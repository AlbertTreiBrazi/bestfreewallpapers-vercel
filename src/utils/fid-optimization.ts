/**
 * FID (First Input Delay) Optimization Utilities
 * Focus: Reducing main thread blocking and improving interactivity
 */

// Enhanced requestIdleCallback wrapper with fallback
export const scheduleIdleTask = (
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number => {
  if (typeof window === 'undefined') return 0
  
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options)
  }
  
  // Fallback for browsers without requestIdleCallback
  return setTimeout(() => {
    const start = Date.now()
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
    })
  }, 1) as unknown as number
}

export const cancelIdleTask = (id: number): void => {
  if (typeof window === 'undefined') return
  
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id)
  } else {
    clearTimeout(id)
  }
}

// Enhanced debounce with immediate option for better FID
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean; maxWait?: number } = {}
): T & { cancel: () => void; flush: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null
  let lastCallTime = 0
  let lastInvokeTime = 0
  let result: any

  const { leading = false, trailing = true, maxWait } = options

  function invokeFunc(time: number) {
    lastInvokeTime = time
    result = func.apply(null, arguments as any)
    timeout = null
    return result
  }

  function shouldInvoke(time: number) {
    const timeSinceLastCall = time - lastCallTime
    const timeSinceLastInvoke = time - lastInvokeTime

    return (
      lastCallTime === 0 ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    )
  }

  function debouncedFunc(...args: any[]) {
    const time = Date.now()
    const isInvoking = shouldInvoke(time)

    lastCallTime = time

    if (isInvoking) {
      if (timeout === null && leading) {
        return invokeFunc(time)
      }
      if (maxWait !== undefined) {
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(() => invokeFunc(Date.now()), wait)
        return invokeFunc(time)
      }
    }

    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => invokeFunc(Date.now()), wait)

    return result
  }

  debouncedFunc.cancel = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  debouncedFunc.flush = () => {
    if (timeout) {
      clearTimeout(timeout)
      return invokeFunc(Date.now())
    }
    return result
  }

  return debouncedFunc as any
}

// Throttle for scroll and resize events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T & { cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null
  let previous = 0
  const { leading = true, trailing = true } = options

  function throttled(...args: any[]) {
    const now = Date.now()
    if (!previous && !leading) previous = now

    const remaining = wait - (now - previous)

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      previous = now
      return func.apply(null, args)
    } else if (!timeout && trailing) {
      timeout = setTimeout(() => {
        previous = leading ? Date.now() : 0
        timeout = null
        func.apply(null, args)
      }, remaining)
    }
  }

  throttled.cancel = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
    previous = 0
  }

  return throttled as any
}

// Request Animation Frame scheduler for smooth animations
export const scheduleAnimation = (callback: FrameRequestCallback): number => {
  return requestAnimationFrame(callback)
}

export const cancelAnimation = (id: number): void => {
  cancelAnimationFrame(id)
}

// Passive event listener helper for better scrolling performance
export const addPassiveEventListener = (
  target: EventTarget,
  event: string,
  handler: EventListener,
  options?: AddEventListenerOptions
): void => {
  target.addEventListener(event, handler, {
    ...options,
    passive: true
  })
}

// Main thread yield utility for long tasks
export const yieldToMain = (): Promise<void> => {
  return new Promise(resolve => {
    setTimeout(resolve, 0)
  })
}

// Break up long tasks into smaller chunks
export async function* taskBatcher<T>(
  items: T[],
  batchSize: number = 10
): AsyncGenerator<T[], void, unknown> {
  for (let i = 0; i < items.length; i += batchSize) {
    yield items.slice(i, i + batchSize)
    await yieldToMain()
  }
}

// Optimize click handlers to prevent double-execution
export function optimizeClickHandler<T extends HTMLElement>(
  handler: (event: React.MouseEvent<T>) => void,
  delay: number = 300
): (event: React.MouseEvent<T>) => void {
  let isProcessing = false

  return (event: React.MouseEvent<T>) => {
    if (isProcessing) {
      event.preventDefault()
      return
    }

    isProcessing = true
    handler(event)

    setTimeout(() => {
      isProcessing = false
    }, delay)
  }
}

// Performance-optimized event delegation
export class EventDelegator {
  private handlers = new Map<string, Map<string, EventListener>>()

  constructor(private root: HTMLElement) {}

  on(selector: string, event: string, handler: EventListener) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Map())
      this.root.addEventListener(event, this.delegateEvent.bind(this), {
        passive: true,
        capture: false
      })
    }

    const eventHandlers = this.handlers.get(event)!
    eventHandlers.set(selector, handler)
  }

  off(selector: string, event: string) {
    const eventHandlers = this.handlers.get(event)
    if (eventHandlers) {
      eventHandlers.delete(selector)
      if (eventHandlers.size === 0) {
        this.root.removeEventListener(event, this.delegateEvent.bind(this))
        this.handlers.delete(event)
      }
    }
  }

  private delegateEvent(event: Event) {
    const eventHandlers = this.handlers.get(event.type)
    if (!eventHandlers) return

    let target = event.target as HTMLElement | null
    while (target && target !== this.root) {
      eventHandlers.forEach((handler, selector) => {
        if (target!.matches(selector)) {
          handler.call(target, event)
        }
      })
      target = target.parentElement
    }
  }

  destroy() {
    this.handlers.forEach((handlers, event) => {
      this.root.removeEventListener(event, this.delegateEvent.bind(this))
    })
    this.handlers.clear()
  }
}

// Measure and report FID
export const measureFID = (): void => {
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          const fid = entry.processingStart - entry.startTime
          console.log('[FID Measurement]', {
            value: fid,
            name: entry.name,
            target: entry.target,
            startTime: entry.startTime,
            processingStart: entry.processingStart,
            processingEnd: entry.processingEnd,
            duration: entry.duration
          })

          // Report to analytics if needed
          if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'web_vitals', {
              event_category: 'Web Vitals',
              event_label: 'FID',
              value: Math.round(fid),
              non_interaction: true
            })
          }
        })
      })

      observer.observe({ entryTypes: ['first-input'] })
    } catch (error) {
      console.warn('FID measurement not supported:', error)
    }
  }
}

// Measure Total Blocking Time (TBT)
export const measureTBT = (): void => {
  if ('PerformanceObserver' in window) {
    try {
      let tbt = 0
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (entry.duration > 50) {
            tbt += entry.duration - 50
          }
        })
        console.log('[TBT Measurement]', { totalBlockingTime: tbt })
      })

      observer.observe({ entryTypes: ['longtask'] })
    } catch (error) {
      console.warn('TBT measurement not supported:', error)
    }
  }
}

// Initialize FID optimizations
export const initializeFIDOptimizations = (): void => {
  // Measure FID and TBT
  measureFID()
  measureTBT()

  // Optimize passive event listeners for common scroll/touch events
  if (typeof window !== 'undefined') {
    const passiveEvents = ['scroll', 'touchstart', 'touchmove', 'wheel']
    passiveEvents.forEach(event => {
      const originalAddEventListener = EventTarget.prototype.addEventListener
      EventTarget.prototype.addEventListener = function(
        type: string,
        listener: any,
        options?: any
      ) {
        if (passiveEvents.includes(type) && typeof options === 'object') {
          options.passive = options.passive ?? true
        }
        return originalAddEventListener.call(this, type, listener, options)
      }
    })
  }

  console.log('[FID Optimization] Initialized')
}

// Export all utilities
export default {
  scheduleIdleTask,
  cancelIdleTask,
  debounce,
  throttle,
  scheduleAnimation,
  cancelAnimation,
  addPassiveEventListener,
  yieldToMain,
  taskBatcher,
  optimizeClickHandler,
  EventDelegator,
  measureFID,
  measureTBT,
  initializeFIDOptimizations
}
