-- Migration: Admin Roles System & Collections Management
-- Created: 2025-08-25
-- Description: Creates admin roles system, collections table, and enhances user profiles

-- Create admin_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_roles (
    id SERIAL PRIMARY KEY,
    role_key VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    hierarchy_level INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin roles
INSERT INTO admin_roles (role_key, display_name, description, permissions, hierarchy_level) 
VALUES 
    ('super_admin', 'Super Administrator', 'Full system access including admin management', 
     '["manage_admins", "manage_users", "manage_wallpapers", "manage_collections", "manage_categories", "view_analytics", "manage_premium_requests", "manage_contact_messages", "manage_banners"]'::jsonb, 100),
    ('admin', 'Administrator', 'Full content and user management access', 
     '["manage_users", "manage_wallpapers", "manage_collections", "manage_categories", "view_analytics", "manage_premium_requests", "manage_contact_messages", "manage_banners"]'::jsonb, 75),
    ('moderator', 'Moderator', 'Content moderation and basic user management', 
     '["moderate_wallpapers", "manage_contact_messages", "view_basic_analytics"]'::jsonb, 50)
ON CONFLICT (role_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    hierarchy_level = EXCLUDED.hierarchy_level,
    updated_at = NOW();

-- Create collections table for wallpaper collections management
CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    is_featured BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    wallpaper_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create collection_wallpapers junction table
CREATE TABLE IF NOT EXISTS collection_wallpapers (
    id SERIAL PRIMARY KEY,
    collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_admin_roles_role_key ON admin_roles(role_key);
CREATE INDEX IF NOT EXISTS idx_admin_roles_hierarchy ON admin_roles(hierarchy_level DESC);
CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_published ON collections(is_published, sort_order);
CREATE INDEX IF NOT EXISTS idx_collection_wallpapers_collection ON collection_wallpapers(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_wallpapers_wallpaper ON collection_wallpapers(wallpaper_id);

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

-- Insert some sample collections
INSERT INTO collections (name, slug, description, is_featured, sort_order) 
VALUES 
    ('Featured Wallpapers', 'featured', 'Hand-picked featured wallpapers for the homepage', true, 1),
    ('Nature & Landscapes', 'nature-landscapes', 'Beautiful nature and landscape wallpapers', true, 2),
    ('Abstract Art', 'abstract-art', 'Modern abstract and artistic wallpapers', false, 3),
    ('Technology', 'technology', 'Tech-themed wallpapers and digital art', false, 4)
ON CONFLICT (slug) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE admin_roles IS 'Admin role definitions with hierarchical permissions';
COMMENT ON TABLE collections IS 'Wallpaper collections for organizing content';
COMMENT ON TABLE collection_wallpapers IS 'Junction table linking collections to wallpapers';
COMMENT ON COLUMN admin_roles.hierarchy_level IS 'Higher numbers indicate more permissions (Super Admin = 100)';
COMMENT ON COLUMN admin_roles.permissions IS 'JSON array of permission strings';
COMMENT ON COLUMN collections.wallpaper_count IS 'Automatically updated count of wallpapers in collection';

-- Grant appropriate permissions (adjust based on your RLS policies)
-- These are examples - adjust based on your specific security requirements
GRANT SELECT ON admin_roles TO authenticated;
GRANT ALL ON collections TO authenticated;
GRANT ALL ON collection_wallpapers TO authenticated;