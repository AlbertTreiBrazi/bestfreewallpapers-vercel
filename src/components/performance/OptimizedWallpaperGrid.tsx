import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useIntersectionObserver } from '@/hooks/use-intersection-observer'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Download, Heart, Eye, Star } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import toast from 'react-hot-toast'
import { serializeError } from '@/utils/errorFormatting'

interface Wallpaper {
  id: number
  title: string
  slug: string
  thumbnail_url: string
  is_premium: boolean
  download_count: number
  created_at: string
  width?: number
  height?: number
}

interface OptimizedWallpaperGridProps {
  categoryId?: number
  isPremium?: boolean
  searchQuery?: string
  initialLimit?: number
}

// Responsive image component with srcset for optimal loading
function ResponsiveImage({ 
  src, 
  alt, 
  className, 
  onLoad 
}: { 
  src: string
  alt: string
  className?: string
  onLoad?: () => void 
}) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Generate responsive image URLs
  const generateResponsiveUrls = (baseUrl: string) => {
    // For Supabase storage, we can add transformations
    const baseUrlWithoutQuery = baseUrl.split('?')[0]
    
    return {
      thumbnail: `${baseUrlWithoutQuery}?width=300&height=200&resize=cover&quality=80`,
      mobile: `${baseUrlWithoutQuery}?width=400&height=267&resize=cover&quality=85`,
      tablet: `${baseUrlWithoutQuery}?width=600&height=400&resize=cover&quality=90`,
      desktop: `${baseUrlWithoutQuery}?width=800&height=533&resize=cover&quality=95`
    }
  }

  const responsiveUrls = useMemo(() => generateResponsiveUrls(src), [src])

  const handleLoad = () => {
    setImageLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setImageError(true)
  }

  if (imageError) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <div className="text-gray-500 text-sm">Image unavailable</div>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Loading placeholder */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* Responsive image */}
      <img
        src={responsiveUrls.thumbnail}
        srcSet={`
          ${responsiveUrls.thumbnail} 300w,
          ${responsiveUrls.mobile} 400w,
          ${responsiveUrls.tablet} 600w,
          ${responsiveUrls.desktop} 800w
        `}
        sizes="
          (max-width: 480px) 300px,
          (max-width: 768px) 400px,
          (max-width: 1024px) 600px,
          800px
        "
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading="lazy"
        decoding="async"
      />
    </div>
  )
}

// Memoized wallpaper card component
const WallpaperCard = React.memo(({ 
  wallpaper, 
  onDownload, 
  onFavorite, 
  isFavorited 
}: {
  wallpaper: Wallpaper
  onDownload: (wallpaper: Wallpaper) => void
  onFavorite: (wallpaper: Wallpaper) => void
  isFavorited: boolean
}) => {
  const { theme } = useTheme()
  const [imageLoaded, setImageLoaded] = useState(false)

  return (
    <div className={`group relative bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 ${
      theme === 'dark' ? 'bg-dark-secondary border-dark-border' : 'border border-gray-200'
    }`}>
      {/* Premium badge */}
      {wallpaper.is_premium && (
        <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center">
          <Star className="w-3 h-3 mr-1" />
          Premium
        </div>
      )}

      {/* Image container */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <ResponsiveImage
          src={wallpaper.thumbnail_url}
          alt={wallpaper.title}
          className="w-full h-full"
          onLoad={() => setImageLoaded(true)}
        />
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center">
          <div className="transform translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex space-x-3">
            <button
              onClick={() => onDownload(wallpaper)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors duration-200"
              aria-label="Download wallpaper"
            >
              <Download className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => onFavorite(wallpaper)}
              className={`p-3 rounded-full transition-colors duration-200 ${
                isFavorited 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-white hover:bg-gray-100 text-gray-800'
              }`}
              aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className={`font-semibold text-lg mb-2 line-clamp-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          {wallpaper.title}
        </h3>
        
        <div className="flex items-center justify-between text-sm">
          <div className={`flex items-center ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            <Eye className="w-4 h-4 mr-1" />
            {wallpaper.download_count.toLocaleString()} downloads
          </div>
          
          <div className={`text-xs ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {new Date(wallpaper.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  )
})

WallpaperCard.displayName = 'WallpaperCard'

export function OptimizedWallpaperGrid({ 
  categoryId, 
  isPremium, 
  searchQuery, 
  initialLimit = 20 
}: OptimizedWallpaperGridProps) {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const [offset, setOffset] = useState(0)
  
  const { user } = useAuth()
  const { theme } = useTheme()

  // Intersection observer for infinite scroll
  const [sentinelRef, isIntersecting] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px'
  })

  // Optimized wallpaper fetching with caching
  const fetchWallpapers = useCallback(async (reset = false) => {
    if (loading) return
    
    setLoading(true)
    setError(null)
    
    try {
      const currentOffset = reset ? 0 : offset
      
      // Use optimized database function
      const { data, error } = await supabase
        .rpc('get_wallpapers_optimized', {
          p_category_id: categoryId || null,
          p_is_premium: isPremium || null,
          p_limit: initialLimit,
          p_offset: currentOffset
        })
      
      if (error) throw error
      
      // Apply search filter on client side for better performance
      let filteredData = data || []
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filteredData = filteredData.filter((wallpaper: Wallpaper) =>
          wallpaper.title.toLowerCase().includes(query)
        )
      }
      
      if (reset) {
        setWallpapers(filteredData)
        setOffset(initialLimit)
      } else {
        setWallpapers(prev => [...prev, ...filteredData])
        setOffset(prev => prev + initialLimit)
      }
      
      // Check if there are more items
      setHasMore(filteredData.length === initialLimit)
      
    } catch (err: any) {
      setError(err.message || 'Failed to load wallpapers')
      console.error('Error fetching wallpapers:', err)
    } finally {
      setLoading(false)
    }
  }, [categoryId, isPremium, searchQuery, initialLimit, offset, loading])

  // Load favorites for authenticated users
  const loadFavorites = useCallback(async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('wallpaper_id')
        .eq('user_id', user.id)
      
      if (error) throw error
      
      const favoriteIds = new Set(data?.map(fav => fav.wallpaper_id) || [])
      setFavorites(favoriteIds)
    } catch (error) {
      console.error('Error loading favorites:', error)
    }
  }, [user])

  // Initial load and dependency changes
  useEffect(() => {
    setWallpapers([])
    setOffset(0)
    setHasMore(true)
    fetchWallpapers(true)
  }, [categoryId, isPremium, searchQuery])

  // Load favorites on user change
  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  // Infinite scroll trigger
  useEffect(() => {
    if (isIntersecting && hasMore && !loading) {
      fetchWallpapers(false)
    }
  }, [isIntersecting, hasMore, loading, fetchWallpapers])

  // Download handler with rate limiting check
  const handleDownload = useCallback(async (wallpaper: Wallpaper) => {
    try {
      // Check download rate limit
      const { data: rateLimitData, error: rateLimitError } = await supabase.functions.invoke('enhanced-auth-security', {
        body: {
          action: 'check_download_rate_limit'
        }
      })
      
      if (rateLimitError) {
        if (rateLimitError.message?.includes('DOWNLOAD_RATE_LIMITED')) {
          toast.error('Too many download requests. Please wait before trying again.')
          return
        }
      }
      
      // Initiate download
      const { data, error } = await supabase.functions.invoke('download-wallpaper', {
        body: {
          wallpaper_id: wallpaper.id,
          resolution: '1080p'
        }
      })
      
      if (error) throw error
      
      if (data.token) {
        // Process download with secure download function
        const { data: downloadData, error: downloadError } = await supabase.functions.invoke('secure-download-enhanced', {
          body: {
            token: data.token
          }
        })
        
        if (downloadError) throw downloadError
        
        if (downloadData.download_url) {
          // Create download link
          const link = document.createElement('a')
          link.href = downloadData.download_url
          link.download = `${wallpaper.title}.jpg`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          
          toast.success('Download started!')
        }
      }
    } catch (error: any) {
      console.error('Download error:', error)
      toast.error(error.message || 'Download failed. Please try again.')
    }
  }, [])

  // Favorite handler
  const handleFavorite = useCallback(async (wallpaper: Wallpaper) => {
    if (!user) {
      toast.error('Please sign in to add favorites')
      return
    }
    
    try {
      const isFavorited = favorites.has(wallpaper.id)
      
      if (isFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('wallpaper_id', wallpaper.id)
        
        if (error) throw error
        
        setFavorites(prev => {
          const newSet = new Set(prev)
          newSet.delete(wallpaper.id)
          return newSet
        })
        
        toast.success('Removed from favorites')
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            wallpaper_id: wallpaper.id
          })
        
        if (error) throw error
        
        setFavorites(prev => new Set([...prev, wallpaper.id]))
        toast.success('Added to favorites')
      }
    } catch (error: any) {
      console.error('Favorite error:', error)
      toast.error('Failed to update favorites')
    }
  }, [user, favorites])

  // Memoized grid rendering
  const wallpaperGrid = useMemo(() => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
      {wallpapers.map((wallpaper, index) => (
        <WallpaperCard
          key={`${wallpaper.id}-${index}`}
          wallpaper={wallpaper}
          onDownload={handleDownload}
          onFavorite={handleFavorite}
          isFavorited={favorites.has(wallpaper.id)}
        />
      ))}
    </div>
  ), [wallpapers, handleDownload, handleFavorite, favorites])

  if (error) {
    return (
      <div className={`text-center py-12 ${
        theme === 'dark' ? 'text-white' : 'text-gray-900'
      }`}>
        <div className="text-red-600 mb-4">{serializeError(error)}</div>
        <button
          onClick={() => fetchWallpapers(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Results count */}
      {wallpapers.length > 0 && (
        <div className={`text-sm ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
        }`}>
          Showing {wallpapers.length} wallpapers
        </div>
      )}

      {/* Wallpaper grid */}
      {wallpaperGrid}

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Load more sentinel */}
      {hasMore && !loading && (
        <div ref={sentinelRef as React.RefObject<HTMLDivElement>} className="h-20 flex items-center justify-center">
          <div className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Scroll for more...
          </div>
        </div>
      )}

      {/* End of results */}
      {!hasMore && wallpapers.length > 0 && (
        <div className={`text-center py-8 text-sm ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          You've reached the end! {wallpapers.length} wallpapers loaded.
        </div>
      )}

      {/* No results */}
      {!loading && wallpapers.length === 0 && (
        <div className={`text-center py-12 ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
        }`}>
          {searchQuery ? (
            <>
              <div className="text-lg mb-2">No wallpapers found for "{searchQuery}"</div>
              <div className="text-sm">Try adjusting your search terms</div>
            </>
          ) : (
            <div className="text-lg">No wallpapers available</div>
          )}
        </div>
      )}
    </div>
  )
}

export default OptimizedWallpaperGrid