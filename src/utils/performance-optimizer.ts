/**
 * Performance Optimizer Utility
 * Advanced optimization for Core Web Vitals and page performance
 * Handles image optimization, resource preloading, and performance monitoring
 */

// Types for performance monitoring
export interface CoreWebVitalsMetrics {
  LCP: number | null // Largest Contentful Paint
  FID: number | null // First Input Delay
  CLS: number | null // Cumulative Layout Shift
  FCP: number | null // First Contentful Paint
  TTFB: number | null // Time to First Byte
}

export interface PerformanceConfig {
  enableLazyLoading: boolean
  enableWebPConversion: boolean
  enableCriticalResourcePreload: boolean
  enablePerformanceMonitoring: boolean
  imageQuality: 'low' | 'medium' | 'high'
  lazyLoadingThreshold: number // pixels from viewport
}

// Default configuration
const DEFAULT_CONFIG: PerformanceConfig = {
  enableLazyLoading: true,
  enableWebPConversion: true,
  enableCriticalResourcePreload: true,
  enablePerformanceMonitoring: true,
  imageQuality: 'medium',
  lazyLoadingThreshold: 50
}

class PerformanceOptimizer {
  private config: PerformanceConfig
  private vitalsData: CoreWebVitalsMetrics
  private performanceObserver: PerformanceObserver | null = null
  private intersectionObserver: IntersectionObserver | null = null
  
  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.vitalsData = {
      LCP: null,
      FID: null,
      CLS: null,
      FCP: null,
      TTFB: null
    }
    
    this.initialize()
  }
  
  /**
   * Initialize performance optimization
   */
  private initialize(): void {
    if (typeof window === 'undefined') return
    
    try {
      // Initialize Core Web Vitals monitoring
      if (this.config.enablePerformanceMonitoring) {
        this.initializeWebVitalsMonitoring()
      }
      
      // Preload critical resources
      if (this.config.enableCriticalResourcePreload) {
        this.preloadCriticalResources()
      }
      
      // Setup performance optimizations
      this.setupImageOptimization()
      this.setupResourceHints()
      
      console.log('🚀 Performance Optimizer initialized')
    } catch (error) {
      console.error('❌ Error initializing Performance Optimizer:', error)
    }
  }
  
  /**
   * Initialize Core Web Vitals monitoring
   */
  private initializeWebVitalsMonitoring(): void {
    try {
      // LCP (Largest Contentful Paint)
      if ('PerformanceObserver' in window) {
        this.performanceObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              this.vitalsData.LCP = entry.startTime
              this.reportWebVital('LCP', entry.startTime)
            }
            
            if (entry.entryType === 'first-input') {
              const fidEntry = entry as any // PerformanceEventTiming not available in all environments
              this.vitalsData.FID = fidEntry.processingStart - fidEntry.startTime
              this.reportWebVital('FID', this.vitalsData.FID)
            }
            
            if (entry.entryType === 'layout-shift') {
              const clsEntry = entry as any // LayoutShift entry type
              if (!clsEntry.hadRecentInput) {
                this.vitalsData.CLS = (this.vitalsData.CLS || 0) + clsEntry.value
                this.reportWebVital('CLS', this.vitalsData.CLS)
              }
            }
            
            if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
              this.vitalsData.FCP = entry.startTime
              this.reportWebVital('FCP', entry.startTime)
            }
            
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming
              this.vitalsData.TTFB = navEntry.responseStart - navEntry.requestStart
              this.reportWebVital('TTFB', this.vitalsData.TTFB)
            }
          }
        })
        
        this.performanceObserver.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift', 'paint', 'navigation'] })
      }
    } catch (error) {
      console.error('❌ Error setting up Web Vitals monitoring:', error)
    }
  }
  
  /**
   * Report Web Vital metric
   */
  private reportWebVital(name: string, value: number): void {
    console.log(`📊 ${name}: ${value.toFixed(2)}ms`)
    
    // Send to analytics (e.g., Google Analytics)
    if (typeof (window as any).gtag !== 'undefined') {
      (window as any).gtag('event', name, {
        event_category: 'Web Vitals',
        value: Math.round(value),
        custom_map: { metric_rating: this.getVitalRating(name, value) }
      })
    }
    
    // Trigger performance alerts for poor scores
    this.checkPerformanceThresholds(name, value)
  }
  
  /**
   * Get performance rating for Web Vital
   */
  private getVitalRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      FCP: { good: 1800, poor: 3000 },
      TTFB: { good: 800, poor: 1800 }
    }
    
    const threshold = thresholds[name as keyof typeof thresholds]
    if (!threshold) return 'good'
    
    if (value <= threshold.good) return 'good'
    if (value <= threshold.poor) return 'needs-improvement'
    return 'poor'
  }
  
  /**
   * Check performance thresholds and alert if needed
   */
  private checkPerformanceThresholds(name: string, value: number): void {
    const rating = this.getVitalRating(name, value)
    
    if (rating === 'poor') {
      console.warn(`⚠️ Poor ${name} detected: ${value.toFixed(2)}ms`)
      
      // Could trigger performance optimization suggestions
      this.suggestOptimizations(name, value)
    }
  }
  
  /**
   * Suggest optimizations based on poor performance
   */
  private suggestOptimizations(metric: string, value: number): void {
    const suggestions = {
      LCP: [
        'Optimize images with WebP format and proper sizing',
        'Preload critical resources',
        'Remove unused CSS and JavaScript',
        'Use a CDN for faster content delivery'
      ],
      FID: [
        'Minimize main thread blocking time',
        'Split large JavaScript bundles',
        'Use web workers for heavy computations',
        'Optimize third-party scripts'
      ],
      CLS: [
        'Set explicit dimensions for images and videos',
        'Reserve space for dynamic content',
        'Avoid inserting content above existing content',
        'Use transform animations instead of layout changes'
      ],
      FCP: [
        'Reduce server response time',
        'Eliminate render-blocking resources',
        'Minify CSS and JavaScript',
        'Optimize web fonts loading'
      ],
      TTFB: [
        'Upgrade server infrastructure',
        'Use a CDN',
        'Enable compression',
        'Optimize database queries'
      ]
    }
    
    const metricSuggestions = suggestions[metric as keyof typeof suggestions]
    if (metricSuggestions) {
      console.group(`🔧 Optimization suggestions for ${metric}:`)
      metricSuggestions.forEach(suggestion => console.log(`• ${suggestion}`))
      console.groupEnd()
    }
  }
  
  /**
   * Preload critical resources
   */
  private preloadCriticalResources(): void {
    try {
      const head = document.head
      
      // Preload critical fonts
      const fontPreloads = [
        { href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap', as: 'style' },
      ]
      
      fontPreloads.forEach(font => {
        const link = document.createElement('link')
        link.rel = 'preload'
        link.href = font.href
        link.as = font.as
        link.crossOrigin = 'anonymous'
        head.appendChild(link)
      })
      
      // DNS prefetch for external domains
      const dnsPrefeches = [
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
        'https://supabase.co',
        import.meta.env.VITE_SUPABASE_URL || 'https://eocgtrggcalfptqhgxer.supabase.co'
      ]
      
      dnsPrefeches.forEach(domain => {
        const link = document.createElement('link')
        link.rel = 'dns-prefetch'
        link.href = domain
        head.appendChild(link)
      })
      
      console.log('✅ Critical resources preloaded')
    } catch (error) {
      console.error('❌ Error preloading critical resources:', error)
    }
  }
  
  /**
   * Setup image optimization
   */
  private setupImageOptimization(): void {
    if (!this.config.enableLazyLoading) return
    
    try {
      // Find all images that should be lazy loaded
      const images = document.querySelectorAll('img[data-lazy]')
      
      if (images.length > 0 && 'IntersectionObserver' in window) {
        this.intersectionObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                const img = entry.target as HTMLImageElement
                this.loadImage(img)
                this.intersectionObserver?.unobserve(img)
              }
            })
          },
          {
            threshold: 0.1,
            rootMargin: `${this.config.lazyLoadingThreshold}px`
          }
        )
        
        images.forEach(img => this.intersectionObserver?.observe(img))
      }
    } catch (error) {
      console.error('❌ Error setting up image optimization:', error)
    }
  }
  
  /**
   * Load image with WebP support check
   */
  private loadImage(img: HTMLImageElement): void {
    const src = img.dataset.src
    if (!src) return
    
    try {
      if (this.config.enableWebPConversion && this.supportsWebP()) {
        // Try to load WebP version first
        const webpSrc = this.convertToWebP(src)
        
        const tempImg = new Image()
        tempImg.onload = () => {
          img.src = webpSrc
          img.classList.add('loaded')
        }
        tempImg.onerror = () => {
          // Fallback to original
          img.src = src
          img.classList.add('loaded')
        }
        tempImg.src = webpSrc
      } else {
        img.src = src
        img.classList.add('loaded')
      }
    } catch (error) {
      console.error('❌ Error loading image:', error)
      img.src = src // Fallback
    }
  }
  
  /**
   * Check WebP support
   */
  private supportsWebP(): boolean {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
    } catch {
      return false
    }
  }
  
  /**
   * Convert image URL to WebP format
   */
  private convertToWebP(src: string): string {
    if (src.includes('supabase')) {
      // Supabase storage transformation
      const url = new URL(src)
      url.searchParams.set('format', 'webp')
      url.searchParams.set('quality', this.config.imageQuality === 'low' ? '60' : this.config.imageQuality === 'high' ? '90' : '75')
      return url.toString()
    }
    
    // For other sources, assume WebP version exists
    return src.replace(/\.(jpg|jpeg|png)$/i, '.webp')
  }
  
  /**
   * Setup resource hints
   */
  private setupResourceHints(): void {
    try {
      const head = document.head
      
      // Preconnect to important origins
      const preconnects = [
        'https://fonts.googleapis.com',
        import.meta.env.VITE_SUPABASE_URL || 'https://eocgtrggcalfptqhgxer.supabase.co'
      ]
      
      preconnects.forEach(origin => {
        const link = document.createElement('link')
        link.rel = 'preconnect'
        link.href = origin
        link.crossOrigin = 'anonymous'
        head.appendChild(link)
      })
      
      console.log('✅ Resource hints configured')
    } catch (error) {
      console.error('❌ Error setting up resource hints:', error)
    }
  }
  
  /**
   * Prefetch next page resources based on user behavior
   */
  public prefetchNextPage(url: string): void {
    try {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = url
      document.head.appendChild(link)
      
      console.log(`🔮 Prefetching: ${url}`)
    } catch (error) {
      console.error('❌ Error prefetching page:', error)
    }
  }
  
  /**
   * Get current Web Vitals data
   */
  public getWebVitals(): CoreWebVitalsMetrics {
    return { ...this.vitalsData }
  }
  
  /**
   * Calculate performance score
   */
  public getPerformanceScore(): number {
    const vitals = this.getWebVitals()
    let score = 100
    
    // Deduct points for poor metrics
    Object.entries(vitals).forEach(([metric, value]) => {
      if (value !== null) {
        const rating = this.getVitalRating(metric, value)
        if (rating === 'needs-improvement') score -= 10
        if (rating === 'poor') score -= 25
      }
    })
    
    return Math.max(0, score)
  }
  
  /**
   * Cleanup observers
   */
  public destroy(): void {
    try {
      this.performanceObserver?.disconnect()
      this.intersectionObserver?.disconnect()
      console.log('🧹 Performance Optimizer cleaned up')
    } catch (error) {
      console.error('❌ Error during cleanup:', error)
    }
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer()

// Export class for custom instances
export { PerformanceOptimizer }

// Utility functions
export const monitorCoreWebVitals = () => performanceOptimizer.getWebVitals()
export const getPerformanceScore = () => performanceOptimizer.getPerformanceScore()
export const prefetchPage = (url: string) => performanceOptimizer.prefetchNextPage(url)