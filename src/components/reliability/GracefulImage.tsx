// Graceful Image Component - Phase 3 Priority 4
// Image loading with fallbacks and error handling

import React, { useState, useRef, useEffect } from 'react'
import { ImageOff, RotateCcw } from 'lucide-react'
import reliabilityService from '../../services/reliabilityService'
import monitoringService from '../../services/monitoringService'

interface GracefulImageProps {
  src: string
  alt: string
  fallbackSrc?: string
  placeholder?: React.ReactNode
  className?: string
  loading?: 'lazy' | 'eager'
  onLoad?: () => void
  onError?: (error: Error) => void
  retryAttempts?: number
  quality?: 'low' | 'medium' | 'high'
}

const GracefulImage: React.FC<GracefulImageProps> = ({
  src,
  alt,
  fallbackSrc,
  placeholder,
  className = '',
  loading = 'lazy',
  onLoad,
  onError,
  retryAttempts = 2,
  quality = 'medium'
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error' | 'retrying'>('loading')
  const [currentSrc, setCurrentSrc] = useState(src)
  const [retryCount, setRetryCount] = useState(0)
  const [loadStartTime, setLoadStartTime] = useState<number>(0)
  const imgRef = useRef<HTMLImageElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (loading === 'lazy' && imgRef.current) {
      // Set up intersection observer for lazy loading
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setLoadStartTime(Date.now())
              observerRef.current?.disconnect()
            }
          })
        },
        {
          rootMargin: '100px' // Start loading 100px before visible
        }
      )

      observerRef.current.observe(imgRef.current)
    } else {
      setLoadStartTime(Date.now())
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [loading])

  useEffect(() => {
    setCurrentSrc(src)
    setImageState('loading')
    setRetryCount(0)
  }, [src])

  const handleImageLoad = () => {
    const loadTime = Date.now() - loadStartTime
    
    setImageState('loaded')
    
    // Track successful image load
    monitoringService.trackPerformance({
      name: 'image_load_time',
      value: loadTime,
      rating: loadTime > 3000 ? 'poor' : loadTime > 1000 ? 'needs-improvement' : 'good',
      timestamp: Date.now(),
      metadata: {
        src: currentSrc,
        alt,
        retry_count: retryCount,
        quality
      }
    })
    
    if (onLoad) {
      onLoad()
    }
  }

  const handleImageError = () => {
    const loadTime = Date.now() - loadStartTime
    const error = new Error(`Failed to load image: ${currentSrc}`)
    
    // Track image load error
    monitoringService.trackError({
      message: `Image load failed: ${currentSrc}`,
      url: window.location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      metadata: {
        src: currentSrc,
        alt,
        retry_count: retryCount,
        load_time: loadTime,
        quality
      }
    })

    if (retryCount < retryAttempts) {
      // Try with fallback source or retry
      setImageState('retrying')
      setRetryCount(prev => prev + 1)
      
      setTimeout(() => {
        if (fallbackSrc && retryCount === 0) {
          setCurrentSrc(fallbackSrc)
        } else {
          // Add cache busting parameter for retry
          const separator = currentSrc.includes('?') ? '&' : '?'
          setCurrentSrc(`${currentSrc}${separator}retry=${retryCount}&t=${Date.now()}`)
        }
        setImageState('loading')
      }, 1000 * retryCount) // Exponential backoff
    } else {
      setImageState('error')
      if (onError) {
        onError(error)
      }
    }
  }

  const handleRetry = () => {
    setRetryCount(0)
    setCurrentSrc(src)
    setImageState('loading')
    setLoadStartTime(Date.now())
    
    // Track manual retry
    monitoringService.trackBusinessEvent({
      event_type: 'image_manual_retry',
      url: window.location.href,
      metadata: {
        src,
        alt,
        previous_retry_count: retryCount
      }
    })
  }

  const renderPlaceholder = () => {
    if (placeholder) {
      return placeholder
    }
    
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <div className="text-gray-400 text-center p-4">
          <ImageOff className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Loading image...</p>
        </div>
      </div>
    )
  }

  const renderError = () => {
    return (
      <div className={`bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center ${className}`}>
        <div className="text-gray-500 text-center p-4">
          <ImageOff className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm font-medium mb-1">Image unavailable</p>
          <p className="text-xs text-gray-400 mb-3">{alt}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center space-x-1 text-xs bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    )
  }

  const renderRetrying = () => {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
        <div className="text-gray-500 text-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600 mx-auto mb-2"></div>
          <p className="text-sm">Retrying... ({retryCount}/{retryAttempts})</p>
        </div>
      </div>
    )
  }

  if (imageState === 'error') {
    return renderError()
  }

  if (imageState === 'retrying') {
    return renderRetrying()
  }

  if (imageState === 'loading' && loadStartTime === 0) {
    return renderPlaceholder()
  }

  return (
    <div className="relative">
      {imageState === 'loading' && (
        <div className="absolute inset-0 z-10">
          {renderPlaceholder()}
        </div>
      )}
      
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        className={`${className} transition-opacity duration-300 ${
          imageState === 'loaded' ? 'opacity-100' : 'opacity-0'
        }`}
        loading={loading}
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{
          display: imageState === 'loading' && loadStartTime === 0 ? 'none' : 'block'
        }}
      />
    </div>
  )
}

export default GracefulImage
