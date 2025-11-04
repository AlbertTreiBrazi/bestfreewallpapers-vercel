-- Migration: Fix Wallpaper Detail System
-- Purpose: Ensure all required tables and columns exist for the wallpaper detail system
-- Date: 2025-01-15

-- Ensure wallpapers table has all required columns
ALTER TABLE wallpapers 
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS is_mobile BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'desktop',
ADD COLUMN IF NOT EXISTS resolution_1080p TEXT,
ADD COLUMN IF NOT EXISTS resolution_4k TEXT,
ADD COLUMN IF NOT EXISTS resolution_8k TEXT,
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS width INTEGER DEFAULT 1920,
ADD COLUMN IF NOT EXISTS height INTEGER DEFAULT 1080,
ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure unique constraint on slug
DROP INDEX IF EXISTS idx_wallpapers_slug;
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallpapers_slug_unique ON wallpapers(slug) WHERE slug IS NOT NULL;

-- Create categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add category_id foreign key to wallpapers if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wallpapers' AND column_name = 'category_id'
    ) THEN
        ALTER TABLE wallpapers ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create profiles table if it doesn't exist (for user management)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'premium')),
    premium_expires_at TIMESTAMPTZ,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure unique constraint on profiles.user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Create downloads table if it doesn't exist
CREATE TABLE IF NOT EXISTS downloads (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    wallpaper_id INTEGER NOT NULL REFERENCES wallpapers(id) ON DELETE CASCADE,
    resolution TEXT DEFAULT '1080p',
    download_type TEXT DEFAULT 'direct',
    download_token UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallpapers_category_id ON wallpapers(category_id);
CREATE INDEX IF NOT EXISTS idx_wallpapers_is_published ON wallpapers(is_published);
CREATE INDEX IF NOT EXISTS idx_wallpapers_is_active ON wallpapers(is_active);
CREATE INDEX IF NOT EXISTS idx_wallpapers_is_premium ON wallpapers(is_premium);
CREATE INDEX IF NOT EXISTS idx_wallpapers_device_type ON wallpapers(device_type);
CREATE INDEX IF NOT EXISTS idx_wallpapers_download_count ON wallpapers(download_count);
CREATE INDEX IF NOT EXISTS idx_wallpapers_created_at ON wallpapers(created_at);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_wallpaper_id ON downloads(wallpaper_id);
CREATE INDEX IF NOT EXISTS idx_downloads_created_at ON downloads(created_at);

-- Insert some default categories if they don't exist
INSERT INTO categories (name, slug, description, sort_order) 
VALUES 
    ('Nature', 'nature', 'Beautiful nature and landscape wallpapers', 1),
    ('Abstract', 'abstract', 'Modern abstract and artistic wallpapers', 2),
    ('Technology', 'technology', 'Tech-inspired and futuristic wallpapers', 3),
    ('Space', 'space', 'Space, galaxies, and cosmic wallpapers', 4),
    ('Gaming', 'gaming', 'Gaming and entertainment wallpapers', 5)
ON CONFLICT (slug) DO NOTHING;

-- Function to update wallpaper slugs if they're missing
CREATE OR REPLACE FUNCTION ensure_wallpaper_slugs()
RETURNS INTEGER AS $$
DECLARE
    wallpaper_record RECORD;
    new_slug TEXT;
    counter INTEGER;
    updated_count INTEGER := 0;
BEGIN
    FOR wallpaper_record IN 
        SELECT id, title FROM wallpapers WHERE slug IS NULL OR slug = ''
    LOOP
        -- Generate base slug from title
        new_slug := lower(regexp_replace(trim(wallpaper_record.title), '[^a-zA-Z0-9\s]', '', 'g'));
        new_slug := regexp_replace(new_slug, '\s+', '-', 'g');
        new_slug := trim(new_slug, '-');
        
        -- Ensure slug is not empty
        IF new_slug = '' OR new_slug IS NULL THEN
            new_slug := 'wallpaper-' || wallpaper_record.id;
        END IF;
        
        -- Check for uniqueness
        counter := 0;
        WHILE EXISTS (SELECT 1 FROM wallpapers WHERE slug = new_slug AND id != wallpaper_record.id) LOOP
            counter := counter + 1;
            new_slug := regexp_replace(new_slug, '-\d+$', '') || '-' || counter;
        END LOOP;
        
        -- Update the wallpaper
        UPDATE wallpapers SET slug = new_slug WHERE id = wallpaper_record.id;
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Run the function to ensure all wallpapers have slugs
SELECT ensure_wallpaper_slugs();

-- Enable RLS on tables
ALTER TABLE wallpapers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Wallpapers: Public can read published/active wallpapers
CREATE POLICY "Public can view published wallpapers" ON wallpapers
    FOR SELECT USING (is_published = true AND is_active = true);

CREATE POLICY "Service role can manage wallpapers" ON wallpapers
    FOR ALL USING (auth.role() = 'service_role');

-- Categories: Public can read active categories
CREATE POLICY "Public can view active categories" ON categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage categories" ON categories
    FOR ALL USING (auth.role() = 'service_role');

-- Downloads: Users can insert their own downloads, service role can manage all
CREATE POLICY "Users can create downloads" ON downloads
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can view their downloads" ON downloads
    FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage downloads" ON downloads
    FOR ALL USING (auth.role() = 'service_role');

-- Profiles: Users can manage their own profiles
CREATE POLICY "Users can view and update own profile" ON profiles
    FOR ALL USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage profiles" ON profiles
    FOR ALL USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT SELECT ON wallpapers TO anon, authenticated;
GRANT SELECT ON categories TO anon, authenticated;
GRANT SELECT, INSERT ON downloads TO authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;

GRANT ALL ON wallpapers TO service_role;
GRANT ALL ON categories TO service_role;
GRANT ALL ON downloads TO service_role;
GRANT ALL ON profiles TO service_role;

COMMIT;