/**
 * Feature Flags Configuration
 * 
 * CRITICAL: Feature flags for safe rollout and rollback capability
 * Set flags to false to disable features and revert to previous behavior
 */

export const FEATURE_FLAGS = {
  // Email + Password Authentication (NEW)
  AUTH_EMAIL_PASSWORD: true,
  
  // Enhanced Email OTP/Magic Link with expandable section (ENHANCED)
  AUTH_EMAIL_OTP_ENHANCED: true,
  
  // Rate Limiting via Edge Functions
  AUTH_RATE_LIMITING: true,
  
  // Password Strength Validation
  AUTH_PASSWORD_VALIDATION: true,
  
  // Forgot Password Functionality
  AUTH_FORGOT_PASSWORD: true,
  
  // OAuth Flows (Google, Facebook) - ALWAYS TRUE (existing functionality)
  AUTH_OAUTH_GOOGLE: true,
  AUTH_OAUTH_FACEBOOK: true,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/**
 * Check if a feature is enabled
 */
export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  return FEATURE_FLAGS[flag] === true;
};

/**
 * Configuration for authentication methods
 */
export const AUTH_CONFIG = {
  // Rate limiting settings
  RATE_LIMIT: {
    MAX_ATTEMPTS: 5,
    WINDOW_MINUTES: 15,
    EDGE_FUNCTION_URL: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rate-limit-auth`,
  },
  
  // Password validation rules
  PASSWORD: {
    MIN_LENGTH: 12,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: false, // Optional for better UX
    
    // Common passwords blocklist (subset - full list should be in backend)
    COMMON_PASSWORDS: [
      'password',
      'password123',
      '123456',
      '12345678',
      'qwerty',
      'abc123',
      'letmein',
      'welcome',
      'admin',
      'admin123',
    ],
  },
  
  // Turnstile CAPTCHA settings (existing)
  TURNSTILE: {
    SITE_KEY: import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAAAgQvBhEOvUl_pVP',
    TIMEOUT_MS: 5000,
    FALLBACK_ENABLED: true,
  },
  
  // OAuth providers (existing)
  OAUTH_PROVIDERS: ['google', 'facebook'] as const,
  
  // Session settings
  SESSION: {
    COOKIE_OPTIONS: {
      domain: '.bestfreewallpapers.com',
      path: '/',
      sameSite: 'strict' as const,
      secure: true,
    },
  },
} as const;

/**
 * Admin email configuration
 */
export const ADMIN_CONFIG = {
  SUPER_ADMIN_EMAIL: 'admin@bestfreewallpapers.com',
  AUTO_ASSIGN_ADMIN_ROLE: true,
} as const;
