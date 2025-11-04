import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface PerformanceMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  timestamp: number
}

interface ErrorLog {
  message: string
  stack?: string
  url: string
  lineNumber?: number
  columnNumber?: number
  timestamp: number
  userAgent: string
  userId?: string
}

// Core Web Vitals thresholds
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  FID: { good: 100, poor: 300 },  // First Input Delay
  CLS: { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  TTFB: { good: 800, poor: 1800 }  // Time to First Byte
}

function getRating(value: number, thresholds: { good: number; poor: number }): 'good' | 'needs-improvement' | 'poor' {
  if (value <= thresholds.good) return 'good'
  if (value <= thresholds.poor) return 'needs-improvement'
  return 'poor'
}

export function usePerformanceMonitoring() {
  const metricsRef = useRef<PerformanceMetric[]>([])
  const errorsRef = useRef<ErrorLog[]>([])
  const reportedRef = useRef<Set<string>>(new Set())

  // Log performance metric (store locally only)
  const logMetric = useCallback(async (metric: PerformanceMetric) => {
    metricsRef.current.push(metric)
    
    // Note: Performance monitor edge function only accepts GET requests
    // Critical metrics are stored locally and can be sent via batch operations
    if (metric.rating === 'poor') {
      console.log('🚨 Poor performance metric detected:', metric)
    }
  }, [])

  // Log error (store locally only)
  const logError = useCallback(async (error: ErrorLog) => {
    errorsRef.current.push(error)
    
    // Note: Performance monitor edge function only accepts GET requests
    // Errors are stored locally for batch processing
    console.warn('🚨 Error logged:', error.message)
  }, [])

  // Measure Core Web Vitals
  const measureWebVitals = useCallback(() => {
    // LCP - Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      const lastEntry = entries[entries.length - 1] as any
      
      if (lastEntry && !reportedRef.current.has('LCP')) {
        const value = lastEntry.startTime
        logMetric({
          name: 'LCP',
          value,
          rating: getRating(value, THRESHOLDS.LCP),
          timestamp: Date.now()
        })
        reportedRef.current.add('LCP')
      }
    })
    
    if ('PerformanceObserver' in window) {
      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      } catch (error) {
        console.warn('LCP observation not supported')
      }
    }

    // FID - First Input Delay
    const fidObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      entries.forEach((entry: any) => {
        if (!reportedRef.current.has('FID')) {
          const value = entry.processingStart - entry.startTime
          logMetric({
            name: 'FID',
            value,
            rating: getRating(value, THRESHOLDS.FID),
            timestamp: Date.now()
          })
          reportedRef.current.add('FID')
        }
      })
    })
    
    try {
      fidObserver.observe({ entryTypes: ['first-input'] })
    } catch (error) {
      console.warn('FID observation not supported')
    }

    // CLS - Cumulative Layout Shift
    let clsValue = 0
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
        }
      }
    })
    
    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] })
    } catch (error) {
      console.warn('CLS observation not supported')
    }

    // Report CLS on page visibility change
    const reportCLS = () => {
      if (!reportedRef.current.has('CLS')) {
        logMetric({
          name: 'CLS',
          value: clsValue,
          rating: getRating(clsValue, THRESHOLDS.CLS),
          timestamp: Date.now()
        })
        reportedRef.current.add('CLS')
      }
    }

    document.addEventListener('visibilitychange', reportCLS)
    window.addEventListener('beforeunload', reportCLS)

    // FCP - First Contentful Paint
    const fcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      entries.forEach((entry: any) => {
        if (entry.name === 'first-contentful-paint' && !reportedRef.current.has('FCP')) {
          logMetric({
            name: 'FCP',
            value: entry.startTime,
            rating: getRating(entry.startTime, THRESHOLDS.FCP),
            timestamp: Date.now()
          })
          reportedRef.current.add('FCP')
        }
      })
    })
    
    try {
      fcpObserver.observe({ entryTypes: ['paint'] })
    } catch (error) {
      console.warn('FCP observation not supported')
    }

    // TTFB - Time to First Byte
    const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    if (navigationEntries.length > 0 && !reportedRef.current.has('TTFB')) {
      const ttfb = navigationEntries[0].responseStart - navigationEntries[0].fetchStart
      logMetric({
        name: 'TTFB',
        value: ttfb,
        rating: getRating(ttfb, THRESHOLDS.TTFB),
        timestamp: Date.now()
      })
      reportedRef.current.add('TTFB')
    }

    return () => {
      lcpObserver.disconnect()
      fidObserver.disconnect()
      clsObserver.disconnect()
      fcpObserver.disconnect()
      document.removeEventListener('visibilitychange', reportCLS)
      window.removeEventListener('beforeunload', reportCLS)
    }
  }, [logMetric])

  // Error tracking
  const setupErrorTracking = useCallback(() => {
    // Global error handler
    const handleError = (event: ErrorEvent) => {
      logError({
        message: event.message,
        stack: event.error?.stack,
        url: event.filename || window.location.href,
        lineNumber: event.lineno,
        columnNumber: event.colno,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      })
    }

    // Unhandled promise rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        url: window.location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [logError])

  // Custom performance measurement
  const measureCustomMetric = useCallback((name: string, startTime: number, endTime?: number) => {
    const actualEndTime = endTime || performance.now()
    const duration = actualEndTime - startTime
    
    // Define custom thresholds
    const customThresholds = {
      'api-call': { good: 1000, poor: 3000 },
      'image-load': { good: 1000, poor: 2500 },
      'route-change': { good: 500, poor: 1500 },
      'search': { good: 300, poor: 1000 }
    }
    
    const thresholds = customThresholds[name as keyof typeof customThresholds] || { good: 1000, poor: 2000 }
    
    logMetric({
      name,
      value: duration,
      rating: getRating(duration, thresholds),
      timestamp: Date.now()
    })
    
    return duration
  }, [logMetric])

  // Batch send metrics (disabled - function only accepts GET)
  const sendBatchMetrics = useCallback(async () => {
    if (metricsRef.current.length === 0 && errorsRef.current.length === 0) return
    
    // Note: Performance monitor edge function only accepts GET requests
    // Batch metrics are stored locally for now
    console.log('📊 Performance batch data available:', {
      metrics: metricsRef.current.length,
      errors: errorsRef.current.length
    })
    
    // Clear metrics to prevent memory buildup
    metricsRef.current = []
    errorsRef.current = []
  }, [])

  // Setup monitoring on mount
  useEffect(() => {
    const cleanupWebVitals = measureWebVitals()
    const cleanupErrorTracking = setupErrorTracking()
    
    // Send metrics batch periodically
    const interval = setInterval(sendBatchMetrics, 30000) // Every 30 seconds
    
    // Send metrics on page unload
    const handleBeforeUnload = () => {
      sendBatchMetrics()
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      cleanupWebVitals()
      cleanupErrorTracking()
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      
      // Send final batch
      sendBatchMetrics()
    }
  }, [measureWebVitals, setupErrorTracking, sendBatchMetrics])

  return {
    measureCustomMetric,
    logError,
    sendBatchMetrics
  }
}

export default usePerformanceMonitoring