-- Create RPC function to get collections with statistics for optimized performance
CREATE OR REPLACE FUNCTION get_collections_with_stats()
RETURNS TABLE(
    id TEXT,
    name TEXT,
    slug TEXT,
    description TEXT,
    icon_name TEXT,
    cover_image_url TEXT,
    color_theme JSONB,
    is_seasonal BOOLEAN,
    season_start_month INTEGER,
    season_end_month INTEGER,
    is_featured BOOLEAN,
    is_active BOOLEAN,
    sort_order INTEGER,
    wallpaper_count BIGINT,
    view_count BIGINT,
    is_currently_seasonal BOOLEAN,
    seasonal_priority INTEGER
) AS $$
DECLARE
    current_month INTEGER;
BEGIN
    current_month := EXTRACT(MONTH FROM NOW());
    
    RETURN QUERY
    SELECT
        c.id::TEXT,
        c.name,
        c.slug,
        c.description,
        c.icon_name,
        c.cover_image_url,
        c.color_theme,
        c.is_seasonal,
        c.season_start_month,
        c.season_end_month,
        c.is_featured,
        c.is_active,
        c.sort_order,
        COALESCE(cw.wallpaper_count, 0) as wallpaper_count,
        COALESCE(c.view_count, 0) as view_count,
        CASE 
            WHEN c.is_seasonal AND c.season_start_month IS NOT NULL AND c.season_end_month IS NOT NULL THEN
                CASE 
                    WHEN c.season_start_month <= c.season_end_month THEN
                        (current_month >= c.season_start_month AND current_month <= c.season_end_month)
                    ELSE
                        (current_month >= c.season_start_month OR current_month <= c.season_end_month)
                END
            ELSE false
        END as is_currently_seasonal,
        CASE 
            WHEN c.is_seasonal AND c.season_start_month IS NOT NULL AND
                 CASE 
                     WHEN c.season_start_month <= c.season_end_month THEN
                         (current_month >= c.season_start_month AND current_month <= c.season_end_month)
                     ELSE
                         (current_month >= c.season_start_month OR current_month <= c.season_end_month)
                 END THEN
                (100 - ABS(current_month - c.season_start_month))
            ELSE 0
        END as seasonal_priority
    FROM
        collections c
    LEFT JOIN (
        SELECT 
            collection_id,
            COUNT(*) as wallpaper_count
        FROM collection_wallpapers 
        GROUP BY collection_id
    ) cw ON c.id = cw.collection_id
    WHERE
        c.is_active = true
    ORDER BY
        CASE 
            WHEN c.is_seasonal AND c.season_start_month IS NOT NULL AND
                 CASE 
                     WHEN c.season_start_month <= c.season_end_month THEN
                         (current_month >= c.season_start_month AND current_month <= c.season_end_month)
                     ELSE
                         (current_month >= c.season_start_month OR current_month <= c.season_end_month)
                 END THEN
                (100 - ABS(current_month - c.season_start_month))
            ELSE 0
        END DESC,
        c.sort_order ASC,
        c.created_at DESC;
END;
$$ LANGUAGE plpgsql;