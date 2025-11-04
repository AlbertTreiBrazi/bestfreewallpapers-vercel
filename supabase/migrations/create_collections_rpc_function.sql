-- Create the get_collections_with_stats RPC function
-- This function fetches collections with their wallpaper counts and view counts

CREATE OR REPLACE FUNCTION get_collections_with_stats()
RETURNS TABLE (
    id text,
    name text,
    slug text,
    description text,
    icon_name text,
    cover_image_url text,
    color_theme jsonb,
    is_seasonal boolean,
    season_start_month integer,
    season_end_month integer,
    is_featured boolean,
    is_active boolean,
    sort_order integer,
    wallpaper_count bigint,
    view_count bigint,
    is_currently_seasonal boolean,
    seasonal_priority integer
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id::text,
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
        COALESCE(wc.wallpaper_count, 0) as wallpaper_count,
        COALESCE(c.view_count, 0) as view_count,
        (
            CASE 
                WHEN c.is_seasonal AND c.season_start_month IS NOT NULL AND c.season_end_month IS NOT NULL THEN
                    CASE
                        WHEN c.season_start_month <= c.season_end_month THEN
                            EXTRACT(MONTH FROM CURRENT_DATE) >= c.season_start_month AND EXTRACT(MONTH FROM CURRENT_DATE) <= c.season_end_month
                        ELSE
                            EXTRACT(MONTH FROM CURRENT_DATE) >= c.season_start_month OR EXTRACT(MONTH FROM CURRENT_DATE) <= c.season_end_month
                    END
                ELSE false
            END
        ) as is_currently_seasonal,
        (
            CASE 
                WHEN c.is_seasonal THEN c.sort_order
                ELSE 999
            END
        ) as seasonal_priority
    FROM collections c
    LEFT JOIN (
        SELECT 
            wc.collection_id,
            COUNT(w.id) as wallpaper_count
        FROM wallpapers_collections wc
        INNER JOIN wallpapers w ON wc.wallpaper_id = w.id
        WHERE w.is_published = true AND w.is_active = true
        GROUP BY wc.collection_id
    ) wc ON c.id::text = wc.collection_id::text
    WHERE c.is_active = true
    ORDER BY 
        c.is_featured DESC,
        (
            CASE 
                WHEN c.is_seasonal AND c.season_start_month IS NOT NULL AND c.season_end_month IS NOT NULL THEN
                    CASE
                        WHEN c.season_start_month <= c.season_end_month THEN
                            EXTRACT(MONTH FROM CURRENT_DATE) >= c.season_start_month AND EXTRACT(MONTH FROM CURRENT_DATE) <= c.season_end_month
                        ELSE
                            EXTRACT(MONTH FROM CURRENT_DATE) >= c.season_start_month OR EXTRACT(MONTH FROM CURRENT_DATE) <= c.season_end_month
                    END
                ELSE false
            END
        ) DESC,
        c.sort_order ASC,
        c.name ASC;
END;
$$;
