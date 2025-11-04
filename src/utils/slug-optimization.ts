/**
 * Enhanced Slug Management and Optimization Utilities
 * Provides comprehensive slug generation, validation, and SEO optimization
 */

// Regular expressions for slug validation and cleaning
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const INVALID_CHARS_REGEX = /[^a-z0-9\s-]/gi
const MULTIPLE_HYPHENS_REGEX = /-+/g
const LEADING_TRAILING_HYPHENS_REGEX = /^-+|-+$/g

// Common words to remove for better SEO slugs
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 
  'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 
  'that', 'the', 'to', 'was', 'will', 'with', 'the'
])

// Reserved slugs that shouldn't be used
const RESERVED_SLUGS = new Set([
  'admin', 'api', 'app', 'www', 'mail', 'ftp', 'localhost', 'staging',
  'test', 'dev', 'cdn', 'static', 'assets', 'uploads', 'downloads',
  'login', 'logout', 'register', 'signup', 'signin', 'auth', 'oauth',
  'search', 'browse', 'category', 'categories', 'wallpaper', 'wallpapers',
  'collection', 'collections', 'premium', 'free', 'home', 'about',
  'contact', 'privacy', 'terms', 'help', 'support', 'blog', 'news'
])

// Special character mappings for international characters
const CHAR_MAP: Record<string, string> = {
  'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a', 'ã': 'a', 'å': 'a',
  'é': 'e', 'è': 'e', 'ë': 'e', 'ê': 'e',
  'í': 'i', 'ì': 'i', 'ï': 'i', 'î': 'i',
  'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o', 'õ': 'o', 'ø': 'o',
  'ú': 'u', 'ù': 'u', 'ü': 'u', 'û': 'u',
  'ý': 'y', 'ÿ': 'y',
  'ñ': 'n', 'ç': 'c', 'ß': 'ss',
  'æ': 'ae', 'œ': 'oe'
}

interface SlugOptions {
  maxLength?: number
  removeStopWords?: boolean
  suffix?: string
  preserveCase?: boolean
  allowUnicode?: boolean
}

interface SlugValidationResult {
  isValid: boolean
  errors: string[]
  suggestions: string[]
}

interface SlugAnalysis {
  length: number
  wordCount: number
  hasStopWords: boolean
  hasNumbers: boolean
  hasSpecialChars: boolean
  isReserved: boolean
  seoScore: number
  readabilityScore: number
}

export class SlugOptimizer {
  private static instance: SlugOptimizer
  private slugCache = new Map<string, string>()
  private reservedSlugs = new Set<string>()

  static getInstance(): SlugOptimizer {
    if (!SlugOptimizer.instance) {
      SlugOptimizer.instance = new SlugOptimizer()
    }
    return SlugOptimizer.instance
  }

  private constructor() {
    // Initialize with reserved slugs
    RESERVED_SLUGS.forEach(slug => this.reservedSlugs.add(slug))
  }

  /**
   * Generate an optimized slug from a title
   */
  generateSlug(title: string, options: SlugOptions = {}): string {
    const {
      maxLength = 60,
      removeStopWords = true,
      suffix = '',
      preserveCase = false,
      allowUnicode = false
    } = options

    // Check cache first
    const cacheKey = `${title}-${JSON.stringify(options)}`
    if (this.slugCache.has(cacheKey)) {
      return this.slugCache.get(cacheKey)!
    }

    let slug = title.trim()

    // Convert to lowercase unless preserveCase is true
    if (!preserveCase) {
      slug = slug.toLowerCase()
    }

    // Handle unicode characters
    if (!allowUnicode) {
      slug = this.normalizeUnicode(slug)
    }

    // Remove invalid characters
    slug = slug.replace(INVALID_CHARS_REGEX, ' ')

    // Split into words and process
    let words = slug.split(/\s+/).filter(word => word.length > 0)

    // Remove stop words if enabled
    if (removeStopWords) {
      words = words.filter(word => !STOP_WORDS.has(word.toLowerCase()))
    }

    // Join with hyphens
    slug = words.join('-')

    // Clean up multiple hyphens
    slug = slug.replace(MULTIPLE_HYPHENS_REGEX, '-')

    // Remove leading/trailing hyphens
    slug = slug.replace(LEADING_TRAILING_HYPHENS_REGEX, '')

    // Add suffix if provided
    if (suffix) {
      slug = `${slug}-${suffix}`
    }

    // Truncate if too long
    if (slug.length > maxLength) {
      // Try to break at word boundary
      const truncated = slug.substring(0, maxLength)
      const lastHyphen = truncated.lastIndexOf('-')
      slug = lastHyphen > maxLength * 0.7 ? truncated.substring(0, lastHyphen) : truncated
    }

    // Ensure it's not empty
    if (!slug) {
      slug = 'untitled'
    }

    // Handle reserved slugs
    if (this.reservedSlugs.has(slug)) {
      slug = `${slug}-item`
    }

    // Cache the result
    this.slugCache.set(cacheKey, slug)
    
    return slug
  }

  /**
   * Validate a slug and provide feedback
   */
  validateSlug(slug: string): SlugValidationResult {
    const errors: string[] = []
    const suggestions: string[] = []

    // Basic format validation
    if (!SLUG_REGEX.test(slug)) {
      errors.push('Slug contains invalid characters. Use only lowercase letters, numbers, and hyphens.')
      suggestions.push(this.generateSlug(slug))
    }

    // Length validation
    if (slug.length < 3) {
      errors.push('Slug is too short. Minimum length is 3 characters.')
    } else if (slug.length > 60) {
      errors.push('Slug is too long. Maximum length is 60 characters.')
      suggestions.push(this.generateSlug(slug, { maxLength: 60 }))
    }

    // Reserved slug check
    if (this.reservedSlugs.has(slug)) {
      errors.push('This slug is reserved and cannot be used.')
      suggestions.push(`${slug}-item`)
    }

    // Consecutive hyphens
    if (slug.includes('--')) {
      errors.push('Slug cannot contain consecutive hyphens.')
      suggestions.push(slug.replace(/-+/g, '-'))
    }

    // Leading/trailing hyphens
    if (slug.startsWith('-') || slug.endsWith('-')) {
      errors.push('Slug cannot start or end with hyphens.')
      suggestions.push(slug.replace(/^-+|-+$/g, ''))
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions: [...new Set(suggestions)] // Remove duplicates
    }
  }

  /**
   * Analyze a slug for SEO and readability
   */
  analyzeSlug(slug: string): SlugAnalysis {
    const words = slug.split('-').filter(word => word.length > 0)
    const hasStopWords = words.some(word => STOP_WORDS.has(word))
    const hasNumbers = /\d/.test(slug)
    const hasSpecialChars = !/^[a-z0-9-]+$/.test(slug)
    const isReserved = this.reservedSlugs.has(slug)

    // Calculate SEO score (0-100)
    let seoScore = 100
    if (slug.length < 10) seoScore -= 10
    if (slug.length > 50) seoScore -= 20
    if (words.length < 2) seoScore -= 15
    if (words.length > 8) seoScore -= 10
    if (hasStopWords) seoScore -= 5
    if (hasNumbers) seoScore -= 5
    if (hasSpecialChars) seoScore -= 20
    if (isReserved) seoScore -= 50

    // Calculate readability score (0-100)
    let readabilityScore = 100
    if (words.length > 6) readabilityScore -= 15
    if (slug.length > 40) readabilityScore -= 10
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length
    if (avgWordLength > 8) readabilityScore -= 10
    if (hasNumbers) readabilityScore -= 5

    return {
      length: slug.length,
      wordCount: words.length,
      hasStopWords,
      hasNumbers,
      hasSpecialChars,
      isReserved,
      seoScore: Math.max(0, seoScore),
      readabilityScore: Math.max(0, readabilityScore)
    }
  }

  /**
   * Generate multiple slug variations
   */
  generateVariations(title: string, count: number = 5): string[] {
    const variations: string[] = []
    const baseSlug = this.generateSlug(title)
    variations.push(baseSlug)

    // Generate variations with different options
    variations.push(this.generateSlug(title, { removeStopWords: false }))
    variations.push(this.generateSlug(title, { maxLength: 40 }))
    variations.push(this.generateSlug(title, { suffix: 'hd' }))
    variations.push(this.generateSlug(title, { suffix: 'wallpaper' }))

    // Generate shortened versions
    const words = title.toLowerCase().split(/\s+/)
    if (words.length > 3) {
      variations.push(this.generateSlug(words.slice(0, 3).join(' ')))
    }
    if (words.length > 2) {
      variations.push(this.generateSlug(words.slice(0, 2).join(' ')))
    }

    // Remove duplicates and limit count
    return [...new Set(variations)].slice(0, count)
  }

  /**
   * Check if a slug is available (would need database integration)
   */
  async isSlugAvailable(slug: string, excludeId?: number): Promise<boolean> {
    // This would typically check against a database
    // For now, just check against reserved slugs
    return !this.reservedSlugs.has(slug)
  }

  /**
   * Add a slug to the reserved list
   */
  addReservedSlug(slug: string): void {
    this.reservedSlugs.add(slug)
  }

  /**
   * Clear the slug cache
   */
  clearCache(): void {
    this.slugCache.clear()
  }

  /**
   * Normalize unicode characters
   */
  private normalizeUnicode(text: string): string {
    // First try to use built-in normalization
    let normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    
    // Then apply custom character mappings
    for (const [char, replacement] of Object.entries(CHAR_MAP)) {
      normalized = normalized.replace(new RegExp(char, 'g'), replacement)
    }
    
    return normalized
  }
}

// Export singleton instance
export const slugOptimizer = SlugOptimizer.getInstance()

// Utility functions for common operations
export const generateSlug = (title: string, options?: SlugOptions): string => {
  return slugOptimizer.generateSlug(title, options)
}

export const validateSlug = (slug: string): SlugValidationResult => {
  return slugOptimizer.validateSlug(slug)
}

export const analyzeSlug = (slug: string): SlugAnalysis => {
  return slugOptimizer.analyzeSlug(slug)
}

export const generateSlugVariations = (title: string, count?: number): string[] => {
  return slugOptimizer.generateVariations(title, count)
}

// Export types
export type { SlugOptions, SlugValidationResult, SlugAnalysis }
