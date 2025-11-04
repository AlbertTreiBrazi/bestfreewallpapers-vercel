/**
 * Error formatting utilities to prevent "[object Object]" rendering issues
 * Provides consistent error handling and display across the application
 */

export interface ErrorDetails {
  message: string;
  stack?: string;
  code?: string;
  statusCode?: number;
  timestamp?: string;
}

/**
 * Safely serialize any error object to a readable string
 * Handles Error objects, plain objects, strings, and other types
 */
export function serializeError(error: any): string {
  if (!error) {
    return 'Unknown error occurred';
  }

  // If it's already a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // Handle Error objects
  if (error instanceof Error) {
    return error.message || 'An error occurred';
  }

  // Handle objects with a message property
  if (typeof error === 'object' && error.message) {
    return String(error.message);
  }

  // Handle Supabase error format
  if (typeof error === 'object' && error.error_description) {
    return String(error.error_description);
  }

  // Handle API error responses
  if (typeof error === 'object' && error.details) {
    return String(error.details);
  }

  // For other objects, try to extract meaningful information
  if (typeof error === 'object') {
    // Try common error properties
    const message = error.msg || error.detail || error.description || error.reason;
    if (message) {
      return String(message);
    }

    // Last resort: stringify the object safely
    try {
      const stringified = JSON.stringify(error, null, 2);
      // If it's just an empty object, return a default message
      if (stringified === '{}' || stringified === 'null') {
        return 'An unknown error occurred';
      }
      return stringified;
    } catch {
      return 'An error occurred (unable to serialize error details)';
    }
  }

  // Convert other types to string
  return String(error);
}

/**
 * Extract detailed error information for debugging and logging
 */
export function getErrorDetails(error: any): ErrorDetails {
  const details: ErrorDetails = {
    message: serializeError(error),
    timestamp: new Date().toISOString()
  };

  if (error instanceof Error) {
    details.stack = error.stack;
    details.code = (error as any).code;
  }

  if (typeof error === 'object' && error) {
    details.statusCode = error.status || error.statusCode;
    details.code = error.code || error.error_code;
  }

  return details;
}

/**
 * Format error for user display - removes technical details
 */
export function formatErrorForUser(error: any): string {
  const message = serializeError(error);
  
  // Replace technical error messages with user-friendly ones
  const userFriendlyMessages: Record<string, string> = {
    'Network Error': 'Connection problem. Please check your internet connection.',
    'Failed to fetch': 'Unable to connect to server. Please try again.',
    'UNAUTHORIZED': 'You need to sign in to perform this action.',
    'FORBIDDEN': 'You don\'t have permission to perform this action.',
    'NOT_FOUND': 'The requested item was not found.',
    'INTERNAL_SERVER_ERROR': 'Server error. Please try again later.',
    'SERVICE_UNAVAILABLE': 'Service is temporarily unavailable. Please try again later.'
  };

  // Check for exact matches
  if (userFriendlyMessages[message]) {
    return userFriendlyMessages[message];
  }

  // Check for partial matches
  for (const [technical, friendly] of Object.entries(userFriendlyMessages)) {
    if (message.toLowerCase().includes(technical.toLowerCase())) {
      return friendly;
    }
  }

  return message;
}

/**
 * Log error details for debugging while showing user-friendly message
 */
export function handleAndLogError(error: any, context?: string): string {
  const details = getErrorDetails(error);
  
  console.error(`Error${context ? ` in ${context}` : ''}:`, {
    message: details.message,
    stack: details.stack,
    code: details.code,
    statusCode: details.statusCode,
    timestamp: details.timestamp,
    originalError: error
  });

  return formatErrorForUser(error);
}

/**
 * Safe JSON stringify that handles circular references
 */
export function safeStringify(obj: any): string {
  try {
    return JSON.stringify(obj, (key, value) => {
      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      return value;
    }, 2);
  } catch (error) {
    return `[Unable to stringify: ${serializeError(error)}]`;
  }
}

// WeakSet to track seen objects for circular reference detection
const seen = new WeakSet();

/**
 * Extract error message from various error formats commonly used in React/Supabase apps
 */
export function extractErrorMessage(error: any): string {
  if (!error) return 'Unknown error';

  // Handle string errors
  if (typeof error === 'string') return error;

  // Handle Error objects
  if (error instanceof Error) return error.message;

  // Handle objects with message property
  if (typeof error === 'object' && error.message) {
    return String(error.message);
  }

  // Handle Supabase-style errors
  if (typeof error === 'object' && error.error) {
    if (typeof error.error === 'string') {
      return error.error;
    }
    if (typeof error.error === 'object' && error.error.message) {
      return String(error.error.message);
    }
  }

  // Try to extract meaningful information
  return serializeError(error);
}

/**
 * Safe toast error handler that prevents [object Object] displays
 */
export function safeToastError(error: any, fallbackMessage: string = 'An error occurred'): void {
  const message = extractErrorMessage(error) || fallbackMessage;
  
  // Import toast dynamically to avoid circular dependencies
  import('react-hot-toast').then(({ default: toast }) => {
    toast.error(message);
  }).catch(() => {
    console.error('Failed to show toast:', message);
  });
}

/**
 * Global error handler for React components
 */
export function handleComponentError(error: any, componentName?: string): string {
  const errorMessage = extractErrorMessage(error);
  
  console.error(`Component Error${componentName ? ` in ${componentName}` : ''}:`, {
    originalError: error,
    formattedMessage: errorMessage,
    timestamp: new Date().toISOString()
  });
  
  return errorMessage;
}

/**
 * Prevent [object Object] from being displayed in JSX
 */
export function safeRenderError(error: any): string {
  if (!error) return '';
  
  // If it's already a safe string, return it
  if (typeof error === 'string' && error !== '[object Object]') {
    return error;
  }
  
  // Extract meaningful error message
  return extractErrorMessage(error);
}