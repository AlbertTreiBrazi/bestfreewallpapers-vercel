// Performance Monitoring Utilities
// Client-side performance tracking and analytics

interface PerformanceMetric {
  metric_name: string
  value: number
  url?: string
  user_id?: string
  metadata?: any
}

interface BusinessEvent {
  event_type: string
  user_id?: string
  session_id?: string
  value?: number
  metadata?: any
}

interface PerformanceConfig {
  enableAutoTracking?: boolean
  sampleRate?: number
  endpoint?: string
}

class PerformanceMonitor {
  private config: PerformanceConfig
  private sessionId: string
  private metrics: PerformanceMetric[] = []
  private events: BusinessEvent[] = []
  private observer: PerformanceObserver | null = null
  private supabaseUrl: string
  private anonKey: string

  constructor(config: PerformanceConfig = {}) {
    // EMERGENCY FIX: Performance monitoring disabled to eliminate 401/405 errors
    // Root cause: performance-monitor edge function only accepts GET requests
    // but this service attempts to send POST requests, causing method mismatch
    // TODO: Re-enable when performance-logger endpoint is properly implemented
    this.config = {
      enableAutoTracking: false,  // DISABLED: Was true
      sampleRate: 0,              // DISABLED: Was 1.0
      endpoint: '/functions/v1/performance-monitoring',
      ...config
    }
    
    this.sessionId = this.generateSessionId()
    this.supabaseUrl = this.getSupabaseUrl()
    this.anonKey = this.getSupabaseAnonKey()
    
    if (this.config.enableAutoTracking && typeof window !== 'undefined') {
      this.initializeAutoTracking()
    }
    
    console.log('🔍 Performance monitoring disabled (emergency fix for 401/405 errors)')
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getSupabaseUrl(): string {
    if (typeof window !== 'undefined' && (window as any).ENV?.VITE_SUPABASE_URL) {
      return (window as any).ENV.VITE_SUPABASE_URL
    }
    return 'https://9uozkca3lph4.supabase.co'
  }

  private getSupabaseAnonKey(): string {
    if (typeof window !== 'undefined' && (window as any).ENV?.VITE_SUPABASE_ANON_KEY) {
      return (window as any).ENV.VITE_SUPABASE_ANON_KEY
    }
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IjF1b3prY2EzbHBoNCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzUzMDU1MTg4LCJleHAiOjIwNjg2MzExODh9.gYg6vVuI8Xz9j6WPgZ6g0X6RZ6kqX9VCMQJvY8x4iPY'
  }

  private initializeAutoTracking() {
    // Track Core Web Vitals
    this.trackCoreWebVitals()
    
    // Track navigation timing
    this.trackNavigationTiming()
    
    // Track resource timing
    this.trackResourceTiming()
    
    // Track user interactions
    this.trackUserInteractions()
    
    // Track page visibility
    this.trackPageVisibility()
    
    // Periodic flush of metrics
    setInterval(() => this.flush(), 30000) // Flush every 30 seconds
  }

  private trackCoreWebVitals() {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        this.recordMetric({
          metric_name: 'lcp',
          value: lastEntry.startTime,
          url: window.location.href
        })
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            metric_name: 'fid',
            value: (entry as any).processingStart - entry.startTime,
            url: window.location.href
          })
        }
      })
      fidObserver.observe({ entryTypes: ['first-input'] })

      // Cumulative Layout Shift (CLS)
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value
          }
        }
        this.recordMetric({
          metric_name: 'cls',
          value: clsValue,
          url: window.location.href
        })
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
    }
  }

  private trackNavigationTiming() {
    if (typeof window !== 'undefined' && window.performance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          
          if (navigation) {
            this.recordMetric({
              metric_name: 'page_load_time',
              value: navigation.loadEventEnd - navigation.fetchStart,
              url: window.location.href
            })
            
            this.recordMetric({
              metric_name: 'dom_content_loaded',
              value: navigation.domContentLoadedEventEnd - navigation.fetchStart,
              url: window.location.href
            })
            
            this.recordMetric({
              metric_name: 'first_paint',
              value: navigation.responseStart - navigation.fetchStart,
              url: window.location.href
            })
          }
        }, 0)
      })
    }
  }

  private trackResourceTiming() {
    if ('PerformanceObserver' in window) {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resource = entry as PerformanceResourceTiming
          
          // Track slow resources
          if (resource.duration > 1000) {
            this.recordMetric({
              metric_name: 'slow_resource',
              value: resource.duration,
              url: window.location.href,
              metadata: {
                resource_url: resource.name,
                resource_type: resource.initiatorType
              }
            })
          }
          
          // Track failed resources
          if (resource.transferSize === 0 && resource.decodedBodySize === 0) {
            this.recordMetric({
              metric_name: 'failed_resource',
              value: 1,
              url: window.location.href,
              metadata: {
                resource_url: resource.name,
                resource_type: resource.initiatorType
              }
            })
          }
        }
      })
      resourceObserver.observe({ entryTypes: ['resource'] })
    }
  }

  private trackUserInteractions() {
    // Track clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.closest('[data-track]')) {
        this.recordEvent({
          event_type: 'user_click',
          session_id: this.sessionId,
          metadata: {
            element: target.tagName,
            text: target.textContent?.slice(0, 50),
            url: window.location.href
          }
        })
      }
    })

    // Track scroll depth
    let maxScrollDepth = 0
    window.addEventListener('scroll', () => {
      const scrollDepth = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100)
      if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth
        
        // Track scroll milestones
        if (scrollDepth >= 25 && scrollDepth < 50) {
          this.recordEvent({
            event_type: 'scroll_25',
            session_id: this.sessionId,
            value: scrollDepth
          })
        } else if (scrollDepth >= 50 && scrollDepth < 75) {
          this.recordEvent({
            event_type: 'scroll_50',
            session_id: this.sessionId,
            value: scrollDepth
          })
        } else if (scrollDepth >= 75) {
          this.recordEvent({
            event_type: 'scroll_75',
            session_id: this.sessionId,
            value: scrollDepth
          })
        }
      }
    })
  }

  private trackPageVisibility() {
    let startTime = Date.now()
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page became hidden
        const timeOnPage = Date.now() - startTime
        this.recordEvent({
          event_type: 'page_hidden',
          session_id: this.sessionId,
          value: timeOnPage,
          metadata: {
            url: window.location.href
          }
        })
      } else {
        // Page became visible
        startTime = Date.now()
        this.recordEvent({
          event_type: 'page_visible',
          session_id: this.sessionId,
          metadata: {
            url: window.location.href
          }
        })
      }
    })
    
    // Track page unload
    window.addEventListener('beforeunload', () => {
      const timeOnPage = Date.now() - startTime
      this.recordEvent({
        event_type: 'page_unload',
        session_id: this.sessionId,
        value: timeOnPage,
        metadata: {
          url: window.location.href
        }
      })
      
      // Force flush before page unload
      this.flush(true)
    })
  }

  // Public methods
  recordMetric(metric: PerformanceMetric) {
    if (Math.random() > this.config.sampleRate!) return
    
    this.metrics.push({
      ...metric,
      url: metric.url || (typeof window !== 'undefined' ? window.location.href : undefined)
    })
  }

  recordEvent(event: BusinessEvent) {
    this.events.push({
      ...event,
      session_id: event.session_id || this.sessionId
    })
  }

  // Track specific business events
  trackPageView(page: string, userId?: string) {
    this.recordEvent({
      event_type: 'page_view',
      user_id: userId,
      session_id: this.sessionId,
      metadata: {
        page,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        referrer: typeof document !== 'undefined' ? document.referrer : undefined
      }
    })
  }

  trackUserSignup(userId: string) {
    this.recordEvent({
      event_type: 'user_signup',
      user_id: userId,
      session_id: this.sessionId
    })
  }

  trackPremiumSignup(userId: string, planType: string) {
    this.recordEvent({
      event_type: 'premium_signup',
      user_id: userId,
      session_id: this.sessionId,
      metadata: {
        plan_type: planType
      }
    })
  }

  trackDownloadStarted(wallpaperId: number, userId?: string) {
    this.recordEvent({
      event_type: 'download_started',
      user_id: userId,
      session_id: this.sessionId,
      metadata: {
        wallpaper_id: wallpaperId
      }
    })
  }

  trackDownloadCompleted(wallpaperId: number, userId?: string, downloadTime?: number) {
    this.recordEvent({
      event_type: 'download_completed',
      user_id: userId,
      session_id: this.sessionId,
      value: downloadTime,
      metadata: {
        wallpaper_id: wallpaperId
      }
    })
  }

  trackSearchQuery(query: string, results: number, userId?: string) {
    this.recordEvent({
      event_type: 'search_query',
      user_id: userId,
      session_id: this.sessionId,
      value: results,
      metadata: {
        query,
        results_count: results
      }
    })
  }

  trackError(error: Error, context?: string) {
    this.recordEvent({
      event_type: 'client_error',
      session_id: this.sessionId,
      metadata: {
        error_message: error.message,
        error_stack: error.stack,
        context,
        url: typeof window !== 'undefined' ? window.location.href : undefined
      }
    })
  }

  async flush(synchronous = false) {
    if (this.metrics.length === 0 && this.events.length === 0) return

    const metricsToSend = [...this.metrics]
    const eventsToSend = [...this.events]
    
    // Clear buffers
    this.metrics = []
    this.events = []

    const sendData = async () => {
      try {
        if (metricsToSend.length > 0) {
          await fetch(`${this.supabaseUrl}${this.config.endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.anonKey}`,
              'apikey': this.anonKey
            },
            body: JSON.stringify({
              action: 'log_performance_metrics',
              metrics: metricsToSend
            })
          })
        }

        if (eventsToSend.length > 0) {
          await fetch(`${this.supabaseUrl}${this.config.endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.anonKey}`,
              'apikey': this.anonKey
            },
            body: JSON.stringify({
              action: 'log_business_events',
              events: eventsToSend
            })
          })
        }
      } catch (error) {
        console.error('Failed to send performance data:', error)
        // Re-add failed metrics/events back to buffer for retry
        this.metrics.unshift(...metricsToSend)
        this.events.unshift(...eventsToSend)
      }
    }

    if (synchronous) {
      // Use sendBeacon for synchronous sending during page unload
      if (navigator.sendBeacon) {
        if (metricsToSend.length > 0) {
          navigator.sendBeacon(
            `${this.supabaseUrl}${this.config.endpoint}`,
            JSON.stringify({
              action: 'log_performance_metrics',
              metrics: metricsToSend
            })
          )
        }
        if (eventsToSend.length > 0) {
          navigator.sendBeacon(
            `${this.supabaseUrl}${this.config.endpoint}`,
            JSON.stringify({
              action: 'log_business_events',
              events: eventsToSend
            })
          )
        }
      }
    } else {
      await sendData()
    }
  }

  // Get current performance data
  getMetrics() {
    return [...this.metrics]
  }

  getEvents() {
    return [...this.events]
  }

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${this.supabaseUrl}${this.config.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.anonKey}`,
          'apikey': this.anonKey
        },
        body: JSON.stringify({
          action: 'health_check'
        })
      })
      
      return response.ok
    } catch (error) {
      console.error('Health check failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Export class for custom instances
export { PerformanceMonitor }

// Export types
export type { PerformanceMetric, BusinessEvent, PerformanceConfig }
