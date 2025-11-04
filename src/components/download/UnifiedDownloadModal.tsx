// Unified Download Modal - Single Source of Truth for Download UI
// Eliminates download UI duplication and ensures consistent behavior

import React, { useState, useEffect } from 'react'
import { X, Download, Clock, Crown, Zap, User } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

interface UnifiedDownloadModalProps {
  isOpen: boolean
  onClose: () => void
  wallpaper: {
    id: number
    title: string
    image_url: string
  } | null
  resolution: string
  userType: 'guest' | 'free' | 'premium'
  timerDuration: number
  showAdTimer: boolean
  isDownloading: boolean
  onDownload: () => void
  onTimerComplete: () => void
  isGuestLiveVideoDownload?: boolean
  onOpenAuthModal?: () => void
}

// CRITICAL FIX: Ad Content Component
function AdContent({ userType }: { userType: string }) {
  const { theme } = useTheme()
  const [adSettings, setAdSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAdSettings()
  }, [userType])

  const loadAdSettings = async () => {
    try {
      const action = userType === 'guest' ? 'get_guest' : 'get_logged_in'
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
        setAdSettings(result.data)
      }
    } catch (error) {
      console.error('Failed to load ad settings:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mb-6 flex items-center justify-center h-48 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading ad...</p>
        </div>
      </div>
    )
  }

  // Get the appropriate image URL based on user type and settings
  const getAdImageUrl = () => {
    if (!adSettings) return null
    
    if (userType === 'guest') {
      if (adSettings.guest_ad_content_type === 'image_upload') {
        return adSettings.guest_ad_image_url
      } else if (adSettings.guest_ad_content_type === 'external_url') {
        return adSettings.guest_ad_external_url
      }
    } else {
      if (adSettings.logged_in_ad_content_type === 'image_upload') {
        return adSettings.logged_in_ad_image_url
      } else if (adSettings.logged_in_ad_content_type === 'external_url') {
        return adSettings.logged_in_ad_external_url
      }
    }
    
    return null
  }

  const adImageUrl = getAdImageUrl()
  const isHtmlContent = userType === 'guest' 
    ? adSettings?.guest_ad_content_type === 'html_adsense'
    : adSettings?.logged_in_ad_content_type === 'html_adsense'
    
  const htmlContent = userType === 'guest'
    ? adSettings?.guest_ad_html_content
    : adSettings?.logged_in_ad_html_content

  return (
    <div className="mb-6">
      <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700" style={{ minHeight: '200px' }}>
        {isHtmlContent && htmlContent ? (
          <div 
            className="w-full h-full p-4 bg-white dark:bg-gray-800"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        ) : adImageUrl ? (
          <div className="relative w-full h-48">
            <img
              src={adImageUrl}
              alt="Advertisement"
              className="w-full h-full object-contain bg-gray-50 dark:bg-gray-800"
              onError={(e) => {
                console.error('Ad image failed to load:', adImageUrl)
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling?.classList.remove('hidden')
              }}
            />
            <div className="hidden w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <p className="text-gray-500 dark:text-gray-400">Ad image unavailable</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-48 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
            <div className="text-center text-white p-4">
              <h3 className="text-base font-bold mb-1">Free Wallpapers</h3>
              <p className="text-xs opacity-90">Supported by ads</p>
            </div>
          </div>
        )}
        
        {/* Ad Label */}
        <div className="absolute top-2 right-2 bg-black/20 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
          Advertisement
        </div>
      </div>
      
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
        Please wait for the timer
      </p>
    </div>
  )
}

export function UnifiedDownloadModal({
  isOpen,
  onClose,
  wallpaper,
  resolution,
  userType,
  timerDuration,
  showAdTimer,
  isDownloading,
  onDownload,
  onTimerComplete,
  isGuestLiveVideoDownload = false,
  onOpenAuthModal
}: UnifiedDownloadModalProps) {
  const { theme } = useTheme()
  const [timeLeft, setTimeLeft] = useState(timerDuration)
  const [isCountdownComplete, setIsCountdownComplete] = useState(false)
  
  // DEBUG: Log all props
  console.log('DEBUG: UnifiedDownloadModal render', {
    isOpen,
    wallpaper: wallpaper?.title,
    resolution,
    userType,
    isGuestLiveVideoDownload,
    onOpenAuthModal: !!onOpenAuthModal
  })

  // Reset countdown when modal opens or timer duration changes
  useEffect(() => {
    if (isOpen && showAdTimer) {
      setTimeLeft(timerDuration)
      setIsCountdownComplete(false)
      
      console.log(`UnifiedDownloadModal: Timer started for ${userType} user`, {
        duration: timerDuration,
        wallpaper_id: wallpaper?.id
      })
    }
  }, [isOpen, showAdTimer, timerDuration, userType, wallpaper?.id])

  // Countdown timer
  useEffect(() => {
    if (!isOpen || !showAdTimer || isCountdownComplete) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsCountdownComplete(true)
          onTimerComplete()
          console.log('UnifiedDownloadModal: Timer completed for user type:', userType)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, showAdTimer, isCountdownComplete, onTimerComplete, userType])

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Handle download button click
  const handleDownloadClick = () => {
    onDownload()
  }

  // Handle login button click for guest live video downloads
  const handleLoginButtonClick = () => {
    console.log('DEBUG: handleLoginButtonClick called', {
      isGuestLiveVideoDownload,
      onOpenAuthModal: !!onOpenAuthModal,
      userType,
      resolution
    })
    
    try {
      // Close download modal first
      console.log('DEBUG: Closing download modal')
      onClose()
      
      // Then open auth modal with a small delay for smooth transition
      setTimeout(() => {
        if (onOpenAuthModal) {
          console.log('DEBUG: Opening auth modal')
          onOpenAuthModal()
        } else {
          console.error('DEBUG: onOpenAuthModal is not available')
        }
      }, 150) // 150ms delay for smooth modal transition
    } catch (error) {
      console.error('DEBUG: Error in handleLoginButtonClick:', error)
    }
  }

  if (!isOpen || !wallpaper) return null

  const canDownload = userType === 'premium' || !showAdTimer || isCountdownComplete

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className={cn(
            'relative w-full max-w-md mx-auto rounded-xl shadow-2xl transition-all duration-300 transform',
            theme === 'dark' 
              ? 'bg-dark-secondary border border-gray-700' 
              : 'bg-white border border-gray-200'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className={cn(
                'text-lg font-semibold',
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              )}>
                Download Wallpaper
              </h3>
              <p className={cn(
                'text-sm mt-1 line-clamp-1',
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              )}>
                {wallpaper.title}
              </p>
            </div>
            
            <button
              onClick={onClose}
              className={cn(
                'p-2 rounded-lg transition-colors',
                theme === 'dark' 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300'
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* SPECIAL CASE: Guest Live Video Registration Prompt */}
            {isGuestLiveVideoDownload ? (
              <div className="text-center space-y-4">
                {/* Registration Message - No Image Preview for Mobile */}
                <div className={cn(
                  'p-4 rounded-lg border-2',
                  theme === 'dark' 
                    ? 'bg-blue-900/20 border-blue-600 text-blue-200'
                    : 'bg-blue-50 border-blue-300 text-blue-900'
                )}>
                  <h3 className="text-lg font-semibold mb-2">
                    Videos are for registered users
                  </h3>
                  <p className={cn(
                    'text-sm',
                    theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                  )}>
                    Login to download live wallpapers. It's free and instant.
                  </p>
                </div>
              </div>
            ) : (
              /* Original Content Logic */
              <>
                {/* CRITICAL FIX: Ad Content Instead of Wallpaper Preview */}
                {userType !== 'premium' && showAdTimer ? (
                  <AdContent userType={userType} />
                ) : (
                  /* Guest users - no preview image for mobile optimization */
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                      Your download starts soon. Free wallpapers include ads.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* User Type Status - Only show for Premium */}
            {userType === 'premium' && (
              <div className="mb-6">
                <div className="flex items-center space-x-2 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                  <Crown className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-medium">Premium Member - Instant Download</span>
                </div>
              </div>
            )}

            {/* Timer Display */}
            {showAdTimer && (
              <div className="text-center mb-6">
                {!isCountdownComplete ? (
                  <div className="space-y-3">
                    <div className={cn(
                      'inline-flex items-center space-x-2 px-4 py-2 rounded-full',
                      theme === 'dark' 
                        ? 'bg-blue-900/30 text-blue-300'
                        : 'bg-blue-100 text-blue-700'
                    )}>
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">
                        Download in {timeLeft} second{timeLeft !== 1 ? 's' : ''}...
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className={cn(
                      'w-full h-2 rounded-full overflow-hidden',
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                    )}>
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-1000 ease-linear"
                        style={{ 
                          width: `${((timerDuration - timeLeft) / timerDuration) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className={cn(
                    'inline-flex items-center space-x-2 px-4 py-2 rounded-full',
                    theme === 'dark' 
                      ? 'bg-green-900/30 text-green-300'
                      : 'bg-green-100 text-green-700'
                  )}>
                    <Download className="w-4 h-4" />
                    <span className="font-medium">Ready to download!</span>
                  </div>
                )}
              </div>
            )}

            {/* Download Button - Updated for Registration Prompt */}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                
                console.log('DEBUG: Button clicked', {
                  isGuestLiveVideoDownload,
                  canDownload,
                  isDownloading,
                  userType,
                  resolution
                })
                
                if (isGuestLiveVideoDownload) {
                  console.log('DEBUG: Calling handleLoginButtonClick')
                  handleLoginButtonClick()
                } else {
                  console.log('DEBUG: Calling handleDownloadClick')
                  handleDownloadClick()
                }
              }}
              disabled={!isGuestLiveVideoDownload && (!canDownload || isDownloading)}
              className={cn(
                'w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2',
                isGuestLiveVideoDownload
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                  : canDownload && !isDownloading
                    ? userType === 'premium'
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                      : 'bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                    : theme === 'dark'
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
            >
              {isGuestLiveVideoDownload ? (
                <User className="w-5 h-5" />
              ) : userType === 'premium' ? (
                <Zap className="w-5 h-5" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              <span>
                {isGuestLiveVideoDownload
                  ? 'Login to Download Video'
                  : isDownloading 
                    ? 'Downloading...'
                    : canDownload 
                      ? userType === 'premium' 
                        ? 'Download Now'
                        : 'Download Now'
                      : `Wait ${timeLeft}s`
                }
              </span>
            </button>

            {/* Info Text */}
            {userType !== 'premium' && (
              <p className={cn(
                'text-xs text-center mt-4',
                theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
              )}>
                Free downloads are supported by ads. Get{' '}
                <span className="font-medium">instant downloads</span> with premium membership.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
