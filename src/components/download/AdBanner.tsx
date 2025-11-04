import React, { useState, useEffect } from 'react'
import { Clock, Crown, Zap, Star, Users, CheckCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface AdBannerProps {
  onCountdownComplete: () => void
  onUpgrade?: () => void
  wallpaperTitle: string
  countdownDuration?: number
}

interface AdSettings {
  guest_ad_active?: boolean
  guest_timer_duration?: number
  guest_ad_content_type?: 'image_upload' | 'external_url' | 'html_adsense'
  guest_ad_image_url?: string
  guest_ad_external_url?: string
  guest_ad_html_content?: string
  guest_ad_click_url?: string
  logged_in_ad_active?: boolean
  logged_in_timer_duration?: number
  logged_in_ad_content_type?: 'image_upload' | 'external_url' | 'html_adsense'
  logged_in_ad_image_url?: string
  logged_in_ad_external_url?: string
  logged_in_ad_html_content?: string
  logged_in_ad_click_url?: string
}

export function AdBanner({ onCountdownComplete, onUpgrade, wallpaperTitle, countdownDuration = 30 }: AdBannerProps) {
  const { user } = useAuth()
  const [countdown, setCountdown] = useState(countdownDuration)
  const [isCompleted, setIsCompleted] = useState(false)
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const isLoggedIn = !!user

  useEffect(() => {
    loadAdSettings()
  }, [isLoggedIn])

  useEffect(() => {
    if (adSettings) {
      const actualDuration = isLoggedIn 
        ? adSettings.logged_in_timer_duration || 15   // Free users: 15s
        : adSettings.guest_timer_duration || 30       // Guest users: 30s
      setCountdown(actualDuration)
    }
  }, [adSettings, isLoggedIn])

  const loadAdSettings = async () => {
    setLoading(true)
    try {
      const action = isLoggedIn ? 'get_logged_in' : 'get_guest'
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

  useEffect(() => {
    if (countdown > 0 && !loading) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (countdown <= 0 && !loading) {
      setIsCompleted(true)
      onCountdownComplete()
    }
  }, [countdown, onCountdownComplete, loading])

  const getActualDuration = () => {
    if (isLoggedIn) {
      return adSettings?.logged_in_timer_duration || 15   // Free users: 15s
    }
    return adSettings?.guest_timer_duration || 30        // Guest users: 30s
  }

  const getAdContent = () => {
    if (isLoggedIn) {
      return {
        active: adSettings?.logged_in_ad_active ?? true,
        contentType: adSettings?.logged_in_ad_content_type || 'image_upload',
        imageUrl: adSettings?.logged_in_ad_image_url,
        externalUrl: adSettings?.logged_in_ad_external_url,
        htmlContent: adSettings?.logged_in_ad_html_content,
        clickUrl: adSettings?.logged_in_ad_click_url
      }
    }
    return {
      active: adSettings?.guest_ad_active ?? true,
      contentType: adSettings?.guest_ad_content_type || 'image_upload',
      imageUrl: adSettings?.guest_ad_image_url,
      externalUrl: adSettings?.guest_ad_external_url,
      htmlContent: adSettings?.guest_ad_html_content,
      clickUrl: adSettings?.guest_ad_click_url
    }
  }

  const progress = ((getActualDuration() - countdown) / getActualDuration()) * 100
  const adContent = getAdContent()

  if (loading) {
    return (
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-lg animate-pulse">
        <div className="h-4 bg-gray-300 rounded mb-4"></div>
        <div className="h-20 bg-gray-300 rounded"></div>
      </div>
    )
  }

  if (isCompleted) {
    return (
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-lg text-center shadow-lg">
        <div className="flex items-center justify-center mb-2">
          <CheckCircle className="w-8 h-8 mr-2" />
          <span className="text-xl font-bold">Download Ready!</span>
        </div>
        <p className="opacity-90">Your wallpaper is ready to download</p>
      </div>
    )
  }

  const handleAdClick = () => {
    if (adContent.clickUrl) {
      window.open(adContent.clickUrl, '_blank')
    }
  }

  const renderAdContent = () => {
    if (!adContent.active) {
      return null
    }

    switch (adContent.contentType) {
      case 'image_upload':
        if (adContent.imageUrl) {
          return (
            <div className="mb-4">
              <img
                src={adContent.imageUrl}
                alt={`${isLoggedIn ? 'Logged-in' : 'Guest'} Advertisement`}
                className={`w-full h-48 object-cover rounded-lg ${
                  adContent.clickUrl ? 'cursor-pointer hover:opacity-90' : ''
                }`}
                onClick={adContent.clickUrl ? handleAdClick : undefined}
              />
            </div>
          )
        }
        break
      
      case 'external_url':
        if (adContent.externalUrl) {
          return (
            <div className="mb-4">
              <img
                src={adContent.externalUrl}
                alt={`${isLoggedIn ? 'Logged-in' : 'Guest'} Advertisement`}
                className={`w-full h-48 object-cover rounded-lg ${
                  adContent.clickUrl ? 'cursor-pointer hover:opacity-90' : ''
                }`}
                onClick={adContent.clickUrl ? handleAdClick : undefined}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          )
        }
        break
      
      case 'html_adsense':
        if (adContent.htmlContent) {
          return (
            <div 
              className="mb-4 w-full"
              dangerouslySetInnerHTML={{ __html: adContent.htmlContent }}
            />
          )
        }
        break
    }

    return null
  }

  return (
    <div className="space-y-4">
      {/* Custom Ad Content */}
      {renderAdContent()}

      {/* Default Premium Upgrade Banner */}
      <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white rounded-lg overflow-hidden shadow-xl">
        {/* Header */}
        <div className="bg-black bg-opacity-20 p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Crown className="w-6 h-6 mr-2 text-yellow-300" />
            <h3 className="text-lg font-bold">Upgrade to Premium</h3>
          </div>
          <p className="text-sm opacity-90">
            {isLoggedIn ? 'Skip ads & get instant downloads with better quality' : 'Get instant downloads & higher quality wallpapers'}
          </p>
        </div>

        {/* Main Content */}
        <div className="p-6 text-center">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <Zap className="w-8 h-8 mx-auto mb-2 text-yellow-300" />
              <p className="text-sm font-semibold">Instant</p>
              <p className="text-xs opacity-75">Downloads</p>
            </div>
            <div className="text-center">
              <Star className="w-8 h-8 mx-auto mb-2 text-yellow-300" />
              <p className="text-sm font-semibold">4K & 8K</p>
              <p className="text-xs opacity-75">Quality</p>
            </div>
            <div className="text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-yellow-300" />
              <p className="text-sm font-semibold">Ad-Free</p>
              <p className="text-xs opacity-75">Experience</p>
            </div>
          </div>

          <button
            onClick={onUpgrade}
            className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold py-3 px-6 rounded-lg hover:from-yellow-300 hover:to-orange-400 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <span className="flex items-center justify-center">
              <Crown className="w-5 h-5 mr-2" />
              Upgrade Now - $4.99/month
            </span>
          </button>
        </div>
      </div>

      {/* Countdown Timer with Progress */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-lg">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Preparing your download...</span>
            <span className="font-semibold">{countdown}s remaining</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            >
              <div className="h-full bg-gradient-to-r from-white to-transparent opacity-30 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Circular Progress with Timer */}
        <div className="flex items-center justify-center space-x-4">
          <div className="relative">
            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#e5e7eb"
                strokeWidth="8"
                fill="none"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="url(#gradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{countdown}</div>
                <div className="text-xs text-gray-500">seconds</div>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center mb-2">
              <Clock className="w-5 h-5 mr-2 text-gray-600" />
              <span className="font-semibold text-gray-900">Please Wait</span>
            </div>
            <p className="text-sm text-gray-600 mb-1">
              Preparing <span className="font-medium">{wallpaperTitle}</span> for download
            </p>
            <p className="text-xs text-gray-500">
              {isLoggedIn 
                ? 'Premium users get instant access without waiting'
                : 'Login for faster downloads or upgrade to Premium for instant access'
              }
            </p>
          </div>
        </div>

        {/* Motivational Message */}
        <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <p className="text-sm text-center text-gray-700">
            <span className="font-semibold">💡 Tip:</span> Upgrade to Premium for instant downloads and exclusive 8K wallpapers
          </p>
        </div>
      </div>
    </div>
  )
}

export default AdBanner