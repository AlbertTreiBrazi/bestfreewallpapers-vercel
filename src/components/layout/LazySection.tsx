import React, { useState, useRef } from 'react'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'

interface LazySectionProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  threshold?: number
  rootMargin?: string
  className?: string
  delay?: number
}

export const LazySection: React.FC<LazySectionProps> = ({
  children,
  fallback,
  threshold = 0.1,
  rootMargin = '100px',
  className = '',
  delay = 0
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    if (isVisible) {
      if (delay > 0) {
        const timer = setTimeout(() => setShouldRender(true), delay)
        return () => clearTimeout(timer)
      } else {
        setShouldRender(true)
      }
    }
  }, [isVisible, delay])

  return (
    <div ref={sectionRef} className={className}>
      {shouldRender ? (
        children
      ) : (
        fallback || <LoadingSkeleton variant="card" count={3} />
      )}
    </div>
  )
}

// Pre-built lazy sections for common use cases
export const LazyWallpaperGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LazySection
    fallback={
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <LoadingSkeleton variant="card" count={8} />
      </div>
    }
    delay={100}
  >
    {children}
  </LazySection>
)

export const LazyCategorySection: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LazySection
    fallback={
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <LoadingSkeleton variant="card" count={6} />
      </div>
    }
    delay={200}
  >
    {children}
  </LazySection>
)