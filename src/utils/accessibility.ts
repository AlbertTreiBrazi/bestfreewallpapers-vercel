/**
 * Accessibility Utilities for WCAG 2.1 AA Compliance
 * Provides color contrast checking, ARIA helpers, and accessibility functions
 */

// WCAG AA Color Contrast Requirements
export const CONTRAST_RATIOS = {
  // Normal text (below 18pt/24px): minimum 4.5:1
  NORMAL_TEXT: 4.5,
  // Large text (18pt+ or 14pt+ bold): minimum 3:1
  LARGE_TEXT: 3.0,
  // UI components and graphical objects: minimum 3:1
  UI_COMPONENTS: 3.0
}

// Color contrast calculation (WCAG 2.1)
export function calculateContrastRatio(color1: string, color2: string): number {
  const getLuminance = (color: string): number => {
    const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0]
    const [r, g, b] = rgb.map(value => {
      const sRGB = value / 255
      return sRGB <= 0.03928 
        ? sRGB / 12.92 
        : Math.pow((sRGB + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
  }
  
  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  
  return (brightest + 0.05) / (darkest + 0.05)
}

// Check if contrast ratio meets WCAG AA standards
export function meetsWCAGAA(bgColor: string, textColor: string, fontSize: 'normal' | 'large' = 'normal'): boolean {
  const ratio = calculateContrastRatio(bgColor, textColor)
  const required = fontSize === 'large' ? CONTRAST_RATIOS.LARGE_TEXT : CONTRAST_RATIOS.NORMAL_TEXT
  return ratio >= required
}

// Accessibility-optimized color palettes for WCAG AA compliance
export const ACCESSIBLE_COLORS = {
  // Green palette (WCAG AA compliant)
  GREEN: {
    50: '#f0f9ff',   // Background
    100: '#e0f2fe',  // Light background
    200: '#bae6fd',  // Borders
    500: '#0ea5e9',  // Interactive elements
    600: '#0284c7',  // Hover states
    700: '#0369a1',  // Active states
    800: '#075985',  // Text on light backgrounds
    900: '#0c4a6e',  // High contrast text
  },
  
  // Purple palette (Brand colors - WCAG AA compliant)
  PURPLE: {
    50: '#faf5ff',   // Background
    100: '#f3e8ff',  // Light background
    200: '#e9d5ff',  // Borders
    500: '#9333ea',  // Interactive elements (current brand)
    600: '#7c3aed',  // Hover states
    700: '#6d28d9',  // Active states
    800: '#5b21b6',  // Text on light backgrounds
    900: '#4c1d95',  // High contrast text
  },
  
  // Red palette (Error states - WCAG AA compliant)
  RED: {
    50: '#fef2f2',   // Background
    100: '#fee2e2',  // Light background
    200: '#fecaca',  // Borders
    500: '#ef4444',  // Interactive elements
    600: '#dc2626',  // Hover states
    700: '#b91c1c',  // Active states
    800: '#991b1b',  // Text on light backgrounds
    900: '#7f1d1d',  // High contrast text
  }
}

// Generate accessible alt text for images
export function generateAltText(imageType: 'wallpaper' | 'category' | 'user' | 'icon', title?: string, description?: string): string {
  const baseAlt = {
    wallpaper: 'Wallpaper',
    category: 'Category',
    user: 'User avatar',
    icon: 'Icon'
  }
  
  if (title) {
    return `${baseAlt[imageType]}: ${title}`
  }
  
  if (description) {
    return `${baseAlt[imageType]} - ${description}`
  }
  
  return baseAlt[imageType]
}

// ARIA helpers for common components
export const ARIA_LABELS = {
  // Navigation
  MAIN_NAVIGATION: 'Main navigation menu',
  MOBILE_MENU: 'Mobile navigation menu',
  BREADCRUMBS: 'Breadcrumb navigation',
  
  // Forms
  SEARCH_INPUT: 'Search wallpapers',
  FILTER_BUTTON: 'Filter options',
  SORT_BUTTON: 'Sort options',
  
  // Interactive elements
  DOWNLOAD_BUTTON: 'Download wallpaper',
  FAVORITE_BUTTON: 'Add to favorites',
  SHARE_BUTTON: 'Share wallpaper',
  FULLSCREEN_BUTTON: 'View fullscreen',
  
  // Feedback
  LOADING_SPINNER: 'Loading content',
  ERROR_MESSAGE: 'Error message',
  SUCCESS_MESSAGE: 'Success message',
  
  // Content
  IMAGE_GALLERY: 'Wallpaper gallery',
  WALLPAPER_CARD: 'Wallpaper preview card',
  CATEGORY_SECTION: 'Category section'
}

// Keyboard navigation helpers
export const KEYBOARD_EVENTS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  TAB: 'Tab'
}

// Touch target minimum size (WCAG 2.1 AA)
export const TOUCH_TARGET_SIZE = {
  MINIMUM: 44, // pixels
  RECOMMENDED: 48 // pixels
}

// Validate touch target size
export function validateTouchTarget(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect()
  return rect.width >= TOUCH_TARGET_SIZE.MINIMUM && rect.height >= TOUCH_TARGET_SIZE.MINIMUM
}

// Focus management for modals and dialogs
export class FocusManager {
  private focusableElements: HTMLElement[]
  private previousFocus: HTMLElement | null

  constructor(container: HTMLElement) {
    this.focusableElements = Array.from(
      container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[]
    this.previousFocus = document.activeElement as HTMLElement
  }

  focusFirst(): void {
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus()
    }
  }

  focusLast(): void {
    if (this.focusableElements.length > 0) {
      this.focusableElements[this.focusableElements.length - 1].focus()
    }
  }

  restoreFocus(): void {
    if (this.previousFocus) {
      this.previousFocus.focus()
    }
  }

  handleTabKey(event: KeyboardEvent): void {
    if (event.key !== KEYBOARD_EVENTS.TAB) return

    const firstElement = this.focusableElements[0]
    const lastElement = this.focusableElements[this.focusableElements.length - 1]

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }
}