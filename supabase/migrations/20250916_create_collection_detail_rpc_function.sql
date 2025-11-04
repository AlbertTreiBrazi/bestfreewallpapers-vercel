-- Create RPC function to get collection details with wallpapers for optimized performance
CREATE OR REPLACE FUNCTION get_collection_with_wallpapers(
    collection_slug TEXT,
    sort_by TEXT DEFAULT 'newest',
    page_number INTEGER DEFAULT 1,
    page_limit INTEGER DEFAULT 12
)
RETURNS JSONB AS $$
DECLARE
    collection_data JSONB;
    wallpapers_data JSONB;
    total_count INTEGER;
    total_pages INTEGER;
    offset_value INTEGER;
    current_month INTEGER;
    sort_column TEXT;
    sort_direction TEXT;
BEGIN
    -- Calculate offset
    offset_value := (page_number - 1) * page_limit;
    current_month := EXTRACT(MONTH FROM NOW());
    
    -- Determine sort order
    CASE sort_by
        WHEN 'oldest' THEN
            sort_column := 'w.created_at';
            sort_direction := 'ASC';
        WHEN 'popular' THEN
            sort_column := 'w.download_count';
            sort_direction := 'DESC';
        WHEN 'alphabetical' THEN
            sort_column := 'w.title';
            sort_direction := 'ASC';
        ELSE -- 'newest' as default
            sort_column := 'w.created_at';
            sort_direction := 'DESC';
    END CASE;
    
    -- Get collection details with statistics
    SELECT jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'slug', c.slug,
        'description', c.description,
        'icon_name', c.icon_name,
        'cover_image_url', c.cover_image_url,
        'color_theme', c.color_theme,
        'is_seasonal', c.is_seasonal,
        'season_start_month', c.season_start_month,
        'season_end_month', c.season_end_month,
        'is_featured', c.is_featured,
        'is_active', c.is_active,
        'sort_order', c.sort_order,
        'wallpaper_count', COALESCE(cw.wallpaper_count, 0),
        'view_count', COALESCE(c.view_count, 0),
        'is_currently_seasonal', 
        CASE 
            WHEN c.is_seasonal AND c.season_start_month IS NOT NULL AND c.season_end_month IS NOT NULL THEN
                CASE 
                    WHEN c.season_start_month <= c.season_end_month THEN
                        (current_month >= c.season_start_month AND current_month <= c.season_end_month)
                    ELSE
                        (current_month >= c.season_start_month OR current_month <= c.season_end_month)
                END
            ELSE false
        END
    ) INTO collection_data
    FROM collections c
    LEFT JOIN (
        SELECT 
            collection_id,
            COUNT(*) as wallpaper_count
        FROM collection_wallpapers 
        GROUP BY collection_id
    ) cw ON c.id = cw.collection_id
    WHERE c.slug = collection_slug AND c.is_active = true;
    
    -- Return error if collection not found
    IF collection_data IS NULL THEN
        RAISE EXCEPTION 'Collection not found' USING ERRCODE = 'P0002';
    END IF;
    
    -- Get total count of wallpapers in collection
    SELECT COUNT(*) INTO total_count
    FROM collection_wallpapers cw
    INNER JOIN wallpapers w ON cw.wallpaper_id = w.id
    INNER JOIN collections c ON cw.collection_id = c.id
    WHERE c.slug = collection_slug 
      AND w.is_published = true 
      AND w.is_active = true
      AND c.is_active = true;
    
    -- Calculate total pages
    total_pages := CEIL(total_count::FLOAT / page_limit);
    
    -- Get wallpapers with dynamic sorting
    EXECUTE format('
        SELECT jsonb_agg(
            jsonb_build_object(
                ''id'', w.id,
                ''title'', w.title,
                ''description'', w.description,
                ''image_url'', w.image_url,
                ''thumbnail_url'', w.thumbnail_url,
                ''download_url'', w.download_url,
                ''resolution_1080p'', w.resolution_1080p,
                ''resolution_4k'', w.resolution_4k,
                ''resolution_8k'', w.resolution_8k,
                ''is_premium'', w.is_premium,
                ''is_published'', w.is_published,
                ''is_active'', w.is_active,
                ''download_count'', w.download_count,
                ''created_at'', w.created_at,
                ''updated_at'', w.updated_at,
                ''width'', w.width,
                ''height'', w.height,
                ''device_type'', w.device_type,
                ''collection_sort_order'', cw.sort_order
            ) ORDER BY %s %s
        )
        FROM collection_wallpapers cw
        INNER JOIN wallpapers w ON cw.wallpaper_id = w.id
        INNER JOIN collections c ON cw.collection_id = c.id
        WHERE c.slug = $1 
          AND w.is_published = true 
          AND w.is_active = true
          AND c.is_active = true
        ORDER BY %s %s
        LIMIT $2 OFFSET $3
    ', sort_column, sort_direction, sort_column, sort_direction)
    INTO wallpapers_data
    USING collection_slug, page_limit, offset_value;
    
    -- Return combined result
    RETURN jsonb_build_object(
        'collection', collection_data,
        'wallpapers', COALESCE(wallpapers_data, '[]'::jsonb),
        'pagination', jsonb_build_object(
            'page', page_number,
            'limit', page_limit,
            'total', total_count,
            'total_pages', total_pages
        )
    );
END;
$$ LANGUAGE plpgsql;