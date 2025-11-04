-- Migration: Update Admin Roles System & Collections Enhancement
-- Created: 2025-08-25
-- Description: Updates existing admin roles table and enhances collections system

-- Add missing columns to admin_roles table
ALTER TABLE admin_roles 
ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index on role_name for performance
CREATE INDEX IF NOT EXISTS idx_admin_roles_role_name ON admin_roles(role_name);
CREATE INDEX IF NOT EXISTS idx_admin_roles_hierarchy ON admin_roles(hierarchy_level DESC);

-- Update existing admin roles with hierarchy levels and better permissions
INSERT INTO admin_roles (role_name, display_name, description, permissions, hierarchy_level, can_manage_users, can_manage_content, can_manage_admins, can_delete_admins) 
VALUES 
    ('super_admin', 'Super Administrator', 'Full system access including admin management', 
     '{"manage_admins": true, "manage_users": true, "manage_wallpapers": true, "manage_collections": true, "manage_categories": true, "view_analytics": true, "manage_premium_requests": true, "manage_contact_messages": true, "manage_banners": true}'::jsonb, 
     100, true, true, true, true),
    ('admin', 'Administrator', 'Full content and user management access', 
     '{"manage_users": true, "manage_wallpapers": true, "manage_collections": true, "manage_categories": true, "view_analytics": true, "manage_premium_requests": true, "manage_contact_messages": true, "manage_banners": true}'::jsonb, 
     75, true, true, false, false),
    ('moderator', 'Moderator', 'Content moderation and basic user management', 
     '{"moderate_wallpapers": true, "manage_contact_messages": true, "view_basic_analytics": true}'::jsonb, 
     50, false, true, false, false)
ON CONFLICT (role_name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    hierarchy_level = EXCLUDED.hierarchy_level,
    can_manage_users = EXCLUDED.can_manage_users,
    can_manage_content = EXCLUDED.can_manage_content,
    can_manage_admins = EXCLUDED.can_manage_admins,
    can_delete_admins = EXCLUDED.can_delete_admins,
    updated_at = NOW();

-- Create collection_wallpapers junction table (collections table already exists)
CREATE TABLE IF NOT EXISTS collection_wallpapers (
    id SERIAL PRIMARY KEY,
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    wallpaper_id INTEGER REFERENCES wallpapers(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(collection_id, wallpaper_id)
);

-- Create function to update collection wallpaper count
CREATE OR REPLACE FUNCTION update_collection_wallpaper_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE collections 
        SET wallpaper_count = wallpaper_count + 1, updated_at = NOW() 
        WHERE id = NEW.collection_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE collections 
        SET wallpaper_count = wallpaper_count - 1, updated_at = NOW() 
        WHERE id = OLD.collection_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for collection wallpaper count
DROP TRIGGER IF EXISTS collection_wallpaper_count_trigger ON collection_wallpapers;
CREATE TRIGGER collection_wallpaper_count_trigger
    AFTER INSERT OR DELETE ON collection_wallpapers
    FOR EACH ROW
    EXECUTE FUNCTION update_collection_wallpaper_count();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_collection_wallpapers_collection ON collection_wallpapers(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_wallpapers_wallpaper ON collection_wallpapers(wallpaper_id);
CREATE INDEX IF NOT EXISTS idx_collections_active ON collections(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_collections_featured ON collections(is_featured, sort_order);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at timestamps
DROP TRIGGER IF EXISTS update_admin_roles_updated_at ON admin_roles;
CREATE TRIGGER update_admin_roles_updated_at
    BEFORE UPDATE ON admin_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_collections_updated_at ON collections;
CREATE TRIGGER update_collections_updated_at
    BEFORE UPDATE ON collections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample featured collections if they don't exist
INSERT INTO collections (name, slug, description, is_featured, is_active, sort_order) 
VALUES 
    ('Featured Wallpapers', 'featured', 'Hand-picked featured wallpapers for the homepage', true, true, 1),
    ('Nature & Landscapes', 'nature-landscapes', 'Beautiful nature and landscape wallpapers', true, true, 2),
    ('Abstract Art', 'abstract-art', 'Modern abstract and artistic wallpapers', false, true, 3),
    ('Technology', 'technology', 'Tech-themed wallpapers and digital art', false, true, 4),
    ('Minimalist', 'minimalist', 'Clean and minimalist wallpapers', true, true, 5)
ON CONFLICT (slug) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE admin_roles IS 'Admin role definitions with hierarchical permissions';
COMMENT ON TABLE collections IS 'Wallpaper collections for organizing content';
COMMENT ON TABLE collection_wallpapers IS 'Junction table linking collections to wallpapers';
COMMENT ON COLUMN admin_roles.hierarchy_level IS 'Higher numbers indicate more permissions (Super Admin = 100)';
COMMENT ON COLUMN admin_roles.permissions IS 'JSON object of permission flags';
COMMENT ON COLUMN collections.wallpaper_count IS 'Automatically updated count of wallpapers in collection';