import React, { useState, useRef, useEffect, useMemo } from 'react'
import { EnhancedLazyImage } from './EnhancedLazyImage'
import { useIntersectionObserver } from '@/hooks/use-intersection-observer'
import { intelligentPreloader, preloadImages } from '@/utils/intelligent-preloading'
import { cdnOptimizer } from '@/utils/cdn-optimization'
import { debounce } from '@/utils/debounce'

interface WallpaperItem {
  id: number
  title: string
  thumbnailUrl?: string
  fullUrl?: string
  width?: number
  height?: number
  category?: string
  tags?: string[]
}

interface LazyWallpaperGridProps {
  wallpapers: WallpaperItem[]
  columns?: {
    mobile: number
    tablet: number
    desktop: number
  }
  onWallpaperClick?: (wallpaper: WallpaperItem) => void
  className?: string
  enableInfiniteScroll?: boolean
  onLoadMore?: () => void
  loading?: boolean
  virtualScrolling?: boolean
  itemHeight?: number
}

// Virtual scrolling hook for performance
const useVirtualScroll = (
  items: WallpaperItem[], 
  itemHeight: number,
  containerRef: React.RefObject<HTMLDivElement>,
  enabled = false
) => {
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  
  useEffect(() => {
    if (!enabled || !containerRef.current) return
    
    const container = containerRef.current
    
    const handleScroll = debounce(() => {
      setScrollTop(container.scrollTop)
    }, 16) // ~60fps
    
    const handleResize = debounce(() => {
      setContainerHeight(container.clientHeight)
    }, 250)
    
    container.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)
    handleResize() // Initial call
    
    return () => {
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [enabled, itemHeight])
  
  const visibleItems = useMemo(() => {
    if (!enabled || containerHeight === 0) return items
    
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    )
    
    return items.slice(Math.max(0, startIndex - 1), endIndex + 1).map((item, index) => ({
      ...item,
      virtualIndex: startIndex + index
    }))
  }, [items, scrollTop, containerHeight, itemHeight, enabled])
  
  return {
    visibleItems,
    totalHeight: enabled ? items.length * itemHeight : 'auto',
    offsetY: enabled ? Math.floor(scrollTop / itemHeight) * itemHeight : 0
  }
}

// Intersection Observer hook for infinite scroll
const useInfiniteScroll = (
  onLoadMore: () => void,
  loading: boolean,
  enabled: boolean
) => {
  const [targetRef, isIntersecting] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px'
  })
  
  useEffect(() => {
    if (isIntersecting && !loading && enabled) {
      onLoadMore()
    }
  }, [isIntersecting, loading, enabled, onLoadMore])
  
  return targetRef
}

// Smart preloading based on scroll direction and user behavior
const useSmartPreloading = (wallpapers: WallpaperItem[], currentIndex: number) => {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('down')
  const lastScrollY = useRef(0)
  
  useEffect(() => {
    const handleScroll = debounce(() => {
      const currentScrollY = window.scrollY
      setScrollDirection(currentScrollY > lastScrollY.current ? 'down' : 'up')
      lastScrollY.current = currentScrollY
      
      // Preload upcoming images based on scroll direction
      const preloadCount = 5
      const startIndex = scrollDirection === 'down' 
        ? currentIndex + 1 
        : Math.max(0, currentIndex - preloadCount)
      const endIndex = scrollDirection === 'down'
        ? Math.min(wallpapers.length, currentIndex + preloadCount)
        : currentIndex
        
      const preloadUrls = wallpapers
        .slice(startIndex, endIndex)
        .map(w => w.thumbnailUrl || `/api/wallpaper/${w.id}/thumbnail`)
        .filter(Boolean)
        
      preloadImages(preloadUrls, 'low')
    }, 100)
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [wallpapers, currentIndex, scrollDirection])
  
  return scrollDirection
}

export const LazyWallpaperGrid: React.FC<LazyWallpaperGridProps> = ({
  wallpapers,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  onWallpaperClick,
  className = '',
  enableInfiniteScroll = false,
  onLoadMore = () => {},
  loading = false,
  virtualScrolling = false,
  itemHeight = 300
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [visibleStartIndex, setVisibleStartIndex] = useState(0)
  
  // Virtual scrolling
  const { visibleItems, totalHeight, offsetY } = useVirtualScroll(
    wallpapers,
    itemHeight,
    containerRef,
    virtualScrolling
  )
  
  // Infinite scroll
  const loadMoreRef = useInfiniteScroll(onLoadMore, loading, enableInfiniteScroll)
  
  // Smart preloading
  useSmartPreloading(wallpapers, visibleStartIndex)
  
  // Update visible start index for preloading
  useEffect(() => {
    if (!virtualScrolling) return
    
    const container = containerRef.current
    if (!container) return
    
    const updateVisibleIndex = debounce(() => {
      const scrollTop = container.scrollTop
      const newIndex = Math.floor(scrollTop / itemHeight)
      setVisibleStartIndex(newIndex)
    }, 100)
    
    container.addEventListener('scroll', updateVisibleIndex, { passive: true })
    return () => container.removeEventListener('scroll', updateVisibleIndex)
  }, [itemHeight, virtualScrolling])
  
  // Preload on hover
  const handleHover = useMemo(
    () => debounce((index: number, wallpaper: WallpaperItem) => {
      setHoveredIndex(index)
      
      // Preload high resolution version
      if (wallpaper.fullUrl) {
        intelligentPreloader.addResource({
          url: wallpaper.fullUrl,
          type: 'image',
          priority: 'medium',
          strategy: 'hover',
          metadata: {
            width: wallpaper.width,
            height: wallpaper.height
          }
        })
      }
      
      // Preload adjacent images
      const adjacentIndices = [index - 1, index + 1]
      adjacentIndices.forEach(i => {
        if (i >= 0 && i < wallpapers.length) {
          const adjacent = wallpapers[i]
          const url = adjacent.thumbnailUrl || `/api/wallpaper/${adjacent.id}/thumbnail`
          intelligentPreloader.addResource({
            url,
            type: 'image',
            priority: 'low',
            strategy: 'hover'
          })
        }
      })
    }, 150),
    [wallpapers]
  )
  
  // Get image URL with CDN optimization
  const getOptimizedImageUrl = (wallpaper: WallpaperItem, width: number) => {
    const baseUrl = wallpaper.thumbnailUrl || `/functions/v1/api-img/${wallpaper.id}`
    return cdnOptimizer.getAdaptiveImageUrl(baseUrl, {
      baseWidth: width,
      baseHeight: Math.round(width * 0.75) // 4:3 aspect ratio
    })
  }
  
  // Responsive grid classes
  const gridClasses = `
    grid gap-4 w-full
    grid-cols-${columns.mobile}
    md:grid-cols-${columns.tablet}
    lg:grid-cols-${columns.desktop}
    xl:grid-cols-${columns.desktop + 1}
  `.trim()
  
  const currentWallpapers = virtualScrolling ? visibleItems : wallpapers
  
  return (
    <div className={`relative ${className}`}>
      <div 
        ref={containerRef}
        className={`${virtualScrolling ? 'overflow-y-auto' : ''}`}
        style={{
          height: virtualScrolling ? '80vh' : 'auto'
        }}
      >
        {virtualScrolling && (
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div 
              style={{
                transform: `translateY(${offsetY}px)`,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0
              }}
            >
              <WallpaperGridContent
                wallpapers={currentWallpapers}
                gridClasses={gridClasses}
                hoveredIndex={hoveredIndex}
                onHover={handleHover}
                onWallpaperClick={onWallpaperClick}
                getOptimizedImageUrl={getOptimizedImageUrl}
              />
            </div>
          </div>
        )}
        
        {!virtualScrolling && (
          <WallpaperGridContent
            wallpapers={currentWallpapers}
            gridClasses={gridClasses}
            hoveredIndex={hoveredIndex}
            onHover={handleHover}
            onWallpaperClick={onWallpaperClick}
            getOptimizedImageUrl={getOptimizedImageUrl}
          />
        )}
        
        {/* Infinite scroll trigger */}
        {enableInfiniteScroll && (
          <div 
            ref={loadMoreRef as React.RefObject<HTMLDivElement>}
            className="h-20 flex items-center justify-center"
          >
            {loading && (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            )}
          </div>
        )}
      </div>
      
      {/* Loading skeleton */}
      {loading && wallpapers.length === 0 && (
        <div className={gridClasses}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div 
              key={i} 
              className="bg-gray-200 animate-pulse rounded-lg" 
              style={{ aspectRatio: '4/3', height: itemHeight }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Memoized grid content component
const WallpaperGridContent = React.memo<{
  wallpapers: WallpaperItem[]
  gridClasses: string
  hoveredIndex: number | null
  onHover: (index: number, wallpaper: WallpaperItem) => void
  onWallpaperClick?: (wallpaper: WallpaperItem) => void
  getOptimizedImageUrl: (wallpaper: WallpaperItem, width: number) => string
}>(({ wallpapers, gridClasses, hoveredIndex, onHover, onWallpaperClick, getOptimizedImageUrl }) => (
  <div className={gridClasses}>
    {wallpapers.map((wallpaper, index) => {
      const isHovered = hoveredIndex === index
      const imageWidth = 400 // Base width for optimization
      
      return (
        <div
          key={wallpaper.id}
          className={`
            relative group cursor-pointer rounded-lg overflow-hidden
            transition-transform duration-300 ease-out
            ${isHovered ? 'scale-105 z-10' : 'scale-100'}
            hover:shadow-xl
          `}
          onClick={() => onWallpaperClick?.(wallpaper)}
          onMouseEnter={() => onHover(index, wallpaper)}
          onMouseLeave={() => {}}
        >
          <div className="relative aspect-[4/3]">
            <EnhancedLazyImage
              src={getOptimizedImageUrl(wallpaper, imageWidth)}
              alt={wallpaper.title}
              width={imageWidth}
              height={300}
              priority={index < 6 ? 'high' : 'medium'}
              placeholder="blur"
              quality="medium"
              preloadStrategy="viewport"
              className="w-full h-full object-cover transition-transform duration-300"
            />
            
            {/* Hover overlay */}
            <div className={`
              absolute inset-0 bg-black bg-opacity-0 transition-all duration-300
              ${isHovered ? 'bg-opacity-20' : ''}
              group-hover:bg-opacity-20
            `} />
            
            {/* Title overlay */}
            <div className={`
              absolute bottom-0 left-0 right-0 p-4
              bg-gradient-to-t from-black/70 to-transparent
              transform translate-y-full transition-transform duration-300
              ${isHovered ? 'translate-y-0' : ''}
              group-hover:translate-y-0
            `}>
              <h3 className="text-white font-medium text-sm truncate">
                {wallpaper.title}
              </h3>
              {wallpaper.category && (
                <p className="text-white/80 text-xs mt-1">
                  {wallpaper.category}
                </p>
              )}
            </div>
          </div>
        </div>
      )
    })}
  </div>
))

WallpaperGridContent.displayName = 'WallpaperGridContent'