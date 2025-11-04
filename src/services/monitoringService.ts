// Frontend Monitoring Service - Phase 3 Priority 3
// Real-time error tracking, performance monitoring, and business analytics

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url?: string;
  metadata?: Record<string, any>;
}

export interface ErrorEvent {
  message: string;
  stack?: string;
  url: string;
  lineNumber?: number;
  columnNumber?: number;
  timestamp: number;
  userAgent: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface BusinessEvent {
  event_type: string;
  user_id?: string;
  session_id?: string;
  value?: number;
  metadata?: Record<string, any>;
  url: string;
  referrer?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  error_rate: number;
  avg_response_time: number;
  alerts: {
    error_rate: boolean;
    response_time: boolean;
  };
  timestamp: string;
}

export interface DashboardData {
  current_metrics: {
    error_rate: number;
    signup_rate: number;
    premium_conversion_rate: number;
    download_success_rate: number;
  };
  performance_history: any[];
  active_alerts: any[];
  health_status: {
    overall: 'healthy' | 'warning';
    error_rate: 'healthy' | 'warning';
    conversion_rate: 'healthy' | 'warning';
    download_success: 'healthy' | 'warning';
  };
}

class MonitoringService {
  private edgeFunctionUrl: string;
  private sessionId: string;
  private isInitialized = false;
  private errorBuffer: ErrorEvent[] = [];
  private performanceBuffer: PerformanceMetric[] = [];
  private businessBuffer: BusinessEvent[] = [];
  private flushInterval: number = 5000; // 5 seconds
  private maxBufferSize = 50;
  private flushTimer?: number;

  constructor() {
    this.edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/performance-monitor`;
    this.sessionId = this.generateSessionId();
    this.initialize();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Set up global error handling
      this.setupGlobalErrorHandling();
      
      // Set up performance monitoring
      this.setupPerformanceMonitoring();
      
      // Set up periodic flushing
      this.startPeriodicFlush();
      
      // Track page view
      this.trackBusinessEvent({
        event_type: 'page_view',
        url: window.location.href,
        referrer: document.referrer,
        metadata: {
          user_agent: navigator.userAgent,
          screen_resolution: `${screen.width}x${screen.height}`,
          viewport: `${window.innerWidth}x${window.innerHeight}`
        }
      });

      this.isInitialized = true;
      console.log('🔍 Monitoring service initialized');
    } catch (error) {
      console.error('Failed to initialize monitoring service:', error);
    }
  }

  private setupGlobalErrorHandling(): void {
    // Capture JavaScript errors
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        stack: event.error?.stack,
        url: event.filename || window.location.href,
        lineNumber: event.lineno,
        columnNumber: event.colno,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        url: window.location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      });
    });

    // Capture resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        const target = event.target as HTMLElement;
        this.trackError({
          message: `Resource loading error: ${target.tagName}`,
          url: (target as any).src || (target as any).href || window.location.href,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          metadata: {
            resource_type: target.tagName,
            resource_url: (target as any).src || (target as any).href
          }
        });
      }
    }, true);
  }

  private setupPerformanceMonitoring(): void {
    // Web Vitals monitoring
    if (typeof PerformanceObserver !== 'undefined') {
      // Largest Contentful Paint (LCP)
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          if (lastEntry) {
            this.trackPerformance({
              name: 'lcp',
              value: lastEntry.startTime,
              rating: lastEntry.startTime > 4000 ? 'poor' : lastEntry.startTime > 2500 ? 'needs-improvement' : 'good',
              timestamp: Date.now()
            });
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('LCP monitoring not supported');
      }

      // First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            this.trackPerformance({
              name: 'fid',
              value: entry.processingStart - entry.startTime,
              rating: entry.processingStart - entry.startTime > 300 ? 'poor' : entry.processingStart - entry.startTime > 100 ? 'needs-improvement' : 'good',
              timestamp: Date.now()
            });
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.warn('FID monitoring not supported');
      }

      // Cumulative Layout Shift (CLS)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        // Report CLS on page unload
        window.addEventListener('beforeunload', () => {
          if (clsValue > 0) {
            this.trackPerformance({
              name: 'cls',
              value: clsValue,
              rating: clsValue > 0.25 ? 'poor' : clsValue > 0.1 ? 'needs-improvement' : 'good',
              timestamp: Date.now()
            });
          }
        });
      } catch (e) {
        console.warn('CLS monitoring not supported');
      }
    }

    // Navigation timing
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          this.trackPerformance({
            name: 'page_load_time',
            value: navigation.loadEventEnd - navigation.fetchStart,
            rating: navigation.loadEventEnd - navigation.fetchStart > 3000 ? 'poor' : navigation.loadEventEnd - navigation.fetchStart > 1000 ? 'needs-improvement' : 'good',
            timestamp: Date.now()
          });

          this.trackPerformance({
            name: 'dom_content_loaded',
            value: navigation.domContentLoadedEventEnd - navigation.fetchStart,
            rating: navigation.domContentLoadedEventEnd - navigation.fetchStart > 2000 ? 'poor' : navigation.domContentLoadedEventEnd - navigation.fetchStart > 800 ? 'needs-improvement' : 'good',
            timestamp: Date.now()
          });
        }
      }, 0);
    });
  }

  private startPeriodicFlush(): void {
    this.flushTimer = window.setInterval(() => {
      this.flushBuffers();
    }, this.flushInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flushBuffers(true);
    });
  }

  public trackError(error: Omit<ErrorEvent, 'userId'>): void {
    const errorWithUser: ErrorEvent = {
      ...error,
      userId: this.getCurrentUserId()
    };

    this.errorBuffer.push(errorWithUser);
    
    // Flush immediately for critical errors
    if (this.errorBuffer.length >= this.maxBufferSize) {
      this.flushBuffers();
    }
  }

  public trackPerformance(metric: PerformanceMetric): void {
    const metricWithUrl: PerformanceMetric = {
      ...metric,
      url: metric.url || window.location.href
    };

    this.performanceBuffer.push(metricWithUrl);

    if (this.performanceBuffer.length >= this.maxBufferSize) {
      this.flushBuffers();
    }
  }

  public trackBusinessEvent(event: Omit<BusinessEvent, 'session_id'>): void {
    const eventWithSession: BusinessEvent = {
      ...event,
      session_id: this.sessionId,
      url: event.url || window.location.href,
      referrer: event.referrer || document.referrer
    };

    this.businessBuffer.push(eventWithSession);

    if (this.businessBuffer.length >= this.maxBufferSize) {
      this.flushBuffers();
    }
  }

  public async trackApiCall(url: string, method: string, startTime: number, endTime: number, status: number): Promise<void> {
    const duration = endTime - startTime;
    
    this.trackPerformance({
      name: 'api_call',
      value: duration,
      rating: duration > 3000 ? 'poor' : duration > 1000 ? 'needs-improvement' : 'good',
      timestamp: Date.now(),
      metadata: {
        url,
        method,
        status,
        duration
      }
    });

    // Track as business event for conversion analysis
    this.trackBusinessEvent({
      event_type: status >= 400 ? 'api_error' : 'api_success',
      url: window.location.href,
      metadata: {
        api_url: url,
        method,
        status,
        duration
      }
    });
  }

  private async flushBuffers(synchronous = false): Promise<void> {
    // EMERGENCY FIX: Performance monitoring disabled to eliminate 401/405 errors
    // Root cause: performance-monitor edge function only accepts GET requests
    // but this service sends POST requests, causing method mismatch errors
    // TODO: Re-enable when performance-logger endpoint is properly implemented
    return;

    // Original monitoring logic disabled - no need to process buffers
    if (this.errorBuffer.length === 0 && this.performanceBuffer.length === 0 && this.businessBuffer.length === 0) {
      return;
    }

    // Original POST request logic has been disabled above
    // Uncomment the following code when performance-logger endpoint is ready:
    /*
    const payload: any = {
      type: 'batch_metrics',
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    };

    if (this.performanceBuffer.length > 0) {
      payload.metrics = [...this.performanceBuffer];
      this.performanceBuffer = [];
    }

    if (this.errorBuffer.length > 0) {
      payload.errors = [...this.errorBuffer];
      this.errorBuffer = [];
    }

    if (this.businessBuffer.length > 0) {
      payload.businessEvents = [...this.businessBuffer];
      this.businessBuffer = [];
    }

    try {
      const options: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
        },
        body: JSON.stringify(payload)
      };

      // Add auth header if user is logged in
      const token = this.getAuthToken();
      if (token) {
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        };
      }

      if (synchronous && navigator.sendBeacon) {
        // Use sendBeacon for synchronous requests (page unload)
        navigator.sendBeacon(this.edgeFunctionUrl, options.body);
      } else {
        await fetch(this.edgeFunctionUrl, options);
      }
    } catch (error) {
      console.error('Failed to flush monitoring data:', error);
      // Re-add to buffers if flush failed (except on page unload)
      if (!synchronous) {
        if (payload.metrics) this.performanceBuffer.unshift(...payload.metrics);
        if (payload.errors) this.errorBuffer.unshift(...payload.errors);
        if (payload.businessEvents) this.businessBuffer.unshift(...payload.businessEvents);
      }
    }
    */
  }

  public async getHealthStatus(): Promise<HealthStatus> {
    // EMERGENCY FIX: Health check disabled to prevent API calls
    // TODO: Re-enable when performance-logger endpoint is properly implemented
    console.log('🔍 Health check disabled (emergency fix for 401/405 errors)')
    return {
      status: 'critical',
      error_rate: 0,
      avg_response_time: 0,
      alerts: { error_rate: false, response_time: false },
      timestamp: new Date().toISOString()
    };
  }

  public async getDashboardData(): Promise<DashboardData> {
    // EMERGENCY FIX: Dashboard data disabled to prevent API calls
    // TODO: Re-enable when performance-logger endpoint is properly implemented
    console.log('🔍 Dashboard data disabled (emergency fix for 401/405 errors)')
    return {
      current_metrics: {
        error_rate: 0,
        signup_rate: 0,
        premium_conversion_rate: 0,
        download_success_rate: 0
      },
      performance_history: [],
      active_alerts: [],
      health_status: {
        overall: 'warning',
        error_rate: 'warning',
        conversion_rate: 'warning',
        download_success: 'warning'
      }
    };
  }

  private getCurrentUserId(): string | undefined {
    // This would integrate with your auth system
    try {
      const user = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
      return user?.user?.id;
    } catch {
      return undefined;
    }
  }

  private getAuthToken(): string | undefined {
    try {
      const auth = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
      return auth?.access_token;
    } catch {
      return undefined;
    }
  }

  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushBuffers(true);
  }

  // Public methods for manual tracking
  public trackUserSignup(userId: string): void {
    this.trackBusinessEvent({
      event_type: 'user_signup',
      user_id: userId,
      url: window.location.href
    });
  }

  public trackPremiumSignup(userId: string, plan: string): void {
    this.trackBusinessEvent({
      event_type: 'premium_signup',
      user_id: userId,
      url: window.location.href,
      metadata: { plan }
    });
  }

  public trackDownloadStarted(wallpaperId: string, userId?: string): void {
    this.trackBusinessEvent({
      event_type: 'download_started',
      user_id: userId,
      url: window.location.href,
      metadata: { wallpaper_id: wallpaperId }
    });
  }

  public trackDownloadCompleted(wallpaperId: string, userId?: string): void {
    this.trackBusinessEvent({
      event_type: 'download_completed',
      user_id: userId,
      url: window.location.href,
      metadata: { wallpaper_id: wallpaperId }
    });
  }

  public trackSearch(query: string, resultsCount: number, userId?: string): void {
    this.trackBusinessEvent({
      event_type: 'search_performed',
      user_id: userId,
      value: resultsCount,
      url: window.location.href,
      metadata: { query }
    });
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

export default monitoringService;
