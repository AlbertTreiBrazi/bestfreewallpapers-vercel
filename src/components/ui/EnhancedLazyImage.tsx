import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react'
import { debounce } from '@/utils/debounce'
import { calculateAspectRatio, getSkeletonStyles, createSkeletonDimensions } from '@/utils/cls-optimization'

interface EnhancedLazyImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  priority?: 'critical' | 'high' | 'medium' | 'low'
  sizes?: string
  onLoad?: () => void
  onError?: () => void
  placeholder?: 'blur' | 'skeleton' | 'none'
  quality?: 'high' | 'medium' | 'low'
  preloadStrategy?: 'viewport' | 'hover' | 'critical'
}

// Network-aware quality selection
const getNetworkAwareQuality = (requestedQuality: string) => {
  const connection = (navigator as any)?.connection
  if (!connection) return requestedQuality
  
  // Adapt quality based on network conditions
  if (connection.saveData || connection.effectiveType === '2g') {
    return 'low'
  } else if (connection.effectiveType === '3g') {
    return 'medium'
  }
  return requestedQuality
}

// Format detection and optimization
const getOptimizedImageUrl = (src: string, width?: number, height?: number, quality = 'medium') => {
  const params = new URLSearchParams()
  
  // Format selection based on browser support
  const supportsAvif = 'paintWorklet' in CSS // Rough AVIF detection
  const supportsWebp = document.createElement('canvas').toDataURL('image/webp').indexOf('webp') > 0
  
  if (supportsAvif) {
    params.append('format', 'avif')
  } else if (supportsWebp) {
    params.append('format', 'webp')
  }
  
  // Quality mapping
  const qualityMap = { low: 60, medium: 80, high: 95 }
  params.append('quality', qualityMap[quality as keyof typeof qualityMap].toString())
  
  if (width) params.append('width', width.toString())
  if (height) params.append('height', height.toString())
  
  return `${src}?${params.toString()}`
}

// Blur placeholder generator
const generateBlurPlaceholder = (width: number, height: number) => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  canvas.width = width
  canvas.height = height
  
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#f3f4f6')
  gradient.addColorStop(1, '#e5e7eb')
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  
  return canvas.toDataURL()
}

export const EnhancedLazyImage = memo<EnhancedLazyImageProps>(({
  src,
  alt,
  className = '',
  width,
  height,
  priority = 'low',
  sizes,
  onLoad,
  onError,
  placeholder = 'blur',
  quality = 'medium',
  preloadStrategy = 'viewport'
}) => {
  const [isIntersecting, setIsIntersecting] = useState(priority === 'critical')
  const [isLoaded, setIsLoaded] = useState(false)
  const [currentSrc, setCurrentSrc] = useState('')
  const [isHovered, setIsHovered] = useState(false)
  
  const imgRef = useRef<HTMLImageElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const preloadedRef = useRef<Set<string>>(new Set())
  
  // Network-aware quality
  const adaptiveQuality = getNetworkAwareQuality(quality)
  
  // CLS Prevention: Generate skeleton dimensions with exact aspect ratio
  const skeletonDimensions = useMemo(() => 
    createSkeletonDimensions(width, height, width && height ? calculateAspectRatio(width, height) : undefined),
    [width, height]
  )

  // Generate placeholder
  const placeholderSrc = useMemo(() => {
    if (placeholder === 'none') return ''
    if (placeholder === 'skeleton') return ''
    
    const w = width || 400
    const h = height || 300
    return generateBlurPlaceholder(w, h)
  }, [placeholder, width, height])
  
  // Intersection Observer setup with adaptive thresholds
  useEffect(() => {
    if (priority === 'critical') return
    
    const thresholdMap = {
      high: { threshold: 0.01, rootMargin: '50px' },
      medium: { threshold: 0.1, rootMargin: '100px' },
      low: { threshold: 0.1, rootMargin: '200px' }
    }
    
    const config = thresholdMap[priority] || thresholdMap.low
    
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
          observerRef.current?.disconnect()
        }
      },
      config
    )
    
    if (imgRef.current) {
      observerRef.current.observe(imgRef.current)
    }
    
    return () => observerRef.current?.disconnect()
  }, [priority])
  
  // Preload on hover for better UX
  const handleMouseEnter = useCallback(
    debounce(() => {
      if (preloadStrategy === 'hover' && !preloadedRef.current.has(src)) {
        const img = new Image()
        img.src = getOptimizedImageUrl(src, width, height, adaptiveQuality)
        preloadedRef.current.add(src)
        setIsHovered(true)
      }
    }, 100),
    [src, width, height, adaptiveQuality, preloadStrategy]
  )
  
  // Load image when conditions are met
  useEffect(() => {
    if (!isIntersecting && preloadStrategy !== 'critical') return
    if (isLoaded) return
    
    const optimizedSrc = getOptimizedImageUrl(src, width, height, adaptiveQuality)
    
    const img = new Image()
    img.onload = () => {
      setCurrentSrc(optimizedSrc)
      setIsLoaded(true)
      onLoad?.()
    }
    img.onerror = (e) => {
      console.warn('Image load failed:', src, e)
      // Fallback to original
      img.src = src
      img.onload = () => {
        setCurrentSrc(src)
        setIsLoaded(true)
        onLoad?.()
      }
      img.onerror = () => onError?.()
    }
    
    img.src = optimizedSrc
  }, [isIntersecting, src, width, height, adaptiveQuality, isLoaded, onLoad, onError, preloadStrategy])
  
  // Generate responsive srcset
  const generateSrcSet = useCallback(() => {
    if (!width) return ''
    
    const breakpoints = [width * 0.5, width, width * 1.5, width * 2]
    return breakpoints
      .map(w => `${getOptimizedImageUrl(src, Math.round(w), height ? Math.round(height * w / width) : undefined, adaptiveQuality)} ${Math.round(w)}w`)
      .join(', ')
  }, [src, width, height, adaptiveQuality])
  
  // Image classes with smooth transitions
  const imageClasses = `
    transition-all duration-700 ease-out
    ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}
    ${isHovered && !isLoaded ? 'scale-105' : ''}
    ${className}
  `.trim()
  
  // Show placeholder until loaded with CLS prevention
  if (!isIntersecting && priority !== 'critical') {
    return (
      <div 
        ref={imgRef}
        className={`bg-gray-200 animate-pulse ${className}`}
        style={{ 
          width: skeletonDimensions.width, 
          height: skeletonDimensions.height, 
          aspectRatio: skeletonDimensions.aspectRatio 
        }}
        onMouseEnter={handleMouseEnter}
      >
        {placeholder === 'skeleton' && (
          <div 
            className="h-full w-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" 
            style={getSkeletonStyles('image')}
          />
        )}
      </div>
    )
  }
  
  return (
    <>
      {!isLoaded && placeholder === 'blur' && placeholderSrc && (
        <img
          src={placeholderSrc}
          alt=""
          className={`absolute inset-0 object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-0' : 'opacity-100'} blur-sm scale-110`}
          style={{ width, height }}
        />
      )}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        className={imageClasses}
        width={width}
        height={height}
        srcSet={generateSrcSet()}
        sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
        loading={priority === 'critical' ? 'eager' : 'lazy'}
        fetchPriority={priority === 'critical' || priority === 'high' ? 'high' : 'low'}
        decoding="async"
        onMouseEnter={handleMouseEnter}
        style={{
          aspectRatio: width && height ? calculateAspectRatio(width, height) : undefined,
          width: '100%',
          height: 'auto',
        }}
      />
    </>
  )
})

EnhancedLazyImage.displayName = 'EnhancedLazyImage'