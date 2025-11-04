// Optimized data fetching for collections with caching

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
  seasonal_priority?: number
}

// Cache for collections data
let collectionsCache: Collection[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

export async function getCollections(): Promise<Collection[]> {
  // Return cached data if still valid
  if (collectionsCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return collectionsCache
  }

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/collections-api`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch collections: ${response.status}`)
    }

    const data = await response.json()
    const collections = data.data || []

    // Update cache
    collectionsCache = collections
    cacheTimestamp = Date.now()

    return collections
  } catch (error) {
    console.error('Error fetching collections:', error)
    
    // Return cached data if available, even if stale
    if (collectionsCache) {
      return collectionsCache
    }
    
    throw error
  }
}

// Clear cache when needed
export function clearCollectionsCache(): void {
  collectionsCache = null
  cacheTimestamp = 0
}