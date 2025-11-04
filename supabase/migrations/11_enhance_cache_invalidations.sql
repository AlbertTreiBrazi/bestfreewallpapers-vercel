-- Add processed_at field to cache_invalidations table
ALTER TABLE public.cache_invalidations 
ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update the index to include processed_at for efficient querying
DROP INDEX IF EXISTS idx_cache_invalidations_processed;
CREATE INDEX idx_cache_invalidations_processed_with_time 
ON public.cache_invalidations(processed, created_at, processed_at);

-- Create composite index for path lookups
CREATE INDEX idx_cache_invalidations_path_type 
ON public.cache_invalidations(path, invalidation_type);

-- Add comment for documentation
COMMENT ON COLUMN public.cache_invalidations.processed_at IS 'Timestamp when the cache invalidation was processed';
