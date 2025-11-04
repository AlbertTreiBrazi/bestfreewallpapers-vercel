// 500 Server Error Page
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, RefreshCw, AlertTriangle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { errorLogger } from '@/utils/errorLogger'

export function ServerErrorPage() {
  const navigate = useNavigate()
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    errorLogger.info('User initiated page refresh from 500 error page')
    window.location.reload()
  }

  const handleReportIssue = () => {
    errorLogger.info('User initiated issue report from 500 error page')
    navigate('/contact?subject=Error Report')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Error Icon with Animation */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 bg-gradient-to-br from-red-400 to-orange-400 rounded-full opacity-20 animate-pulse"></div>
          </div>
          <div className="relative inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-red-500 to-orange-500 rounded-full shadow-lg">
            <AlertTriangle className="w-16 h-16 text-white" />
          </div>
        </div>

        {/* Error Code */}
        <h1 className="text-8xl font-bold bg-gradient-to-br from-red-600 to-orange-600 bg-clip-text text-transparent mb-4">
          500
        </h1>

        {/* Error Title */}
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Something Went Wrong
        </h2>

        {/* Error Message */}
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed max-w-lg mx-auto">
          We're experiencing technical difficulties. Our team has been notified and is working to fix this issue. Please try again in a few moments.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-8 py-3 rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Try Again'}</span>
          </Button>

          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="px-8 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center space-x-2"
          >
            <Home className="w-5 h-5" />
            <span>Go to Homepage</span>
          </Button>

          <Button
            onClick={handleReportIssue}
            variant="outline"
            className="px-8 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center space-x-2"
          >
            <Mail className="w-5 h-5" />
            <span>Report Issue</span>
          </Button>
        </div>

        {/* Status Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            What can you do?
          </h3>
          <div className="text-left space-y-3 max-w-md mx-auto">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400">1</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Wait a few moments and try refreshing the page
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400">2</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Clear your browser cache and cookies
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400">3</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                If the problem persists, contact our support team
              </p>
            </div>
          </div>
        </div>

        {/* Help Links */}
        <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Need immediate assistance?
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <button
              onClick={() => navigate('/help')}
              className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:underline transition-colors"
            >
              Help Center
            </button>
            <button
              onClick={() => navigate('/contact')}
              className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:underline transition-colors"
            >
              Contact Support
            </button>
            <button
              onClick={() => navigate('/about')}
              className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:underline transition-colors"
            >
              About Us
            </button>
          </div>
        </div>

        {/* Technical Info (Development Only) */}
        {import.meta.env.DEV && (
          <div className="mt-8 bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-left">
            <details>
              <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                Technical Information (Development Mode)
              </summary>
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 font-mono">
                <p>Timestamp: {new Date().toISOString()}</p>
                <p>URL: {window.location.href}</p>
                <p>User Agent: {navigator.userAgent}</p>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}

export default ServerErrorPage
