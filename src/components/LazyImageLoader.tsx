/**
 * Advanced Lazy Image Loader Component
 * Optimized for Core Web Vitals with Intersection Observer API
 * Features: Progressive loading, blur-to-sharp transition, WebP with fallbacks
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '../utils/cn'
import { useAccessibility } from '@/hooks/useAccessibility'
import { generateAltText } from '@/utils/accessibility'

interface LazyImageLoaderProps {
  src: string
  alt: string
  className?: string
  width?: number | string
  height?: number | string
  priority?: boolean // For above-the-fold images
  quality?: 'low' | 'medium' | 'high'
  aspectRatio?: string // e.g., '16/9', '4/3', '1/1'
  placeholder?: 'blur' | 'color' | 'none'
  placeholderColor?: string
  sizes?: string // Responsive sizes attribute
  onLoad?: () => void
  onError?: () => void
  lazy?: boolean // Disable lazy loading for critical images
  title?: string // For screen reader title
  description?: string // Additional description
}

interface ImageState {
  isLoaded: boolean
  isInView: boolean
  hasError: boolean
  currentSrc: string
}

/**
 * Generate responsive image URLs with different qualities
 */
const generateResponsiveUrls = (src: string, quality: 'low' | 'medium' | 'high') => {
  const baseUrl = src.split('?')[0]
  const isSupabaseStorage = baseUrl.includes('supabase')
  
  if (isSupabaseStorage) {
    // Supabase storage transformations
    const qualityMap = {
      low: 60,
      medium: 80,
      high: 95
    }
    
    return {
      webp: `${baseUrl}?format=webp&quality=${qualityMap[quality]}`,
      jpeg: `${baseUrl}?format=jpeg&quality=${qualityMap[quality]}`,
      original: src
    }
  }
  
  // For external images, return as-is
  return {
    webp: src,
    jpeg: src,
    original: src
  }
}

/**
 * Generate srcSet for responsive images
 */
const generateSrcSet = (src: string, quality: 'low' | 'medium' | 'high') => {
  const urls = generateResponsiveUrls(src, quality)
  const baseUrl = urls.original.split('?')[0]
  
  // Generate different sizes for responsive loading
  const sizes = [640, 828, 1200, 1920, 2048]
  
  const srcSet = sizes.map(size => {
    if (baseUrl.includes('supabase')) {
      return `${baseUrl}?width=${size}&quality=${quality === 'low' ? 60 : quality === 'medium' ? 80 : 95} ${size}w`
    }
    return `${baseUrl} ${size}w`
  }).join(', ')
  
  return srcSet
}

/**
 * Create blur placeholder data URL
 */
const createBlurDataURL = (color: string = '#f3f4f6') => {
  const svg = `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <filter id="blur">
        <feGaussianBlur in="SourceGraphic" stdDeviation="3"/>
      </filter>
      <rect width="100%" height="100%" fill="${color}" filter="url(#blur)"/>
    </svg>
  `
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

export const LazyImageLoader: React.FC<LazyImageLoaderProps> = ({
  src,
  alt,
  className,
  width,
  height,
  priority = false,
  quality = 'medium',
  aspectRatio,
  placeholder = 'blur',
  placeholderColor = '#f3f4f6',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  onLoad,
  onError,
  lazy = true,
  title,
  description
}) => {
  const { ariaAttributes, announceToScreenReader } = useAccessibility({
    ariaLabel: generateAltText('wallpaper', title || alt, description)
  })
  const [imageState, setImageState] = useState<ImageState>({
    isLoaded: false,
    isInView: priority || !lazy, // Load immediately if priority or not lazy
    hasError: false,
    currentSrc: ''
  })
  
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  
  // Intersection Observer for lazy loading
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries
    if (entry.isIntersecting && !imageState.isInView) {
      setImageState(prev => ({ ...prev, isInView: true }))
      // Disconnect observer after first intersection
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [imageState.isInView])
  
  // Setup Intersection Observer
  useEffect(() => {
    if (!lazy || priority || imageState.isInView) return
    
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(handleIntersection, {
        threshold: 0.1,
        rootMargin: '50px' // Start loading 50px before element enters viewport
      })
    }
    
    if (containerRef.current) {
      observerRef.current.observe(containerRef.current)
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [lazy, priority, handleIntersection, imageState.isInView])
  
  // Load image when in view
  useEffect(() => {
    if (!imageState.isInView || imageState.isLoaded || imageState.currentSrc === src) return
    
    const img = new Image()
    const urls = generateResponsiveUrls(src, quality)
    
    // Try WebP first, fallback to JPEG
    const tryLoadImage = (srcToTry: string, isWebP: boolean = false) => {
      img.onload = () => {
        setImageState(prev => ({
          ...prev,
          isLoaded: true,
          currentSrc: srcToTry,
          hasError: false
        }))
        onLoad?.()
      }
      
      img.onerror = () => {
        if (isWebP) {
          // Fallback to JPEG if WebP fails
          tryLoadImage(urls.jpeg, false)
        } else {
          setImageState(prev => ({
            ...prev,
            hasError: true,
            currentSrc: urls.original
          }))
          onError?.()
        }
      }
      
      img.src = srcToTry
    }
    
    // Check WebP support and load accordingly
    const supportsWebP = () => {
      const canvas = document.createElement('canvas')
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
    }
    
    if (supportsWebP()) {
      tryLoadImage(urls.webp, true)
    } else {
      tryLoadImage(urls.jpeg, false)
    }
    
  }, [imageState.isInView, imageState.isLoaded, imageState.currentSrc, src, quality, onLoad, onError])
  
  // Container style with aspect ratio
  const containerStyle: React.CSSProperties = {
    aspectRatio: aspectRatio || undefined,
    width: width || '100%',
    height: height || (aspectRatio ? 'auto' : undefined)
  }
  
  // Placeholder based on type
  const getPlaceholder = () => {
    switch (placeholder) {
      case 'blur':
        return createBlurDataURL(placeholderColor)
      case 'color':
        return `data:image/svg+xml;base64,${btoa(`<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${placeholderColor}"/></svg>`)}`
      case 'none':
      default:
        return undefined
    }
  }
  
  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden bg-gray-100',
        className
      )}
      style={containerStyle}
    >
      {/* Placeholder/Loading state */}
      {!imageState.isLoaded && !imageState.hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          {placeholder !== 'none' && (
            <img
              src={getPlaceholder()}
              alt=""
              className="w-full h-full object-cover"
              aria-hidden="true"
            />
          )}
          {/* Loading spinner for priority images */}
          {priority && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50"
              role="status"
              aria-label="Loading image"
            >
              <div 
                className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" 
                aria-hidden="true"
              />
            </div>
          )}
        </div>
      )}
      
      {/* Main Image */}
      {imageState.isInView && (
        <img
          ref={imgRef}
          src={imageState.currentSrc || src}
          srcSet={imageState.currentSrc ? generateSrcSet(imageState.currentSrc, quality) : undefined}
          sizes={sizes}
          alt={generateAltText('wallpaper', alt, description)}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-500',
            imageState.isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => {
            setImageState(prev => ({ ...prev, isLoaded: true }))
            announceToScreenReader(`Image ${title || alt} loaded successfully`)
            onLoad?.()
          }}
          onError={() => {
            setImageState(prev => ({ ...prev, hasError: true }))
            announceToScreenReader(`Failed to load image ${title || alt}`)
            onError?.()
          }}
          aria-label={ariaAttributes['aria-label']}
          style={{
            transform: imageState.isLoaded ? 'scale(1)' : 'scale(1.05)',
            transition: 'transform 0.5s ease-out, opacity 0.5s ease-out'
          }}
        />
      )}
      
      {/* Error state */}
      {imageState.hasError && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-100"
          role="alert"
          aria-label="Error loading image"
        >
          <div className="text-center text-gray-500">
            <svg
              className="w-12 h-12 mx-auto mb-2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm font-medium">Image unavailable</p>
            <p className="text-xs mt-1">The image could not be loaded</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default LazyImageLoader