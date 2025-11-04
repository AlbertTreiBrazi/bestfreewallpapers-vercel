// Enhanced Authentication Security Utilities
// Integrates with the enhanced-auth-security edge function

interface SecurityValidationResult {
  valid: boolean;
  errors: string[];
  requiresCaptcha?: boolean;
  attemptsRemaining?: number;
  resetTime?: Date;
}

interface RateLimitResult {
  allowed: boolean;
  requiresCaptcha?: boolean;
  attemptsRemaining?: number;
  resetTime?: Date;
}

interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  requirements: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
}

// Get Supabase URL from environment or window location
function getSupabaseUrl(): string {
  // Try to get from environment variables first
  if (typeof window !== 'undefined' && (window as any).ENV?.VITE_SUPABASE_URL) {
    return (window as any).ENV.VITE_SUPABASE_URL;
  }
  
  // Fallback to hardcoded URL for the specific deployment
  return 'https://9uozkca3lph4.supabase.co';
}

// Get Supabase anon key
function getSupabaseAnonKey(): string {
  // Try to get from environment variables first
  if (typeof window !== 'undefined' && (window as any).ENV?.VITE_SUPABASE_ANON_KEY) {
    return (window as any).ENV.VITE_SUPABASE_ANON_KEY;
  }
  
  // Fallback to the anon key for the specific deployment
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IjF1b3prY2EzbHBoNCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzUzMDU1MTg4LCJleHAiOjIwNjg2MzExODh9.gYg6vVuI8Xz9j6WPgZ6g0X6RZ6kqX9VCMQJvY8x4iPY';
}

export class AuthSecurityService {
  private supabaseUrl: string;
  private anonKey: string;
  private captchaEnabled: boolean = false;

  constructor() {
    this.supabaseUrl = getSupabaseUrl();
    this.anonKey = getSupabaseAnonKey();
  }

  /**
   * Validate password against security policy
   */
  async validatePassword(password: string): Promise<PasswordValidationResult> {
    try {
      const response = await fetch(`${this.supabaseUrl}/functions/v1/enhanced-auth-security`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.anonKey}`,
          'apikey': this.anonKey
        },
        body: JSON.stringify({
          action: 'validate_password',
          password
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result.data;
      } else {
        console.error('Password validation failed:', response.statusText);
        // Fallback to client-side validation
        return this.clientSidePasswordValidation(password);
      }
    } catch (error) {
      console.error('Password validation error:', error);
      // Fallback to client-side validation
      return this.clientSidePasswordValidation(password);
    }
  }

  /**
   * Check login rate limit before attempting sign in
   */
  async checkLoginRateLimit(captchaToken?: string): Promise<RateLimitResult> {
    try {
      const response = await fetch(`${this.supabaseUrl}/functions/v1/enhanced-auth-security`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.anonKey}`,
          'apikey': this.anonKey
        },
        body: JSON.stringify({
          action: 'check_login_rate_limit',
          captchaToken
        })
      });

      if (response.ok) {
        const result = await response.json();
        return {
          allowed: true,
          requiresCaptcha: result.data.requiresCaptcha,
          attemptsRemaining: result.data.attemptsRemaining
        };
      } else if (response.status === 429) {
        const result = await response.json();
        return {
          allowed: false,
          requiresCaptcha: result.error.requiresCaptcha,
          attemptsRemaining: result.error.attemptsRemaining,
          resetTime: result.error.resetTime ? new Date(result.error.resetTime) : undefined
        };
      } else {
        console.error('Rate limit check failed:', response.statusText);
        // Allow request if rate limit check fails (fail open for better UX)
        return { allowed: true };
      }
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Allow request if rate limit check fails (fail open for better UX)
      return { allowed: true };
    }
  }

  /**
   * Check download rate limit
   */
  async checkDownloadRateLimit(): Promise<RateLimitResult> {
    try {
      const response = await fetch(`${this.supabaseUrl}/functions/v1/enhanced-auth-security`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.anonKey}`,
          'apikey': this.anonKey
        },
        body: JSON.stringify({
          action: 'check_download_rate_limit'
        })
      });

      if (response.ok) {
        const result = await response.json();
        return {
          allowed: true,
          attemptsRemaining: result.data.attemptsRemaining
        };
      } else if (response.status === 429) {
        const result = await response.json();
        return {
          allowed: false,
          resetTime: result.error.resetTime ? new Date(result.error.resetTime) : undefined
        };
      } else {
        console.error('Download rate limit check failed:', response.statusText);
        // Allow request if rate limit check fails (fail open for better UX)
        return { allowed: true };
      }
    } catch (error) {
      console.error('Download rate limit check error:', error);
      // Allow request if rate limit check fails (fail open for better UX)
      return { allowed: true };
    }
  }

  /**
   * Log authentication attempt
   */
  async logAuthAttempt({
    userId,
    action,
    success,
    failureReason
  }: {
    userId?: string;
    action: 'login_attempt' | 'signup_attempt' | 'password_reset';
    success: boolean;
    failureReason?: string;
  }): Promise<void> {
    try {
      await fetch(`${this.supabaseUrl}/functions/v1/enhanced-auth-security`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.anonKey}`,
          'apikey': this.anonKey
        },
        body: JSON.stringify({
          action: 'log_auth_attempt',
          userId,
          success,
          failureReason
        })
      });
    } catch (error) {
      console.error('Failed to log auth attempt:', error);
      // Don't throw error for logging failures
    }
  }

  /**
   * Client-side password validation fallback
   */
  private clientSidePasswordValidation(password: string): PasswordValidationResult {
    const errors: string[] = [];
    
    if (password.length < 10) {
      errors.push('Password must be at least 10 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      requirements: {
        minLength: 10,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
      }
    };
  }

  /**
   * Enable CAPTCHA functionality
   */
  enableCaptcha(): void {
    this.captchaEnabled = true;
  }

  /**
   * Check if CAPTCHA is enabled
   */
  isCaptchaEnabled(): boolean {
    return this.captchaEnabled;
  }
}

// Export singleton instance
export const authSecurity = new AuthSecurityService();

// Export types for use in components
export type { SecurityValidationResult, RateLimitResult, PasswordValidationResult };
