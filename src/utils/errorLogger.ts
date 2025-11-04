// Structured Error Logging Utility
// Provides console-safe error logging with context

import monitoringService from '@/services/monitoringService'

export interface ErrorLogEntry {
  timestamp: string
  level: 'error' | 'warn' | 'info'
  message: string
  context?: Record<string, any>
  stack?: string
  url?: string
  userAgent?: string
}

class ErrorLogger {
  private logs: ErrorLogEntry[] = []
  private maxLogs = 100 // Keep last 100 logs
  private isDevelopment = import.meta.env.DEV

  /**
   * Log an error with context
   */
  error(message: string, error?: Error, context?: Record<string, any>) {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context,
      stack: error?.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
    }

    this.addLog(entry)
    this.consoleLog(entry)

    // Track with monitoring service
    monitoringService.trackError({
      message,
      stack: error?.stack,
      url: window.location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      metadata: context,
    })
  }

  /**
   * Log a warning
   */
  warn(message: string, context?: Record<string, any>) {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context,
      url: window.location.href,
      userAgent: navigator.userAgent,
    }

    this.addLog(entry)
    this.consoleLog(entry)
  }

  /**
   * Log informational message
   */
  info(message: string, context?: Record<string, any>) {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
      url: window.location.href,
    }

    this.addLog(entry)
    if (this.isDevelopment) {
      this.consoleLog(entry)
    }
  }

  /**
   * Get all logged errors
   */
  getLogs(): ErrorLogEntry[] {
    return [...this.logs]
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: ErrorLogEntry['level']): ErrorLogEntry[] {
    return this.logs.filter(log => log.level === level)
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = []
  }

  /**
   * Export logs as JSON string
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  private addLog(entry: ErrorLogEntry) {
    this.logs.push(entry)
    
    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }
  }

  private consoleLog(entry: ErrorLogEntry) {
    const prefix = `[${entry.level.toUpperCase()}] ${entry.timestamp}`
    const message = `${prefix} - ${entry.message}`

    switch (entry.level) {
      case 'error':
        console.error(message)
        if (entry.stack && this.isDevelopment) {
          console.error('Stack:', entry.stack)
        }
        break
      case 'warn':
        console.warn(message)
        break
      case 'info':
        console.info(message)
        break
    }

    if (entry.context && this.isDevelopment) {
      console.log('Context:', entry.context)
    }
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger()

// Convenience functions
export const logError = (message: string, error?: Error, context?: Record<string, any>) => {
  errorLogger.error(message, error, context)
}

export const logWarn = (message: string, context?: Record<string, any>) => {
  errorLogger.warn(message, context)
}

export const logInfo = (message: string, context?: Record<string, any>) => {
  errorLogger.info(message, context)
}
