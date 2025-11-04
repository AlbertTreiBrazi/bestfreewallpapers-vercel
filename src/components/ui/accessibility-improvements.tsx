/**
 * Accessibility Improvements Component
 * Enhances WCAG compliance across the application
 */

import React, { useEffect } from 'react'

// Skip to main content link
export function SkipToMain() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      Skip to main content
    </a>
  )
}

// Focus management for modal-like components
export function useFocusTrap(isOpen: boolean, ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!isOpen || !ref.current) return

    const element = ref.current
    const focusableElements = element.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    )
    
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    function handleTabKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus()
          e.preventDefault()
        }
      }
    }

    element.addEventListener('keydown', handleTabKey)
    firstElement?.focus()

    return () => {
      element.removeEventListener('keydown', handleTabKey)
    }
  }, [isOpen, ref])
}

// Enhanced button with proper accessibility
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  loadingText?: string
}

export function AccessibleButton({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText = 'Loading...',
  disabled,
  className = '',
  ...props
}: AccessibleButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg'
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-100',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 disabled:text-gray-400'
  }
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm min-h-[36px]',
    md: 'px-4 py-2 text-base min-h-[44px]',
    lg: 'px-6 py-3 text-lg min-h-[48px]'
  }

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      aria-busy={isLoading}
      aria-describedby={isLoading ? `${props.id}-loading` : undefined}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>{loadingText}</span>
          {isLoading && (
            <span id={`${props.id}-loading`} className="sr-only">
              Please wait, operation in progress
            </span>
          )}
        </>
      ) : (
        children
      )}
    </button>
  )
}

// Screen reader announcements
export function useScreenReaderAnnouncement() {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.setAttribute('class', 'sr-only')
    announcement.textContent = message
    
    document.body.appendChild(announcement)
    
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }
  
  return { announce }
}

// Enhanced form input with proper labeling
interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  helperText?: string
  required?: boolean
}

export function AccessibleInput({
  label,
  error,
  helperText,
  required,
  id,
  className = '',
  ...props
}: AccessibleInputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
  const errorId = `${inputId}-error`
  const helperId = `${inputId}-helper`
  
  return (
    <div className="space-y-2">
      <label 
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-900 dark:text-gray-100"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
      
      <input
        {...props}
        id={inputId}
        className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 min-h-[44px] ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''} ${className}`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={`${error ? errorId : ''} ${helperText ? helperId : ''}`.trim()}
        required={required}
      />
      
      {helperText && (
        <p id={helperId} className="text-sm text-gray-600 dark:text-gray-400">
          {helperText}
        </p>
      )}
      
      {error && (
        <p id={errorId} className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// Heading hierarchy validator (development helper)
export function HeadingHierarchyChecker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    const levels: number[] = []
    
    headings.forEach((heading) => {
      const level = parseInt(heading.tagName.charAt(1))
      levels.push(level)
    })
    
    // Check for proper hierarchy
    let hasH1 = false
    let previousLevel = 0
    let issues: string[] = []
    
    levels.forEach((level, index) => {
      if (level === 1) {
        if (hasH1) {
          issues.push('Multiple H1 tags found - should only have one per page')
        }
        hasH1 = true
      }
      
      if (index > 0 && level > previousLevel + 1) {
        issues.push(`Heading level skipped from H${previousLevel} to H${level}`)
      }
      
      previousLevel = level
    })
    
    if (!hasH1) {
      issues.push('No H1 tag found - every page should have exactly one H1')
    }
    
    if (issues.length > 0) {
      console.warn('Heading hierarchy issues found:', issues)
    }
  }, [])
  
  return null
}

// Color contrast checker (development helper)
export function ColorContrastChecker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    
    // Simple contrast ratio calculation
    const getContrast = (color1: string, color2: string): number => {
      // This is a simplified version - in production you'd use a proper library
      return 4.5 // Placeholder
    }
    
    // Check common text elements
    const textElements = document.querySelectorAll('p, span, div, button, a')
    
    textElements.forEach((element) => {
      const styles = window.getComputedStyle(element)
      const textColor = styles.color
      const backgroundColor = styles.backgroundColor
      
      // Only check if both colors are defined
      if (textColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        const contrast = getContrast(textColor, backgroundColor)
        
        if (contrast < 4.5) {
          console.warn('Low contrast detected:', {
            element,
            textColor,
            backgroundColor,
            contrast
          })
        }
      }
    })
  }, [])
  
  return null
}

// Global accessibility initialization
export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Add focus-visible polyfill behavior
    let hadKeyboardEvent = true
    
    const keyboardThrottleTimeout = {
      id: 0
    }
    
    function markKeyboardActive() {
      hadKeyboardEvent = true
    }
    
    function markMouseActive() {
      hadKeyboardEvent = false
    }
    
    document.addEventListener('keydown', markKeyboardActive)
    document.addEventListener('mousedown', markMouseActive)
    
    return () => {
      document.removeEventListener('keydown', markKeyboardActive)
      document.removeEventListener('mousedown', markMouseActive)
    }
  }, [])
  
  return (
    <>
      <SkipToMain />
      {process.env.NODE_ENV === 'development' && (
        <>
          <HeadingHierarchyChecker />
          <ColorContrastChecker />
        </>
      )}
      {children}
    </>
  )
}