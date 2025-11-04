-- Add automatic cache invalidation for analytics when downloads are inserted
-- This ensures guest and authenticated downloads immediately invalidate analytics cache

-- Create trigger function to invalidate analytics cache on download insert
CREATE OR REPLACE FUNCTION invalidate_analytics_cache_on_download()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert cache invalidation record for admin metrics/analytics
  INSERT INTO cache_invalidations (path, invalidation_type, processed, created_at)
  VALUES 
    ('/admin/metrics', 'download_inserted', false, NOW()),
    ('/admin/analytics', 'download_inserted', false, NOW()),
    ('/admin/dashboard', 'download_inserted', false, NOW());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on downloads table
DROP TRIGGER IF EXISTS on_download_insert_invalidate_cache ON downloads;

CREATE TRIGGER on_download_insert_invalidate_cache
AFTER INSERT ON downloads
FOR EACH ROW
EXECUTE FUNCTION invalidate_analytics_cache_on_download();

-- Add comment for documentation
COMMENT ON FUNCTION invalidate_analytics_cache_on_download() IS 
'Automatically invalidates analytics cache when a new download (guest or authenticated) is recorded. Ensures real-time analytics updates.';
