import { useEffect, useRef, useCallback, useState } from 'react'
import { 
  performanceTracker, 
  memoryManager, 
  bundleOptimizer,
  createDebouncedFunction 
} from '@/utils/performance-optimization'

// Hook for tracking Core Web Vitals
export function useWebVitals() {
  const metricsRef = useRef<Record<string, number>>({})

  useEffect(() => {
    const updateMetrics = createDebouncedFunction(() => {
      metricsRef.current = performanceTracker.getAllMetrics()
    }, 1000)

    // Update metrics periodically
    const interval = memoryManager.setInterval(updateMetrics, 5000)

    return () => {
      memoryManager.clearTimer(interval)
      updateMetrics.cancel()
    }
  }, [])

  return metricsRef.current
}

// Hook for intelligent preloading
export function useIntelligentPreloading() {
  const preloadedRoutes = useRef(new Set<string>())

  const preloadRoute = useCallback((routeName: string) => {
    if (preloadedRoutes.current.has(routeName)) return
    
    preloadedRoutes.current.add(routeName)
    bundleOptimizer.preloadRoute(routeName)
  }, [])

  const preloadOnHover = useCallback((componentName: string) => {
    bundleOptimizer.preloadOnHover(componentName)
  }, [])

  return { preloadRoute, preloadOnHover }
}

// Hook for memory-efficient event listeners
export function useManagedEventListener(
  target: EventTarget | null,
  type: string,
  listener: EventListener,
  options?: AddEventListenerOptions
) {
  useEffect(() => {
    if (!target) return

    memoryManager.addEventListener(target, type, listener, options)

    return () => {
      target.removeEventListener(type, listener, options)
    }
  }, [target, type, listener, options])
}

// Hook for optimized intersection observer
export function useOptimizedIntersectionObserver(
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
) {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const elementsRef = useRef(new Set<Element>())

  useEffect(() => {
    observerRef.current = new IntersectionObserver(callback, {
      rootMargin: '50px 0px',
      threshold: 0.1,
      ...options
    })

    memoryManager.addObserver(observerRef.current)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [callback, options])

  const observe = useCallback((element: Element) => {
    if (!observerRef.current || elementsRef.current.has(element)) return
    
    observerRef.current.observe(element)
    elementsRef.current.add(element)
  }, [])

  const unobserve = useCallback((element: Element) => {
    if (!observerRef.current || !elementsRef.current.has(element)) return
    
    observerRef.current.unobserve(element)
    elementsRef.current.delete(element)
  }, [])

  return { observe, unobserve }
}

// Hook for performance-optimized state updates
export function useOptimizedState<T>(initialState: T, updateDelay: number = 100) {
  const [state, setState] = useState<T>(initialState)
  const debouncedSetState = useRef(
    createDebouncedFunction((newState: T) => setState(newState), updateDelay)
  )

  useEffect(() => {
    return () => {
      debouncedSetState.current.cancel()
    }
  }, [])

  const setOptimizedState = useCallback((newState: T | ((prev: T) => T)) => {
    if (typeof newState === 'function') {
      setState(prev => {
        const result = (newState as (prev: T) => T)(prev)
        debouncedSetState.current(result)
        return result
      })
    } else {
      debouncedSetState.current(newState)
    }
  }, [])

  return [state, setOptimizedState] as const
}

// Hook for viewport-based resource management
export function useViewportOptimization() {
  const [isVisible, setIsVisible] = useState(false)
  const [isInViewport, setIsInViewport] = useState(false)
  const elementRef = useRef<HTMLElement>(null)

  const { observe, unobserve } = useOptimizedIntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        setIsVisible(entry.isIntersecting)
        setIsInViewport(entry.intersectionRatio > 0)
      })
    },
    { threshold: [0, 0.1, 0.5, 1] }
  )

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    observe(element)

    return () => {
      unobserve(element)
    }
  }, [observe, unobserve])

  return {
    elementRef,
    isVisible,
    isInViewport
  }
}

// Hook for adaptive loading based on connection
export function useAdaptiveLoading() {
  const [connectionSpeed, setConnectionSpeed] = useState<'slow' | 'fast'>('fast')
  const [shouldPreload, setShouldPreload] = useState(true)

  useEffect(() => {
    // Check network information if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      
      const updateConnectionInfo = () => {
        const effective = connection.effectiveType
        setConnectionSpeed(['slow-2g', '2g', '3g'].includes(effective) ? 'slow' : 'fast')
        setShouldPreload(!connection.saveData && effective !== 'slow-2g')
      }

      updateConnectionInfo()
      connection.addEventListener('change', updateConnectionInfo)

      return () => {
        connection.removeEventListener('change', updateConnectionInfo)
      }
    }
  }, [])

  return {
    connectionSpeed,
    shouldPreload,
    isSlowConnection: connectionSpeed === 'slow',
    shouldReduceQuality: connectionSpeed === 'slow'
  }
}

// Hook for performance monitoring
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<Record<string, number>>({})
  const [isOptimal, setIsOptimal] = useState(true)

  useEffect(() => {
    const updateMetrics = createDebouncedFunction(() => {
      const currentMetrics = performanceTracker.getAllMetrics()
      setMetrics(currentMetrics)
      
      // Check if performance is optimal
      const lcp = currentMetrics.LCP
      const fid = currentMetrics.FID
      const cls = currentMetrics.CLS
      
      const isGood = (
        (!lcp || lcp < 2500) && // LCP should be < 2.5s
        (!fid || fid < 100) &&  // FID should be < 100ms
        (!cls || cls < 0.1)     // CLS should be < 0.1
      )
      
      setIsOptimal(isGood)
    }, 1000)

    const interval = memoryManager.setInterval(updateMetrics, 5000)
    updateMetrics() // Initial call

    return () => {
      memoryManager.clearTimer(interval)
      updateMetrics.cancel()
    }
  }, [])

  return {
    metrics,
    isOptimal,
    lcp: metrics.LCP,
    fid: metrics.FID,
    cls: metrics.CLS
  }
}

// FID-specific optimization hooks

// Enhanced useMemo with performance tracking
export function useOptimizedMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  debugLabel?: string
): T {
  const { useMemo } = require('react')
  const value = useMemo(() => {
    if (debugLabel && process.env.NODE_ENV === 'development') {
      console.log(`[useMemo] Computing: ${debugLabel}`)
    }
    return factory()
  }, deps)

  return value
}

// Debounced state hook for input optimization
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, T, (value: T) => void] {
  const [immediateValue, setImmediateValue] = useState<T>(initialValue)
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const setValue = useCallback((value: T) => {
    setImmediateValue(value)
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
  }, [delay])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return [immediateValue, debouncedValue, setValue]
}

// Throttled callback hook for scroll/resize events
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 100,
  deps: React.DependencyList = []
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const lastRunRef = useRef<number>(0)

  const throttledCallback = useCallback((...args: Parameters<T>) => {
    const now = Date.now()
    const timeSinceLastRun = now - lastRunRef.current

    if (timeSinceLastRun >= delay) {
      lastRunRef.current = now
      return callback(...args)
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        lastRunRef.current = Date.now()
        callback(...args)
      }, delay - timeSinceLastRun)
    }
  }, [callback, delay, ...deps]) as T

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return throttledCallback
}

// Request idle callback hook for non-critical operations
export function useIdleCallback(
  callback: () => void,
  deps: React.DependencyList = []
): void {
  useEffect(() => {
    const requestIdleCallback = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 1))
    const cancelIdleCallback = (window as any).cancelIdleCallback || clearTimeout
    
    const handle = requestIdleCallback(callback)

    return () => {
      cancelIdleCallback(handle)
    }
  }, deps)
}

// Passive event listener hook for better scrolling performance
export function usePassiveEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element: Window | HTMLElement = window,
  options: AddEventListenerOptions = {}
): void {
  const savedHandler = useRef(handler)

  useEffect(() => {
    savedHandler.current = handler
  }, [handler])

  useEffect(() => {
    const eventListener = (event: Event) => savedHandler.current(event as WindowEventMap[K])
    
    element.addEventListener(eventName, eventListener, {
      passive: true,
      ...options
    })

    return () => {
      element.removeEventListener(eventName, eventListener)
    }
  }, [eventName, element, options.capture])
}

// Previous value hook for optimization comparisons
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>()

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current
}

// Measure component render performance
export function useRenderPerformance(componentName: string): void {
  const renderCountRef = useRef(0)
  const lastRenderTimeRef = useRef(performance.now())

  useEffect(() => {
    renderCountRef.current++
    const now = performance.now()
    const timeSinceLastRender = now - lastRenderTimeRef.current

    if (process.env.NODE_ENV === 'development') {
      if (timeSinceLastRender < 16 && renderCountRef.current > 1) {
        console.warn(`[Performance] ${componentName} re-rendered within ${timeSinceLastRender.toFixed(2)}ms - possible optimization needed`)
      }
    }

    lastRenderTimeRef.current = now
  })
}

// Optimized click handler to prevent double-clicks
export function useOptimizedClickHandler<T extends (...args: any[]) => any>(
  handler: T,
  delay: number = 300
): T {
  const isProcessingRef = useRef(false)

  const optimizedHandler = useCallback((...args: Parameters<T>) => {
    if (isProcessingRef.current) {
      return
    }

    isProcessingRef.current = true
    const result = handler(...args)

    setTimeout(() => {
      isProcessingRef.current = false
    }, delay)

    return result
  }, [handler, delay]) as T

  return optimizedHandler
}
