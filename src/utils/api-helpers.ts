// API Helper Utilities with Timeout and AbortController
// Provides fetch with timeout and cancellation support

import monitoringService from '@/services/monitoringService'

export interface FetchOptions extends RequestInit {
  timeout?: number
  retries?: number
  retryDelay?: number
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Fetch with timeout and automatic retry support
 * @param url - URL to fetch
 * @param options - Fetch options with timeout, retries, etc.
 * @returns Promise with response
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    timeout = 15000, // Default 15 seconds
    retries = 2,
    retryDelay = 1000,
    signal,
    ...fetchOptions
  } = options

  // Create AbortController for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  // Combine signals if one was provided
  let combinedSignal = controller.signal
  if (signal) {
    // If external signal is already aborted, use it
    if (signal.aborted) {
      clearTimeout(timeoutId)
      throw new DOMException('Request was cancelled', 'AbortError')
    }
    
    // Listen to external signal
    signal.addEventListener('abort', () => {
      controller.abort()
    })
  }

  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: combinedSignal,
      })

      clearTimeout(timeoutId)

      // Track successful request
      monitoringService.trackBusinessEvent({
        event_type: 'api_request_success',
        url,
        metadata: {
          status: response.status,
          attempt: attempt + 1,
          timestamp: Date.now()
        }
      })

      return response
    } catch (error: any) {
      clearTimeout(timeoutId)
      lastError = error

      // Don't retry if request was cancelled or if it's the last attempt
      if (error.name === 'AbortError' || attempt === retries) {
        // Track failed request
        monitoringService.trackError({
          message: `API request failed: ${error.message}`,
          url,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          metadata: {
            error_type: error.name,
            attempt: attempt + 1,
            max_retries: retries,
            timestamp: Date.now()
          }
        })

        if (error.name === 'AbortError') {
          // Determine if it was a timeout or manual cancellation
          throw new ApiError(
            'Request timeout - please try again',
            408,
            { originalError: error.message }
          )
        }
        throw error
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
    }
  }

  throw lastError || new Error('Request failed')
}

/**
 * Create a cancellable request that can be aborted on route/filter changes
 * @returns Object with execute and cancel functions
 */
export function createCancellableRequest<T>(
  requestFn: (signal: AbortSignal) => Promise<T>
) {
  let controller: AbortController | null = new AbortController()

  return {
    execute: async (): Promise<T> => {
      if (!controller) {
        controller = new AbortController()
      }
      return requestFn(controller.signal)
    },
    cancel: () => {
      if (controller) {
        controller.abort()
        controller = null
      }
    },
    isActive: () => controller !== null
  }
}

/**
 * Hook-friendly fetch with automatic cleanup
 * Use in React components with useEffect
 */
export class RequestManager {
  private controllers: Map<string, AbortController> = new Map()

  /**
   * Execute a request with automatic cleanup on abort
   * @param key - Unique key for this request
   * @param url - URL to fetch
   * @param options - Fetch options
   */
  async fetch(key: string, url: string, options: FetchOptions = {}): Promise<Response> {
    // Cancel any existing request with this key
    this.cancel(key)

    // Create new controller for this request
    const controller = new AbortController()
    this.controllers.set(key, controller)

    try {
      const response = await fetchWithTimeout(url, {
        ...options,
        signal: controller.signal
      })
      
      // Clean up on success
      this.controllers.delete(key)
      return response
    } catch (error) {
      // Clean up on error
      this.controllers.delete(key)
      throw error
    }
  }

  /**
   * Cancel a specific request by key
   */
  cancel(key: string) {
    const controller = this.controllers.get(key)
    if (controller) {
      controller.abort()
      this.controllers.delete(key)
    }
  }

  /**
   * Cancel all requests managed by this instance
   */
  cancelAll() {
    this.controllers.forEach(controller => controller.abort())
    this.controllers.clear()
  }

  /**
   * Get count of active requests
   */
  getActiveCount(): number {
    return this.controllers.size
  }
}

/**
 * JSON fetch with timeout and error handling
 */
export async function fetchJSON<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await fetchWithTimeout(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new ApiError(
      `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      { body: errorText }
    )
  }

  return response.json()
}
