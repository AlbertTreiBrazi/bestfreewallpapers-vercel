/**
 * Advanced Performance Monitoring & Real User Monitoring (RUM)
 * Tracks Core Web Vitals, resource timing, and user experience metrics
 */

// ============================================================================
// CORE WEB VITALS MONITORING
// ============================================================================

interface PerformanceMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  timestamp: number
}

interface RUMData {
  sessionId: string
  pageUrl: string
  userAgent: string
  connectionType: string
  metrics: PerformanceMetric[]
  resources: ResourceTiming[]
  errors: ErrorLog[]
}

/**
 * Initialize Real User Monitoring
 */
export function initializeRUM(): void {
  if (typeof window === 'undefined') return

  const sessionId = generateSessionId()
  
  // Track Core Web Vitals
  trackLCP()
  trackFID()
  trackCLS()
  trackTTFB()
  trackFCP()
  
  // Track resource loading
  trackResourceTiming()
  
  // Track JavaScript errors
  trackErrors()
  
  // Track user interactions
  trackUserInteractions()
  
  // Report metrics periodically
  scheduleMetricsReport(sessionId)
  
  console.log('✓ RUM initialized - Session:', sessionId)
}

/**
 * Track Largest Contentful Paint (LCP)
 * Target: <2.5s (good), <4.0s (needs improvement), >4.0s (poor)
 */
function trackLCP(): void {
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const lastEntry = entries[entries.length - 1]
    
    const metric: PerformanceMetric = {
      name: 'LCP',
      value: lastEntry.startTime,
      rating: lastEntry.startTime < 2500 ? 'good' : 
              lastEntry.startTime < 4000 ? 'needs-improvement' : 'poor',
      timestamp: Date.now()
    }
    
    reportMetric(metric)
  })
  
  observer.observe({ type: 'largest-contentful-paint', buffered: true })
}

/**
 * Track First Input Delay (FID)
 * Target: <100ms (good), <300ms (needs improvement), >300ms (poor)
 */
function trackFID(): void {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const fidEntry = entry as PerformanceEventTiming
      const metric: PerformanceMetric = {
        name: 'FID',
        value: fidEntry.processingStart - fidEntry.startTime,
        rating: fidEntry.processingStart - fidEntry.startTime < 100 ? 'good' :
                fidEntry.processingStart - fidEntry.startTime < 300 ? 'needs-improvement' : 'poor',
        timestamp: Date.now()
      }
      
      reportMetric(metric)
    }
  })
  
  observer.observe({ type: 'first-input', buffered: true })
}

/**
 * Track Cumulative Layout Shift (CLS)
 * Target: <0.1 (good), <0.25 (needs improvement), >0.25 (poor)
 */
function trackCLS(): void {
  let clsScore = 0
  
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const layoutShift = entry as any
      if (!layoutShift.hadRecentInput) {
        clsScore += layoutShift.value
      }
    }
    
    const metric: PerformanceMetric = {
      name: 'CLS',
      value: clsScore,
      rating: clsScore < 0.1 ? 'good' :
              clsScore < 0.25 ? 'needs-improvement' : 'poor',
      timestamp: Date.now()
    }
    
    reportMetric(metric)
  })
  
  observer.observe({ type: 'layout-shift', buffered: true })
}

/**
 * Track Time to First Byte (TTFB)
 * Target: <800ms (good), <1800ms (needs improvement), >1800ms (poor)
 */
function trackTTFB(): void {
  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  
  if (navEntry) {
    const ttfb = navEntry.responseStart - navEntry.requestStart
    
    const metric: PerformanceMetric = {
      name: 'TTFB',
      value: ttfb,
      rating: ttfb < 800 ? 'good' :
              ttfb < 1800 ? 'needs-improvement' : 'poor',
      timestamp: Date.now()
    }
    
    reportMetric(metric)
  }
}

/**
 * Track First Contentful Paint (FCP)
 * Target: <1.8s (good), <3.0s (needs improvement), >3.0s (poor)
 */
function trackFCP(): void {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const metric: PerformanceMetric = {
        name: 'FCP',
        value: entry.startTime,
        rating: entry.startTime < 1800 ? 'good' :
                entry.startTime < 3000 ? 'needs-improvement' : 'poor',
        timestamp: Date.now()
      }
      
      reportMetric(metric)
    }
  })
  
  observer.observe({ type: 'paint', buffered: true })
}

// ============================================================================
// RESOURCE TIMING MONITORING
// ============================================================================

interface ResourceTiming {
  name: string
  type: string
  duration: number
  size: number
  cached: boolean
}

/**
 * Track resource loading performance
 */
function trackResourceTiming(): void {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const resource = entry as PerformanceResourceTiming
      
      const timing: ResourceTiming = {
        name: resource.name,
        type: resource.initiatorType,
        duration: resource.duration,
        size: resource.transferSize,
        cached: resource.transferSize === 0 && resource.decodedBodySize > 0
      }
      
      // Log slow resources
      if (resource.duration > 1000) {
        console.warn('Slow resource detected:', timing)
      }
      
      // Track large resources
      if (resource.transferSize > 500000) {
        console.warn('Large resource detected:', timing)
      }
    }
  })
  
  observer.observe({ type: 'resource', buffered: true })
}

// ============================================================================
// ERROR TRACKING
// ============================================================================

interface ErrorLog {
  message: string
  stack?: string
  timestamp: number
  url: string
}

/**
 * Track JavaScript errors and network failures
 */
function trackErrors(): void {
  window.addEventListener('error', (event) => {
    const error: ErrorLog = {
      message: event.message,
      stack: event.error?.stack,
      timestamp: Date.now(),
      url: event.filename || window.location.href
    }
    
    reportError(error)
  })
  
  window.addEventListener('unhandledrejection', (event) => {
    const error: ErrorLog = {
      message: `Unhandled Promise Rejection: ${event.reason}`,
      stack: event.reason?.stack,
      timestamp: Date.now(),
      url: window.location.href
    }
    
    reportError(error)
  })
}

// ============================================================================
// USER INTERACTION TRACKING
// ============================================================================

/**
 * Track user interactions for INP (Interaction to Next Paint)
 */
function trackUserInteractions(): void {
  const interactions: number[] = []
  
  const trackInteraction = (event: Event) => {
    const startTime = performance.now()
    
    requestAnimationFrame(() => {
      const duration = performance.now() - startTime
      interactions.push(duration)
      
      if (duration > 200) {
        console.warn('Slow interaction detected:', duration, 'ms')
      }
    })
  }
  
  window.addEventListener('click', trackInteraction, { passive: true })
  window.addEventListener('keydown', trackInteraction, { passive: true })
  window.addEventListener('touchstart', trackInteraction, { passive: true })
}

// ============================================================================
// NETWORK MONITORING
// ============================================================================

/**
 * Get network information
 */
export function getNetworkInfo(): {
  effectiveType: string
  downlink: number
  rtt: number
  saveData: boolean
} {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  
  if (!connection) {
    return {
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0,
      saveData: false
    }
  }
  
  return {
    effectiveType: connection.effectiveType || 'unknown',
    downlink: connection.downlink || 0,
    rtt: connection.rtt || 0,
    saveData: connection.saveData || false
  }
}

// ============================================================================
// PERFORMANCE BUDGETS
// ============================================================================

const PERFORMANCE_BUDGETS = {
  LCP: 2500,
  FID: 100,
  CLS: 0.1,
  TTFB: 800,
  FCP: 1800,
  totalJSSize: 300000, // 300KB
  totalCSSSize: 100000, // 100KB
  totalImageSize: 500000 // 500KB
}

/**
 * Check if performance budgets are met
 */
export function checkPerformanceBudgets(): {
  passed: boolean
  violations: string[]
} {
  const violations: string[] = []
  
  // Check resource sizes
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
  let totalJS = 0
  let totalCSS = 0
  let totalImages = 0
  
  resources.forEach(resource => {
    if (resource.name.endsWith('.js')) {
      totalJS += resource.transferSize
    } else if (resource.name.endsWith('.css')) {
      totalCSS += resource.transferSize
    } else if (/\.(jpg|jpeg|png|gif|webp|avif)$/i.test(resource.name)) {
      totalImages += resource.transferSize
    }
  })
  
  if (totalJS > PERFORMANCE_BUDGETS.totalJSSize) {
    violations.push(`JS budget exceeded: ${(totalJS / 1000).toFixed(1)}KB / ${(PERFORMANCE_BUDGETS.totalJSSize / 1000).toFixed(1)}KB`)
  }
  
  if (totalCSS > PERFORMANCE_BUDGETS.totalCSSSize) {
    violations.push(`CSS budget exceeded: ${(totalCSS / 1000).toFixed(1)}KB / ${(PERFORMANCE_BUDGETS.totalCSSSize / 1000).toFixed(1)}KB`)
  }
  
  if (totalImages > PERFORMANCE_BUDGETS.totalImageSize) {
    violations.push(`Image budget exceeded: ${(totalImages / 1000).toFixed(1)}KB / ${(PERFORMANCE_BUDGETS.totalImageSize / 1000).toFixed(1)}KB`)
  }
  
  return {
    passed: violations.length === 0,
    violations
  }
}

// ============================================================================
// REPORTING
// ============================================================================

const metrics: PerformanceMetric[] = []
const errors: ErrorLog[] = []

function reportMetric(metric: PerformanceMetric): void {
  metrics.push(metric)
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    const icon = metric.rating === 'good' ? '✓' :
                 metric.rating === 'needs-improvement' ? '⚠' : '✗'
    console.log(`${icon} ${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`)
  }
}

function reportError(error: ErrorLog): void {
  errors.push(error)
  console.error('Error tracked:', error)
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Schedule periodic metrics reporting
 */
function scheduleMetricsReport(sessionId: string): void {
  // Report metrics after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      const report = generatePerformanceReport(sessionId)
      sendMetricsToAnalytics(report)
    }, 5000) // Wait 5s after load
  })
  
  // Report before page unload
  window.addEventListener('beforeunload', () => {
    const report = generatePerformanceReport(sessionId)
    sendMetricsToAnalytics(report, true)
  })
}

/**
 * Generate comprehensive performance report
 */
function generatePerformanceReport(sessionId: string): RUMData {
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
  
  return {
    sessionId,
    pageUrl: window.location.href,
    userAgent: navigator.userAgent,
    connectionType: getNetworkInfo().effectiveType,
    metrics,
    resources: resources.map(r => ({
      name: r.name,
      type: r.initiatorType,
      duration: r.duration,
      size: r.transferSize,
      cached: r.transferSize === 0 && r.decodedBodySize > 0
    })),
    errors
  }
}

/**
 * Send metrics to analytics (console log for now)
 */
function sendMetricsToAnalytics(report: RUMData, useBeacon = false): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('Performance Report:', report)
  }
  
  // In production, send to analytics endpoint
  // if (useBeacon && navigator.sendBeacon) {
  //   navigator.sendBeacon('/api/analytics/performance', JSON.stringify(report))
  // } else {
  //   fetch('/api/analytics/performance', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(report),
  //     keepalive: true
  //   }).catch(err => console.warn('Failed to send metrics:', err))
  // }
}

// ============================================================================
// PERFORMANCE DASHBOARD HELPERS
// ============================================================================

/**
 * Get current performance metrics summary
 */
export function getPerformanceMetrics(): {
  coreWebVitals: PerformanceMetric[]
  budgetStatus: ReturnType<typeof checkPerformanceBudgets>
  networkInfo: ReturnType<typeof getNetworkInfo>
} {
  return {
    coreWebVitals: metrics.filter(m => 
      ['LCP', 'FID', 'CLS', 'TTFB', 'FCP'].includes(m.name)
    ),
    budgetStatus: checkPerformanceBudgets(),
    networkInfo: getNetworkInfo()
  }
}

/**
 * Get performance score (0-100)
 */
export function getPerformanceScore(): number {
  const lcp = metrics.find(m => m.name === 'LCP')
  const fid = metrics.find(m => m.name === 'FID')
  const cls = metrics.find(m => m.name === 'CLS')
  
  if (!lcp || !fid || !cls) return 0
  
  const lcpScore = lcp.rating === 'good' ? 100 : lcp.rating === 'needs-improvement' ? 50 : 0
  const fidScore = fid.rating === 'good' ? 100 : fid.rating === 'needs-improvement' ? 50 : 0
  const clsScore = cls.rating === 'good' ? 100 : cls.rating === 'needs-improvement' ? 50 : 0
  
  return Math.round((lcpScore + fidScore + clsScore) / 3)
}
