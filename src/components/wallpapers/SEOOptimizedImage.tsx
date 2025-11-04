import React, { useState, useRef, useEffect } from 'react'
import { Image as ImageIcon } from 'lucide-react'

interface SEOOptimizedImageProps {
  id: number
  title: string
  alt: string
  thumbnailUrl: string | null
  webpUrl?: string
  avifUrl?: string
  dominantColor?: string
  onClick?: () => void
  lazyLoading?: boolean
  className?: string
  itemProp?: string
  sizes?: string
  priority?: 'high' | 'low' | 'auto'
  aspectRatio?: 'square' | 'video' | 'portrait'
}

export function SEOOptimizedImage({
  id,
  title,
  alt,
  thumbnailUrl,
  webpUrl,
  avifUrl,
  dominantColor = '#8B5CF6',
  onClick,
  lazyLoading = true,
  className = '',
  itemProp,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  priority = 'auto',
  aspectRatio = 'video'
}: SEOOptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(!lazyLoading)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazyLoading || isInView) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [lazyLoading, isInView])

  const handleLoad = () => {
    setIsLoaded(true)
  }

  const handleError = () => {
    setHasError(true)
    setIsLoaded(true)
  }

  // Generate responsive image URLs
  const generateSrcSet = () => {
    if (!thumbnailUrl) return ''

    const baseUrl = thumbnailUrl.replace(/\.[^/.]+$/, '')
    const srcSet = []

    // Add WebP versions if available
    if (webpUrl) {
      srcSet.push(`${webpUrl} 1x`)
      srcSet.push(`${baseUrl}_2x.webp 2x`)
    }

    // Add original format as fallback
    srcSet.push(`${thumbnailUrl} 1x`)
    srcSet.push(`${baseUrl}_2x.jpg 2x`)

    return srcSet.join(', ')
  }

  // Aspect ratio classes
  const aspectRatioClass = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]'
  }[aspectRatio]

  // Loading placeholder with dominant color
  const placeholderStyle = {
    backgroundColor: dominantColor,
    backgroundImage: `linear-gradient(45deg, ${dominantColor}22 25%, transparent 25%), 
                     linear-gradient(-45deg, ${dominantColor}22 25%, transparent 25%), 
                     linear-gradient(45deg, transparent 75%, ${dominantColor}22 75%), 
                     linear-gradient(-45deg, transparent 75%, ${dominantColor}22 75%)`,
    backgroundSize: '20px 20px',
    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${aspectRatioClass} ${className}`}
      onClick={onClick}
      style={!isLoaded ? placeholderStyle : undefined}
    >
      {/* Structured Data */}
      {itemProp && (
        <meta itemProp={itemProp} content={thumbnailUrl || ''} />
      )}

      {/* Loading State */}
      {!isLoaded && isInView && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-pulse">
            <ImageIcon className="w-8 h-8 text-white/50" />
          </div>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center bg-gray-200 dark:bg-gray-700"
          role="img"
          aria-label={alt}
        >
          <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
          <span className="text-xs text-gray-500 text-center px-2">
            {title}
          </span>
        </div>
      )}

      {/* Main Image with Progressive Enhancement */}
      {isInView && !hasError && (
        <picture>
          {/* AVIF format for modern browsers */}
          {avifUrl && (
            <source
              srcSet={`${avifUrl} 1x, ${avifUrl.replace('.avif', '_2x.avif')} 2x`}
              type="image/avif"
              sizes={sizes}
            />
          )}
          
          {/* WebP format for most browsers */}
          {webpUrl && (
            <source
              srcSet={`${webpUrl} 1x, ${webpUrl.replace('.webp', '_2x.webp')} 2x`}
              type="image/webp"
              sizes={sizes}
            />
          )}
          
          {/* Fallback to JPEG/PNG */}
          <img
            ref={imgRef}
            src={thumbnailUrl || undefined}
            srcSet={generateSrcSet()}
            alt={alt}
            title={title}
            sizes={sizes}
            loading={priority === 'high' ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority}
            onLoad={handleLoad}
            onError={handleError}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            // SEO attributes
            itemProp="image"
          />
        </picture>
      )}

      {/* Lazy Loading Intersection Trigger */}
      {lazyLoading && !isInView && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
      )}
    </div>
  )
}