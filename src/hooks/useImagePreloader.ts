import { useState, useEffect } from 'react'

interface ImagePreloaderOptions {
  priority?: 'high' | 'low'
  loadingStrategy?: 'eager' | 'lazy'
  onLoad?: () => void
  onError?: (error: Event) => void
}

export const useImagePreloader = (
  src: string, 
  options: ImagePreloaderOptions = {}
) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!src) return

    setIsLoading(true)
    setHasError(false)
    setIsLoaded(false)

    const img = new Image()
    
    img.onload = () => {
      setIsLoaded(true)
      setIsLoading(false)
      options.onLoad?.()
    }

    img.onerror = (error) => {
      setHasError(true)
      setIsLoading(false)
      if (error instanceof Event) {
        options.onError?.(error)
      }
    }

    // Set loading priority if supported
    if ('loading' in img && options.loadingStrategy) {
      img.loading = options.loadingStrategy
    }

    img.src = src

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [src, options.loadingStrategy])

  return { isLoaded, hasError, isLoading }
}

// Batch image preloader for multiple images
export const useBatchImagePreloader = (urls: string[]) => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (urls.length === 0) return

    setIsLoading(true)
    setLoadedImages(new Set())
    setFailedImages(new Set())

    const promises = urls.map(url => {
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          setLoadedImages(prev => new Set([...prev, url]))
          resolve(url)
        }
        img.onerror = () => {
          setFailedImages(prev => new Set([...prev, url]))
          resolve(url)
        }
        img.src = url
      })
    })

    Promise.all(promises).then(() => {
      setIsLoading(false)
    })
  }, [JSON.stringify(urls)])

  return {
    loadedImages,
    failedImages,
    isLoading,
    allLoaded: loadedImages.size + failedImages.size === urls.length,
    successRate: urls.length > 0 ? loadedImages.size / urls.length : 0
  }
}