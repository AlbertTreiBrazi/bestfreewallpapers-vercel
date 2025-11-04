// CDN and Edge Caching Optimization
import { debounce } from './debounce'

// Get Supabase URL from environment
const getSupabaseUrl = () => {
  // For Node.js environment (build scripts)
  if (typeof process !== 'undefined' && process.env) {
    return process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  }
  // For browser environment  
  if (typeof window !== 'undefined' && import.meta?.env) {
    return import.meta.env.VITE_SUPABASE_URL
  }
  throw new Error('Supabase URL not available')
}

// CDN Configuration
const CDN_CONFIG = {
  primaryCDN: getSupabaseUrl(),
  fallbackCDN: 'https://backup-cdn.example.com',
  edgeLocations: [
    'us-east-1', 'us-west-1', 'eu-west-1', 'ap-southeast-1'
  ],
  cacheHeaders: {
    images: {
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000', // 1 year
      'Vary': 'Accept, Accept-Encoding'
    },
    static: {
      'Cache-Control': 'public, max-age=31536000, immutable', // 1 year immutable
    },
    api: {
      'Cache-Control': 'public, max-age=300, s-maxage=600', // 5min client, 10min edge
      'Vary': 'Accept-Encoding'
    }
  }
}

// Intelligent CDN selector based on user location
class CDNOptimizer {
  private static instance: CDNOptimizer
  private optimalCDN: string = CDN_CONFIG.primaryCDN
  private performanceCache = new Map<string, number>()
  private fallbackMode = false
  
  static getInstance(): CDNOptimizer {
    if (!CDNOptimizer.instance) {
      CDNOptimizer.instance = new CDNOptimizer()
    }
    return CDNOptimizer.instance
  }
  
  constructor() {
    this.initializeOptimalCDN()
  }
  
  private async initializeOptimalCDN() {
    try {
      const fastestCDN = await this.findFastestCDN()
      this.optimalCDN = fastestCDN
    } catch (error) {
      console.warn('CDN optimization failed, using default:', error)
    }
  }
  
  private async findFastestCDN(): Promise<string> {
    const testUrls = [
      `${CDN_CONFIG.primaryCDN}/functions/v1/api-ping`,
      `${CDN_CONFIG.fallbackCDN}/ping`
    ]
    
    const results = await Promise.allSettled(
      testUrls.map(url => this.testCDNSpeed(url))
    )
    
    let fastestUrl = CDN_CONFIG.primaryCDN
    let fastestTime = Infinity
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value < fastestTime) {
        fastestTime = result.value
        fastestUrl = testUrls[index].replace('/functions/v1/api-ping', '').replace('/ping', '')
      }
    })
    
    return fastestUrl
  }
  
  private async testCDNSpeed(url: string): Promise<number> {
    const start = performance.now()
    
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(3000) // 3 second timeout
      })
      
      if (!response.ok) throw new Error('CDN test failed')
      
      return performance.now() - start
    } catch (error) {
      return Infinity
    }
  }
  
  // Get optimized URL with CDN and caching
  getOptimizedUrl(path: string, options: {
    type?: 'image' | 'static' | 'api'
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'avif' | 'auto'
    resize?: 'fit' | 'fill' | 'cover'
  } = {}): string {
    const {
      type = 'image',
      width,
      height,
      quality = 85,
      format = 'auto',
      resize = 'cover'
    } = options
    
    let url = `${this.optimalCDN}${path.startsWith('/') ? path : `/${path}`}`
    
    // Add optimization parameters for images
    if (type === 'image') {
      const params = new URLSearchParams()
      
      if (width) params.append('width', width.toString())
      if (height) params.append('height', height.toString())
      if (quality !== 85) params.append('quality', quality.toString())
      if (format !== 'auto') params.append('format', format)
      if (resize !== 'cover') params.append('resize', resize)
      
      const paramString = params.toString()
      if (paramString) {
        url += url.includes('?') ? `&${paramString}` : `?${paramString}`
      }
    }
    
    return url
  }
  
  // Preload critical resources with CDN optimization
  preloadCriticalResources(resources: Array<{
    url: string
    type: 'image' | 'style' | 'script' | 'font'
    priority: 'high' | 'medium' | 'low'
  }>) {
    const head = document.head
    
    resources
      .sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority))
      .forEach(({ url, type, priority }, index) => {
        // Delay lower priority preloads
        const delay = priority === 'high' ? 0 : priority === 'medium' ? 100 : 500
        
        setTimeout(() => {
          const link = document.createElement('link')
          link.rel = 'preload'
          link.href = this.getOptimizedUrl(url, { type: type === 'image' ? 'image' : 'static' })
          link.as = type
          
          if (type === 'image') {
            link.type = 'image/webp' // Assume WebP support
          }
          
          // Set crossorigin for fonts
          if (type === 'font') {
            link.crossOrigin = 'anonymous'
          }
          
          head.appendChild(link)
          
          // Remove after 30 seconds to prevent memory leaks
          setTimeout(() => {
            if (link.parentNode) {
              link.parentNode.removeChild(link)
            }
          }, 30000)
        }, delay + index * 10) // Stagger preloads
      })
  }
  
  private getPriorityWeight(priority: string): number {
    switch (priority) {
      case 'high': return 3
      case 'medium': return 2
      case 'low': return 1
      default: return 1
    }
  }
  
  // Dynamic image optimization based on device and network
  getAdaptiveImageUrl(src: string, options: {
    baseWidth: number
    baseHeight?: number
    devicePixelRatio?: number
    networkSpeed?: 'fast' | 'slow'
  }): string {
    const {
      baseWidth,
      baseHeight,
      devicePixelRatio = window.devicePixelRatio || 1,
      networkSpeed = this.getNetworkSpeed()
    } = options
    
    // Adjust dimensions for device pixel ratio
    let width = Math.round(baseWidth * Math.min(devicePixelRatio, 2))
    let height = baseHeight ? Math.round(baseHeight * Math.min(devicePixelRatio, 2)) : undefined
    
    // Optimize for slow networks
    let quality = 85
    let format: 'webp' | 'avif' | 'auto' = 'auto'
    
    if (networkSpeed === 'slow') {
      width = Math.round(width * 0.75) // Reduce size by 25%
      quality = 70
      format = 'webp' // Force WebP for better compression
    }
    
    return this.getOptimizedUrl(src, {
      type: 'image',
      width,
      height,
      quality,
      format
    })
  }
  
  private getNetworkSpeed(): 'fast' | 'slow' {
    const connection = (navigator as any)?.connection
    if (!connection) return 'fast'
    
    // Consider 2G/3G as slow
    if (
      connection.effectiveType === '2g' ||
      connection.effectiveType === 'slow-2g' ||
      connection.downlink < 1.5 ||
      connection.saveData
    ) {
      return 'slow'
    }
    
    return 'fast'
  }
  
  // Cache optimization with intelligent expiration
  setupCacheOptimization() {
    // Service Worker registration for advanced caching
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw-advanced.js', { scope: '/' })
        .then(registration => {
          console.log('CDN-optimized Service Worker registered:', registration)
        })
        .catch(error => {
          console.warn('Service Worker registration failed:', error)
        })
    }
    
    // Preconnect to CDN domains
    this.preconnectToCDNs()
    
    // Setup resource hints
    this.setupResourceHints()
  }
  
  private preconnectToCDNs() {
    const cdnDomains = [
      CDN_CONFIG.primaryCDN,
      CDN_CONFIG.fallbackCDN,
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ]
    
    cdnDomains.forEach(domain => {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = domain
      link.crossOrigin = 'anonymous'
      document.head.appendChild(link)
    })
  }
  
  private setupResourceHints() {
    // DNS prefetch for likely domains
    const prefetchDomains = [
      '//api.example.com',
      '//analytics.example.com'
    ]
    
    prefetchDomains.forEach(domain => {
      const link = document.createElement('link')
      link.rel = 'dns-prefetch'
      link.href = domain
      document.head.appendChild(link)
    })
  }
  
  // Monitor CDN performance and switch if needed
  monitorPerformance = debounce(() => {
    this.testCurrentCDNPerformance()
  }, 60000) // Check every minute
  
  private async testCurrentCDNPerformance() {
    const testUrl = `${this.optimalCDN}/functions/v1/api-ping`
    const responseTime = await this.testCDNSpeed(testUrl)
    
    // If current CDN is slow, find a better one
    if (responseTime > 2000) { // 2 second threshold
      console.warn('Current CDN performance degraded, searching for alternative...')
      this.initializeOptimalCDN()
    }
  }
  
  // Get cache headers for different resource types
  getCacheHeaders(type: 'image' | 'static' | 'api'): Record<string, string> {
    return CDN_CONFIG.cacheHeaders[type] || {}
  }
}

// Export singleton instance
export const cdnOptimizer = CDNOptimizer.getInstance()

// Initialize CDN optimization
export const initCDNOptimization = () => {
  cdnOptimizer.setupCacheOptimization()
  
  // Preload critical resources
  cdnOptimizer.preloadCriticalResources([
    {
      url: '/css/app.css',
      type: 'style',
      priority: 'high'
    },
    {
      url: '/fonts/inter-var.woff2',
      type: 'font',
      priority: 'high'
    }
  ])
  
  // Monitor performance
  window.addEventListener('load', () => {
    setTimeout(() => {
      cdnOptimizer.monitorPerformance()
    }, 5000)
  })
}

// Utility functions
export const optimizeImageUrl = (src: string, width: number, height?: number, quality = 85) => {
  return cdnOptimizer.getOptimizedUrl(src, {
    type: 'image',
    width,
    height,
    quality
  })
}

export const getAdaptiveImage = (src: string, baseWidth: number, baseHeight?: number) => {
  return cdnOptimizer.getAdaptiveImageUrl(src, {
    baseWidth,
    baseHeight
  })
}