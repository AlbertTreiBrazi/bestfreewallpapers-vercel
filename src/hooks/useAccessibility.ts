/**
 * Accessibility Hook for React Components
 * Provides WCAG 2.1 AA compliance features and keyboard navigation
 */

import { useState, useEffect, useCallback } from 'react'
import { ARIA_LABELS, KEYBOARD_EVENTS, TOUCH_TARGET_SIZE, FocusManager } from '@/utils/accessibility'

interface UseAccessibilityOptions {
  enableKeyboardNavigation?: boolean
  enableFocusManagement?: boolean
  ariaLabel?: string
  role?: string
}

export function useAccessibility(options: UseAccessibilityOptions = {}) {
  const {
    enableKeyboardNavigation = true,
    enableFocusManagement = false,
    ariaLabel,
    role
  } = options

  const [isKeyboardUser, setIsKeyboardUser] = useState(false)

  // Detect keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === KEYBOARD_EVENTS.TAB) {
        setIsKeyboardUser(true)
      }
    }

    const handleMouseDown = () => {
      setIsKeyboardUser(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  // Focus management for modals/dialogs
  const [focusManager, setFocusManager] = useState<FocusManager | null>(null)

  const initializeFocusManager = useCallback((container: HTMLElement) => {
    if (enableFocusManagement) {
      const manager = new FocusManager(container)
      setFocusManager(manager)
      return manager
    }
    return null
  }, [enableFocusManagement])

  // ARIA attributes for screen readers
  const ariaAttributes = {
    ...(ariaLabel && { 'aria-label': ariaLabel }),
    ...(role && { role }),
    'aria-live': 'polite',
    'aria-atomic': 'true'
  }

  // Keyboard event handler
  const handleKeyDown = useCallback((event: KeyboardEvent, callback?: (event: KeyboardEvent) => void) => {
    if (!enableKeyboardNavigation) return

    switch (event.key) {
      case KEYBOARD_EVENTS.ENTER:
      case KEYBOARD_EVENTS.SPACE:
        if (callback) {
          event.preventDefault()
          callback(event)
        }
        break
      case KEYBOARD_EVENTS.ESCAPE:
        // Handle escape key for closing modals
        if (callback) {
          event.preventDefault()
          callback(event)
        }
        break
      default:
        if (callback) {
          callback(event)
        }
    }
  }, [enableKeyboardNavigation])

  // Touch target validation
  const validateTouchTarget = useCallback((element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    return rect.width >= TOUCH_TARGET_SIZE.MINIMUM && rect.height >= TOUCH_TARGET_SIZE.MINIMUM
  }, [])

  return {
    isKeyboardUser,
    focusManager,
    ariaAttributes,
    handleKeyDown,
    initializeFocusManager,
    validateTouchTarget,
    // Utility functions
    announceToScreenReader: (message: string) => {
      const announcement = document.createElement('div')
      announcement.setAttribute('aria-live', 'polite')
      announcement.setAttribute('aria-atomic', 'true')
      announcement.className = 'sr-only'
      announcement.textContent = message
      document.body.appendChild(announcement)
      setTimeout(() => document.body.removeChild(announcement), 1000)
    }
  }
}

// Hook for managing focus in modals and dialogs
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>) {
  const [focusManager, setFocusManager] = useState<FocusManager | null>(null)

  useEffect(() => {
    if (containerRef.current) {
      const manager = new FocusManager(containerRef.current)
      setFocusManager(manager)
      
      // Focus first element when modal opens
      manager.focusFirst()
      
      return () => {
        manager.restoreFocus()
      }
    }
  }, [containerRef])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (focusManager) {
      focusManager.handleTabKey(event)
    }
  }, [focusManager])

  return { focusManager, handleKeyDown }
}

// High contrast mode detection
export function useHighContrast() {
  const [isHighContrast, setIsHighContrast] = useState(false)

  useEffect(() => {
    const checkHighContrast = () => {
      // Check for high contrast mode in various browsers
      const highContrastMediaQuery = window.matchMedia('(prefers-contrast: high)')
      const forcedColorsMediaQuery = window.matchMedia('(forced-colors: active)')
      
      setIsHighContrast(highContrastMediaQuery.matches || forcedColorsMediaQuery.matches)
    }

    checkHighContrast()

    // Listen for changes
    const highContrastMediaQuery = window.matchMedia('(prefers-contrast: high)')
    const forcedColorsMediaQuery = window.matchMedia('(forced-colors: active)')

    highContrastMediaQuery.addListener(checkHighContrast)
    forcedColorsMediaQuery.addListener(checkHighContrast)

    return () => {
      highContrastMediaQuery.removeListener(checkHighContrast)
      forcedColorsMediaQuery.removeListener(checkHighContrast)
    }
  }, [])

  return isHighContrast
}