import React from 'react'
import { useNavigate, useRouteError } from 'react-router-dom'
import { AlertTriangle, Home, RefreshCw, Search, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface ErrorPageProps {
  code?: string
  title?: string
  message?: string
  showBackButton?: boolean
  showSearchButton?: boolean
  customActions?: React.ReactNode
}

const ErrorPage: React.FC<ErrorPageProps> = ({
  code = '404',
  title,
  message,
  showBackButton = true,
  showSearchButton = true,
  customActions
}) => {
  const navigate = useNavigate()
  const error = useRouteError() as any
  
  // Default error content based on code
  const getErrorContent = (errorCode: string) => {
    switch (errorCode) {
      case '404':
        return {
          title: 'Page Not Found',
          message: 'Sorry, we couldn\'t find the page you\'re looking for. It might have been moved, deleted, or you entered the wrong URL.',
          bgGradient: 'from-purple-400 to-pink-400'
        }
      case '500':
        return {
          title: 'Server Error',
          message: 'Something went wrong on our end. We\'re working to fix this issue. Please try again later.',
          bgGradient: 'from-red-400 to-orange-400'
        }
      case '403':
        return {
          title: 'Access Forbidden',
          message: 'You don\'t have permission to access this resource. Please check your credentials or contact support.',
          bgGradient: 'from-yellow-400 to-red-400'
        }
      case 'maintenance':
        return {
          title: 'Under Maintenance',
          message: 'We\'re currently performing scheduled maintenance to improve your experience. We\'ll be back shortly!',
          bgGradient: 'from-blue-400 to-purple-400'
        }
      default:
        return {
          title: 'Something Went Wrong',
          message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
          bgGradient: 'from-gray-400 to-blue-400'
        }
    }
  }
  
  const errorContent = getErrorContent(code)
  const displayTitle = title || errorContent.title
  const displayMessage = message || errorContent.message
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Error Icon with Gradient Background */}
        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br ${errorContent.bgGradient} mb-8 shadow-lg`}>
          <AlertTriangle className="w-12 h-12 text-white" />
        </div>
        
        {/* Error Code */}
        <div className="mb-6">
          <h1 className={`text-8xl font-bold bg-gradient-to-br ${errorContent.bgGradient} bg-clip-text text-transparent mb-2`}>
            {code}
          </h1>
        </div>
        
        {/* Error Title */}
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {displayTitle}
        </h2>
        
        {/* Error Message */}
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
          {displayMessage}
        </p>
        
        {/* Development Error Details */}
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mb-8 text-left bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <summary className="cursor-pointer font-medium mb-2">Error Details (Development)</summary>
            <pre className="text-xs overflow-auto max-h-40 text-red-600 dark:text-red-400">
              {error.stack || error.message || JSON.stringify(error, null, 2)}
            </pre>
          </details>
        )}
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {/* Custom Actions */}
          {customActions}
          
          {/* Default Actions */}
          {!customActions && (
            <>
              <Button
                onClick={() => navigate('/')}
                className={`bg-gradient-to-r ${errorContent.bgGradient} text-white px-8 py-3 rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-2`}
              >
                <Home className="w-5 h-5" />
                <span>Go to Homepage</span>
              </Button>
              
              {showBackButton && (
                <Button
                  onClick={() => navigate(-1)}
                  variant="outline"
                  className="px-8 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center space-x-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Go Back</span>
                </Button>
              )}
              
              {showSearchButton && code === '404' && (
                <Button
                  onClick={() => navigate('/search')}
                  variant="outline" 
                  className="px-8 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center space-x-2"
                >
                  <Search className="w-5 h-5" />
                  <span>Search Wallpapers</span>
                </Button>
              )}
              
              {(code === '500' || code === 'maintenance') && (
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="px-8 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center space-x-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>Try Again</span>
                </Button>
              )}
            </>
          )}
        </div>
        
        {/* Additional Help Links */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Need help? Check out our resources:
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <button 
              onClick={() => navigate('/help')}
              className="text-gray-600 dark:text-gray-400 hover:underline"
            >
              Help Center
            </button>
            <button 
              onClick={() => navigate('/contact')}
              className="text-gray-600 dark:text-gray-400 hover:underline"
            >
              Contact Support
            </button>
            <button 
              onClick={() => navigate('/about')}
              className="text-gray-600 dark:text-gray-400 hover:underline"
            >
              About Us
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Specific error page components
export const NotFoundPage: React.FC = () => (
  <ErrorPage code="404" />
)

export const ServerErrorPage: React.FC = () => (
  <ErrorPage code="500" />
)

export const ForbiddenPage: React.FC = () => (
  <ErrorPage code="403" />
)

export const MaintenancePage: React.FC = () => (
  <ErrorPage 
    code="maintenance" 
    showBackButton={false}
    showSearchButton={false}
    customActions={
      <div className="flex flex-col gap-4">
        <Button
          onClick={() => window.location.reload()}
          className="bg-gradient-to-r from-blue-400 to-purple-400 text-white px-8 py-3 rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-2"
        >
          <RefreshCw className="w-5 h-5" />
          <span>Check Again</span>
        </Button>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Follow us for updates: 
          <a href="https://twitter.com/bestfreewallpapers" className="text-gray-600 dark:text-gray-400 hover:underline ml-1">
            @bestfreewallpapers
          </a>
        </p>
      </div>
    }
  />
)

export default ErrorPage
