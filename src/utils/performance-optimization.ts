/**
 * Performance Optimization Utilities for Core Web Vitals Enhancement
 * Focus: LCP, FID, CLS improvements
 */

// Intersection Observer for Efficient Lazy Loading
class LazyLoadManager {
  private observer: IntersectionObserver
  private imageCache = new Map<string, HTMLImageElement>()
  private preloadCache = new Set<string>()

  constructor() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.loadImage(entry.target as HTMLImageElement)
          }
        })
      },
      {
        rootMargin: '50px 0px', // Start loading 50px before entering viewport
        threshold: 0.1
      }
    )
  }

  observe(img: HTMLImageElement) {
    this.observer.observe(img)
  }

  unobserve(img: HTMLImageElement) {
    this.observer.unobserve(img)
  }

  private async loadImage(img: HTMLImageElement) {
    const src = img.dataset.src
    if (!src) return

    // Check cache first
    if (this.imageCache.has(src)) {
      const cachedImg = this.imageCache.get(src)!
      img.src = cachedImg.src
      img.classList.remove('lazy-loading')
      img.classList.add('lazy-loaded')
      this.observer.unobserve(img)
      return
    }

    // Load and cache image
    const imageLoader = new Image()
    imageLoader.onload = () => {
      this.imageCache.set(src, imageLoader)
      img.src = src
      img.classList.remove('lazy-loading')
      img.classList.add('lazy-loaded')
      this.observer.unobserve(img)
    }
    imageLoader.onerror = () => {
      img.classList.remove('lazy-loading')
      img.classList.add('lazy-error')
      this.observer.unobserve(img)
    }
    imageLoader.src = src
  }

  // Preload critical images
  preloadCritical(urls: string[]) {
    urls.forEach((url) => {
      if (this.preloadCache.has(url)) return
      
      this.preloadCache.add(url)
      const img = new Image()
      img.src = url
      this.imageCache.set(url, img)
    })
  }

  // Clear cache to prevent memory leaks
  clearCache() {
    this.imageCache.clear()
    this.preloadCache.clear()
  }
}

// Global lazy load manager
export const lazyLoadManager = new LazyLoadManager()

// Resource Priority Loading
interface ResourceHint {
  href: string
  as?: 'image' | 'script' | 'style' | 'font'
  rel: 'preload' | 'prefetch' | 'preconnect'
  crossOrigin?: 'anonymous' | 'use-credentials'
}

class ResourceHintManager {
  private addedHints = new Set<string>()

  addHint(hint: ResourceHint) {
    const key = `${hint.rel}-${hint.href}`
    if (this.addedHints.has(key)) return

    const link = document.createElement('link')
    link.rel = hint.rel
    link.href = hint.href
    if (hint.as) link.setAttribute('as', hint.as)
    if (hint.crossOrigin) link.crossOrigin = hint.crossOrigin
    
    document.head.appendChild(link)
    this.addedHints.add(key)
  }

  preloadCriticalResources() {
    // Get Supabase URL from environment
    const supabaseUrl = (typeof window !== 'undefined' && import.meta?.env?.VITE_SUPABASE_URL) || 
                       (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL))
    
    if (supabaseUrl) {
      // Preload Supabase CDN
      this.addHint({
        href: supabaseUrl,
        rel: 'preconnect'
      })
    }

    // Preload Google Fonts
    this.addHint({
      href: 'https://fonts.googleapis.com',
      rel: 'preconnect'
    })

    this.addHint({
      href: 'https://fonts.gstatic.com',
      rel: 'preconnect',
      crossOrigin: 'anonymous'
    })
  }
}

export const resourceHintManager = new ResourceHintManager()

// Performance Metrics Tracking
class PerformanceTracker {
  private metrics = new Map<string, number>()

  // Track Core Web Vitals
  trackLCP() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        this.metrics.set('LCP', lastEntry.startTime)
      })
      observer.observe({ entryTypes: ['largest-contentful-paint'] })
    }
  }

  trackFID() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          this.metrics.set('FID', entry.processingStart - entry.startTime)
        })
      })
      observer.observe({ entryTypes: ['first-input'] })
    }
  }

  trackCLS() {
    if ('PerformanceObserver' in window) {
      let clsValue = 0
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
            this.metrics.set('CLS', clsValue)
          }
        })
      })
      observer.observe({ entryTypes: ['layout-shift'] })
    }
  }

  getMetric(name: string): number | undefined {
    return this.metrics.get(name)
  }

  getAllMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics)
  }
}

export const performanceTracker = new PerformanceTracker()

// Memory Management
class MemoryManager {
  private timers = new Set<number>()
  private observers = new Set<IntersectionObserver | ResizeObserver>()
  private eventListeners = new Map<EventTarget, Array<{ type: string; listener: EventListener; options?: AddEventListenerOptions }>>()

  // Track and clean up timers
  setTimeout(callback: () => void, delay: number): number {
    const id = window.setTimeout(() => {
      callback()
      this.timers.delete(id)
    }, delay)
    this.timers.add(id)
    return id
  }

  setInterval(callback: () => void, delay: number): number {
    const id = window.setInterval(callback, delay)
    this.timers.add(id)
    return id
  }

  clearTimer(id: number) {
    this.timers.delete(id)
    clearTimeout(id)
    clearInterval(id)
  }

  // Track observers
  addObserver(observer: IntersectionObserver | ResizeObserver) {
    this.observers.add(observer)
  }

  // Track event listeners
  addEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ) {
    target.addEventListener(type, listener, options)
    
    if (!this.eventListeners.has(target)) {
      this.eventListeners.set(target, [])
    }
    this.eventListeners.get(target)!.push({ type, listener, options })
  }

  // Cleanup all managed resources
  cleanup() {
    // Clear timers
    this.timers.forEach(id => {
      clearTimeout(id)
      clearInterval(id)
    })
    this.timers.clear()

    // Disconnect observers
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()

    // Remove event listeners
    this.eventListeners.forEach((listeners, target) => {
      listeners.forEach(({ type, listener, options }) => {
        target.removeEventListener(type, listener, options)
      })
    })
    this.eventListeners.clear()

    // Clear image cache
    lazyLoadManager.clearCache()
  }
}

export const memoryManager = new MemoryManager()

// Bundle Optimization Utilities
export const bundleOptimizer = {
  // Preload route chunks
  preloadRoute(routeName: string) {
    const routeMap: Record<string, () => Promise<any>> = {
      home: () => import('@/pages/HomePage'),
      wallpapers: () => import('@/pages/WallpapersPage'),
      detail: () => import('@/pages/WallpaperDetailPage'),
      admin: () => import('@/pages/AdminPage'),
      premium: () => import('@/pages/PremiumPage'),
      search: () => import('@/pages/SearchV2Page')
    }

    if (routeMap[routeName]) {
      // Use requestIdleCallback for non-critical preloading
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => routeMap[routeName]())
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => routeMap[routeName](), 100)
      }
    }
  },

  // Preload components based on user interaction
  preloadOnHover(componentName: string) {
    const componentMap: Record<string, () => Promise<any>> = {
      downloadModal: () => import('@/components/download/DownloadModal'),

      authModal: () => import('@/components/auth/AuthModal'),
      adminPanel: () => import('@/components/admin/EnhancedAdminPanel')
    }

    if (componentMap[componentName]) {
      componentMap[componentName]()
    }
  }
}

// Performance initialization
export function initializePerformanceOptimizations() {
  // Start tracking Core Web Vitals
  performanceTracker.trackLCP()
  performanceTracker.trackFID()
  performanceTracker.trackCLS()

  // Add critical resource hints
  resourceHintManager.preloadCriticalResources()

  // Preload critical route chunks on idle
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      bundleOptimizer.preloadRoute('wallpapers')
      bundleOptimizer.preloadRoute('detail')
    })
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    memoryManager.cleanup()
  })
}

// Utility function to optimize images for different screen sizes
export function getOptimizedImageUrl(baseUrl: string, options: {
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'jpg' | 'png'
  devicePixelRatio?: number
}): string {
  const {
    width,
    height,
    quality = 85,
    format = 'webp',
    devicePixelRatio = window.devicePixelRatio || 1
  } = options

  // Calculate responsive dimensions
  const targetWidth = width ? Math.ceil(width * Math.min(devicePixelRatio, 2)) : undefined
  const targetHeight = height ? Math.ceil(height * Math.min(devicePixelRatio, 2)) : undefined

  const params = new URLSearchParams()
  if (targetWidth) params.append('w', targetWidth.toString())
  if (targetHeight) params.append('h', targetHeight.toString())
  params.append('q', quality.toString())
  params.append('f', format)

  return `${baseUrl}?${params.toString()}`
}

// Debounce utility with cleanup
export function createDebouncedFunction<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T & { cancel: () => void } {
  let timeoutId: number

  const debouncedFunc = ((...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = memoryManager.setTimeout(() => func(...args), delay)
  }) as T & { cancel: () => void }

  debouncedFunc.cancel = () => {
    clearTimeout(timeoutId)
  }

  return debouncedFunc
}
