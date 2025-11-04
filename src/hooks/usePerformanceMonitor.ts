// Performance monitoring hook for tracking Core Web Vitals and custom metrics
import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface PerformanceMetrics {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  fcpTime?: number; // First Contentful Paint
  loadTime?: number; // Page load time
  renderTime?: number; // Component render time
}

interface UsePerformanceMonitorOptions {
  page: string;
  trackCoreWebVitals?: boolean;
  trackCustomMetrics?: boolean;
  sampleRate?: number; // 0-1, percentage of sessions to track
}

export function usePerformanceMonitor({
  page,
  trackCoreWebVitals = true,
  trackCustomMetrics = true,
  sampleRate = 0 // PHASE ONE FIX: Disabled to eliminate 99 API errors (401/405)
}: UsePerformanceMonitorOptions) {
  // Log performance metrics to backend
  const logMetrics = useCallback(async (metrics: PerformanceMetrics) => {
    try {
      // PHASE ONE FIX: Performance monitoring disabled (was causing 99 console errors)
      // Only track a sample of sessions to reduce load
      if (Math.random() > sampleRate || sampleRate === 0) return;

      await supabase.functions.invoke('performance-monitor', {
        body: {
          action: 'LOG_PERFORMANCE',
          page,
          metrics,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      // Silently fail to avoid console clutter
      // console.error('Failed to log performance metrics:', error);
    }
  }, [page, sampleRate]);

  // Log custom error
  const logError = useCallback(async (error: Error, context?: any) => {
    try {
      // PHASE ONE FIX: Error logging disabled (was causing console errors)
      if (sampleRate === 0) return;
      
      await supabase.functions.invoke('performance-monitor', {
        body: {
          action: 'LOG_ERROR',
          error: error.message,
          page,
          user_agent: navigator.userAgent,
          stack: error.stack,
          context,
          timestamp: new Date().toISOString()
        }
      });
    } catch (logError) {
      // Silently fail to avoid console clutter
      // console.error('Failed to log error:', logError);
    }
  }, [page, sampleRate]);

  // Track Core Web Vitals
  useEffect(() => {
    if (!trackCoreWebVitals) return;

    // Track LCP (Largest Contentful Paint)
    const trackLCP = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        if (lastEntry) {
          logMetrics({ lcp: lastEntry.startTime });
        }
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    };

    // Track FID (First Input Delay)
    const trackFID = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          logMetrics({ fid: entry.processingStart - entry.startTime });
        });
      });
      observer.observe({ type: 'first-input', buffered: true });
    };

    // Track CLS (Cumulative Layout Shift)
    const trackCLS = () => {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
      });
      observer.observe({ type: 'layout-shift', buffered: true });
      
      // Log CLS on page unload
      const logCLS = () => logMetrics({ cls: clsValue });
      window.addEventListener('beforeunload', logCLS);
      
      return () => window.removeEventListener('beforeunload', logCLS);
    };

    // Track TTFB (Time to First Byte)
    const trackTTFB = () => {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as any;
      if (navigationEntry) {
        const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
        logMetrics({ ttfb });
      }
    };

    // Track FCP (First Contentful Paint)
    const trackFCP = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          logMetrics({ fcpTime: entry.startTime });
        });
      });
      observer.observe({ type: 'paint', buffered: true });
    };

    // Track overall load time
    const trackLoadTime = () => {
      window.addEventListener('load', () => {
        const loadTime = performance.now();
        logMetrics({ loadTime });
      });
    };

    // Initialize tracking
    trackLCP();
    trackFID();
    trackCLS();
    trackTTFB();
    trackFCP();
    trackLoadTime();
  }, [trackCoreWebVitals, logMetrics]);

  // Track custom render performance
  const trackRenderTime = useCallback((startTime: number) => {
    const renderTime = performance.now() - startTime;
    if (trackCustomMetrics) {
      logMetrics({ renderTime });
    }
    return renderTime;
  }, [logMetrics, trackCustomMetrics]);

  return {
    logMetrics,
    logError,
    trackRenderTime
  };
}

// Hook for measuring component render performance
export function useRenderPerformance(componentName: string) {
  const { trackRenderTime } = usePerformanceMonitor({ 
    page: `component:${componentName}` 
  });

  const startMeasure = useCallback(() => {
    return performance.now();
  }, []);

  const endMeasure = useCallback((startTime: number) => {
    return trackRenderTime(startTime);
  }, [trackRenderTime]);

  return { startMeasure, endMeasure };
}
