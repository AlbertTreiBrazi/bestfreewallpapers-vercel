/**
 * CLS (Cumulative Layout Shift) Optimization Utilities
 * 
 * Provides utilities to prevent layout shifts and achieve CLS < 0.1
 * Target: Perfect 10/10 Core Web Vitals score
 */

// ============================================================================
// LAYOUT SHIFT MEASUREMENT & TRACKING
// ============================================================================

interface LayoutShiftEntry extends PerformanceEntry {
  value: number
  hadRecentInput: boolean
  sources?: Array<{
    node?: Node
    previousRect: DOMRectReadOnly
    currentRect: DOMRectReadOnly
  }>
}

/**
 * Track Cumulative Layout Shift (CLS) metric
 * Target: < 0.1 for perfect score
 */
export function measureCLS(callback: (value: number) => void): () => void {
  let clsScore = 0
  let sessionValue = 0
  let sessionEntries: LayoutShiftEntry[] = []

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as LayoutShiftEntry[]) {
      // Only count layout shifts without recent user input
      if (!entry.hadRecentInput) {
        const firstSessionEntry = sessionEntries[0]
        const lastSessionEntry = sessionEntries[sessionEntries.length - 1]

        // If the entry occurred less than 1 second after the previous entry and
        // less than 5 seconds after the first entry in the session, include the
        // entry in the current session. Otherwise, start a new session.
        if (
          sessionValue &&
          entry.startTime - lastSessionEntry.startTime < 1000 &&
          entry.startTime - firstSessionEntry.startTime < 5000
        ) {
          sessionValue += entry.value
          sessionEntries.push(entry)
        } else {
          sessionValue = entry.value
          sessionEntries = [entry]
        }

        // If the current session value is larger than the current CLS value,
        // update CLS and report it.
        if (sessionValue > clsScore) {
          clsScore = sessionValue
          callback(clsScore)
        }
      }
    }
  })

  observer.observe({ type: 'layout-shift', buffered: true })

  return () => observer.disconnect()
}

/**
 * Report CLS to console for debugging
 */
export function logCLS(): void {
  measureCLS((value) => {
    console.log('CLS:', value.toFixed(4), value < 0.1 ? '✓ GOOD' : '✗ NEEDS IMPROVEMENT')
  })
}

/**
 * Track individual layout shifts with details
 */
export function trackLayoutShifts(
  onShift: (entry: LayoutShiftEntry) => void
): () => void {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as LayoutShiftEntry[]) {
      onShift(entry)
    }
  })

  observer.observe({ type: 'layout-shift', buffered: true })

  return () => observer.disconnect()
}

// ============================================================================
// DIMENSION RESERVATION UTILITIES
// ============================================================================

/**
 * Calculate aspect ratio from width and height
 */
export function calculateAspectRatio(
  width: number,
  height: number
): string {
  return `${width} / ${height}`
}

/**
 * Get aspect ratio CSS property for container
 */
export function getAspectRatioStyle(
  width?: number,
  height?: number
): React.CSSProperties {
  if (!width || !height) {
    return {}
  }

  return {
    aspectRatio: calculateAspectRatio(width, height),
  }
}

/**
 * Common aspect ratios for images
 */
export const ASPECT_RATIOS = {
  square: '1 / 1',
  landscape: '16 / 9',
  portrait: '9 / 16',
  video: '16 / 9',
  ultrawide: '21 / 9',
  photo: '4 / 3',
  cinema: '2.39 / 1',
} as const

/**
 * Get standard aspect ratio by name
 */
export function getStandardAspectRatio(
  ratio: keyof typeof ASPECT_RATIOS
): string {
  return ASPECT_RATIOS[ratio]
}

/**
 * Reserve space for dynamically loaded content
 */
export function reserveContentSpace(
  minHeight: number,
  maxHeight?: number
): React.CSSProperties {
  return {
    minHeight: `${minHeight}px`,
    maxHeight: maxHeight ? `${maxHeight}px` : undefined,
  }
}

// ============================================================================
// SKELETON LOADER UTILITIES
// ============================================================================

interface SkeletonDimensions {
  width: number | string
  height: number | string
  aspectRatio?: string
}

/**
 * Create skeleton placeholder with exact dimensions to prevent shifts
 */
export function createSkeletonDimensions(
  width?: number,
  height?: number,
  aspectRatio?: string
): SkeletonDimensions {
  if (aspectRatio) {
    return {
      width: width || '100%',
      height: 'auto',
      aspectRatio,
    }
  }

  return {
    width: width || '100%',
    height: height || 'auto',
    aspectRatio: width && height ? calculateAspectRatio(width, height) : undefined,
  }
}

/**
 * Generate skeleton styles for different content types
 */
export function getSkeletonStyles(type: 'image' | 'text' | 'card' | 'button'): React.CSSProperties {
  const baseStyles: React.CSSProperties = {
    background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
    backgroundSize: '200% 100%',
    animation: 'skeleton-loading 1.5s infinite',
  }

  switch (type) {
    case 'image':
      return {
        ...baseStyles,
        borderRadius: '0.5rem',
      }
    case 'text':
      return {
        ...baseStyles,
        height: '1rem',
        borderRadius: '0.25rem',
      }
    case 'card':
      return {
        ...baseStyles,
        borderRadius: '0.75rem',
        padding: '1rem',
      }
    case 'button':
      return {
        ...baseStyles,
        height: '2.5rem',
        borderRadius: '0.5rem',
      }
    default:
      return baseStyles
  }
}

// ============================================================================
// FONT LOADING OPTIMIZATION
// ============================================================================

/**
 * Preload critical fonts to prevent FOIT/FOUT
 */
export function preloadFont(fontUrl: string, fontFamily: string): void {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'font'
  link.type = 'font/woff2'
  link.href = fontUrl
  link.crossOrigin = 'anonymous'
  document.head.appendChild(link)
}

/**
 * Apply font with fallback to prevent layout shift
 */
export function getFontStackWithFallback(primaryFont: string): string {
  const fallbacks = {
    // Sans-serif fonts
    'Inter': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'Roboto': '"Helvetica Neue", Arial, sans-serif',
    'Open Sans': '-apple-system, "Segoe UI", sans-serif',
    
    // Serif fonts
    'Merriweather': 'Georgia, "Times New Roman", serif',
    'Playfair Display': 'Georgia, serif',
    
    // Monospace fonts
    'Fira Code': 'Monaco, Consolas, "Courier New", monospace',
    'JetBrains Mono': 'Consolas, Monaco, monospace',
  }

  return fallbacks[primaryFont as keyof typeof fallbacks] || 
         'system-ui, -apple-system, sans-serif'
}

/**
 * Font display strategies for different use cases
 */
export const FONT_DISPLAY = {
  swap: 'swap',      // Show fallback immediately, swap when loaded (best for CLS)
  block: 'block',    // Block rendering for short period (3s), then swap
  fallback: 'fallback', // Block briefly (100ms), swap if loaded within 3s
  optional: 'optional', // Block briefly (100ms), use fallback if not loaded
} as const

// ============================================================================
// IMAGE DIMENSION OPTIMIZATION
// ============================================================================

/**
 * Ensure image has explicit dimensions to prevent layout shift
 */
export function ensureImageDimensions(
  src: string,
  providedWidth?: number,
  providedHeight?: number
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (providedWidth && providedHeight) {
      resolve({ width: providedWidth, height: providedHeight })
      return
    }

    const img = new Image()
    img.onload = () => {
      resolve({
        width: providedWidth || img.naturalWidth,
        height: providedHeight || img.naturalHeight,
      })
    }
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${src}`))
    }
    img.src = src
  })
}

/**
 * Create image container with reserved space
 */
export function createImageContainer(
  width: number,
  height: number
): React.CSSProperties {
  return {
    position: 'relative',
    width: '100%',
    aspectRatio: calculateAspectRatio(width, height),
    overflow: 'hidden',
  }
}

// ============================================================================
// DYNAMIC CONTENT SPACE RESERVATION
// ============================================================================

/**
 * Reserve space for ads, modals, and dynamic content
 */
export function reserveDynamicContentSpace(config: {
  type: 'ad' | 'modal' | 'dropdown' | 'notification'
  dimensions?: { width?: number; height?: number }
}): React.CSSProperties {
  const defaultDimensions: Record<string, { width?: number; height?: number }> = {
    ad: { height: 250 }, // Standard ad height
    modal: { height: 300 },
    dropdown: { height: 150 },
    notification: { height: 80 },
  }

  const dimensions = config.dimensions || defaultDimensions[config.type] || {}

  return {
    minHeight: dimensions.height ? `${dimensions.height}px` : undefined,
    minWidth: dimensions.width ? `${dimensions.width}px` : undefined,
  }
}

/**
 * Create placeholder for async content with exact dimensions
 */
export function createAsyncPlaceholder(
  width?: number | string,
  height?: number | string
): React.CSSProperties {
  return {
    width: typeof width === 'number' ? `${width}px` : width || '100%',
    height: typeof height === 'number' ? `${height}px` : height || 'auto',
    backgroundColor: '#f3f4f6',
    borderRadius: '0.5rem',
  }
}

// ============================================================================
// INITIALIZATION & MONITORING
// ============================================================================

/**
 * Initialize CLS optimization and monitoring
 */
export function initializeCLSOptimizations(): void {
  if (typeof window === 'undefined') return

  // Log CLS for development
  if (process.env.NODE_ENV === 'development') {
    logCLS()
  }

  // Add skeleton loading animation to document
  const style = document.createElement('style')
  style.textContent = `
    @keyframes skeleton-loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `
  document.head.appendChild(style)

  console.log('✓ CLS optimization utilities initialized')
}

/**
 * Create CLS performance observer
 */
export function createCLSObserver(
  threshold: number = 0.1,
  onExceed?: (value: number) => void
): () => void {
  return measureCLS((value) => {
    if (value > threshold) {
      console.warn(`⚠️ CLS threshold exceeded: ${value.toFixed(4)} > ${threshold}`)
      onExceed?.(value)
    }
  })
}

// ============================================================================
// REACT UTILITIES
// ============================================================================

/**
 * Get container props with CLS prevention
 */
export function getContainerProps(
  width?: number,
  height?: number,
  className?: string
): {
  style: React.CSSProperties
  className?: string
} {
  return {
    style: {
      ...getAspectRatioStyle(width, height),
      position: 'relative',
      overflow: 'hidden',
    },
    className,
  }
}

/**
 * Prevent layout shift during image load
 */
export function getImageProps(
  src: string,
  width?: number,
  height?: number
): {
  src: string
  width?: number
  height?: number
  loading: 'lazy' | 'eager'
  decoding: 'async'
  style: React.CSSProperties
} {
  return {
    src,
    width,
    height,
    loading: 'lazy',
    decoding: 'async',
    style: {
      width: '100%',
      height: 'auto',
      aspectRatio: width && height ? calculateAspectRatio(width, height) : undefined,
    },
  }
}
