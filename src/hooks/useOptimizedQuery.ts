import { useQuery, useInfiniteQuery, QueryKey } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface OptimizedQueryOptions {
  staleTime?: number
  cacheTime?: number
  refetchOnWindowFocus?: boolean
  enabled?: boolean
  retry?: number
}

// Optimized wallpapers query with better caching and error handling
export const useOptimizedWallpapers = (
  filters: {
    category?: string
    search?: string
    sortBy?: string
    page?: number
    limit?: number
  } = {},
  options: OptimizedQueryOptions = {}
) => {
  const { category, search, sortBy = 'newest', page = 1, limit = 12 } = filters
  
  return useQuery({
    queryKey: ['wallpapers', { category, search, sortBy, page, limit }],
    queryFn: async () => {
      try {
        // Use the wallpaper-management edge function for better reliability
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wallpaper-management`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: 'get_wallpapers',
              category: category,
              search: search,
              sort: sortBy,
              page: page,
              limit: limit
            })
          }
        )

        if (response.ok) {
          const result = await response.json()
          if (result.data) {
            return {
              wallpapers: result.data.wallpapers || [],
              totalCount: result.data.totalCount || 0,
              totalPages: result.data.totalPages || 1,
              currentPage: result.data.currentPage || page
            }
          }
        }
        
        // Fallback to direct Supabase query
        let query = supabase
          .from('wallpapers')
          .select('*', { count: 'exact' })
          .eq('is_published', true)
          .eq('is_active', true)
          .eq('visibility', 'public')
        
        // Apply filters
        if (category && category !== 'all') {
          const { data: categoryData } = await supabase
            .from('categories')
            .select('id')
            .eq('slug', category)
            .single()
          
          if (categoryData) {
            query = query.eq('category_id', categoryData.id)
          }
        }
        
        if (search) {
          const sanitizedQuery = search.replace(/[<>"'%;()&+]/g, '').trim()
          if (sanitizedQuery) {
            query = query.or(`title.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`)
          }
        }
        
        // Apply sorting with better handling for popular
        switch (sortBy) {
          case 'newest':
            query = query.order('created_at', { ascending: false })
            break
          case 'oldest':
            query = query.order('created_at', { ascending: true })
            break
          case 'popular':
            // Sort by download_count with nulls last, then by created_at
            query = query.order('download_count', { ascending: false, nullsFirst: false })
                         .order('created_at', { ascending: false })
            break
          case 'title':
            query = query.order('title', { ascending: true })
            break
          default:
            query = query.order('created_at', { ascending: false })
        }
        
        // Apply pagination
        const from = (page - 1) * limit
        const to = from + limit - 1
        query = query.range(from, to)
        
        const { data, error, count } = await query
        
        if (error) {
          console.error('Supabase query error:', error)
          // Return empty data instead of throwing
          return {
            wallpapers: [],
            totalCount: 0,
            totalPages: 1,
            currentPage: page
          }
        }
        
        return {
          wallpapers: data || [],
          totalCount: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          currentPage: page
        }
      } catch (error) {
        console.error('Error in useOptimizedWallpapers:', error)
        // Return empty data instead of throwing
        return {
          wallpapers: [],
          totalCount: 0,
          totalPages: 1,
          currentPage: page
        }
      }
    },
    staleTime: options.staleTime || 5 * 60 * 1000, // 5 minutes
    gcTime: options.cacheTime || 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
    enabled: options.enabled ?? true,
    retry: options.retry || 1,
  })
}

// Optimized categories query
export const useOptimizedCategories = (options: OptimizedQueryOptions = {}) => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      // First get categories
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, slug, sort_order, preview_image, preview_wallpaper_id')
        .eq('is_active', true)
        .order('sort_order')
        .limit(6)
      
      if (categoriesError) throw categoriesError
      
      if (!categories) return []
      
      // For each category, get a sample wallpaper if no preview is set
      const processedCategories = await Promise.all(
        categories.map(async (category) => {
          if (category.preview_image || category.preview_wallpaper_id) {
            return category
          }
          
          // Get a sample wallpaper for this category
          const { data: sampleWallpaper } = await supabase
            .from('wallpapers')
            .select('id, thumbnail_url, image_url')
            .eq('category_id', category.id)
            .eq('is_published', true)
            .eq('is_active', true)
            .limit(1)
            .single()
          
          return {
            ...category,
            preview_image: sampleWallpaper?.thumbnail_url || sampleWallpaper?.image_url,
            preview_wallpaper_id: sampleWallpaper?.id
          }
        })
      )
      
      return processedCategories
    },
    staleTime: options.staleTime || 10 * 60 * 1000, // 10 minutes
    gcTime: options.cacheTime || 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
    enabled: options.enabled ?? true,
    retry: options.retry || 2,
  })
}

// Infinite scroll wallpapers query
export const useInfiniteWallpapers = (
  filters: {
    category?: string
    search?: string
    sortBy?: string
    limit?: number
  } = {},
  options: OptimizedQueryOptions = {}
) => {
  const { category, search, sortBy = 'newest', limit = 12 } = filters
  
  return useInfiniteQuery({
    queryKey: ['wallpapers-infinite', { category, search, sortBy, limit }],
    queryFn: async ({ pageParam = 0 }: { pageParam: number }) => {
      let query = supabase
        .from('wallpapers')
        .select('*')
        .eq('is_published', true)
        .eq('is_active', true)
        .eq('visibility', 'public')
      
      // Apply filters (similar to useOptimizedWallpapers)
      if (category && category !== 'all') {
        const { data: categoryData } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', category)
          .single()
        
        if (categoryData) {
          query = query.eq('category_id', categoryData.id)
        }
      }
      
      if (search) {
        const sanitizedQuery = search.replace(/[<>"'%;()&+]/g, '').trim()
        if (sanitizedQuery) {
          query = query.or(`title.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`)
        }
      }
      
      // Apply sorting
      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false })
          break
        case 'oldest':
          query = query.order('created_at', { ascending: true })
          break
        case 'popular':
          query = query.order('download_count', { ascending: false })
          break
        case 'title':
          query = query.order('title', { ascending: true })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }
      
      // Apply pagination
      const from = pageParam * limit
      const to = from + limit - 1
      query = query.range(from, to)
      
      const { data, error } = await query
      
      if (error) throw error
      
      return {
        wallpapers: data || [],
        nextCursor: data && data.length === limit ? pageParam + 1 : null,
      }
    },
    getNextPageParam: (lastPage: { wallpapers: any[]; nextCursor: number | null }) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: options.staleTime || 5 * 60 * 1000,
    gcTime: options.cacheTime || 30 * 60 * 1000,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
    enabled: options.enabled ?? true,
    retry: options.retry || 1,
  })
}