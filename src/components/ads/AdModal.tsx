import React, { useState, useEffect } from 'react'
import { X, Download, Clock } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

interface AdModalProps {
  isOpen: boolean
  onClose: () => void
  onDownload: (adGateToken: string) => void
  wallpaperTitle: string
  wallpaperId: number
  countdownDuration?: number
  onLogEvent?: (event: string, details?: any) => void
}

interface GuestAdSettings {
  guest_ad_active: boolean
  guest_timer_duration: number
  guest_ad_content_type: 'image_upload' | 'external_url' | 'html_adsense'
  guest_ad_image_url: string | null
  guest_ad_external_url: string | null
  guest_ad_html_content: string | null
  guest_ad_click_url: string | null
}

interface LoggedInAdSettings {
  logged_in_ad_active: boolean
  logged_in_timer_duration: number
  logged_in_ad_content_type: 'image_upload' | 'external_url' | 'html_adsense'
  logged_in_ad_image_url: string | null
  logged_in_ad_external_url: string | null
  logged_in_ad_html_content: string | null
  logged_in_ad_click_url: string | null
}

export function AdModal({ 
  isOpen, 
  onClose, 
  onDownload, 
  wallpaperTitle,
  wallpaperId,
  countdownDuration = 8,
  onLogEvent
}: AdModalProps) {
  const { theme } = useTheme()
  const { user, profile } = useAuth()
  const [timeLeft, setTimeLeft] = useState(countdownDuration)
  const [isCountdownComplete, setIsCountdownComplete] = useState(false)
  const [adGateToken, setAdGateToken] = useState('')
  const [guestAdSettings, setGuestAdSettings] = useState<GuestAdSettings | null>(null)
  const [loggedInAdSettings, setLoggedInAdSettings] = useState<LoggedInAdSettings | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)
  
  // Determine user type for ad configuration selection
  const isGuest = !user
  const isPremium = profile?.plan_type === 'premium' && 
                   (!profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date())
  const isLoggedInFree = user && !isPremium

  // Load appropriate ad settings based on user type
  useEffect(() => {
    if (isOpen) {
      loadAdSettings()
    }
  }, [isOpen, isGuest, isLoggedInFree])

  const loadAdSettings = async () => {
    setLoadingSettings(true)
    
    // Clear previous settings
    setGuestAdSettings(null)
    setLoggedInAdSettings(null)
    
    try {
      // Determine which configuration to load based on user type
      const action = isGuest ? 'get_guest' : 'get_logged_in'
      
      console.log(`AdModal: Loading ad settings for ${isGuest ? 'Guest' : 'Logged-in Free'} user`, {
        isGuest, 
        isLoggedInFree, 
        action, 
        userEmail: user?.email
      })
      
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
        console.log(`AdModal: Successfully loaded ${action} settings:`, result.data)
        
        if (isGuest) {
          setGuestAdSettings(result.data)
        } else {
          setLoggedInAdSettings(result.data)
        }
      } else {
        console.error(`AdModal: Failed to load ${action} settings, using fallback`)
        // Use fallback settings based on user type
        if (isGuest) {
          setGuestAdSettings({
            guest_ad_active: true,
            guest_timer_duration: countdownDuration,
            guest_ad_content_type: 'image_upload',
            guest_ad_image_url: null,
            guest_ad_external_url: null,
            guest_ad_html_content: null,
            guest_ad_click_url: null
          })
        } else {
          setLoggedInAdSettings({
            logged_in_ad_active: true,
            logged_in_timer_duration: countdownDuration,
            logged_in_ad_content_type: 'image_upload',
            logged_in_ad_image_url: null,
            logged_in_ad_external_url: null,
            logged_in_ad_html_content: null,
            logged_in_ad_click_url: null
          })
        }
      }
    } catch (error) {
      console.error(`AdModal: Exception loading ad settings:`, error)
      // Use fallback settings based on user type
      if (isGuest) {
        setGuestAdSettings({
          guest_ad_active: true,
          guest_timer_duration: countdownDuration,
          guest_ad_content_type: 'image_upload',
          guest_ad_image_url: null,
          guest_ad_external_url: null,
          guest_ad_html_content: null,
          guest_ad_click_url: null
        })
      } else {
        setLoggedInAdSettings({
          logged_in_ad_active: true,
          logged_in_timer_duration: countdownDuration,
          logged_in_ad_content_type: 'image_upload',
          logged_in_ad_image_url: null,
          logged_in_ad_external_url: null,
          logged_in_ad_html_content: null,
          logged_in_ad_click_url: null
        })
      }
    } finally {
      setLoadingSettings(false)
    }
  }
  
  // Helper function to get current active ad settings
  const getCurrentAdSettings = () => {
    if (isGuest && guestAdSettings) {
      return {
        ad_active: guestAdSettings.guest_ad_active,
        timer_duration: guestAdSettings.guest_timer_duration,
        ad_content_type: guestAdSettings.guest_ad_content_type,
        ad_image_url: guestAdSettings.guest_ad_image_url,
        ad_external_url: guestAdSettings.guest_ad_external_url,
        ad_html_content: guestAdSettings.guest_ad_html_content,
        ad_click_url: guestAdSettings.guest_ad_click_url
      }
    } else if (isLoggedInFree && loggedInAdSettings) {
      return {
        ad_active: loggedInAdSettings.logged_in_ad_active,
        timer_duration: loggedInAdSettings.logged_in_timer_duration,
        ad_content_type: loggedInAdSettings.logged_in_ad_content_type,
        ad_image_url: loggedInAdSettings.logged_in_ad_image_url,
        ad_external_url: loggedInAdSettings.logged_in_ad_external_url,
        ad_html_content: loggedInAdSettings.logged_in_ad_html_content,
        ad_click_url: loggedInAdSettings.logged_in_ad_click_url
      }
    }
    return null
  }

  // Reset countdown when modal opens or settings load
  useEffect(() => {
    const currentSettings = getCurrentAdSettings()
    if (isOpen && currentSettings && !loadingSettings) {
      const duration = currentSettings.timer_duration || countdownDuration
      setTimeLeft(duration)
      setIsCountdownComplete(false)
      
      // Generate ad gate token
      const token = `ad_gate_${wallpaperId}_${Date.now()}`.slice(0, 32)
      setAdGateToken(token)
      
      // Log modal open event with user type info
      onLogEvent?.('dl_gate_open', { 
        wallpaper_id: wallpaperId,
        user_type: isGuest ? 'guest' : 'logged_in_free',
        timer_duration: duration
      })
      
      console.log(`AdModal: Countdown initialized for ${isGuest ? 'Guest' : 'Logged-in Free'} user`, {
        duration,
        user_type: isGuest ? 'guest' : 'logged_in_free'
      })
    }
  }, [isOpen, guestAdSettings, loggedInAdSettings, loadingSettings, countdownDuration, wallpaperId, onLogEvent, isGuest, isLoggedInFree])

  // Countdown timer
  useEffect(() => {
    const currentSettings = getCurrentAdSettings()
    if (!isOpen || isCountdownComplete || loadingSettings || !currentSettings) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsCountdownComplete(true)
          // Log countdown completion
          onLogEvent?.('dl_gate_done', { 
            wallpaper_id: wallpaperId,
            user_type: isGuest ? 'guest' : 'logged_in_free'
          })
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, isCountdownComplete, loadingSettings, guestAdSettings, loggedInAdSettings, wallpaperId, onLogEvent, isGuest, isLoggedInFree])

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

  // Handle download and close
  const handleDownload = () => {
    onDownload(adGateToken)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
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
                {wallpaperTitle}
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
            {/* Dynamic Ad Content Area */}
            {loadingSettings ? (
              <div className={cn(
                'w-full h-32 rounded-lg border-2 border-dashed flex items-center justify-center mb-6',
                theme === 'dark' 
                  ? 'border-gray-600 bg-gray-800/50'
                  : 'border-gray-300 bg-gray-50'
              )}>
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500 mx-auto mb-2"></div>
                  <p className={cn(
                    'text-sm',
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  )}>
                    Loading...
                  </p>
                </div>
              </div>
            ) : (
              <div className="mb-6">
                {(() => {
                  const currentSettings = getCurrentAdSettings()
                  if (!currentSettings || !currentSettings.ad_active) {
                    return (
                      <div className={cn(
                        'w-full h-32 rounded-lg border-2 border-dashed flex items-center justify-center',
                        theme === 'dark' 
                          ? 'border-gray-600 bg-gray-800/50'
                          : 'border-gray-300 bg-gray-50'
                      )}>
                        <div className="text-center">
                          <div className={cn(
                            'text-2xl mb-2',
                            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                          )}>
                            📺
                          </div>
                          <p className={cn(
                            'text-sm font-medium',
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          )}>
                            Advertisement
                          </p>
                          <p className={cn(
                            'text-xs mt-1',
                            theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                          )}>
                            Support free wallpapers
                          </p>
                        </div>
                      </div>
                    )
                  }
                  
                  if (currentSettings.ad_content_type === 'image_upload' && currentSettings.ad_image_url) {
                    return (
                      <div 
                        className="w-full h-32 rounded-lg overflow-hidden cursor-pointer"
                        onClick={() => {
                          if (currentSettings.ad_click_url) {
                            window.open(currentSettings.ad_click_url, '_blank')
                          }
                        }}
                      >
                        <img
                          src={currentSettings.ad_image_url}
                          alt="Advertisement"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )
                  }
                  
                  if (currentSettings.ad_content_type === 'external_url' && currentSettings.ad_external_url) {
                    return (
                      <div 
                        className="w-full h-32 rounded-lg overflow-hidden cursor-pointer"
                        onClick={() => {
                          if (currentSettings.ad_click_url) {
                            window.open(currentSettings.ad_click_url, '_blank')
                          }
                        }}
                      >
                        <img
                          src={currentSettings.ad_external_url}
                          alt="Advertisement"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )
                  }
                  
                  if (currentSettings.ad_content_type === 'html_adsense' && currentSettings.ad_html_content) {
                    return (
                      <div 
                        className="w-full min-h-32 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                        dangerouslySetInnerHTML={{ __html: currentSettings.ad_html_content }}
                      />
                    )
                  }
                  
                  // Fallback
                  return (
                    <div className={cn(
                      'w-full h-32 rounded-lg border-2 border-dashed flex items-center justify-center',
                      theme === 'dark' 
                        ? 'border-gray-600 bg-gray-800/50'
                        : 'border-gray-300 bg-gray-50'
                    )}>
                      <div className="text-center">
                        <div className={cn(
                          'text-2xl mb-2',
                          theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                        )}>
                          📺
                        </div>
                        <p className={cn(
                          'text-sm font-medium',
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        )}>
                          Advertisement
                        </p>
                        <p className={cn(
                          'text-xs mt-1',
                          theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                        )}>
                          Support free wallpapers
                        </p>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Countdown Display */}
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
                        width: `${(() => {
                          const currentSettings = getCurrentAdSettings()
                          if (!currentSettings) return 0
                          return ((currentSettings.timer_duration - timeLeft) / currentSettings.timer_duration) * 100
                        })()}%` 
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

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={!isCountdownComplete}
              className={cn(
                'w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2',
                isCountdownComplete
                  ? 'bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                  : theme === 'dark'
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
            >
              <Download className="w-5 h-5" />
              <span>
                {isCountdownComplete ? 'Download Now' : `Wait ${timeLeft}s`}
              </span>
            </button>

            {/* Info Text */}
            <p className={cn(
              'text-xs text-center mt-4',
              theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
            )}>
              Free downloads are supported by ads. Get{' '}
              <span className="font-medium">instant downloads</span> with premium membership.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
