// Google Analytics 4 (GA4) Service
// Centralized analytics tracking for wallpaper website

// GA4 Configuration Types
interface GAConfig {
  send_page_view?: boolean;
  custom_map?: Record<string, string>;
}

interface GAEvent {
  action: string;
  category?: string;
  label?: string;
  value?: number;
  custom_parameters?: Record<string, any>;
}

// Custom Event Types for Enhanced Tracking
interface WallpaperDownloadEvent {
  wallpaper_id: string;
  wallpaper_title: string;
  category: string;
  resolution: string;
  download_type: 'free' | 'premium';
  user_type: 'guest' | 'registered' | 'premium';
}

interface PremiumRequestEvent {
  request_stage: 'started' | 'submitted' | 'completed';
  plan_type?: string;
  payment_method?: string;
  request_value?: number;
}

interface UserAuthEvent {
  auth_method: 'email' | 'google' | 'github';
  user_type: 'new' | 'returning';
}

interface SearchEvent {
  search_term: string;
  results_count: number;
  search_filters?: string[];
}

interface NavigationEvent {
  page_location: string;
  page_title: string;
  referrer?: string;
}

// GA4 Analytics Service Class
class Analytics {
  private measurementId: string | null = null;
  private isInitialized: boolean = false;
  private isDevelopment: boolean = false;

  constructor() {
    this.measurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID || null;
    this.isDevelopment = import.meta.env.DEV;
    
    if (this.measurementId && !this.isDevelopment) {
      this.initialize();
    } else if (this.isDevelopment) {
      console.log('GA4 Analytics: Running in development mode - tracking disabled');
    } else {
      console.warn('GA4 Analytics: Measurement ID not found in environment variables');
    }
  }

  /**
   * Initialize Google Analytics 4
   */
  private initialize(): void {
    if (!this.measurementId || this.isInitialized) return;

    try {
      // Load gtag script
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
      document.head.appendChild(script);

      // Initialize gtag
      window.dataLayer = window.dataLayer || [];
      window.gtag = function() {
        window.dataLayer.push(arguments);
      };

      window.gtag('js', new Date());
      window.gtag('config', this.measurementId, {
        send_page_view: true,
        custom_map: {
          custom_dimension_1: 'user_type',
          custom_dimension_2: 'wallpaper_category',
          custom_dimension_3: 'download_type'
        }
      });

      this.isInitialized = true;
      console.log('GA4 Analytics: Successfully initialized');
    } catch (error) {
      console.error('GA4 Analytics: Initialization failed', error);
    }
  }

  /**
   * Check if analytics is properly configured
   */
  isConfigured(): boolean {
    return !!(this.measurementId && this.isInitialized && !this.isDevelopment);
  }

  /**
   * Track page views
   */
  trackPageView(page_title: string, page_location: string, custom_parameters?: Record<string, any>): void {
    if (!this.isConfigured()) {
      this.logDevelopmentEvent('page_view', { page_title, page_location, ...custom_parameters });
      return;
    }

    try {
      window.gtag('event', 'page_view', {
        page_title,
        page_location,
        ...custom_parameters
      });
    } catch (error) {
      console.error('GA4 Analytics: Page view tracking failed', error);
    }
  }

  /**
   * Track custom events
   */
  trackEvent(event_name: string, parameters?: Record<string, any>): void {
    if (!this.isConfigured()) {
      this.logDevelopmentEvent(event_name, parameters);
      return;
    }

    try {
      window.gtag('event', event_name, parameters);
    } catch (error) {
      console.error('GA4 Analytics: Event tracking failed', error);
    }
  }

  /**
   * Track wallpaper downloads (free)
   */
  trackWallpaperDownloadFree(event: WallpaperDownloadEvent): void {
    this.trackEvent('wallpaper_download_free', {
      wallpaper_id: event.wallpaper_id,
      wallpaper_title: event.wallpaper_title,
      category: event.category,
      resolution: event.resolution,
      user_type: event.user_type,
      currency: 'USD',
      value: 0
    });
  }

  /**
   * Track wallpaper downloads (premium)
   */
  trackWallpaperDownloadPremium(event: WallpaperDownloadEvent): void {
    this.trackEvent('wallpaper_download_premium', {
      wallpaper_id: event.wallpaper_id,
      wallpaper_title: event.wallpaper_title,
      category: event.category,
      resolution: event.resolution,
      user_type: event.user_type,
      currency: 'USD',
      value: 1 // Assign value for premium downloads
    });
  }

  /**
   * Track premium request process
   */
  trackPremiumRequest(event: PremiumRequestEvent): void {
    const eventName = `premium_request_${event.request_stage}`;
    
    this.trackEvent(eventName, {
      request_stage: event.request_stage,
      plan_type: event.plan_type,
      payment_method: event.payment_method,
      currency: 'USD',
      value: event.request_value || 0
    });
  }

  /**
   * Track user authentication events
   */
  trackUserAuth(event: UserAuthEvent): void {
    this.trackEvent('user_login', {
      method: event.auth_method,
      user_type: event.user_type
    });
  }

  /**
   * Track user logout
   */
  trackUserLogout(): void {
    this.trackEvent('user_logout', {
      engagement_time_msec: Date.now() // Track session duration
    });
  }

  /**
   * Track search functionality
   */
  trackSearch(event: SearchEvent): void {
    this.trackEvent('search', {
      search_term: event.search_term,
      results_count: event.results_count,
      search_filters: event.search_filters?.join(',') || ''
    });
  }

  /**
   * Track category browsing
   */
  trackCategoryView(category: string, wallpaper_count: number): void {
    this.trackEvent('category_view', {
      category_name: category,
      wallpaper_count,
      engagement_time_msec: 1000 // Default engagement time
    });
  }

  /**
   * Track wallpaper detail views
   */
  trackWallpaperView(wallpaper_id: string, wallpaper_title: string, category: string): void {
    this.trackEvent('wallpaper_view', {
      wallpaper_id,
      wallpaper_title,
      category,
      engagement_time_msec: 2000 // Default engagement time for detail view
    });
  }

  /**
   * Track admin panel access
   */
  trackAdminAccess(admin_section: string): void {
    this.trackEvent('admin_access', {
      admin_section,
      user_type: 'admin'
    });
  }

  /**
   * Track error events
   */
  trackError(error_type: string, error_message: string, page_location?: string): void {
    this.trackEvent('error_encountered', {
      error_type,
      error_message: error_message.substring(0, 150), // Limit length
      page_location: page_location || window.location.pathname
    });
  }

  /**
   * Track Enhanced Ecommerce - Purchase Event (for premium plans)
   */
  trackPurchase(transaction_id: string, plan_type: string, value: number, currency: string = 'USD'): void {
    this.trackEvent('purchase', {
      transaction_id,
      value,
      currency,
      items: [{
        item_id: `premium_plan_${plan_type}`,
        item_name: `Premium Plan - ${plan_type}`,
        item_category: 'subscription',
        item_variant: plan_type,
        quantity: 1,
        price: value
      }]
    });
  }

  /**
   * Track form submissions
   */
  trackFormSubmission(form_name: string, form_success: boolean): void {
    this.trackEvent('form_submit', {
      form_name,
      form_success,
      engagement_time_msec: 5000 // Assume form engagement time
    });
  }

  /**
   * Track social sharing
   */
  trackShare(content_type: string, content_id: string, method: string): void {
    this.trackEvent('share', {
      content_type,
      content_id,
      method
    });
  }

  /**
   * Track file downloads (general)
   */
  trackFileDownload(file_name: string, file_type: string): void {
    this.trackEvent('file_download', {
      file_name,
      file_extension: file_type,
      link_url: window.location.href
    });
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, any>): void {
    if (!this.isConfigured()) {
      this.logDevelopmentEvent('set_user_properties', properties);
      return;
    }

    try {
      window.gtag('config', this.measurementId!, {
        custom_map: {
          ...properties
        }
      });
    } catch (error) {
      console.error('GA4 Analytics: User properties setting failed', error);
    }
  }

  /**
   * Development mode logging
   */
  private logDevelopmentEvent(event_name: string, parameters?: Record<string, any>): void {
    if (this.isDevelopment) {
      console.log(`GA4 Analytics [DEV]: ${event_name}`, parameters);
    }
  }
}

// Global Analytics Instance
const analytics = new Analytics();

// Export the analytics instance and types
export default analytics;
export type {
  WallpaperDownloadEvent,
  PremiumRequestEvent,
  UserAuthEvent,
  SearchEvent,
  NavigationEvent,
  GAEvent,
  GAConfig
};

// Convenience exports for common tracking functions
export const {
  trackPageView,
  trackEvent,
  trackWallpaperDownloadFree,
  trackWallpaperDownloadPremium,
  trackPremiumRequest,
  trackUserAuth,
  trackUserLogout,
  trackSearch,
  trackCategoryView,
  trackWallpaperView,
  trackAdminAccess,
  trackError,
  trackPurchase,
  trackFormSubmission,
  trackShare,
  trackFileDownload,
  setUserProperties,
  isConfigured
} = analytics;

// Global gtag interface for TypeScript
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}