/**
 * Security Headers Utility
 * Provides client-side security enhancements and monitoring
 */

// Security configuration
export const SECURITY_CONFIG = {
  headers: {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Content-Security-Policy': `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.minimax.io;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' https://fonts.gstatic.com;
      img-src 'self' data: https: blob:;
      media-src 'self' https:;
      connect-src 'self' https://*.supabase.co https://*.minimax.io;
      frame-src 'none';
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none'
    `.replace(/\s+/g, ' ').trim(),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()'
  },
  monitoring: {
    enableCSPReporting: true,
    reportViolations: true,
    logSecurityEvents: true
  }
};

/**
 * Initialize client-side security monitoring
 */
export function initializeSecurityMonitoring(): void {
  // CSP Violation Reporting
  if (SECURITY_CONFIG.monitoring.enableCSPReporting) {
    document.addEventListener('securitypolicyviolation', (event) => {
      console.warn('[Security] CSP Violation:', {
        violatedDirective: event.violatedDirective,
        blockedURI: event.blockedURI,
        sourceFile: event.sourceFile,
        lineNumber: event.lineNumber,
        originalPolicy: event.originalPolicy
      });
      
      // Report to analytics or monitoring service
      if (SECURITY_CONFIG.monitoring.reportViolations) {
        reportSecurityViolation(event);
      }
    });
  }

  // Monitor for mixed content
  if ('serviceWorker' in navigator) {
    checkServiceWorkerSecurity();
  }

  // Check for HTTPS
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    console.warn('[Security] Website not served over HTTPS');
  }

  // Initialize security headers validation
  validateSecurityHeaders();
}

/**
 * Report security violations to monitoring service
 */
function reportSecurityViolation(event: SecurityPolicyViolationEvent): void {
  // Send to your monitoring/analytics service
  const violationData = {
    type: 'csp_violation',
    directive: event.violatedDirective,
    blockedURI: event.blockedURI,
    sourceFile: event.sourceFile,
    lineNumber: event.lineNumber,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: location.href
  };

  // Log locally for development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Security] Violation reported:', violationData);
  }

  // In production, send to your monitoring service
  // Example: analytics.track('security_violation', violationData);
}

/**
 * Check service worker security implementation
 */
function checkServiceWorkerSecurity(): void {
  navigator.serviceWorker.ready.then((registration) => {
    // Check if security-enhanced service worker is active
    if (registration.active) {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        const { securityHeadersActive, headersCount } = event.data;
        if (securityHeadersActive) {
          console.log(`[Security] Service Worker security headers active (${headersCount} headers)`);
        } else {
          console.warn('[Security] Service Worker security headers not active');
        }
      };
      
      registration.active.postMessage(
        { type: 'SECURITY_STATUS' },
        [messageChannel.port2]
      );
    }
  }).catch((error) => {
    console.warn('[Security] Service Worker not available:', error);
  });
}

/**
 * Validate that security headers are present
 */
export async function validateSecurityHeaders(): Promise<SecurityValidationResult> {
  try {
    const response = await fetch(location.href, { method: 'HEAD' });
    const headers = response.headers;
    
    const validation: SecurityValidationResult = {
      score: 0,
      totalChecks: Object.keys(SECURITY_CONFIG.headers).length,
      passedChecks: 0,
      missingHeaders: [],
      presentHeaders: [],
      recommendations: []
    };

    // Check each security header
    Object.entries(SECURITY_CONFIG.headers).forEach(([headerName, expectedValue]) => {
      const headerValue = headers.get(headerName.toLowerCase());
      
      if (headerValue) {
        validation.presentHeaders.push({
          name: headerName,
          value: headerValue,
          expected: expectedValue,
          matches: headerValue.includes(expectedValue.split(';')[0])
        });
        validation.passedChecks++;
      } else {
        validation.missingHeaders.push({
          name: headerName,
          expectedValue,
          impact: getHeaderImpact(headerName)
        });
      }
    });

    validation.score = Math.round((validation.passedChecks / validation.totalChecks) * 100);
    
    // Generate recommendations
    if (validation.missingHeaders.length > 0) {
      validation.recommendations = generateSecurityRecommendations(validation.missingHeaders);
    }

    return validation;
    
  } catch (error) {
    console.error('[Security] Failed to validate headers:', error);
    return {
      score: 0,
      totalChecks: 0,
      passedChecks: 0,
      missingHeaders: [],
      presentHeaders: [],
      recommendations: ['Unable to validate security headers - check network connectivity'],
      error: error.message
    };
  }
}

/**
 * Get the security impact of a missing header
 */
function getHeaderImpact(headerName: string): string {
  const impacts: Record<string, string> = {
    'Strict-Transport-Security': 'HIGH - Vulnerable to HTTPS downgrade attacks',
    'Content-Security-Policy': 'HIGH - Vulnerable to XSS and code injection attacks',
    'X-Frame-Options': 'MEDIUM - Vulnerable to clickjacking attacks',
    'X-Content-Type-Options': 'MEDIUM - Vulnerable to MIME sniffing attacks',
    'X-XSS-Protection': 'MEDIUM - Legacy XSS protection missing',
    'Referrer-Policy': 'LOW - Referrer information may leak',
    'Permissions-Policy': 'LOW - Browser features not restricted'
  };
  
  return impacts[headerName] || 'UNKNOWN - Security impact unclear';
}

/**
 * Generate security recommendations based on missing headers
 */
function generateSecurityRecommendations(missingHeaders: MissingHeader[]): string[] {
  const recommendations: string[] = [];
  
  missingHeaders.forEach((header) => {
    switch (header.name) {
      case 'Strict-Transport-Security':
        recommendations.push('Implement HSTS to prevent HTTPS downgrade attacks');
        break;
      case 'Content-Security-Policy':
        recommendations.push('Add CSP header to prevent XSS and injection attacks');
        break;
      case 'X-Frame-Options':
        recommendations.push('Add X-Frame-Options to prevent clickjacking');
        break;
      case 'X-Content-Type-Options':
        recommendations.push('Add X-Content-Type-Options to prevent MIME sniffing');
        break;
      default:
        recommendations.push(`Implement ${header.name} for enhanced security`);
    }
  });
  
  return recommendations;
}

/**
 * Apply security headers via service worker registration
 */
export async function registerSecurityServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[Security] Service Worker not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw-security.js', {
      scope: '/',
      updateViaCache: 'none'
    });

    console.log('[Security] Security Service Worker registered successfully');
    
    // Listen for updates
    registration.addEventListener('updatefound', () => {
      console.log('[Security] Security Service Worker update found');
    });

    return true;
  } catch (error) {
    console.error('[Security] Failed to register Security Service Worker:', error);
    return false;
  }
}

// Type definitions
export interface SecurityValidationResult {
  score: number;
  totalChecks: number;
  passedChecks: number;
  missingHeaders: MissingHeader[];
  presentHeaders: PresentHeader[];
  recommendations: string[];
  error?: string;
}

export interface MissingHeader {
  name: string;
  expectedValue: string;
  impact: string;
}

export interface PresentHeader {
  name: string;
  value: string;
  expected: string;
  matches: boolean;
}

// Auto-initialize security monitoring when module loads
if (typeof document !== 'undefined') {
  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSecurityMonitoring);
  } else {
    initializeSecurityMonitoring();
  }
}
