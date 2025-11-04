// React Hook for Cancellable Requests
// Automatically cancels requests on component unmount or dependency changes

import { useEffect, useRef, useCallback } from 'react'
import { RequestManager, FetchOptions, ApiError } from '@/utils/api-helpers'
import { errorLogger } from '@/utils/errorLogger'

/**
 * Hook for managing cancellable API requests
 * Automatically cancels in-flight requests when component unmounts or dependencies change
 * 
 * @example
 * const { fetch, cancel, isLoading } = useCancellableRequest()
 * 
 * useEffect(() => {
 *   const loadData = async () => {
 *     try {
 *       const data = await fetch('data-fetch', '/api/data')
 *       setData(data)
 *     } catch (error) {
 *       // Handle error
 *     }
 *   }
 *   loadData()
 * }, [someFilter]) // Automatically cancels previous request when someFilter changes
 */
export function useCancellableRequest() {
  const managerRef = useRef<RequestManager | null>(null)

  // Initialize manager on first render
  if (!managerRef.current) {
    managerRef.current = new RequestManager()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (managerRef.current) {
        managerRef.current.cancelAll()
      }
    }
  }, [])

  const fetch = useCallback(
    async (key: string, url: string, options?: FetchOptions) => {
      if (!managerRef.current) {
        throw new Error('RequestManager not initialized')
      }

      try {
        return await managerRef.current.fetch(key, url, options)
      } catch (error: any) {
        // Only log non-abort errors
        if (error.name !== 'AbortError') {
          errorLogger.error(`Request failed: ${key}`, error, { url })
        }
        throw error
      }
    },
    []
  )

  const cancel = useCallback((key: string) => {
    if (managerRef.current) {
      managerRef.current.cancel(key)
    }
  }, [])

  const cancelAll = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.cancelAll()
    }
  }, [])

  const getActiveCount = useCallback(() => {
    return managerRef.current?.getActiveCount() || 0
  }, [])

  return {
    fetch,
    cancel,
    cancelAll,
    getActiveCount,
  }
}

/**
 * Hook for a single cancellable fetch with loading state
 * Simpler alternative when you only need one request at a time
 */
export function useCancellableFetch<T = any>() {
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      // Cancel on unmount
      if (controllerRef.current) {
        controllerRef.current.abort()
      }
    }
  }, [])

  const executeFetch = useCallback(
    async (url: string, options?: FetchOptions): Promise<T> => {
      // Cancel any existing request
      if (controllerRef.current) {
        controllerRef.current.abort()
      }

      // Create new controller
      controllerRef.current = new AbortController()

      try {
        const response = await fetch(url, {
          ...options,
          signal: controllerRef.current.signal,
        })

        if (!response.ok) {
          throw new ApiError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status
          )
        }

        const data = await response.json()
        return data
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          errorLogger.error('Fetch failed', error, { url })
        }
        throw error
      }
    },
    []
  )

  const cancel = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort()
      controllerRef.current = null
    }
  }, [])

  return {
    fetch: executeFetch,
    cancel,
  }
}
