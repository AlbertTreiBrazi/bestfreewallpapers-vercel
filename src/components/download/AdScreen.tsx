import React, { useState, useEffect } from 'react'
import { X, Download, Clock, Crown, Timer } from 'lucide-react'
import { safeToastError, extractErrorMessage } from '@/utils/errorFormatting'
import toast from 'react-hot-toast'

interface AdSettings {
  countdown_duration: number
  ad_title: string
  ad_description: string
  ad_image_url: string | null
  is_active: boolean
}

interface AdScreenProps {
  isOpen: boolean
  onClose: () => void
  onFinished?: () => void
  downloadUrl: string
  resolution: string
  wallpaperTitle: string
  isUserLoggedIn?: boolean
  isPremiumUser?: boolean
  countdownDuration?: number
}

export function AdScreen({ 
  isOpen, 
  onClose, 
  onFinished, 
  downloadUrl, 
  resolution, 
  wallpaperTitle, 
  isUserLoggedIn = false, 
  isPremiumUser = false,
  countdownDuration 
}: AdScreenProps) {
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null)
  const [countdown, setCountdown] = useState(6)
  const [isDownloadReady, setIsDownloadReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [adInteracted, setAdInteracted] = useState(false)
  const [tierAtClick, setTierAtClick] = useState<string | null>(null)
  const [finalCountdownDuration, setFinalCountdownDuration] = useState<number | null>(null)

  // BUG FIX 1: Determine user tier ONCE on click and store as tierAtClick
  // This prevents timer jumps during the session
  const userTier = tierAtClick || (isPremiumUser ? 'premium' : (isUserLoggedIn ? 'free' : 'guest'))
  const requiresTimer = userTier === 'free'
  const requiresAd = userTier !== 'premium'
  
  // BUG FIX 1: Fixed timer durations based on requirements
  // Guest: 15s, Free: 6s, Premium: 0s
  const getDefaultTimer = (tier: string) => {
    switch (tier) {
      case 'premium': return 0
      case 'free': return 6
      case 'guest': return 15
      default: return 15
    }
  }

  // BUG FIX 1: Initialize tier and timer on modal open (only once)
  useEffect(() => {
    if (isOpen && !tierAtClick) {
      // Snapshot the user tier at click time - this prevents timer jumps
      const currentTier = isPremiumUser ? 'premium' : (isUserLoggedIn ? 'free' : 'guest')
      setTierAtClick(currentTier)
      
      console.log('AdScreen: Tier snapshotted at click:', currentTier)
      
      // Premium users get instant download
      if (currentTier === 'premium') {
        setIsDownloadReady(true)
        setLoading(false)
        // Auto-trigger download for premium users
        setTimeout(() => {
          if (onFinished) {
            onFinished()
          }
        }, 100)
        return
      }
      
      loadAdSettings()
    }
  }, [isOpen, isPremiumUser, isUserLoggedIn])

  // BUG FIX 1: Start countdown only once with snapshotted values
  useEffect(() => {
    if (isOpen && adSettings && tierAtClick && finalCountdownDuration === null) {
      // Calculate final countdown duration ONCE and store it
      let timerDuration = getDefaultTimer(tierAtClick)
      
      // Override with backend settings if available
      if (tierAtClick === 'free' && adSettings.countdown_duration) {
        timerDuration = adSettings.countdown_duration
      } else if (tierAtClick === 'guest') {
        // Guest users always get 15s (requirement)
        timerDuration = 15
      }
      
      // Override with explicit countdown if provided
      if (countdownDuration) {
        timerDuration = countdownDuration
      }
      
      setFinalCountdownDuration(timerDuration)
      
      console.log('AdScreen: Final countdown duration set:', {
        tier: tierAtClick,
        duration: timerDuration,
        source: countdownDuration ? 'explicit' : 'calculated'
      })
      
      if (tierAtClick === 'free' || tierAtClick === 'guest') {
        setCountdown(timerDuration)
        setIsDownloadReady(false)
        
        // Single countdown timer - no resets or jumps
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              setIsDownloadReady(true)
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)

        return () => clearInterval(timer)
      } else {
        // Premium users - instant
        setIsDownloadReady(true)
        setCountdown(0)
      }
    }
  }, [isOpen, adSettings, tierAtClick, finalCountdownDuration, countdownDuration])

  const loadAdSettings = async () => {
    setLoading(true)
    try {
      // Determine which ad settings to load based on user type
      const action = isUserLoggedIn ? 'get_logged_in' : 'get_guest'
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ad-settings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action })
        }
      )

      if (response.ok) {
        const result = await response.json()
        const adData = result.data
        
        // BUG FIX 1: Extract the correct timer duration based on user type
        let timerDuration = getDefaultTimer(tierAtClick || userTier)
        if (!countdownDuration) {
          if (tierAtClick === 'free' || isUserLoggedIn) {
            timerDuration = adData.logged_in_timer_duration || 6
          } else if (tierAtClick === 'guest' || !isUserLoggedIn) {
            // BUG FIX 1: Guest timer must be 15s as per requirements
            timerDuration = adData.guest_timer_duration || 15
          }
        }
        
        // Convert to old AdSettings format for compatibility
        setAdSettings({
          countdown_duration: timerDuration,
          ad_title: userTier === 'premium' ? 'Premium Download' : (userTier === 'free' ? 'Free User Download' : 'Support Us'),
          ad_description: userTier === 'premium' ? 'Enjoy instant downloads!' : 'Please wait while we prepare your download...',
          ad_image_url: isUserLoggedIn ? adData.logged_in_ad_image_url : adData.guest_ad_image_url,
          is_active: isUserLoggedIn ? adData.logged_in_ad_active : adData.guest_ad_active
        })
      } else {
        // BUG FIX 1: Fallback to default settings with correct user-based timers
        const fallbackTimer = getDefaultTimer(tierAtClick || userTier)
        setAdSettings({
          countdown_duration: countdownDuration || fallbackTimer,
          ad_title: userTier === 'premium' ? 'Premium Download' : (userTier === 'free' ? 'Free User Download' : 'Support Us'),
          ad_description: userTier === 'premium' ? 'Enjoy instant downloads!' : 'Please wait while we prepare your download...',
          ad_image_url: null,
          is_active: true
        })
      }
    } catch (error) {
      console.error('Failed to load ad settings:', error)
      // BUG FIX 1: Use default settings with correct user-based timers
      const fallbackTimer = getDefaultTimer(tierAtClick || userTier)
      setAdSettings({
        countdown_duration: countdownDuration || fallbackTimer,
        ad_title: userTier === 'premium' ? 'Premium Download' : (userTier === 'free' ? 'Free User Download' : 'Support Us'),
        ad_description: userTier === 'premium' ? 'Enjoy instant downloads!' : 'Please wait while we prepare your download...',
        ad_image_url: null,
        is_active: true
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAdInteraction = () => {
    if (userTier === 'guest') {
      setAdInteracted(true)
      setIsDownloadReady(true)
    }
  }

  const handleDownload = async () => {
    // Check download readiness based on user tier
    if (userTier === 'premium') {
      // Premium: Always ready
    } else if (userTier === 'free') {
      // Free: Requires both ad interaction and timer completion
      if (!isDownloadReady) {
        safeToastError(`Please wait ${countdown} more seconds`)
        return
      }
    } else {
      // Guest: Requires ad interaction
      if (!adInteracted) {
        safeToastError('Please interact with the ad first')
        return
      }
    }

    try {
      console.log('AdScreen: Download conditions met, triggering download')
      
      // Call the parent's download handler
      if (onFinished) {
        onFinished()
      } else {
        console.error('AdScreen: No onFinished callback provided')
        safeToastError('Download configuration error. Please try again.')
      }
      
    } catch (error: any) {
      console.error('AdScreen: Download trigger failed:', error)
      safeToastError(error, 'Download failed')
    }
  }

  if (!isOpen) return null

  if (loading || !adSettings) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              {isPremiumUser ? 'Preparing your instant download...' : 'Loading...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Determine if download button should be enabled
  const isDownloadButtonEnabled = () => {
    if (userTier === 'premium') return true
    if (userTier === 'free') return isDownloadReady
    if (userTier === 'guest') return adInteracted
    return false
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            {userTier === 'premium' && <Crown className="w-5 h-5 text-yellow-500" />}
            {userTier === 'free' && <Timer className="w-5 h-5 text-blue-500" />}
            {userTier === 'guest' && <Clock className="w-5 h-5 text-gray-500" />}
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {adSettings.ad_title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ad Content */}
        <div className="p-6">
          {/* User Tier Indicator */}
          <div className={`mb-4 p-3 rounded-lg ${
            userTier === 'premium' ? 'bg-yellow-50 border border-yellow-200' :
            userTier === 'free' ? 'bg-blue-50 border border-blue-200' :
            'bg-gray-50 border border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {userTier === 'premium' && (
                  <>
                    <Crown className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Premium User</span>
                  </>
                )}
                {userTier === 'free' && (
                  <>
                    <Timer className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Free User</span>
                  </>
                )}
                {userTier === 'guest' && (
                  <>
                    <Clock className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-800">Guest User</span>
                  </>
                )}
              </div>
              <div className="text-xs text-gray-600">
                {userTier === 'premium' && 'Instant Download'}
                {userTier === 'free' && 'Timer + Ad Required'}
                {userTier === 'guest' && 'Ad Interaction Required'}
              </div>
            </div>
          </div>

          {/* Ad Image */}
          {adSettings.ad_image_url && (
            <div className="mb-6">
              <img
                src={adSettings.ad_image_url}
                alt="Advertisement"
                className="w-full h-48 object-cover rounded-lg cursor-pointer"
                onClick={handleAdInteraction}
              />
              {userTier === 'guest' && !adInteracted && (
                <p className="text-sm text-center text-gray-500 mt-2">
                  Click on the ad above to enable download
                </p>
              )}
            </div>
          )}

          {/* Ad Description */}
          <div className="text-center mb-8">
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
              {adSettings.ad_description}
            </p>
            
            {/* Wallpaper Info */}
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                {wallpaperTitle}
              </h4>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Resolution: {resolution.toUpperCase()}
              </div>
            </div>

            {/* Timer for Free Users */}
            {userTier === 'free' && !isDownloadReady && (
              <div className="text-center mb-4">
                <div className="text-6xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {countdown}
                </div>
                <p className="text-blue-600 dark:text-blue-400 font-medium">
                  Your download will be ready in {countdown} second{countdown !== 1 ? 's' : ''}
                </p>
                <div className="text-xs text-gray-500 mt-2">
                  Free users must wait for the timer to complete
                </div>
              </div>
            )}

            {/* Ready State */}
            {isDownloadButtonEnabled() && (
              <div className="text-center mb-4">
                <div className="text-green-600 dark:text-green-400 mb-2">
                  <div className="text-2xl font-bold mb-1">Ready!</div>
                  <p>
                    {userTier === 'premium' ? 'Your instant download is ready' :
                     userTier === 'free' ? 'Timer complete - download now available' :
                     'Ad interaction complete - download available'}
                  </p>
                </div>
              </div>
            )}

            {/* Guest Ad Interaction Status */}
            {userTier === 'guest' && !adInteracted && adSettings.ad_image_url && (
              <div className="text-center mb-4">
                <div className="text-gray-600 dark:text-gray-400">
                  <p className="text-sm">Please click on the advertisement above to continue</p>
                </div>
              </div>
            )}
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={!isDownloadButtonEnabled()}
            className={`w-full flex items-center justify-center space-x-2 py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 ${
              isDownloadButtonEnabled()
                ? userTier === 'premium' 
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white hover:from-yellow-600 hover:to-yellow-700'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            <Download className="w-6 h-6" />
            <span>
              {userTier === 'premium' ? 'Instant Download' :
               isDownloadButtonEnabled() ? 'Download Now' :
               userTier === 'free' ? `Wait ${countdown}s` :
               'Interact with Ad First'}
            </span>
          </button>

          {/* Fine Print */}
          <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
            <p>
              {userTier === 'premium' ? 
                'Enjoying Premium? Share BestFreeWallpapers with friends!' :
                'By downloading, you agree to our terms of service. Consider upgrading to Premium for instant downloads!'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}