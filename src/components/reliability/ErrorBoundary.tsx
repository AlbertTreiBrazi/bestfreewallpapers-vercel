// Enhanced Error Boundary - Phase 3 Priority 4
// Comprehensive error handling with graceful degradation

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import reliabilityService from '../../services/reliabilityService'
import monitoringService from '../../services/monitoringService'
import { extractErrorMessage, safeRenderError } from '../../utils/errorFormatting'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
  level?: 'page' | 'component' | 'section'
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
  retryCount: number
}

class EnhancedErrorBoundary extends Component<Props, State> {
  private retryTimer?: number
  private readonly maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component' } = this.props
    const errorId = this.state.errorId || 'unknown'

    // Track error with monitoring service
    monitoringService.trackError({
      message: `${level} error: ${error.message}`,
      stack: error.stack,
      url: window.location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      metadata: {
        error_id: errorId,
        error_boundary_level: level,
        component_stack: errorInfo.componentStack,
        retry_count: this.state.retryCount,
        error_digest: errorInfo.digest
      }
    })

    // Handle error with reliability service
    const userMessage = reliabilityService.handleUserFriendlyError(
      error,
      {
        component: 'error_boundary',
        action: 'component_render',
        metadata: {
          level,
          error_id: errorId,
          component_stack: errorInfo.componentStack
        }
      }
    )

    console.error('Error Boundary caught an error:', userMessage)

    // Store error info in state
    this.setState({ errorInfo })

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo)
    }

    // Auto-retry for component-level errors
    if (level === 'component' && this.state.retryCount < this.maxRetries) {
      this.scheduleRetry()
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
    }
  }

  private scheduleRetry = () => {
    const retryDelay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000) // Exponential backoff, max 10s
    
    this.retryTimer = window.setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        retryCount: prevState.retryCount + 1
      }))
    }, retryDelay)
  }

  private handleManualRetry = () => {
    // Track manual retry
    monitoringService.trackBusinessEvent({
      event_type: 'error_boundary_manual_retry',
      url: window.location.href,
      metadata: {
        error_id: this.state.errorId,
        retry_count: this.state.retryCount,
        level: this.props.level
      }
    })

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    })
  }

  private handleReportError = () => {
    const { error, errorInfo, errorId } = this.state
    
    // Create error report
    const errorReport = {
      error_id: errorId,
      message: error?.message,
      stack: error?.stack,
      component_stack: errorInfo?.componentStack,
      url: window.location.href,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      level: this.props.level
    }

    // Track error report submission
    monitoringService.trackBusinessEvent({
      event_type: 'error_report_submitted',
      url: window.location.href,
      metadata: errorReport
    })

    // Show confirmation
    alert('Error report sent. Thank you for helping us improve!')
  }

  private handleGoHome = () => {
    // Track navigation to home
    monitoringService.trackBusinessEvent({
      event_type: 'error_boundary_home_navigation',
      url: window.location.href,
      metadata: {
        error_id: this.state.errorId,
        from_url: window.location.href
      }
    })

    window.location.href = '/'
  }

  private renderErrorFallback = () => {
    const { error, errorId, retryCount } = this.state
    const { level = 'component', showDetails = false } = this.props
    const canRetry = retryCount < this.maxRetries

    // Different layouts based on error level
    if (level === 'page') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Oops! Something went wrong
            </h1>
            
            <p className="text-gray-600 mb-6">
              We encountered an unexpected error. Our team has been notified and is working to fix it.
            </p>

            {showDetails && error && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4 text-left">
                <p className="text-sm text-gray-700 font-medium mb-1">Error Details:</p>
                <p className="text-xs text-gray-600 font-mono break-all">
                  {error.message}
                </p>
                {errorId && (
                  <p className="text-xs text-gray-500 mt-1">
                    Error ID: {errorId}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              {canRetry && (
                <button
                  onClick={this.handleManualRetry}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Again</span>
                </button>
              )}
              
              <button
                onClick={this.handleGoHome}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Go Home</span>
              </button>
              
              <button
                onClick={this.handleReportError}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
              >
                <Bug className="w-4 h-4" />
                <span>Report Issue</span>
              </button>
            </div>

            {retryCount > 0 && (
              <p className="text-xs text-gray-500 mt-4">
                Retry attempts: {retryCount}/{this.maxRetries}
              </p>
            )}
          </div>
        </div>
      )
    }

    // Component-level error fallback
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">
              {level === 'section' ? 'Section Unavailable' : 'Component Error'}
            </h3>
            <p className="text-sm text-red-700 mt-1">
              This part of the page is temporarily unavailable.
            </p>
            
            {showDetails && error && (
              <details className="mt-2">
                <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
                  Technical details
                </summary>
                <div className="mt-1 text-xs text-red-600 font-mono bg-red-100 p-2 rounded">
                  {error.message}
                  {errorId && (
                    <div className="mt-1 text-red-500">
                      ID: {errorId}
                    </div>
                  )}
                </div>
              </details>
            )}
            
            <div className="flex space-x-2 mt-3">
              {canRetry && (
                <button
                  onClick={this.handleManualRetry}
                  className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              )}
              
              <button
                onClick={this.handleReportError}
                className="bg-red-100 text-red-700 px-3 py-1 rounded text-xs hover:bg-red-200 transition-colors flex items-center space-x-1"
              >
                <Bug className="w-3 h-3" />
                <span>Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  render() {
    const { hasError } = this.state
    const { children, fallback } = this.props

    if (hasError) {
      return fallback || this.renderErrorFallback()
    }

    return children
  }
}

export default EnhancedErrorBoundary
