// Optimized data fetching for collection details with caching

interface Collection {
  id: string
  name: string
  slug: string
  description: string | null
  icon_name: string | null
  cover_image_url: string | null
  color_theme: {
    primary: string
    secondary: string
    accent: string
  } | null
  is_seasonal: boolean
  season_start_month: number | null
  season_end_month: number | null
  is_featured: boolean
  is_active: boolean
  sort_order: number
  wallpaper_count: number
  view_count: number
  is_currently_seasonal?: boolean
}

interface Wallpaper {
  id: number
  title: string
  description: string | null
  image_url: string
  thumbnail_url: string | null
  download_url: string
  resolution_1080p: string | null
  resolution_4k: string | null
  resolution_8k: string | null
  is_premium: boolean
  is_published: boolean
  is_active: boolean
  download_count: number
  created_at: string
  updated_at: string
  width?: number
  height?: number
  device_type?: string
}

interface CollectionDetailResponse {
  collection: Collection
  wallpapers: Wallpaper[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

// Cache for collection details
interface CollectionCache {
  [key: string]: {
    data: CollectionDetailResponse
    timestamp: number
  }
}

const collectionCache: CollectionCache = {}
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes

export async function getCollectionDetail(
  slug: string,
  sortBy: string = 'newest',
  page: number = 1
): Promise<CollectionDetailResponse> {
  const cacheKey = `${slug}-${sortBy}-${page}`
  
  // Return cached data if still valid
  if (collectionCache[cacheKey] && Date.now() - collectionCache[cacheKey].timestamp < CACHE_DURATION) {
    return collectionCache[cacheKey].data
  }

  try {
    const queryParams = new URLSearchParams({
      sort: sortBy,
      page: page.toString(),
      limit: '12'
    });
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/collection-detail/${slug}?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        }
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Collection not found')
      }
      throw new Error(`Failed to fetch collection: ${response.status}`)
    }

    const data = await response.json()
    const result: CollectionDetailResponse = {
      collection: data.data.collection,
      wallpapers: data.data.wallpapers || [],
      pagination: data.data.pagination
    }

    // Update cache
    collectionCache[cacheKey] = {
      data: result,
      timestamp: Date.now()
    }

    return result
  } catch (error) {
    console.error('Error fetching collection detail:', error)
    
    // Return cached data if available, even if stale
    if (collectionCache[cacheKey]) {
      return collectionCache[cacheKey].data
    }
    
    throw error
  }
}

// Increment view count
export async function incrementCollectionView(slug: string): Promise<void> {
  try {
    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/collection-detail`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ 
          slug: slug,
          action: 'increment_view' 
        })
      }
    )
  } catch (error) {
    console.error('Failed to increment view count:', error)
  }
}

// Clear cache when needed
export function clearCollectionCache(slug?: string): void {
  if (slug) {
    // Clear specific collection cache
    Object.keys(collectionCache).forEach(key => {
      if (key.startsWith(slug)) {
        delete collectionCache[key]
      }
    })
  } else {
    // Clear all cache
    Object.keys(collectionCache).forEach(key => {
      delete collectionCache[key]
    })
  }
}