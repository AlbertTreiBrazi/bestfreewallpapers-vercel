import React, { useState, useEffect } from 'react'
import { ChevronUp } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface BackToTopButtonProps {
  /** Scroll threshold in pixels before button appears */
  threshold?: number
  /** Custom className for button styling */
  className?: string
}

export function BackToTopButton({ threshold = 300, className = '' }: BackToTopButtonProps) {
  const { theme } = useTheme()
  const [isVisible, setIsVisible] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)

  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout

    const handleScroll = () => {
      const scrollY = window.scrollY
      setIsVisible(scrollY > threshold)
      
      // Track scrolling state for smooth animation
      setIsScrolling(true)
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false)
      }, 150)
    }

    // Add scroll event listener with passive option for better performance
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    // Check initial scroll position
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [threshold])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  if (!isVisible) {
    return null
  }

  return (
    <button
      onClick={scrollToTop}
      className={`
        fixed bottom-6 right-6 z-50
        w-14 h-14 md:w-12 md:h-12 rounded-full
        flex items-center justify-center
        transition-all duration-300 ease-in-out
        transform hover:scale-110 active:scale-95
        shadow-lg hover:shadow-xl
        focus:outline-none focus:ring-2 focus:ring-offset-2
        ${
          theme === 'dark'
            ? 'bg-gray-800 hover:bg-gray-700 text-white shadow-black/50 focus:ring-gray-500 focus:ring-offset-gray-900 border border-gray-700'
            : 'bg-white hover:bg-gray-50 text-gray-800 shadow-gray-900/30 border border-gray-300 focus:ring-gray-500 focus:ring-offset-white'
        }
        ${
          isScrolling ? 'opacity-80' : 'opacity-95 hover:opacity-100'
        }
        ${className}
      `}
      aria-label="Back to top"
      title="Back to top"
    >
      <ChevronUp 
        className="w-7 h-7 md:w-6 md:h-6" 
        strokeWidth={2.5}
      />
    </button>
  )
}

export default BackToTopButton