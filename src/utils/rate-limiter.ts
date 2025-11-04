/**
 * Rate Limiting Utilities
 * Provides client-side rate limiting and backend integration
 */

export interface RateLimitConfig {
  endpoint: string;
  maxRequests: number;
  windowMinutes: number;
  blockDurationMinutes?: number;
}

export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  'contact-form': { 
    endpoint: 'contact', 
    maxRequests: 5, 
    windowMinutes: 60,
    blockDurationMinutes: 60
  },
  'search': { 
    endpoint: 'search', 
    maxRequests: 100, 
    windowMinutes: 60,
    blockDurationMinutes: 15
  },
  'download': { 
    endpoint: 'download', 
    maxRequests: 50, 
    windowMinutes: 60,
    blockDurationMinutes: 30
  },
  'auth': { 
    endpoint: 'auth', 
    maxRequests: 10, 
    windowMinutes: 15,
    blockDurationMinutes: 30
  },
  'image-preview': {
    endpoint: 'image',
    maxRequests: 120,
    windowMinutes: 60,
    blockDurationMinutes: 15
  }
};

/**
 * Client-side rate limiting (backup/additional protection)
 */
export class ClientRateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(private config: RateLimitConfig) {}
  
  /**
   * Check if request is allowed
   */
  isAllowed(): boolean {
    const now = Date.now();
    const windowStart = now - (this.config.windowMinutes * 60 * 1000);
    
    const key = this.config.endpoint;
    const timestamps = this.requests.get(key) || [];
    
    // Clean old timestamps
    const validTimestamps = timestamps.filter(ts => ts > windowStart);
    
    if (validTimestamps.length >= this.config.maxRequests) {
      return false;
    }
    
    // Add current timestamp
    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);
    
    return true;
  }
  
  /**
   * Get remaining requests count
   */
  getRemainingRequests(): number {
    const now = Date.now();
    const windowStart = now - (this.config.windowMinutes * 60 * 1000);
    
    const key = this.config.endpoint;
    const timestamps = this.requests.get(key) || [];
    const validTimestamps = timestamps.filter(ts => ts > windowStart);
    
    return Math.max(0, this.config.maxRequests - validTimestamps.length);
  }
  
  /**
   * Clear rate limit data
   */
  clear(): void {
    this.requests.clear();
  }
}

/**
 * Hook for React components to use rate limiting
 */
export const useRateLimit = (endpointType: string) => {
  const config = DEFAULT_RATE_LIMITS[endpointType];
  if (!config) {
    throw new Error(`Rate limit config not found for endpoint: ${endpointType}`);
  }
  
  const limiter = new ClientRateLimiter(config);
  
  return {
    isAllowed: () => limiter.isAllowed(),
    remainingRequests: () => limiter.getRemainingRequests(),
    clear: () => limiter.clear()
  };
};
