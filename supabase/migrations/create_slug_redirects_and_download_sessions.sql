-- Migration: Create Slug Redirects and Download Sessions Tables
-- Purpose: Support for slug redirects and secure download sessions
-- Date: 2025-01-15

-- Create slug_redirects table for 301 redirects when slugs change
CREATE TABLE IF NOT EXISTS slug_redirects (
    id SERIAL PRIMARY KEY,
    old_slug TEXT NOT NULL UNIQUE,
    new_slug TEXT NOT NULL,
    wallpaper_id INTEGER REFERENCES wallpapers(id) ON DELETE CASCADE,
    redirect_type VARCHAR(10) DEFAULT '301' CHECK (redirect_type IN ('301', '302')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for slug_redirects
CREATE INDEX IF NOT EXISTS idx_slug_redirects_old_slug ON slug_redirects(old_slug);
CREATE INDEX IF NOT EXISTS idx_slug_redirects_new_slug ON slug_redirects(new_slug);
CREATE INDEX IF NOT EXISTS idx_slug_redirects_wallpaper_id ON slug_redirects(wallpaper_id);
CREATE INDEX IF NOT EXISTS idx_slug_redirects_active ON slug_redirects(is_active);

-- Create download_sessions table for secure download management
CREATE TABLE IF NOT EXISTS download_sessions (
    id SERIAL PRIMARY KEY,
    token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    wallpaper_id INTEGER NOT NULL REFERENCES wallpapers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    resolution TEXT NOT NULL DEFAULT '1080p',
    download_url TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_premium_user BOOLEAN DEFAULT false,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    used_at TIMESTAMPTZ NULL
);

-- Create indexes for download_sessions
CREATE INDEX IF NOT EXISTS idx_download_sessions_token ON download_sessions(token);
CREATE INDEX IF NOT EXISTS idx_download_sessions_wallpaper_id ON download_sessions(wallpaper_id);
CREATE INDEX IF NOT EXISTS idx_download_sessions_user_id ON download_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_download_sessions_expires_at ON download_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_download_sessions_ip_address ON download_sessions(ip_address);
CREATE INDEX IF NOT EXISTS idx_download_sessions_created_at ON download_sessions(created_at);

-- Enhance downloads table if it doesn't have all required columns
ALTER TABLE downloads 
ADD COLUMN IF NOT EXISTS download_token UUID REFERENCES download_sessions(token) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS download_type TEXT DEFAULT 'direct' CHECK (download_type IN ('direct', 'enhanced', 'premium', 'free', 'guest')),
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Create indexes for enhanced downloads table
CREATE INDEX IF NOT EXISTS idx_downloads_download_token ON downloads(download_token);
CREATE INDEX IF NOT EXISTS idx_downloads_download_type ON downloads(download_type);
CREATE INDEX IF NOT EXISTS idx_downloads_ip_address ON downloads(ip_address);
CREATE INDEX IF NOT EXISTS idx_downloads_user_id_created_at ON downloads(user_id, created_at);

-- Add slug column to wallpapers table if it doesn't exist
ALTER TABLE wallpapers 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create index for wallpaper slugs
CREATE INDEX IF NOT EXISTS idx_wallpapers_slug ON wallpapers(slug);

-- Function to generate slug from title
CREATE OR REPLACE FUNCTION generate_slug_from_title(title TEXT)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Basic slug generation: lowercase, replace spaces and special chars with hyphens
    base_slug := lower(regexp_replace(trim(title), '[^a-zA-Z0-9\s]', '', 'g'));
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := trim(base_slug, '-');
    
    -- Ensure slug is not empty
    IF base_slug = '' OR base_slug IS NULL THEN
        base_slug := 'wallpaper';
    END IF;
    
    -- Check for uniqueness and add counter if needed
    final_slug := base_slug;
    
    WHILE EXISTS (SELECT 1 FROM wallpapers WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically set slug on wallpaper insert/update
CREATE OR REPLACE FUNCTION set_wallpaper_slug()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set slug if it's not provided
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := generate_slug_from_title(NEW.title);
    ELSE
        -- Validate provided slug format
        NEW.slug := lower(regexp_replace(trim(NEW.slug), '[^a-zA-Z0-9\-]', '', 'g'));
        NEW.slug := regexp_replace(NEW.slug, '\-+', '-', 'g');
        NEW.slug := trim(NEW.slug, '-');
        
        -- Ensure uniqueness if this is an update with different slug
        IF TG_OP = 'UPDATE' AND OLD.slug != NEW.slug THEN
            WHILE EXISTS (SELECT 1 FROM wallpapers WHERE slug = NEW.slug AND id != NEW.id) LOOP
                NEW.slug := NEW.slug || '-' || extract(epoch from now())::integer;
            END LOOP;
        ELSIF TG_OP = 'INSERT' THEN
            WHILE EXISTS (SELECT 1 FROM wallpapers WHERE slug = NEW.slug) LOOP
                NEW.slug := NEW.slug || '-' || extract(epoch from now())::integer;
            END LOOP;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic slug generation
DROP TRIGGER IF EXISTS trigger_set_wallpaper_slug ON wallpapers;
CREATE TRIGGER trigger_set_wallpaper_slug
    BEFORE INSERT OR UPDATE OF title, slug
    ON wallpapers
    FOR EACH ROW
    EXECUTE FUNCTION set_wallpaper_slug();

-- Function to clean up expired download sessions
CREATE OR REPLACE FUNCTION cleanup_expired_download_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM download_sessions 
    WHERE expires_at < NOW() - INTERVAL '1 hour';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get download statistics
CREATE OR REPLACE FUNCTION get_download_statistics(
    p_wallpaper_id INTEGER DEFAULT NULL,
    p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
    wallpaper_id INTEGER,
    wallpaper_title TEXT,
    total_downloads BIGINT,
    premium_downloads BIGINT,
    free_downloads BIGINT,
    guest_downloads BIGINT,
    last_download TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id as wallpaper_id,
        w.title as wallpaper_title,
        COUNT(d.id) as total_downloads,
        COUNT(CASE WHEN d.download_type = 'premium' THEN 1 END) as premium_downloads,
        COUNT(CASE WHEN d.download_type = 'free' THEN 1 END) as free_downloads,
        COUNT(CASE WHEN d.download_type = 'guest' THEN 1 END) as guest_downloads,
        MAX(d.created_at) as last_download
    FROM wallpapers w
    LEFT JOIN downloads d ON w.id = d.wallpaper_id 
        AND d.created_at BETWEEN p_start_date AND p_end_date
    WHERE (p_wallpaper_id IS NULL OR w.id = p_wallpaper_id)
        AND w.is_published = true
    GROUP BY w.id, w.title
    ORDER BY total_downloads DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing wallpapers to have slugs if they don't
UPDATE wallpapers 
SET slug = generate_slug_from_title(title)
WHERE slug IS NULL;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON slug_redirects TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON download_sessions TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION generate_slug_from_title TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_download_sessions TO service_role;
GRANT EXECUTE ON FUNCTION get_download_statistics TO authenticated, service_role;

-- Enable RLS on new tables
ALTER TABLE slug_redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for slug_redirects (public read, admin write)
CREATE POLICY "Public can read active redirects" ON slug_redirects
    FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage redirects" ON slug_redirects
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for download_sessions
CREATE POLICY "Users can access their own sessions" ON download_sessions
    FOR ALL USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage all sessions" ON download_sessions
    FOR ALL USING (auth.role() = 'service_role');

COMMIT;