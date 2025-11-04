// 404 Not Found Page
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft, Search, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Animated 404 Icon */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20 animate-pulse"></div>
          </div>
          <h1 className="relative text-9xl font-bold bg-gradient-to-br from-purple-600 to-pink-600 bg-clip-text text-transparent">
            404
          </h1>
        </div>

        {/* Error Title */}
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Page Not Found
        </h2>

        {/* Error Message */}
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed max-w-lg mx-auto">
          Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or the URL might be incorrect.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-2"
          >
            <Home className="w-5 h-5" />
            <span>Go to Homepage</span>
          </Button>

          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="px-8 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center space-x-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Go Back</span>
          </Button>

          <Button
            onClick={() => navigate('/search')}
            variant="outline"
            className="px-8 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center space-x-2"
          >
            <Search className="w-5 h-5" />
            <span>Search Wallpapers</span>
          </Button>
        </div>

        {/* Suggested Links */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center justify-center space-x-2">
            <HelpCircle className="w-5 h-5" />
            <span>Popular Pages</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/free-wallpapers')}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:underline transition-colors"
            >
              All Wallpapers
            </button>
            <button
              onClick={() => navigate('/categories')}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:underline transition-colors"
            >
              Categories
            </button>
            <button
              onClick={() => navigate('/collections')}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:underline transition-colors"
            >
              Collections
            </button>
            <button
              onClick={() => navigate('/premium')}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:underline transition-colors"
            >
              Premium
            </button>
          </div>
        </div>

        {/* Help Links */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Need help? Check out our resources:
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <button
              onClick={() => navigate('/help')}
              className="text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:underline transition-colors"
            >
              Help Center
            </button>
            <button
              onClick={() => navigate('/contact')}
              className="text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:underline transition-colors"
            >
              Contact Support
            </button>
            <button
              onClick={() => navigate('/about')}
              className="text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:underline transition-colors"
            >
              About Us
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
