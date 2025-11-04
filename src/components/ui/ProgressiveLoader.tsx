import React, { useState, useEffect } from 'react'
import { LoadingSkeleton } from './LoadingSkeleton'

interface ProgressiveLoaderProps {
  isLoading: boolean
  hasError?: boolean
  isEmpty?: boolean
  skeleton?: React.ReactNode
  error?: React.ReactNode
  empty?: React.ReactNode
  children: React.ReactNode
  delay?: number
}

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  isLoading,
  hasError = false,
  isEmpty = false,
  skeleton,
  error,
  empty,
  children,
  delay = 0
}) => {
  const [showContent, setShowContent] = useState(delay === 0)

  useEffect(() => {
    if (delay > 0 && !isLoading) {
      const timer = setTimeout(() => setShowContent(true), delay)
      return () => clearTimeout(timer)
    }
  }, [delay, isLoading])

  if (isLoading) {
    return skeleton || <LoadingSkeleton variant="card" count={4} />
  }

  if (hasError) {
    return error || (
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">⚠️ Something went wrong</div>
        <p className="text-gray-600">Please try refreshing the page</p>
      </div>
    )
  }

  if (isEmpty) {
    return empty || (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-2">📭 No content available</div>
        <p className="text-gray-600">Check back later for updates</p>
      </div>
    )
  }

  if (!showContent) {
    return skeleton || <LoadingSkeleton variant="card" />
  }

  return <>{children}</>
}

// Hook for progressive loading states
export const useProgressiveLoading = (dependencies: any[], delay = 100) => {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      const allLoaded = dependencies.every(dep => dep != null && !dep.isLoading)
      if (allLoaded) {
        setIsReady(true)
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [...dependencies, delay])

  return isReady
}