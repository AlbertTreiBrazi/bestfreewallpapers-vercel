-- Migration: Add Image Dimensions Support
-- Purpose: Add width and height columns to wallpapers table for dynamic aspect ratios
-- Date: 2025-01-15

-- Add image dimension columns to wallpapers table
ALTER TABLE wallpapers 
ADD COLUMN IF NOT EXISTS width INTEGER,
ADD COLUMN IF NOT EXISTS height INTEGER,
ADD COLUMN IF NOT EXISTS aspect_ratio DECIMAL(10,4) GENERATED ALWAYS AS (
    CASE 
        WHEN height IS NOT NULL AND height > 0 THEN ROUND((width::DECIMAL / height::DECIMAL), 4)
        ELSE NULL 
    END
) STORED;

-- Add device_type enum if not exists
DO $$ BEGIN
    CREATE TYPE device_type_enum AS ENUM ('desktop', 'mobile', 'tablet', 'both');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update device_type column to use enum
ALTER TABLE wallpapers 
ALTER COLUMN device_type TYPE device_type_enum USING device_type::device_type_enum;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallpapers_aspect_ratio ON wallpapers(aspect_ratio);
CREATE INDEX IF NOT EXISTS idx_wallpapers_device_type ON wallpapers(device_type);
CREATE INDEX IF NOT EXISTS idx_wallpapers_dimensions ON wallpapers(width, height);

-- Create function to determine device type from dimensions
CREATE OR REPLACE FUNCTION determine_device_type_from_dimensions(p_width INTEGER, p_height INTEGER)
RETURNS device_type_enum AS $$
DECLARE
    aspect_ratio DECIMAL(10,4);
BEGIN
    IF p_width IS NULL OR p_height IS NULL OR p_width <= 0 OR p_height <= 0 THEN
        RETURN 'both'::device_type_enum;
    END IF;
    
    aspect_ratio := ROUND((p_width::DECIMAL / p_height::DECIMAL), 4);
    
    -- Portrait (taller than wide) - typically mobile
    IF aspect_ratio < 0.8 THEN
        RETURN 'mobile'::device_type_enum;
    -- Square-ish or slightly portrait - could be both
    ELSIF aspect_ratio >= 0.8 AND aspect_ratio <= 1.2 THEN
        RETURN 'both'::device_type_enum;
    -- Landscape (wider than tall) - typically desktop
    ELSE
        RETURN 'desktop'::device_type_enum;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to update device type based on dimensions
CREATE OR REPLACE FUNCTION update_device_type_from_dimensions()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-update device_type if dimensions are provided but device_type is not explicitly set
    IF NEW.width IS NOT NULL AND NEW.height IS NOT NULL THEN
        IF NEW.device_type IS NULL OR OLD.device_type IS NULL THEN
            NEW.device_type := determine_device_type_from_dimensions(NEW.width, NEW.height);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update device type
DROP TRIGGER IF EXISTS trigger_update_device_type_from_dimensions ON wallpapers;
CREATE TRIGGER trigger_update_device_type_from_dimensions
    BEFORE INSERT OR UPDATE OF width, height
    ON wallpapers
    FOR EACH ROW
    EXECUTE FUNCTION update_device_type_from_dimensions();

-- Create function to backfill dimensions for existing wallpapers
CREATE OR REPLACE FUNCTION backfill_wallpaper_dimensions()
RETURNS TABLE(
    wallpaper_id INTEGER,
    image_url TEXT,
    status TEXT,
    error_message TEXT
) AS $$
DECLARE
    wallpaper_record RECORD;
    image_info JSONB;
    new_width INTEGER;
    new_height INTEGER;
BEGIN
    -- Process wallpapers that don't have dimensions yet
    FOR wallpaper_record IN 
        SELECT id, title, thumbnail_url, resolution_1080p, resolution_4k
        FROM wallpapers 
        WHERE width IS NULL OR height IS NULL
        ORDER BY id
    LOOP
        BEGIN
            -- For now, we'll set default dimensions based on common wallpaper sizes
            -- This will be updated by the image processing service
            
            -- Default mobile wallpaper dimensions (portrait)
            IF wallpaper_record.title ILIKE '%mobile%' OR 
               wallpaper_record.title ILIKE '%phone%' OR
               wallpaper_record.title ILIKE '%vertical%' THEN
                new_width := 1080;
                new_height := 1920;
            -- Default desktop wallpaper dimensions (landscape)
            ELSE
                new_width := 1920;
                new_height := 1080;
            END IF;
            
            -- Update the wallpaper with dimensions
            UPDATE wallpapers 
            SET width = new_width, height = new_height
            WHERE id = wallpaper_record.id;
            
            -- Return success status
            wallpaper_id := wallpaper_record.id;
            image_url := COALESCE(wallpaper_record.thumbnail_url, wallpaper_record.resolution_1080p);
            status := 'success';
            error_message := NULL;
            RETURN NEXT;
            
        EXCEPTION WHEN OTHERS THEN
            -- Return error status
            wallpaper_id := wallpaper_record.id;
            image_url := COALESCE(wallpaper_record.thumbnail_url, wallpaper_record.resolution_1080p);
            status := 'error';
            error_message := SQLERRM;
            RETURN NEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get wallpapers with dimension-based filtering
CREATE OR REPLACE FUNCTION get_wallpapers_by_aspect_ratio(
    p_device_type device_type_enum DEFAULT NULL,
    p_min_aspect_ratio DECIMAL DEFAULT NULL,
    p_max_aspect_ratio DECIMAL DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id INTEGER,
    title TEXT,
    slug TEXT,
    thumbnail_url TEXT,
    width INTEGER,
    height INTEGER,
    aspect_ratio DECIMAL,
    device_type device_type_enum,
    is_premium BOOLEAN,
    download_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.title,
        w.slug,
        w.thumbnail_url,
        w.width,
        w.height,
        w.aspect_ratio,
        w.device_type,
        w.is_premium,
        w.download_count
    FROM wallpapers w
    WHERE w.is_published = true
        AND (p_device_type IS NULL OR w.device_type = p_device_type OR w.device_type = 'both')
        AND (p_min_aspect_ratio IS NULL OR w.aspect_ratio >= p_min_aspect_ratio)
        AND (p_max_aspect_ratio IS NULL OR w.aspect_ratio <= p_max_aspect_ratio)
    ORDER BY w.download_count DESC, w.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION determine_device_type_from_dimensions TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION backfill_wallpaper_dimensions TO service_role;
GRANT EXECUTE ON FUNCTION get_wallpapers_by_aspect_ratio TO authenticated, service_role;

-- Run backfill for existing wallpapers (commented out - run manually when ready)
-- SELECT * FROM backfill_wallpaper_dimensions();

COMMIT;
