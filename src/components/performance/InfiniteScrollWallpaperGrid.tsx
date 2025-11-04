import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useIntersectionObserver } from '@/hooks/use-intersection-observer'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Download, Heart, Eye, Star, ExternalLink } from 'lucide-react'
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
  category_name?: string
  category_slug?: string
  responsive_images?: {
    small: string
    medium: string
    large: string
    webp_small: string
    webp_medium: string
  }
}

interface InfiniteScrollWallpaperGridProps {
  categoryId?: number
  isPremium?: boolean
  deviceType?: string
  searchQuery?: string
  sortBy?: 'newest' | 'popular' | 'oldest'
  initialLimit?: number
  onWallpaperClick?: (wallpaper: Wallpaper) => void
}

// Optimized image component with responsive loading and WebP support
function OptimizedImage({ 
  wallpaper, 
  className,
  onLoad,
  onClick
}: { 
  wallpaper: Wallpaper
  className?: string
  onLoad?: () => void
  onClick?: () => void
}) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  
  // Intersection observer for lazy loading
  const [observerRef, isIntersecting] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px'
  })

  useEffect(() => {
    if (isIntersecting && !isInView) {
      setIsInView(true)
    }
  }, [isIntersecting, isInView])

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true)
    onLoad?.()
  }, [onLoad])

  const handleImageError = useCallback(() => {
    setImageError(true)
    console.warn(`Failed to load image: ${wallpaper.thumbnail_url}`)
  }, [wallpaper.thumbnail_url])

  // Generate responsive image sources
  const imageSources = useMemo(() => {
    if (wallpaper.responsive_images) {
      return {
        webpSrcSet: `${wallpaper.responsive_images.webp_small} 300w, ${wallpaper.responsive_images.webp_medium} 600w`,
        jpegSrcSet: `${wallpaper.responsive_images.small} 300w, ${wallpaper.responsive_images.medium} 600w`,
        fallbackSrc: wallpaper.thumbnail_url
      }
    }
    return {
      webpSrcSet: '',
      jpegSrcSet: '',
      fallbackSrc: wallpaper.thumbnail_url
    }
  }, [wallpaper])

  if (!isInView) {
    return (
      <div 
        ref={observerRef as React.RefObject<HTMLDivElement>}
        className={`${className} bg-gray-200 animate-pulse flex items-center justify-center`}
        style={{ aspectRatio: '16/9' }}
      >
        <div className="w-8 h-8 bg-gray-300 rounded" />
      </div>
    )
  }

  if (imageError) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center text-gray-400`}>
        <span className="text-sm">Image unavailable</span>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} onClick={onClick}>
      <picture>
        {/* WebP format for modern browsers */}
        {imageSources.webpSrcSet && (
          <source 
            srcSet={imageSources.webpSrcSet}
            sizes="(max-width: 768px) 300px, 600px"
            type="image/webp"
          />
        )}
        {/* JPEG fallback */}
        {imageSources.jpegSrcSet && (
          <source 
            srcSet={imageSources.jpegSrcSet}
            sizes="(max-width: 768px) 300px, 600px"
            type="image/jpeg"
          />
        )}
        {/* Final fallback */}
        <img
          ref={imgRef}
          src={imageSources.fallbackSrc}
          alt={wallpaper.title}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
          decoding="async"
        />
      </picture>
      
      {/* Loading state */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 bg-gray-300 rounded" />
        </div>
      )}
    </div>
  )
}

// Memoized wallpaper card component
const WallpaperCard = React.memo(({ 
  wallpaper, 
  onWallpaperClick 
}: { 
  wallpaper: Wallpaper
  onWallpaperClick?: (wallpaper: Wallpaper) => void
}) => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const [imageLoaded, setImageLoaded] = useState(false)

  const handleClick = useCallback(() => {
    onWallpaperClick?.(wallpaper)
  }, [wallpaper, onWallpaperClick])

  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Download functionality will be handled by parent component
    onWallpaperClick?.(wallpaper)
  }, [wallpaper, onWallpaperClick])

  return (
    <div className="group relative bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer">
      {/* Image Container */}
      <div className="relative aspect-[16/9] overflow-hidden rounded-t-lg">
        <OptimizedImage
          wallpaper={wallpaper}
          className="w-full h-full"
          onLoad={() => setImageLoaded(true)}
          onClick={handleClick}
        />
        
        {/* Premium Badge */}
        {wallpaper.is_premium && (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center space-x-1">
            <Star className="w-3 h-3" />
            <span>Premium</span>
          </div>
        )}
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-2">
            <button
              onClick={handleDownload}
              className="bg-white text-gray-800 p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleClick}
              className="bg-white text-gray-800 p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="View Details"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2" title={wallpaper.title}>
          {wallpaper.title}
        </h3>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Download className="w-3 h-3" />
              <span>{wallpaper.download_count || 0}</span>
            </div>
            {wallpaper.width && wallpaper.height && (
              <span>{wallpaper.width}×{wallpaper.height}</span>
            )}
          </div>
          
          {wallpaper.category_name && (
            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
              {wallpaper.category_name}
            </span>
          )}
        </div>
      </div>
    </div>
  )
})

WallpaperCard.displayName = 'WallpaperCard'

export function InfiniteScrollWallpaperGrid({
  categoryId,
  isPremium,
  deviceType,
  searchQuery,
  sortBy = 'newest',
  initialLimit = 20,
  onWallpaperClick
}: InfiniteScrollWallpaperGridProps) {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastId, setLastId] = useState<number | null>(null)
  const [imagesLoaded, setImagesLoaded] = useState(0)
  
  const { user } = useAuth()
  const { theme } = useTheme()

  // Intersection observer for infinite scroll
  const [sentinelRef, isIntersecting] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '200px'
  })

  // Optimized wallpaper fetching with the new database function
  const fetchWallpapers = useCallback(async (reset = false) => {
    if (loading || (!hasMore && !reset)) return
    
    setLoading(true)
    setError(null)
    
    try {
      const currentLastId = reset ? null : lastId
      
      let data, error
      
      if (searchQuery) {
        // Use search function when there's a search query
        const { data: searchData, error: searchError } = await supabase
          .rpc('search_wallpapers_infinite_scroll', {
            p_search_query: searchQuery,
            p_last_id: currentLastId,
            p_category_id: categoryId || null,
            p_limit: initialLimit
          })
        data = searchData
        error = searchError
      } else {
        // Use optimized infinite scroll function
        const { data: scrollData, error: scrollError } = await supabase
          .rpc('get_wallpapers_infinite_scroll', {
            p_last_id: currentLastId,
            p_category_id: categoryId || null,
            p_is_premium: isPremium || null,
            p_device_type: deviceType || null,
            p_limit: initialLimit,
            p_sort_by: sortBy
          })
        data = scrollData
        error = scrollError
      }
      
      if (error) {
        console.error('Error fetching wallpapers:', error)
        setError('Failed to load wallpapers. Please try again.')
        return
      }
      
      if (data && data.length > 0) {
        const newWallpapers = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          slug: item.slug,
          thumbnail_url: item.thumbnail_url,
          is_premium: item.is_premium,
          download_count: item.download_count,
          created_at: item.created_at,
          width: item.width,
          height: item.height,
          category_name: item.category_name,
          category_slug: item.category_slug,
          responsive_images: item.responsive_images
        }))
        
        if (reset) {
          setWallpapers(newWallpapers)
        } else {
          setWallpapers(prev => [...prev, ...newWallpapers])
        }
        
        // Update pagination state
        if (newWallpapers.length > 0) {
          setLastId(newWallpapers[newWallpapers.length - 1].id)
        }
        
        // Check if there are more items
        const hasMoreItems = data.length === initialLimit && data[0]?.has_more !== false
        setHasMore(hasMoreItems)
      } else {
        setHasMore(false)
      }
    } catch (err) {
      console.error('Fetch error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [categoryId, isPremium, deviceType, searchQuery, sortBy, initialLimit, lastId, loading, hasMore])

  // Load more when sentinel comes into view
  useEffect(() => {
    if (isIntersecting && hasMore && !loading) {
      fetchWallpapers()
    }
  }, [isIntersecting, hasMore, loading, fetchWallpapers])

  // Reset and fetch when filters change
  useEffect(() => {
    setWallpapers([])
    setLastId(null)
    setHasMore(true)
    setImagesLoaded(0)
    fetchWallpapers(true)
  }, [categoryId, isPremium, deviceType, searchQuery, sortBy])

  // Memoized grid items
  const gridItems = useMemo(() => {
    return wallpapers.map((wallpaper) => (
      <WallpaperCard
        key={`${wallpaper.id}-${wallpaper.slug}`}
        wallpaper={wallpaper}
        onWallpaperClick={onWallpaperClick}
      />
    ))
  }, [wallpapers, onWallpaperClick])

  const handleImageLoad = useCallback(() => {
    setImagesLoaded(prev => prev + 1)
  }, [])

  // Loading skeleton
  const loadingSkeleton = useMemo(() => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: initialLimit }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="aspect-[16/9] bg-gray-200 animate-pulse" />
          <div className="p-4 space-y-2">
            <div className="h-4 bg-gray-200 animate-pulse rounded" />
            <div className="h-3 bg-gray-200 animate-pulse rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  ), [initialLimit])

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{serializeError(error)}</div>
        <button
          onClick={() => fetchWallpapers(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (loading && wallpapers.length === 0) {
    return loadingSkeleton
  }

  if (wallpapers.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">
          {searchQuery ? `No wallpapers found for "${searchQuery}"` : 'No wallpapers found'}
        </div>
        {searchQuery && (
          <p className="text-sm text-gray-400">
            Try adjusting your search terms or browse our categories
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Performance Info */}
      {wallpapers.length > 0 && (
        <div className="text-sm text-gray-500 flex items-center justify-between">
          <span>Showing {wallpapers.length} wallpapers</span>
          <span>Images loaded: {imagesLoaded}/{wallpapers.length}</span>
        </div>
      )}
      
      {/* Wallpaper Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {gridItems}
      </div>
      
      {/* Loading Indicator */}
      {loading && wallpapers.length > 0 && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}
      
      {/* Infinite Scroll Sentinel */}
      {hasMore && (
        <div 
          ref={sentinelRef as React.RefObject<HTMLDivElement>} 
          className="h-20 flex items-center justify-center"
        >
          {isIntersecting && (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          )}
        </div>
      )}
      
      {/* End of results */}
      {!hasMore && wallpapers.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>You've reached the end of the results</p>
          <p className="text-sm mt-2">Total: {wallpapers.length} wallpapers</p>
        </div>
      )}
    </div>
  )
}

export default InfiniteScrollWallpaperGrid
