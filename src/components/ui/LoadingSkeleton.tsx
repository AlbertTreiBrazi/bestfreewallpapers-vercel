import React from 'react'
import { useTheme } from '@/contexts/ThemeContext'

export interface LoadingSkeletonProps {
  variant?: 'wallpaper' | 'category' | 'text' | 'hero' | 'card'
  count?: number
  className?: string
}

export function LoadingSkeleton({ 
  variant = 'wallpaper', 
  count = 1, 
  className = '' 
}: LoadingSkeletonProps) {
  const { theme } = useTheme()
  
  const baseClasses = `animate-pulse ${
    theme === 'dark' ? 'bg-dark-tertiary' : 'bg-gray-200'
  }`
  
  const renderSkeleton = () => {
    switch (variant) {
      case 'wallpaper':
        return (
          <div className={`${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} rounded-lg p-4 border ${className}`}>
            <div className={`w-full aspect-video ${baseClasses} rounded-lg mb-3`}></div>
            <div className={`h-4 ${baseClasses} rounded mb-2`}></div>
            <div className={`h-3 ${baseClasses} rounded w-2/3`}></div>
          </div>
        )
      
      case 'category':
        return (
          <div className={`${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} rounded-lg overflow-hidden border ${className}`}>
            <div className={`w-full aspect-square ${baseClasses}`}></div>
            <div className="p-3">
              <div className={`h-4 ${baseClasses} rounded mx-auto w-3/4`}></div>
            </div>
          </div>
        )
      
      case 'text':
        return (
          <div className={`space-y-2 ${className}`}>
            <div className={`h-4 ${baseClasses} rounded`}></div>
            <div className={`h-4 ${baseClasses} rounded w-4/5`}></div>
            <div className={`h-4 ${baseClasses} rounded w-3/5`}></div>
          </div>
        )
      
      case 'hero':
        return (
          <div className={`w-full space-y-4 ${className}`}>
            <div className={`h-8 ${baseClasses} rounded mx-auto w-3/4`}></div>
            <div className={`h-6 ${baseClasses} rounded mx-auto w-1/2`}></div>
            <div className="flex gap-2 justify-center">
              <div className={`h-10 w-32 ${baseClasses} rounded`}></div>
              <div className={`h-10 w-32 ${baseClasses} rounded`}></div>
            </div>
          </div>
        )
      
      case 'card':
        return (
          <div className={`${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} rounded-lg p-4 border ${className}`}>
            <div className={`w-full h-32 ${baseClasses} rounded-lg mb-3`}></div>
            <div className={`h-4 ${baseClasses} rounded mb-2`}></div>
            <div className={`h-3 ${baseClasses} rounded w-2/3`}></div>
          </div>
        )
      
      default:
        return (
          <div className={`h-20 ${baseClasses} rounded ${className}`}></div>
        )
    }
  }
  
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <React.Fragment key={index}>
          {renderSkeleton()}
        </React.Fragment>
      ))}
    </>
  )
}

// Named export alias for backward compatibility
export const PageLoadingSkeleton = LoadingSkeleton

export default LoadingSkeleton