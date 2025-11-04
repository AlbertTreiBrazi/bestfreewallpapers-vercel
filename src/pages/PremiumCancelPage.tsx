import React from 'react'
import { Link } from 'react-router-dom'
import { XCircle, ArrowLeft, Crown, Home, HelpCircle } from 'lucide-react'

export function PremiumCancelPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-8 text-center">
            <XCircle className="w-16 h-16 mx-auto text-white mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Payment Cancelled
            </h1>
            <p className="text-orange-100">
              No charges were made to your account
            </p>
          </div>
          
          <div className="p-6">
            <div className="text-center mb-6">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                You cancelled the payment process. No worries - you can try again anytime or continue using our free wallpapers.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center space-x-2">
                  <Crown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>Still interested in Premium?</span>
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  Get unlimited downloads, 8K quality, and exclusive content for just €4.99 + VAT per month.
                </p>
                <Link
                  to="/premium"
                  className="inline-flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                >
                  <span>Try subscribing again</span>
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </Link>
              </div>
            </div>
            
            <div className="mt-8 space-y-3">
              <Link
                to="/free-wallpapers"
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition duration-200 flex items-center justify-center space-x-2"
              >
                <span>Browse Free Wallpapers</span>
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </Link>
              
              <Link
                to="/"
                className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white py-3 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition duration-200 flex items-center justify-center space-x-2"
              >
                <Home className="w-5 h-5" />
                <span>Return to Home</span>
              </Link>
            </div>
            
            <div className="mt-6 text-center">
              <Link
                to="/help"
                className="inline-flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Need help? Contact support</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PremiumCancelPage