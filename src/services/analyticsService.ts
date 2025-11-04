// Google Analytics 4 (GA4) Service
// Comprehensive tracking for wallpaper downloads, premium conversions, and user behavior

interface WallpaperDownloadEvent {
  wallpaper_id: number
  wallpaper_title: string
  category: string
  resolution: string
  is_premium: boolean
  download_source: 'homepage' | 'search' | 'category' | 'collection' | 'detail' | 'lightbox'
  user_type: 'anonymous' | 'free' | 'premium' | 'admin'
}

interface PremiumConversionEvent {
  event_type: 'premium_page_view' | 'premium_request_started' | 'premium_request_submitted' | 'premium_payment_method_selected' | 'premium_activated'
  plan_type?: string
  duration_months?: number
  amount?: number
  payment_method?: string
  funnel_step?: number
}

interface UserEvent {
  event_type: 'user_registration' | 'user_login' | 'user_logout'
  method?: 'email' | 'google' | 'facebook'
  user_type: 'anonymous' | 'free' | 'premium' | 'admin'
}

interface SearchEvent {
  search_term: string
  results_count: number
  filters_applied: string[]
  search_source: 'header' | 'advanced' | 'category'
}

interface CategoryEvent {
  category_name: string
  category_id: string
  view_type: 'grid' | 'list'
  wallpapers_count: number
}

interface WallpaperViewEvent {
  wallpaper_id: number
  wallpaper_title: string
  category: string
  is_premium: boolean
  view_source: 'search' | 'category' | 'collection' | 'related' | 'homepage'
  time_spent?: number
}

interface CustomDimensions {
  user_type: 'anonymous' | 'free' | 'premium' | 'admin'
  device_type: 'mobile' | 'tablet' | 'desktop'
  wallpaper_category?: string
  download_source?: string
}

class AnalyticsService {
  private isInitialized = false
  private measurementId: string | null = null
  private debugMode = false

  constructor() {
    this.debugMode = import.meta.env.DEV
  }

  // Initialize Google Analytics 4
  initialize(measurementId: string): void {
    if (this.isInitialized) {
      console.warn('[Analytics] GA4 already initialized')
      return
    }

    if (!measurementId) {
      console.error('[Analytics] No measurement ID provided')
      return
    }

    this.measurementId = measurementId

    try {
      // Load gtag script
      const script = document.createElement('script')
      script.async = true
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
      document.head.appendChild(script)

      // Initialize gtag
      window.dataLayer = window.dataLayer || []
      window.gtag = function() {
        window.dataLayer.push(arguments)
      }

      window.gtag('js', new Date())
      window.gtag('config', measurementId, {
        // Enhanced ecommerce settings
        send_page_view: true,
        anonymize_ip: true,
        allow_google_signals: true,
        allow_ad_personalization_signals: false,
        // Custom dimensions configuration
        custom_map: {
          'custom_dimension_1': 'user_type',
          'custom_dimension_2': 'device_type',
          'custom_dimension_3': 'wallpaper_category',
          'custom_dimension_4': 'download_source'
        }
      })

      this.isInitialized = true
      this.log('GA4 initialized successfully with ID:', measurementId)

      // Set initial custom dimensions
      this.setUserProperties({
        device_type: this.getDeviceType(),
        user_type: 'anonymous'
      })

    } catch (error) {
      console.error('[Analytics] Failed to initialize GA4:', error)
    }
  }

  // Set user properties and custom dimensions
  setUserProperties(properties: Partial<CustomDimensions>): void {
    if (!this.isInitialized) return

    try {
      window.gtag('config', this.measurementId, {
        user_properties: properties
      })
      
      this.log('User properties set:', properties)
    } catch (error) {
      console.error('[Analytics] Failed to set user properties:', error)
    }
  }

  // Track page views with custom parameters
  trackPageView(pagePath: string, pageTitle: string, customParams: any = {}): void {
    if (!this.isInitialized) return

    try {
      window.gtag('config', this.measurementId, {
        page_path: pagePath,
        page_title: pageTitle,
        ...customParams
      })

      this.log('Page view tracked:', { pagePath, pageTitle, customParams })
    } catch (error) {
      console.error('[Analytics] Failed to track page view:', error)
    }
  }

  // Track wallpaper downloads
  trackWallpaperDownload(event: WallpaperDownloadEvent): void {
    if (!this.isInitialized) return

    const eventName = event.is_premium ? 'wallpaper_download_premium' : 'wallpaper_download_free'
    
    try {
      window.gtag('event', eventName, {
        wallpaper_id: event.wallpaper_id,
        wallpaper_title: event.wallpaper_title,
        category: event.category,
        resolution: event.resolution,
        download_source: event.download_source,
        user_type: event.user_type,
        value: event.is_premium ? 1 : 0.5, // Assign value for conversion tracking
        custom_dimension_3: event.category,
        custom_dimension_4: event.download_source
      })

      this.log('Wallpaper download tracked:', event)
    } catch (error) {
      console.error('[Analytics] Failed to track wallpaper download:', error)
    }
  }

  // Track download attempts that were blocked
  trackDownloadBlocked(wallpaperId: number, reason: 'premium_required' | 'login_required' | 'rate_limit'): void {
    if (!this.isInitialized) return

    try {
      window.gtag('event', 'download_attempt_blocked', {
        wallpaper_id: wallpaperId,
        block_reason: reason,
        value: 0
      })

      this.log('Download blocked:', { wallpaperId, reason })
    } catch (error) {
      console.error('[Analytics] Failed to track blocked download:', error)
    }
  }

  // Track successful download completion
  trackDownloadSuccess(wallpaperId: number, resolution: string, downloadTime: number): void {
    if (!this.isInitialized) return

    try {
      window.gtag('event', 'download_complete_success', {
        wallpaper_id: wallpaperId,
        resolution: resolution,
        download_time_ms: downloadTime,
        value: 1
      })

      this.log('Download success tracked:', { wallpaperId, resolution, downloadTime })
    } catch (error) {
      console.error('[Analytics] Failed to track download success:', error)
    }
  }

  // Track premium conversion funnel events
  trackPremiumConversion(event: PremiumConversionEvent): void {
    if (!this.isInitialized) return

    try {
      const eventData: any = {
        event_category: 'premium_conversion',
        funnel_step: event.funnel_step || 1
      }

      if (event.plan_type) eventData.plan_type = event.plan_type
      if (event.duration_months) eventData.duration_months = event.duration_months
      if (event.amount) eventData.value = event.amount
      if (event.payment_method) eventData.payment_method = event.payment_method

      // Enhanced ecommerce tracking for premium conversion funnel
      switch (event.event_type) {
        case 'premium_page_view':
          window.gtag('event', 'view_item_list', {
            item_list_name: 'Premium Plans',
            ...eventData
          })
          break

        case 'premium_request_started':
          window.gtag('event', 'add_to_cart', {
            currency: 'USD',
            value: event.amount || 0,
            items: [{
              item_id: `premium_${event.duration_months}m`,
              item_name: `Premium ${event.duration_months} Month${event.duration_months > 1 ? 's' : ''}`,
              category: 'Premium Plans',
              quantity: 1,
              price: event.amount || 0
            }],
            ...eventData
          })
          break

        case 'premium_request_submitted':
          window.gtag('event', 'begin_checkout', {
            currency: 'USD',
            value: event.amount || 0,
            items: [{
              item_id: `premium_${event.duration_months}m`,
              item_name: `Premium ${event.duration_months} Month${event.duration_months > 1 ? 's' : ''}`,
              category: 'Premium Plans',
              quantity: 1,
              price: event.amount || 0
            }],
            ...eventData
          })
          break

        case 'premium_activated':
          window.gtag('event', 'purchase', {
            transaction_id: `premium_${Date.now()}`,
            currency: 'USD',
            value: event.amount || 0,
            items: [{
              item_id: `premium_${event.duration_months}m`,
              item_name: `Premium ${event.duration_months} Month${event.duration_months > 1 ? 's' : ''}`,
              category: 'Premium Plans',
              quantity: 1,
              price: event.amount || 0
            }],
            ...eventData
          })
          break

        default:
          window.gtag('event', event.event_type, eventData)
      }

      this.log('Premium conversion tracked:', event)
    } catch (error) {
      console.error('[Analytics] Failed to track premium conversion:', error)
    }
  }

  // Track user authentication events
  trackUserEvent(event: UserEvent): void {
    if (!this.isInitialized) return

    try {
      window.gtag('event', event.event_type, {
        method: event.method || 'email',
        user_type: event.user_type
      })

      // Update user type dimension
      this.setUserProperties({
        user_type: event.user_type
      })

      this.log('User event tracked:', event)
    } catch (error) {
      console.error('[Analytics] Failed to track user event:', error)
    }
  }

  // Track search events
  trackSearch(event: SearchEvent): void {
    if (!this.isInitialized) return

    try {
      window.gtag('event', 'search', {
        search_term: event.search_term,
        results_count: event.results_count,
        filters_applied: event.filters_applied.join(','),
        search_source: event.search_source
      })

      this.log('Search tracked:', event)
    } catch (error) {
      console.error('[Analytics] Failed to track search:', error)
    }
  }

  // Track category browsing
  trackCategoryView(event: CategoryEvent): void {
    if (!this.isInitialized) return

    try {
      window.gtag('event', 'view_item_list', {
        item_list_name: event.category_name,
        item_list_id: event.category_id,
        view_type: event.view_type,
        wallpapers_count: event.wallpapers_count,
        custom_dimension_3: event.category_name
      })

      this.log('Category view tracked:', event)
    } catch (error) {
      console.error('[Analytics] Failed to track category view:', error)
    }
  }

  // Track wallpaper detail views
  trackWallpaperView(event: WallpaperViewEvent): void {
    if (!this.isInitialized) return

    try {
      window.gtag('event', 'view_item', {
        item_id: event.wallpaper_id.toString(),
        item_name: event.wallpaper_title,
        item_category: event.category,
        view_source: event.view_source,
        is_premium: event.is_premium,
        time_spent: event.time_spent || 0,
        custom_dimension_3: event.category
      })

      this.log('Wallpaper view tracked:', event)
    } catch (error) {
      console.error('[Analytics] Failed to track wallpaper view:', error)
    }
  }

  // Track custom events
  trackCustomEvent(eventName: string, parameters: any = {}): void {
    if (!this.isInitialized) return

    try {
      window.gtag('event', eventName, parameters)
      this.log('Custom event tracked:', { eventName, parameters })
    } catch (error) {
      console.error('[Analytics] Failed to track custom event:', error)
    }
  }

  // Track site engagement metrics
  trackEngagement(type: 'scroll_depth' | 'time_on_page' | 'exit_intent', value: number): void {
    if (!this.isInitialized) return

    try {
      window.gtag('event', type, {
        value: value,
        engagement_type: type
      })

      this.log('Engagement tracked:', { type, value })
    } catch (error) {
      console.error('[Analytics] Failed to track engagement:', error)
    }
  }

  // Utility methods
  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }

  private log(message: string, data?: any): void {
    if (this.debugMode) {
      console.log(`[Analytics] ${message}`, data || '')
    }
  }

  // Get current user type for tracking
  getCurrentUserType(): 'anonymous' | 'free' | 'premium' | 'admin' {
    // This will be set by the auth context
    return 'anonymous'
  }
}

// Global declarations for gtag
declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService()
export default analyticsService
