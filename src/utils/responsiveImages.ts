// Responsive Image Utilities
// Handles srcset generation, WebP support, and image optimization

interface ResponsiveImageConfig {
  src: string
  alt: string
  sizes?: string
  className?: string
  priority?: boolean
  quality?: number
}

interface ImageBreakpoint {
  width: number
  suffix: string
  descriptor: string
}

// Standard breakpoints for responsive images
const IMAGE_BREAKPOINTS: ImageBreakpoint[] = [
  { width: 300, suffix: '_small', descriptor: '300w' },
  { width: 600, suffix: '_medium', descriptor: '600w' },
  { width: 900, suffix: '_large', descriptor: '900w' },
  { width: 1200, suffix: '_xl', descriptor: '1200w' },
  { width: 1600, suffix: '_2xl', descriptor: '1600w' }
]

// Device-specific sizes
const DEVICE_SIZES = {
  mobile: '(max-width: 768px) 100vw',
  tablet: '(max-width: 1024px) 50vw',
  desktop: '(max-width: 1280px) 33vw',
  large: '25vw'
}

/**
 * Generate responsive image sources with WebP support
 */
export function generateResponsiveImageSources(baseUrl: string): {
  webpSrcSet: string
  jpegSrcSet: string
  fallbackSrc: string
} {
  if (!baseUrl) {
    return {
      webpSrcSet: '',
      jpegSrcSet: '',
      fallbackSrc: ''
    }
  }

  // Extract file extension
  const extension = baseUrl.split('.').pop()?.toLowerCase() || 'jpg'
  const baseWithoutExt = baseUrl.replace(`.${extension}`, '')

  // Generate WebP srcSet
  const webpSrcSet = IMAGE_BREAKPOINTS
    .map(bp => `${baseWithoutExt}${bp.suffix}.webp ${bp.descriptor}`)
    .join(', ')

  // Generate JPEG srcSet
  const jpegSrcSet = IMAGE_BREAKPOINTS
    .map(bp => `${baseWithoutExt}${bp.suffix}.${extension} ${bp.descriptor}`)
    .join(', ')

  return {
    webpSrcSet,
    jpegSrcSet,
    fallbackSrc: baseUrl
  }
}

/**
 * Generate sizes attribute for responsive images
 */
export function generateSizesAttribute(context: 'grid' | 'hero' | 'detail' | 'thumbnail'): string {
  switch (context) {
    case 'hero':
      return '100vw'
    case 'detail':
      return `${DEVICE_SIZES.mobile}, ${DEVICE_SIZES.tablet}, ${DEVICE_SIZES.desktop}, ${DEVICE_SIZES.large}`
    case 'grid':
      return `${DEVICE_SIZES.mobile}, ${DEVICE_SIZES.tablet}, ${DEVICE_SIZES.desktop}, ${DEVICE_SIZES.large}`
    case 'thumbnail':
      return '(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 20vw'
    default:
      return `${DEVICE_SIZES.mobile}, ${DEVICE_SIZES.tablet}, ${DEVICE_SIZES.desktop}, ${DEVICE_SIZES.large}`
  }
}

/**
 * Check if WebP is supported by the browser
 */
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const webpTestImage = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA'
    
    const img = new Image()
    img.onload = () => resolve(img.width === 2 && img.height === 2)
    img.onerror = () => resolve(false)
    img.src = webpTestImage
  })
}

/**
 * Optimize image loading with intersection observer
 */
export class LazyImageLoader {
  private observer: IntersectionObserver | null = null
  private isWebPSupported: boolean | null = null

  constructor() {
    this.initWebPSupport()
    this.createObserver()
  }

  private async initWebPSupport() {
    this.isWebPSupported = await supportsWebP()
  }

  private createObserver() {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.loadImage(entry.target as HTMLImageElement)
            this.observer?.unobserve(entry.target)
          }
        })
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.1
      }
    )
  }

  private loadImage(img: HTMLImageElement) {
    const dataSrc = img.getAttribute('data-src')
    const dataSrcSet = img.getAttribute('data-srcset')
    
    if (dataSrc) {
      img.src = dataSrc
    }
    
    if (dataSrcSet) {
      img.srcset = dataSrcSet
    }
    
    img.classList.remove('lazy')
    img.classList.add('loaded')
  }

  observe(img: HTMLImageElement) {
    if (this.observer) {
      this.observer.observe(img)
    } else {
      // Fallback for browsers without intersection observer support
      this.loadImage(img)
    }
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect()
    }
  }
}

/**
 * Generate optimized image props for React components
 */
export function getOptimizedImageProps({
  src,
  alt,
  sizes = 'grid',
  className = '',
  priority = false,
  quality = 85
}: ResponsiveImageConfig) {
  const sources = generateResponsiveImageSources(src)
  const sizesAttr = generateSizesAttribute(sizes as any)

  return {
    src: sources.fallbackSrc,
    srcSet: sources.jpegSrcSet,
    sizes: sizesAttr,
    alt,
    className: `${className} ${priority ? '' : 'lazy'}`,
    loading: priority ? 'eager' as const : 'lazy' as const,
    decoding: 'async' as const,
    // Data attributes for lazy loading fallback
    ...(priority ? {} : {
      'data-src': sources.fallbackSrc,
      'data-srcset': sources.jpegSrcSet
    })
  }
}

/**
 * Calculate optimal image dimensions for different viewport sizes
 */
export function calculateImageDimensions(originalWidth: number, originalHeight: number, targetWidth: number) {
  const aspectRatio = originalWidth / originalHeight
  const targetHeight = Math.round(targetWidth / aspectRatio)
  
  return {
    width: targetWidth,
    height: targetHeight,
    aspectRatio
  }
}

/**
 * Generate image metadata for SEO and social sharing
 */
export function generateImageMetadata({
  src,
  alt,
  width,
  height,
  type = 'website'
}: {
  src: string
  alt: string
  width?: number
  height?: number
  type?: 'website' | 'article' | 'product'
}) {
  const metadata = {
    'og:image': src,
    'og:image:alt': alt,
    'twitter:image': src,
    'twitter:image:alt': alt,
    'twitter:card': 'summary_large_image'
  }

  if (width && height) {
    Object.assign(metadata, {
      'og:image:width': width.toString(),
      'og:image:height': height.toString()
    })
  }

  return metadata
}

/**
 * Performance monitoring for image loading
 */
export class ImagePerformanceMonitor {
  private metrics: Map<string, {
    startTime: number
    loadTime?: number
    failed?: boolean
    size?: { width: number; height: number }
  }> = new Map()

  startLoading(imageSrc: string) {
    this.metrics.set(imageSrc, {
      startTime: performance.now()
    })
  }

  finishLoading(imageSrc: string, img?: HTMLImageElement) {
    const metric = this.metrics.get(imageSrc)
    if (metric) {
      metric.loadTime = performance.now() - metric.startTime
      if (img) {
        metric.size = {
          width: img.naturalWidth,
          height: img.naturalHeight
        }
      }
    }
  }

  markFailed(imageSrc: string) {
    const metric = this.metrics.get(imageSrc)
    if (metric) {
      metric.failed = true
      metric.loadTime = performance.now() - metric.startTime
    }
  }

  getMetrics() {
    return Array.from(this.metrics.entries()).map(([src, metric]) => ({
      src,
      ...metric
    }))
  }

  getAverageLoadTime() {
    const successful = this.getMetrics().filter(m => !m.failed && m.loadTime)
    if (successful.length === 0) return 0
    
    const totalTime = successful.reduce((sum, m) => sum + (m.loadTime || 0), 0)
    return totalTime / successful.length
  }

  getFailureRate() {
    const total = this.metrics.size
    if (total === 0) return 0
    
    const failed = this.getMetrics().filter(m => m.failed).length
    return failed / total
  }

  clear() {
    this.metrics.clear()
  }
}

// Global instance for performance monitoring
export const imagePerformanceMonitor = new ImagePerformanceMonitor()

// Global lazy image loader instance
export const globalLazyImageLoader = new LazyImageLoader()
