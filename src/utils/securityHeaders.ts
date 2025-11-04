// Security Headers Utility
// Implements comprehensive web security headers and anti-hotlinking protection

export interface SecurityConfig {
  csp: {
    defaultSrc: string[]
    scriptSrc: string[]
    styleSrc: string[]
    imgSrc: string[]
    connectSrc: string[]
    fontSrc: string[]
    frameSrc: string[]
    objectSrc: string[]
    mediaSrc: string[]
  }
  hsts: {
    maxAge: number
    includeSubdomains: boolean
    preload: boolean
  }
  referrerPolicy: string
  permissionsPolicy: string[]
  antiHotlinking: {
    allowedDomains: string[]
    blockUserAgents: string[]
  }
}

// Default security configuration
const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Required for React
      "'unsafe-eval'",   // Required for development
      "https://cdn.jsdelivr.net",
      "https://unpkg.com"
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Required for CSS-in-JS
      "https://fonts.googleapis.com"
    ],
    imgSrc: [
      "'self'",
      "data:",
      "https:",
      "blob:"
    ],
    connectSrc: [
      "'self'",
      "https://*.supabase.co",
      "https://*.minimax.io",
      "wss://*.supabase.co"
    ],
    fontSrc: [
      "'self'",
      "https://fonts.gstatic.com"
    ],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"]
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubdomains: true,
    preload: true
  },
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()' // Privacy Sandbox
  ],
  antiHotlinking: {
    allowedDomains: [
      'bestfreewallpapers.com',
      'minimax.io',
      'localhost',
      '127.0.0.1'
    ],
    blockUserAgents: [
      'bot',
      'crawler',
      'spider',
      'scraper'
    ]
  }
}

// Generate Content Security Policy header value
export function generateCSPHeader(config: SecurityConfig['csp']): string {
  const policies = [
    `default-src ${config.defaultSrc.join(' ')}`,
    `script-src ${config.scriptSrc.join(' ')}`,
    `style-src ${config.styleSrc.join(' ')}`,
    `img-src ${config.imgSrc.join(' ')}`,
    `connect-src ${config.connectSrc.join(' ')}`,
    `font-src ${config.fontSrc.join(' ')}`,
    `frame-src ${config.frameSrc.join(' ')}`,
    `object-src ${config.objectSrc.join(' ')}`,
    `media-src ${config.mediaSrc.join(' ')}`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`
  ]
  
  return policies.join('; ')
}

// Generate HSTS header value
export function generateHSTSHeader(config: SecurityConfig['hsts']): string {
  let header = `max-age=${config.maxAge}`
  
  if (config.includeSubdomains) {
    header += '; includeSubDomains'
  }
  
  if (config.preload) {
    header += '; preload'
  }
  
  return header
}

// Check if referrer is allowed (anti-hotlinking)
export function isValidReferrer(
  referrer: string | null,
  allowedDomains: string[]
): boolean {
  if (!referrer) {
    // Allow direct access (no referrer)
    return true
  }
  
  try {
    const referrerUrl = new URL(referrer)
    const referrerDomain = referrerUrl.hostname
    
    return allowedDomains.some(domain => {
      // Exact match
      if (referrerDomain === domain) return true
      
      // Subdomain match
      if (referrerDomain.endsWith('.' + domain)) return true
      
      // Development domains
      if (domain.includes('localhost') || domain.includes('127.0.0.1')) {
        return referrerDomain.includes('localhost') || referrerDomain.includes('127.0.0.1')
      }
      
      return false
    })
  } catch {
    return false
  }
}

// Check if user agent should be blocked
export function isBlockedUserAgent(
  userAgent: string | null,
  blockedPatterns: string[]
): boolean {
  if (!userAgent) return false
  
  const ua = userAgent.toLowerCase()
  
  return blockedPatterns.some(pattern => 
    ua.includes(pattern.toLowerCase())
  )
}

// Generate security headers object
export function generateSecurityHeaders(
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): Record<string, string> {
  return {
    // Content Security Policy
    'Content-Security-Policy': generateCSPHeader(config.csp),
    
    // HSTS
    'Strict-Transport-Security': generateHSTSHeader(config.hsts),
    
    // XSS Protection
    'X-XSS-Protection': '1; mode=block',
    
    // Content Type Options
    'X-Content-Type-Options': 'nosniff',
    
    // Frame Options
    'X-Frame-Options': 'DENY',
    
    // Referrer Policy
    'Referrer-Policy': config.referrerPolicy,
    
    // Permissions Policy
    'Permissions-Policy': config.permissionsPolicy.join(', '),
    
    // DNS Prefetch Control
    'X-DNS-Prefetch-Control': 'off',
    
    // Download Options (IE)
    'X-Download-Options': 'noopen',
    
    // Powered By (remove server info)
    'X-Powered-By': ''
  }
}

// Validate download request for anti-hotlinking
export function validateDownloadRequest(
  referrer: string | null,
  userAgent: string | null,
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): { allowed: boolean; reason?: string } {
  // Check referrer
  if (!isValidReferrer(referrer, config.antiHotlinking.allowedDomains)) {
    return {
      allowed: false,
      reason: 'Invalid referrer domain'
    }
  }
  
  // Check user agent
  if (isBlockedUserAgent(userAgent, config.antiHotlinking.blockUserAgents)) {
    return {
      allowed: false,
      reason: 'Blocked user agent'
    }
  }
  
  return { allowed: true }
}

// Apply security headers to fetch responses
export function applySecurityHeaders(
  response: Response,
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): Response {
  const headers = generateSecurityHeaders(config)
  
  // Clone response to avoid modifying original
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers)
  })
  
  // Apply security headers
  Object.entries(headers).forEach(([key, value]) => {
    if (value) {
      newResponse.headers.set(key, value)
    } else {
      newResponse.headers.delete(key)
    }
  })
  
  return newResponse
}

// Rate limiting for downloads
interface RateLimit {
  requests: number
  windowMs: number
  maxRequests: number
}

const downloadRateLimits = new Map<string, RateLimit>()

export function checkDownloadRateLimit(
  identifier: string, // IP address or user ID
  maxRequests: number = 20,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remainingRequests: number; resetTime: number } {
  const now = Date.now()
  const key = identifier
  
  let rateLimit = downloadRateLimits.get(key)
  
  if (!rateLimit || now - rateLimit.windowMs > windowMs) {
    // Reset or create new rate limit
    rateLimit = {
      requests: 1,
      windowMs: now,
      maxRequests
    }
    downloadRateLimits.set(key, rateLimit)
    
    return {
      allowed: true,
      remainingRequests: maxRequests - 1,
      resetTime: now + windowMs
    }
  }
  
  if (rateLimit.requests >= maxRequests) {
    return {
      allowed: false,
      remainingRequests: 0,
      resetTime: rateLimit.windowMs + windowMs
    }
  }
  
  rateLimit.requests++
  downloadRateLimits.set(key, rateLimit)
  
  return {
    allowed: true,
    remainingRequests: maxRequests - rateLimit.requests,
    resetTime: rateLimit.windowMs + windowMs
  }
}

// Clean up expired rate limits
setInterval(() => {
  const now = Date.now()
  const windowMs = 60000 // 1 minute
  
  for (const [key, rateLimit] of downloadRateLimits.entries()) {
    if (now - rateLimit.windowMs > windowMs) {
      downloadRateLimits.delete(key)
    }
  }
}, 60000) // Clean up every minute

export { DEFAULT_SECURITY_CONFIG }