import React, { useRef, useEffect, useState, memo } from 'react'
import { lazyLoadManager, getOptimizedImageUrl } from '@/utils/performance-optimization'
import { cn } from '@/lib/utils'
import { getApiImageUrl } from '@/config/api'
import { calculateAspectRatio, ASPECT_RATIOS } from '@/utils/cls-optimization'

interface OptimizedWallpaperImageProps {
  id: number
  title: string
  thumbnailUrl?: string | null
  className?: string
  priority?: 'high' | 'low'
  sizes?: string
  onLoad?: () => void
  onError?: () => void
  onClick?: () => void
  aspectRatio?: 'video' | 'portrait' | 'square'
}

// Memoized component for optimal performance
export const OptimizedWallpaperImage = memo<OptimizedWallpaperImageProps>(
  function OptimizedWallpaperImage({
    id,
    title,
    thumbnailUrl,
    className,
    priority = 'low',
    sizes = '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw',
    onLoad,
    onError,
    onClick,
    aspectRatio = 'video'
  }) {
    const imgRef = useRef<HTMLImageElement>(null)
    const [isLoaded, setIsLoaded] = useState(false)
    const [hasError, setHasError] = useState(false)
    const [isVisible, setIsVisible] = useState(priority === 'high')
    const [retryCount, setRetryCount] = useState(0)

    // Get safe image URL with fallback strategy
    const getSafeImageUrl = () => {
      const baseUrl = thumbnailUrl || getApiImageUrl(id)
      
      // Use the enhanced API endpoint which has built-in fallback placeholders
      return `${baseUrl}?format=webp&quality=85&w=640`
    }

    // Generate simple srcset for basic responsive support
    const getImageSrcSet = () => {
      const baseUrl = getSafeImageUrl()
      // Simple srcset with different widths
      return [
        `${baseUrl.replace('w=640', 'w=320')} 320w`,
        `${baseUrl.replace('w=640', 'w=640')} 640w`,
        `${baseUrl.replace('w=640', 'w=1024')} 1024w`
      ].join(', ')
    }

    useEffect(() => {
      const img = imgRef.current
      if (!img) return

      if (priority === 'high') {
        // Load immediately for high priority images
        setIsVisible(true)
        return
      }

      // Set up intersection observer for lazy loading
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible(true)
              observer.unobserve(img)
            }
          })
        },
        {
          rootMargin: '50px 0px',
          threshold: 0.1
        }
      )

      observer.observe(img)

      return () => {
        observer.disconnect()
      }
    }, [priority])

    const handleLoad = () => {
      setIsLoaded(true)
      onLoad?.()
    }

    const handleError = () => {
      console.log(`Image load error for wallpaper ${id}, retry count: ${retryCount}`)
      
      // Don't immediately mark as error - the backend now provides SVG fallbacks
      // which should load successfully. Only mark as error after multiple failures.
      if (retryCount < 1) {
        setRetryCount(prev => prev + 1)
        // Force a re-render to retry
        setIsLoaded(false)
        return
      }
      
      setHasError(true)
      onError?.()
    }

    const aspectRatioClasses = {
      video: 'aspect-video', // 16:9
      portrait: 'aspect-[9/16]', // 9:16
      square: 'aspect-square' // 1:1
    }
    
    // CLS Prevention: Get explicit aspect ratio for container
    const aspectRatioStyle = aspectRatio === 'video' 
      ? ASPECT_RATIOS.video 
      : aspectRatio === 'portrait'
      ? ASPECT_RATIOS.portrait
      : ASPECT_RATIOS.square

    return (
      <div 
        className={cn(
          'relative overflow-hidden bg-gray-200 dark:bg-gray-800',
          aspectRatioClasses[aspectRatio],
          className
        )}
        style={{
          aspectRatio: aspectRatioStyle,
        }}
        onClick={onClick}
      >
        {/* Placeholder/Loading State */}
        <div 
          className={cn(
            'absolute inset-0 flex items-center justify-center transition-opacity duration-300 bg-gray-100 dark:bg-gray-800',
            isLoaded ? 'opacity-0' : 'opacity-100'
          )}
        >
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="text-2xl mb-2 animate-pulse">📷</div>
            <div className="text-sm font-medium">Loading...</div>
          </div>
        </div>

        {/* Main Image */}
        {isVisible && (
          <img
            ref={imgRef}
            src={getSafeImageUrl()}
            srcSet={getImageSrcSet()}
            sizes={sizes}
            alt={title}
            className={cn(
              'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0',
              hasError && 'opacity-0'
            )}
            loading={priority === 'high' ? 'eager' : 'lazy'}
            fetchPriority={priority === 'high' ? 'high' : 'low'}
            decoding="async"
            onLoad={handleLoad}
            onError={handleError}
            onContextMenu={(e) => e.preventDefault()} // Prevent right-click context menu
            onDragStart={(e) => e.preventDefault()} // Prevent dragging
            style={{ 
              userSelect: 'none',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }} // Prevent text selection
            key={retryCount} // Force re-render on retry
          />
        )}

        {/* Error State */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-2xl mb-2">📷</div>
              <div className="text-sm">Image unavailable</div>
            </div>
          </div>
        )}

        {/* Hover Effect Overlay */}
        {onClick && (
          <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 hover:opacity-100">
            <div className="bg-white/90 text-black px-3 py-1 rounded-full text-sm font-medium">
              View Details
            </div>
          </div>
        )}
      </div>
    )
  }
)

OptimizedWallpaperImage.displayName = 'OptimizedWallpaperImage'

// Hook for image preloading
export function useImagePreloader() {
  const [preloadedImages, setPreloadedImages] = useState(new Set<string>())

  const preloadImage = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (preloadedImages.has(src)) {
        resolve()
        return
      }

      const img = new Image()
      img.onload = () => {
        setPreloadedImages(prev => new Set([...prev, src]))
        resolve()
      }
      img.onerror = reject
      img.src = src
    })
  }

  const preloadImages = async (srcs: string[]) => {
    try {
      await Promise.all(srcs.map(src => preloadImage(src)))
    } catch (error) {
      console.warn('Some images failed to preload:', error)
    }
  }

  return { preloadImage, preloadImages, preloadedImages }
}
