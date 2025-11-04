// ISR/SWR Cache Hooks for Performance Optimization
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface CacheOptions {
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
  refreshInterval?: number;
  dedupingInterval?: number;
  errorRetryCount?: number;
  staleTime?: number;
}

interface CacheState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isValidating: boolean;
  lastFetched: Date | null;
}

// Global cache storage
const globalCache = new Map<string, any>();
const cacheTimestamps = new Map<string, Date>();
const pendingRequests = new Map<string, Promise<any>>();

/**
 * SWR-style hook for data fetching with caching
 */
export function useSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): CacheState<T> & { mutate: (data?: T) => void; revalidate: () => void } {
  const {
    revalidateOnFocus = true,
    revalidateOnReconnect = true,
    refreshInterval = 0,
    dedupingInterval = 2000,
    errorRetryCount = 3,
    staleTime = 5 * 60 * 1000, // 5 minutes
  } = options;

  const [state, setState] = useState<CacheState<T>>(() => {
    const cached = globalCache.get(key);
    const cachedAt = cacheTimestamps.get(key);
    const isStale = cachedAt ? Date.now() - cachedAt.getTime() > staleTime : true;

    return {
      data: cached || null,
      error: null,
      isLoading: !cached || isStale,
      isValidating: false,
      lastFetched: cachedAt,
    };
  });

  const retryCountRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch data function
  const fetchData = useCallback(async (isRevalidation = false) => {
    try {
      setState(prev => ({ 
        ...prev, 
        isValidating: true,
        isLoading: !prev.data || !isRevalidation
      }));

      // Check for pending request (deduping)
      const pending = pendingRequests.get(key);
      if (pending && Date.now() - (cacheTimestamps.get(`${key}_pending`) || new Date()).getTime() < dedupingInterval) {
        const result = await pending;
        setState(prev => ({
          ...prev,
          data: result,
          error: null,
          isLoading: false,
          isValidating: false,
          lastFetched: new Date()
        }));
        return result;
      }

      // Create new request
      cacheTimestamps.set(`${key}_pending`, new Date());
      const fetchPromise = fetcher();
      pendingRequests.set(key, fetchPromise);

      const result = await fetchPromise;
      
      // Update cache and state
      globalCache.set(key, result);
      cacheTimestamps.set(key, new Date());
      
      setState(prev => ({
        ...prev,
        data: result,
        error: null,
        isLoading: false,
        isValidating: false,
        lastFetched: new Date()
      }));

      retryCountRef.current = 0;
      return result;
    } catch (error) {
      console.error(`SWR fetch error for key ${key}:`, error);
      
      retryCountRef.current++;
      
      setState(prev => ({
        ...prev,
        error: error as Error,
        isLoading: false,
        isValidating: false,
      }));

      // Retry logic
      if (retryCountRef.current <= errorRetryCount) {
        setTimeout(() => {
          fetchData(isRevalidation);
        }, Math.min(1000 * Math.pow(2, retryCountRef.current), 8000));
      }

      throw error;
    } finally {
      pendingRequests.delete(key);
      cacheTimestamps.delete(`${key}_pending`);
    }
  }, [key, fetcher, dedupingInterval, errorRetryCount]);

  // Manual revalidation
  const revalidate = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // Mutate cache data
  const mutate = useCallback((data?: T) => {
    if (data !== undefined) {
      globalCache.set(key, data);
      cacheTimestamps.set(key, new Date());
      setState(prev => ({
        ...prev,
        data,
        lastFetched: new Date()
      }));
    } else {
      fetchData(true);
    }
  }, [key, fetchData]);

  // Initial data fetch
  useEffect(() => {
    const cached = globalCache.get(key);
    const cachedAt = cacheTimestamps.get(key);
    const isStale = cachedAt ? Date.now() - cachedAt.getTime() > staleTime : true;

    if (!cached || isStale) {
      fetchData();
    }
  }, [key, staleTime, fetchData]);

  // Refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchData(true);
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refreshInterval, fetchData]);

  // Window focus revalidation
  useEffect(() => {
    if (!revalidateOnFocus) return;

    const handleFocus = () => {
      const cachedAt = cacheTimestamps.get(key);
      if (cachedAt && Date.now() - cachedAt.getTime() > 5000) { // Only if cache is older than 5s
        fetchData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [revalidateOnFocus, key, fetchData]);

  // Network reconnection revalidation
  useEffect(() => {
    if (!revalidateOnReconnect) return;

    const handleOnline = () => {
      fetchData(true);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [revalidateOnReconnect, fetchData]);

  return {
    ...state,
    mutate,
    revalidate
  };
}

/**
 * Hook for caching wallpaper data with ISR-style revalidation
 */
export function useWallpaperCache(slug?: string) {
  const fetcher = useCallback(async () => {
    if (!slug) return null;

    const { data, error } = await supabase
      .from('wallpapers')
      .select(`
        *,
        category:categories(*),
        collection:collections(*)
      `)
      .eq('slug', slug)
      .single();

    if (error) throw error;
    return data;
  }, [slug]);

  return useSWR(
    slug ? `wallpaper-${slug}` : null,
    fetcher,
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
      revalidateOnFocus: false,
      refreshInterval: 30 * 60 * 1000, // 30 minutes
    }
  );
}

/**
 * Hook for caching category wallpapers with pagination
 */
export function useCategoryWallpapersCache(categorySlug?: string, page = 1, limit = 20) {
  const fetcher = useCallback(async () => {
    if (!categorySlug) return { wallpapers: [], hasMore: false, total: 0 };

    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .single();

    if (categoryError) throw categoryError;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('wallpapers')
      .select('*', { count: 'exact' })
      .eq('category_id', category.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      wallpapers: data || [],
      hasMore: (count || 0) > page * limit,
      total: count || 0
    };
  }, [categorySlug, page, limit]);

  return useSWR(
    categorySlug ? `category-${categorySlug}-${page}-${limit}` : null,
    fetcher,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refreshInterval: 15 * 60 * 1000, // 15 minutes
    }
  );
}

/**
 * Hook for caching search results
 */
export function useSearchCache(query?: string, filters: any = {}, page = 1, limit = 20) {
  const fetcher = useCallback(async () => {
    if (!query?.trim()) return { wallpapers: [], hasMore: false, total: 0 };

    let queryBuilder = supabase
      .from('wallpapers')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    // Add search conditions
    queryBuilder = queryBuilder.or(
      `title.ilike.%${query}%,tags.ilike.%${query}%,description.ilike.%${query}%`
    );

    // Add filters
    if (filters.category) {
      queryBuilder = queryBuilder.eq('category_id', filters.category);
    }
    if (filters.isPremium !== undefined) {
      queryBuilder = queryBuilder.eq('is_premium', filters.isPremium);
    }
    if (filters.orientation) {
      queryBuilder = queryBuilder.eq('orientation', filters.orientation);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await queryBuilder
      .order('download_count', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      wallpapers: data || [],
      hasMore: (count || 0) > page * limit,
      total: count || 0
    };
  }, [query, JSON.stringify(filters), page, limit]);

  const searchKey = query?.trim() 
    ? `search-${encodeURIComponent(query)}-${JSON.stringify(filters)}-${page}-${limit}`
    : null;

  return useSWR(searchKey, fetcher, {
    staleTime: 2 * 60 * 1000, // 2 minutes (search results can change frequently)
    refreshInterval: 0, // Don't auto-refresh search results
    revalidateOnFocus: false,
  });
}

/**
 * Clear all cached data
 */
export function clearAllCache() {
  globalCache.clear();
  cacheTimestamps.clear();
  pendingRequests.clear();
}

/**
 * Clear specific cache entries by pattern
 */
export function clearCacheByPattern(pattern: string | RegExp) {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  
  for (const key of globalCache.keys()) {
    if (regex.test(key)) {
      globalCache.delete(key);
      cacheTimestamps.delete(key);
      pendingRequests.delete(key);
    }
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const now = Date.now();
  const stats = {
    totalEntries: globalCache.size,
    staleEntries: 0,
    freshEntries: 0,
    oldestEntry: null as Date | null,
    newestEntry: null as Date | null,
    totalSize: 0
  };

  for (const [key, timestamp] of cacheTimestamps.entries()) {
    const age = now - timestamp.getTime();
    
    if (age > 5 * 60 * 1000) { // 5 minutes
      stats.staleEntries++;
    } else {
      stats.freshEntries++;
    }

    if (!stats.oldestEntry || timestamp < stats.oldestEntry) {
      stats.oldestEntry = timestamp;
    }
    if (!stats.newestEntry || timestamp > stats.newestEntry) {
      stats.newestEntry = timestamp;
    }

    // Estimate size (rough approximation)
    try {
      stats.totalSize += JSON.stringify(globalCache.get(key) || {}).length;
    } catch (e) {
      // Ignore circular reference errors
    }
  }

  return stats;
}