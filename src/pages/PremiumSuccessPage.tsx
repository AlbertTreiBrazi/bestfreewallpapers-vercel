import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { CheckCircle, Crown, Download, ArrowRight, Home } from 'lucide-react'
import toast from 'react-hot-toast'

export function PremiumSuccessPage() {
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [verifying, setVerifying] = useState(true)
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    const verifySubscription = async () => {
      if (!user || !sessionId) {
        setVerifying(false)
        return
      }

      try {
        // Wait a moment for webhook to process
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Check if subscription is active
        const { data, error } = await supabase
          .from('bfw_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle()

        if (error) {
          console.error('Error verifying subscription:', error)
        }

        if (data) {
          toast.success('Premium subscription activated successfully!')
        } else {
          // If not found immediately, subscription might still be processing
          toast.success('Payment received! Your premium access will be activated shortly.')
        }
      } catch (error) {
        console.error('Error during verification:', error)
        toast.success('Payment received! Your premium access will be activated shortly.')
      } finally {
        setVerifying(false)
      }
    }

    verifySubscription()
  }, [user, sessionId])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-8 text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-white mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Payment Successful!
            </h1>
            <p className="text-green-100">
              Welcome to BestFreeWallpapers Premium
            </p>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Crown className="w-6 h-6 text-green-600 dark:text-green-400" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Premium Access Activated
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {verifying ? 'Verifying your subscription...' : 'You now have full premium access'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  What's included:
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-center space-x-2">
                    <Download className="w-4 h-4 text-green-500" />
                    <span>Unlimited premium wallpaper downloads</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Download className="w-4 h-4 text-green-500" />
                    <span>Access to 8K Ultra HD quality</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Download className="w-4 h-4 text-green-500" />
                    <span>No ads, instant downloads</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Download className="w-4 h-4 text-green-500" />
                    <span>Exclusive premium-only content</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Download className="w-4 h-4 text-green-500" />
                    <span>Commercial use license</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="mt-8 space-y-3">
              <Link
                to="/premium"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition duration-200 flex items-center justify-center space-x-2"
              >
                <Crown className="w-5 h-5" />
                <span>Browse Premium Collection</span>
                <ArrowRight className="w-4 h-4" />
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
              <p className="text-xs text-gray-500 dark:text-gray-400">
                You will receive a confirmation email shortly.
                Manage your subscription anytime from your account.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PremiumSuccessPage