import React, { useState, useEffect } from 'react'
import { X, Download, Crown, Zap } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { startUnifiedDownload, triggerFileDownload, type DownloadParams } from '@/utils/cdnDownload'
import monitoringService from '@/services/monitoringService'
import { safeToastError, extractErrorMessage, handleComponentError } from '@/utils/errorFormatting'
import toast from 'react-hot-toast'
import { AdBanner } from './AdBanner'
import { getApiImageUrl } from '@/config/api'

interface DownloadModalProps {
  wallpaper: {
    id: number
    title: string
    image_url: string
    is_premium: boolean
    resolution_1080p: string | null
    resolution_4k: string | null
    resolution_8k: string | null
  }
  resolution: string
  isOpen: boolean
  onClose: () => void
}

export function DownloadModal({ wallpaper, resolution, isOpen, onClose }: DownloadModalProps) {
  const { user, profile } = useAuth()
  const [downloading, setDownloading] = useState(false)
  const [showAdBanner, setShowAdBanner] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [adSettings, setAdSettings] = useState<any>(null)
  const [anonymousToken, setAnonymousToken] = useState<string | null>(null)

  const isPremiumUser = profile?.plan_type === 'premium' && 
                       (!profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date())
  
  // Debug logging for premium status
  console.log('DownloadModal: Premium status check', { 
    profile, 
    planType: profile?.plan_type, 
    expiresAt: profile?.premium_expires_at,
    isPremium: isPremiumUser 
  })

  useEffect(() => {
    if (isOpen) {
      // Reset states
      setShowAdBanner(false)
      setAuthToken(null)
      setAnonymousToken(null)
      
      loadAdSettings()
      
      if (user) {
        // For authenticated users
        console.log('DownloadModal: User authenticated', { user: user.email, isPremium: isPremiumUser, profile })
        getAuthToken()
        
        // Universal ad policy: Show ad countdown for ALL non-premium users (free and guest)
        if (!isPremiumUser) {
          console.log('DownloadModal: Showing ad banner for non-premium user (universal policy)')
          setShowAdBanner(true)
        } else {
          console.log('DownloadModal: Premium user - no ad banner')
          setShowAdBanner(false)
        }
      } else {
        // Anonymous user - show ad banner
        console.log('DownloadModal: Anonymous user - showing ad banner')
        setShowAdBanner(true)
        generateAnonymousToken()
      }
    }
  }, [isOpen, isPremiumUser, user, profile])

  const loadAdSettings = async () => {
    try {
      // Load appropriate ad settings based on user status
      const action = user ? 'get_logged_in' : 'get_guest'
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ad-settings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ action })
        }
      )

      if (response.ok) {
        const result = await response.json()
        setAdSettings(result.data)
      }
    } catch (error) {
      console.error('Failed to load ad settings:', error)
    }
  }

  const generateAnonymousToken = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-anonymous-token`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ wallpaperId: wallpaper.id })
        }
      )

      if (response.ok) {
        const result = await response.json()
        setAnonymousToken(result.data.token)
      } else {
        const errorResult = await response.json()
        safeToastError(errorResult.error, 'Failed to prepare download')
      }
    } catch (error: any) {
      console.error('Failed to generate anonymous token:', error)
      safeToastError(error, 'Failed to prepare download. Please try again.')
    }
  }

  const getAuthToken = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        setAuthToken(session.access_token)
        if (isPremiumUser) {
          // For premium users, we can immediately prepare for download
          setShowAdBanner(false)
        }
      } else {
        throw new Error('No valid session found')
      }
    } catch (error: any) {
      console.error('Failed to get auth token:', error)
      safeToastError(error, 'Authentication failed. Please sign in again.')
    }
  }

  const handleDownload = async () => {
    // Track download attempt
    monitoringService.trackDownloadStarted(wallpaper.id.toString(), user?.id)
    monitoringService.trackBusinessEvent({
      event_type: 'download_attempt',
      user_id: user?.id,
      url: window.location.href,
      metadata: {
        wallpaper_id: wallpaper.id,
        wallpaper_title: wallpaper.title,
        resolution: resolution,
        user_type: user ? (isPremiumUser ? 'premium' : 'free') : 'anonymous',
        is_premium_wallpaper: wallpaper.is_premium
      }
    })
    
    // Universal download handler - works for all user types
    if (user && authToken) {
      // Authenticated users (free and premium)
      await handleAuthenticatedDownload()
    } else if (anonymousToken) {
      // Anonymous users
      await handleAnonymousDownload()
    } else {
      // Track failed download preparation
      monitoringService.trackBusinessEvent({
        event_type: 'download_preparation_failed',
        user_id: user?.id,
        url: window.location.href,
        metadata: {
          wallpaper_id: wallpaper.id,
          reason: 'no_token_available',
          user_type: user ? (isPremiumUser ? 'premium' : 'free') : 'anonymous'
        }
      })
      
      safeToastError('Download not ready. Please try again.')
    }
  }
  
  const handleAuthenticatedDownload = async () => {
    if (!user || !authToken) {
      safeToastError('Please sign in to download wallpapers')
      return
    }

    setDownloading(true)
    const downloadStartTime = Date.now()
    
    try {
      // Step 1: Get fresh download token from download-wallpaper edge function
      const tokenResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-wallpaper`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            wallpaper_id: wallpaper.id,
            resolution: resolution
          })
        }
      )

      if (!tokenResponse.ok) {
        const errorResult = await tokenResponse.json()
        throw new Error(errorResult.error?.message || 'Failed to prepare download')
      }

      const tokenResult = await tokenResponse.json()
      const downloadToken = tokenResult.data.download_token
      
      console.log('Got fresh download token for:', {
        wallpaper_id: wallpaper.id,
        resolution,
        user_type: isPremiumUser ? 'premium' : 'free',
        token: (downloadToken || 'undefined').substring(0, 8) + '...'
      })
      
      // Step 2: Use token to get actual download URL
      const downloadResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-file?token=${downloadToken}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          }
        }
      )
      
      if (!downloadResponse.ok) {
        const errorResult = await downloadResponse.json()
        throw new Error(errorResult.error?.message || 'Failed to get download URL')
      }
      
      const downloadResult = await downloadResponse.json()
      const { download_url, filename } = downloadResult.data
      
      console.log('Got download URL:', { download_url: (download_url || 'undefined').substring(0, 50) + '...', filename })
      
      // Step 3: Trigger file download
      triggerFileDownload(download_url, filename)
      
      // Track successful download
      const downloadDuration = Date.now() - downloadStartTime
      monitoringService.trackDownloadCompleted(wallpaper.id.toString(), user.id)
      monitoringService.trackBusinessEvent({
        event_type: 'download_success',
        user_id: user.id,
        url: window.location.href,
        metadata: {
          wallpaper_id: wallpaper.id,
          wallpaper_title: wallpaper.title,
          resolution: resolution,
          filename: filename,
          user_type: isPremiumUser ? 'premium' : 'free',
          download_duration_ms: downloadDuration,
          is_premium_wallpaper: wallpaper.is_premium
        }
      })
      
      toast.success(`Download started! File: ${filename}`)
      
      // Close modal after successful download
      setTimeout(() => {
        onClose()
      }, 1500)
      
    } catch (error: any) {
      console.error('Download error:', error)
      
      // Track download failure
      const downloadDuration = Date.now() - downloadStartTime
      monitoringService.trackError({
        message: `Authenticated download failed: ${error.message}`,
        url: window.location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        metadata: {
          wallpaper_id: wallpaper.id,
          resolution: resolution,
          user_type: isPremiumUser ? 'premium' : 'free',
          download_duration_ms: downloadDuration
        }
      })
      
      monitoringService.trackBusinessEvent({
        event_type: 'download_failed',
        user_id: user.id,
        url: window.location.href,
        metadata: {
          wallpaper_id: wallpaper.id,
          error_message: error.message,
          user_type: isPremiumUser ? 'premium' : 'free',
          download_duration_ms: downloadDuration,
          failure_step: error.message.includes('TOKEN_EXPIRED') ? 'token_validation' : 
                        error.message.includes('not found') ? 'file_retrieval' : 'preparation'
        }
      })
      
      let errorMessage = 'Download failed. Please try again.'
      
      if (error.message?.includes('TIMER_NOT_COMPLETED')) {
        errorMessage = 'Please wait for the countdown to complete before downloading.'
      } else if (error.message?.includes('TOKEN_EXPIRED')) {
        errorMessage = 'Download session expired. Please try again.'
      } else if (error.message?.includes('not found')) {
        errorMessage = 'Wallpaper not found. Please try a different one.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage)
    } finally {
      setDownloading(false)
    }
  }

    const handleAnonymousDownload = async () => {
    if (!anonymousToken) {
      safeToastError('Download not ready. Please try again.')
      return
    }

    setDownloading(true)
    const downloadStartTime = Date.now()
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anonymous-download`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            wallpaperId: wallpaper.id,
            token: anonymousToken
          })
        }
      )

      if (response.ok) {
        const result = await response.json()
        const { downloadUrl, filename } = result.data
        
        // Trigger file download
        triggerFileDownload(downloadUrl, filename)
        
        // Track successful anonymous download
        const downloadDuration = Date.now() - downloadStartTime
        monitoringService.trackDownloadCompleted(wallpaper.id.toString())
        monitoringService.trackBusinessEvent({
          event_type: 'download_success',
          url: window.location.href,
          metadata: {
            wallpaper_id: wallpaper.id,
            wallpaper_title: wallpaper.title,
            resolution: resolution,
            filename: filename,
            user_type: 'anonymous',
            download_duration_ms: downloadDuration,
            is_premium_wallpaper: wallpaper.is_premium
          }
        })
        
        toast.success('Download started!')
        setTimeout(() => onClose(), 1500)
      } else {
        const errorResult = await response.json()
        throw new Error(errorResult.error?.message || 'Download failed')
      }
    } catch (error: any) {
      console.error('Anonymous download error:', error)
      
      // Track anonymous download failure
      const downloadDuration = Date.now() - downloadStartTime
      monitoringService.trackError({
        message: `Anonymous download failed: ${error.message}`,
        url: window.location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        metadata: {
          wallpaper_id: wallpaper.id,
          resolution: resolution,
          user_type: 'anonymous',
          download_duration_ms: downloadDuration
        }
      })
      
      monitoringService.trackBusinessEvent({
        event_type: 'download_failed',
        url: window.location.href,
        metadata: {
          wallpaper_id: wallpaper.id,
          error_message: error.message,
          user_type: 'anonymous',
          download_duration_ms: downloadDuration,
          failure_step: 'anonymous_download'
        }
      })
      
      safeToastError(error, 'Download failed. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const handleCountdownComplete = () => {
    // After countdown completes, user can download
    setShowAdBanner(false)
  }

  const handleUpgrade = () => {
    // TODO: Implement premium upgrade flow
    toast.success('Premium upgrade coming soon!')
  }

  const handleClose = () => {
    setShowAdBanner(false)
    setAuthToken(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div className="modal-backdrop bg-black bg-opacity-90 fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
        <div className="modal-content bg-white dark:bg-gray-900 rounded-lg w-full max-w-[calc(100vw-1rem)] sm:max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto touch-pan-y overscroll-contain">
          {/* Mobile-optimized content wrapper */}
          <div className="relative w-full h-full flex flex-col">
          {/* Header - Mobile Optimized */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
              Download Wallpaper
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content - Mobile Optimized */}
          <div className="p-4 sm:p-6">
            {/* Wallpaper Info - No Preview Image for Mobile */}
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-1 text-base md:text-lg text-center">{wallpaper.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">Resolution: {resolution.toUpperCase()}</p>
            </div>

            {/* Premium Users - Instant Download */}
            {isPremiumUser && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                  <Crown className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-medium">Premium Member - Instant Download</span>
                </div>
                
                {authToken && (
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="w-full flex items-center justify-center space-x-2 bg-gray-600 text-white py-4 px-6 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 text-base min-h-[48px] touch-manipulation font-semibold shadow-lg"
                  >
                    <Zap className="w-6 h-6" />
                    <span>{downloading ? 'Preparing Download...' : 'Download Now'}</span>
                  </button>
                )}
              </div>
            )}

            {/* Free Users - Professional Ad Banner with Countdown */}
            {!isPremiumUser && (
              <div className="space-y-4">
                {/* Universal Download Message */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {user ? 'Free access' : 'Guest access'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    {user ? 'Free download in 15s' : 'Free download in 30s'}
                  </p>
                </div>
                {showAdBanner && (
                  <AdBanner
                    onCountdownComplete={handleCountdownComplete}
                    onUpgrade={handleUpgrade}
                    wallpaperTitle={wallpaper.title}
                    countdownDuration={
                      user 
                        ? (adSettings?.logged_in_timer_duration || 6)   // FIXED: Free users: 6s (consistent with admin panel)
                        : (adSettings?.guest_timer_duration || 15)      // FIXED: Guest users: 15s (consistent with admin panel)
                    }
                  />
                )}

                {/* Download Button (after countdown) - Mobile Optimized */}
                {(!showAdBanner || isPremiumUser) && (authToken || anonymousToken) && (
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="w-full flex items-center justify-center space-x-2 bg-gray-600 text-white py-4 px-6 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 text-base min-h-[48px] touch-manipulation font-semibold shadow-lg"
                  >
                    <Download className="w-6 h-6" />
                    <span>{downloading ? 'Preparing Download...' : 'Download Now'}</span>
                  </button>
                )}

                {/* Rate Limit Notice - Mobile Friendly */}
                <div className="text-center bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {user ? 'All wallpapers available • 30 downloads per hour limit' : 'All wallpapers available • 5 downloads per 20 minutes'}
                  </p>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </>
  )
}