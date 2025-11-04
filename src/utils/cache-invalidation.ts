// Cache invalidation utilities for frontend
import { supabase } from '@/lib/supabase';

export interface CacheInvalidationOptions {
  paths: string[];
  type?: string;
  immediate?: boolean;
}

// Invalidate specific paths
export async function invalidateCachePaths({ paths, type = 'manual', immediate = false }: CacheInvalidationOptions) {
  try {
    const uniquePaths = [...new Set(paths.filter(path => path && path.trim()))];
    
    if (uniquePaths.length === 0) {
      console.warn('No valid paths provided for cache invalidation');
      return;
    }

    // Queue cache invalidation for each path
    const invalidationPromises = uniquePaths.map(path => 
      supabase.functions.invoke('cache-invalidation-processor', {
        body: {
          action: 'INVALIDATE_PATH',
          path,
          type
        }
      })
    );

    await Promise.all(invalidationPromises);
    
    console.log(`Cache invalidation queued for ${uniquePaths.length} paths:`, uniquePaths);
    
    // If immediate processing is requested, trigger processor
    if (immediate) {
      await supabase.functions.invoke('cache-invalidation-processor', {
        body: { action: 'PROCESS_PENDING' }
      });
      console.log('Immediate cache processing triggered');
    }
  } catch (error) {
    console.error('Failed to invalidate cache paths:', error);
    throw error;
  }
}

// Invalidate cache for wallpaper-related operations
export async function invalidateWallpaperCache(operation: 'created' | 'updated' | 'deleted', data?: any) {
  const basePaths = [
    '/', // Home page
    '/free-wallpapers',
    '/premium',
    '/search'
  ];
  
  const additionalPaths: string[] = [];
  
  if (data?.category_slug) {
    additionalPaths.push(`/category/${data.category_slug}`);
  }
  
  if (data?.slug && operation !== 'created') {
    additionalPaths.push(`/wallpaper/${data.slug}`);
  }
  
  await invalidateCachePaths({
    paths: [...basePaths, ...additionalPaths],
    type: `wallpaper_${operation}`,
    immediate: true
  });
}

// Invalidate cache for collection operations
export async function invalidateCollectionCache(operation: 'created' | 'updated' | 'deleted', collectionId?: string) {
  const paths = ['/collections'];
  
  if (collectionId) {
    paths.push(`/collection/${collectionId}`);
  }
  
  await invalidateCachePaths({
    paths,
    type: `collection_${operation}`,
    immediate: true
  });
}

// Clear all caches (emergency function)
export async function clearAllCaches() {
  try {
    const { error } = await supabase.functions.invoke('cache-invalidation-processor', {
      body: { action: 'CLEAR_ALL_CACHE' }
    });
    
    if (error) throw error;
    
    console.log('All caches cleared successfully');
  } catch (error) {
    console.error('Failed to clear all caches:', error);
    throw error;
  }
}

// Get cache status
export async function getCacheStatus() {
  try {
    const { data, error } = await supabase.functions.invoke('cache-invalidation-processor', {
      body: { action: 'GET_CACHE_STATUS' }
    });
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Failed to get cache status:', error);
    throw error;
  }
}

// React hook for cache management
import { useState, useEffect } from 'react';

export function useCacheManagement() {
  const [isInvalidating, setIsInvalidating] = useState(false);
  const [cacheStats, setCacheStats] = useState(null);
  
  const invalidateCache = async (options: CacheInvalidationOptions) => {
    setIsInvalidating(true);
    try {
      await invalidateCachePaths(options);
    } finally {
      setIsInvalidating(false);
    }
  };
  
  const refreshCacheStats = async () => {
    try {
      const stats = await getCacheStatus();
      setCacheStats(stats);
    } catch (error) {
      console.error('Failed to refresh cache stats:', error);
    }
  };
  
  // Auto-refresh cache stats every 30 seconds
  useEffect(() => {
    refreshCacheStats();
    const interval = setInterval(refreshCacheStats, 30000);
    return () => clearInterval(interval);
  }, []);
  
  return {
    invalidateCache,
    isInvalidating,
    cacheStats,
    refreshCacheStats,
    invalidateWallpaperCache,
    invalidateCollectionCache,
    clearAllCaches
  };
}
