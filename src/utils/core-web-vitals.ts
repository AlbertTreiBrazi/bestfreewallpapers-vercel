/**
 * Core Web Vitals Optimization
 * Advanced performance monitoring and optimization for mobile-first experience
 */

// Core Web Vitals thresholds
export const CORE_WEB_VITALS_THRESHOLDS = {
  LCP: {
    good: 2500,
    needsImprovement: 4000
  },
  INP: {
    good: 200,
    needsImprovement: 500
  },
  CLS: {
    good: 0.1,
    needsImprovement: 0.25
  }
}

export interface WebVitalsData {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  navigationType: string
}

// Performance monitoring
export const initializeCoreWebVitals = () => {
  if (typeof window === 'undefined') return

  // Use fallback performance monitoring
  console.log('Initializing fallback performance monitoring')
  initializeFallbackPerformanceMonitoring()

  // Initialize performance observer for additional metrics
  initializePerformanceObserver()
}

// Fallback performance monitoring without web-vitals library
const initializeFallbackPerformanceMonitoring = () => {
  if (!window.performance) return
  
  // Monitor page load time
  window.addEventListener('load', () => {
    const navigation = performance.getEntriesByType('navigation')[0] as any
    if (navigation) {
      const lcp = navigation.loadEventEnd - (navigation.navigationStart || navigation.startTime)
      onPerfEntry({
        name: 'LCP',
        value: lcp,
        rating: lcp < 2500 ? 'good' : lcp < 4000 ? 'needs-improvement' : 'poor',
        delta: lcp,
        navigationType: 'navigate'
      })
    }
  })
  
  // Basic CLS monitoring
  let cumulativeLayoutShift = 0
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          cumulativeLayoutShift += (entry as any).value
        }
      }
      
      onPerfEntry({
        name: 'CLS',
        value: cumulativeLayoutShift,
        rating: cumulativeLayoutShift < 0.1 ? 'good' : cumulativeLayoutShift < 0.25 ? 'needs-improvement' : 'poor',
        delta: cumulativeLayoutShift,
        navigationType: 'navigate'
      })
    })
    
    observer.observe({ type: 'layout-shift', buffered: true })
  }
}

const onPerfEntry = (metric: any) => {
  const data: WebVitalsData = {
    name: metric.name,
    value: Math.round(metric.value * 1000) / 1000,
    rating: metric.rating,
    delta: Math.round(metric.delta * 1000) / 1000,
    navigationType: metric.navigationType
  }

  // Send to analytics
  sendToAnalytics(data)
  
  // Log performance issues
  if (data.rating !== 'good') {
    console.warn(`Core Web Vital ${data.name} needs improvement:`, data)
  }

  // Store in localStorage for debugging
  storePerformanceData(data)
}

const initializePerformanceObserver = () => {
  if (!('PerformanceObserver' in window)) return

  // Observe layout shifts
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        console.log('Layout shift detected:', entry)
      }
    }
  })
  clsObserver.observe({ type: 'layout-shift', buffered: true })

  // Observe long tasks
  const longTaskObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log('Long task detected:', entry.duration, 'ms')
    }
  })
  longTaskObserver.observe({ type: 'longtask', buffered: true })

  // Observe navigation timing
  const navigationObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log('Navigation timing:', entry)
    }
  })
  navigationObserver.observe({ type: 'navigation', buffered: true })
}

const sendToAnalytics = (data: WebVitalsData) => {
  // Google Analytics 4
  if (typeof (window as any).gtag !== 'undefined') {
    (window as any).gtag('event', data.name, {
      event_category: 'Web Vitals',
      event_label: data.rating,
      value: Math.round(data.value),
      custom_map: {
        metric_rating: data.rating,
        metric_value: data.value
      }
    })
  }

  // Custom analytics endpoint - DISABLED TO FIX 42 API ERRORS
  // Phase One Performance Fix: Removed failing endpoint call
  /*
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...data,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      })
    }).catch(console.error)
  }
  */
}

const storePerformanceData = (data: WebVitalsData) => {
  try {
    const stored = JSON.parse(localStorage.getItem('webVitalsData') || '[]')
    stored.push({
      ...data,
      timestamp: Date.now(),
      url: window.location.href
    })
    
    // Keep only last 50 entries
    if (stored.length > 50) {
      stored.splice(0, stored.length - 50)
    }
    
    localStorage.setItem('webVitalsData', JSON.stringify(stored))
  } catch (error) {
    console.error('Failed to store performance data:', error)
  }
}

// Image loading optimization
export const optimizeImageLoading = () => {
  // Implement progressive image loading
  const images = document.querySelectorAll('img[data-src]')
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement
        const src = img.dataset.src
        
        if (src) {
          // Create new image to preload
          const newImg = new Image()
          newImg.onload = () => {
            img.src = src
            img.classList.add('loaded')
          }
          newImg.src = src
          
          observer.unobserve(img)
        }
      }
    })
  }, {
    rootMargin: '50px 0px',
    threshold: 0.1
  })
  
  images.forEach(img => imageObserver.observe(img))
}

// Resource hints optimization
export const optimizeResourceHints = () => {
  // PHASE ONE FIX: Removed missing resource preloads (22 errors)
  // Previously attempted to preload:
  // - /fonts/inter-var.woff2 (11 x 404 errors)
  // - /images/logo.webp (11 x 404 errors)
  
  // Preload critical resources (only if they exist)
  const criticalResources: Array<{ href: string; as: string; type?: string }> = []
  
  criticalResources.forEach(resource => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = resource.href
    link.as = resource.as
    if (resource.type) link.type = resource.type
    if (resource.as === 'font') link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  })
  
  // Prefetch likely next pages
  const prefetchUrls = [
    '/mobile-wallpapers',
    '/ai-wallpapers',
    '/collections'
  ]
  
  prefetchUrls.forEach(url => {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = url
    document.head.appendChild(link)
  })
}

// Critical CSS inlining
export const inlineCriticalCSS = () => {
  const criticalCSS = `
    /* Critical CSS for above-the-fold content */
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      margin: 0;
      padding: 0;
      line-height: 1.6;
    }
    
    .hero-section {
      min-height: 50vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .loading-skeleton {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
    }
    
    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `
  
  const style = document.createElement('style')
  style.textContent = criticalCSS
  document.head.appendChild(style)
}

// Mobile-specific optimizations
export const optimizeForMobile = () => {
  // Disable hover effects on mobile
  if ('ontouchstart' in window) {
    document.body.classList.add('touch-device')
  }
  
  // Optimize viewport for mobile
  let viewport = document.querySelector('meta[name="viewport"]')
  if (!viewport) {
    viewport = document.createElement('meta')
    viewport.setAttribute('name', 'viewport')
    document.head.appendChild(viewport)
  }
  viewport.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover')
  
  // Add mobile-specific CSS
  const mobileCSS = `
    @media (max-width: 768px) {
      .touch-device *:hover {
        -webkit-tap-highlight-color: transparent;
      }
      
      .mobile-optimized {
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
      }
      
      .mobile-grid {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 0.5rem;
      }
    }
  `
  
  const style = document.createElement('style')
  style.textContent = mobileCSS
  document.head.appendChild(style)
}

// Service worker for caching
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })
      
      console.log('ServiceWorker registered:', registration)
      
      // Update on new version
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              console.log('New version available')
            }
          })
        }
      })
    } catch (error) {
      console.error('ServiceWorker registration failed:', error)
    }
  }
}

// Main initialization function
export const initializePerformanceOptimizations = () => {
  if (typeof window === 'undefined') return
  
  // Core Web Vitals monitoring
  initializeCoreWebVitals()
  
  // Image loading optimization
  document.addEventListener('DOMContentLoaded', () => {
    optimizeImageLoading()
    optimizeResourceHints()
    inlineCriticalCSS()
    optimizeForMobile()
  })
  
  // Service worker registration
  window.addEventListener('load', () => {
    registerServiceWorker()
  })
  
  // Performance monitoring
  if (process.env.NODE_ENV === 'production') {
    // Monitor bundle size
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resourceEntry = entry as any
        if (resourceEntry.initiatorType === 'script') {
          console.log('Script load time:', entry.name, entry.duration)
        }
      }
    })
    observer.observe({ type: 'resource', buffered: true })
  }
}