import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface Banner {
  id: number
  title: string
  subtitle?: string
  cta_label: string
  cta_url: string
  image_url?: string
  active: boolean
  display_order: number
}

interface PremiumBannerProps {
  className?: string
}

export function PremiumBanner({ className = '' }: PremiumBannerProps) {
  const { profile } = useAuth()
  const [banners, setBanners] = useState<Banner[]>([])
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  // Premium users should never see upgrade banners
  const isPremiumUser = profile?.plan_type === 'premium' && 
                       (!profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date())

  useEffect(() => {
    if (!isPremiumUser) {
      loadBanners()
    } else {
      setLoading(false)
    }
  }, [isPremiumUser])

  useEffect(() => {
    // Banner rotation every 10 seconds
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBannerIndex((prevIndex) => 
          (prevIndex + 1) % banners.length
        )
      }, 10000)

      return () => clearInterval(interval)
    }
  }, [banners.length])

  const loadBanners = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('premium-banners', {
        method: 'GET'
      })

      if (error) {
        console.error('Error loading banners:', error)
        return
      }

      setBanners(data?.data || [])
    } catch (error) {
      console.error('Error loading banners:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    // Store dismissal in session storage (not persistent across sessions)
    sessionStorage.setItem('bannerDismissed', 'true')
  }

  const handleBannerClick = (banner: Banner) => {
    // Open link in new tab with security attributes
    window.open(banner.cta_url, '_blank', 'noopener,noreferrer')
  }

  // Don't show banners to premium users
  if (isPremiumUser) {
    return null
  }

  // Don't show if dismissed
  if (dismissed) {
    return null
  }

  // Check if banner was dismissed in this session
  if (sessionStorage.getItem('bannerDismissed')) {
    return null
  }

  // Show fallback banner if no banners loaded
  if (loading || banners.length === 0) {
    const fallbackBanner = {
      id: 0,
      title: 'Upgrade to Premium',
      subtitle: 'Unlock unlimited downloads and premium wallpapers',
      cta_label: 'Get Premium',
      cta_url: '/premium',
      active: true,
      display_order: 1
    }
    
    return (
      <div className={`relative bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 text-white ${className}`}>
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-1.5 transition-all duration-200 shadow-lg"
          aria-label="Close banner"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Fallback Banner Content */}
        <div 
          className="cursor-pointer hover:scale-[1.02] transition-transform duration-300 ease-out"
          onClick={() => window.open(fallbackBanner.cta_url, '_self')}
        >
          <div className="flex items-center justify-between p-4 md:px-8 min-h-[60px] md:min-h-[80px]">
            <div className="flex-1 mr-4">
              <h3 className="text-base md:text-xl font-bold mb-1 text-white">
                {fallbackBanner.title}
              </h3>
              <p className="text-sm md:text-base text-gray-100 leading-tight">
                {fallbackBanner.subtitle}
              </p>
            </div>

            {/* CTA Button - Enhanced mobile visibility */}
            <div className="flex-shrink-0">
              <span className="inline-flex items-center px-3 py-2 md:px-4 md:py-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg font-semibold text-sm text-gray-900 transition-all duration-200 shadow-lg">
                {fallbackBanner.cta_label}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentBanner = banners[currentBannerIndex]

  return (
    <div className={`relative bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 text-white ${className}`}>
      {/* Close button - made more visible */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-1.5 transition-all duration-200 shadow-lg"
        aria-label="Close banner"
      >
        <X className="w-4 h-4 text-white" />
      </button>

      {/* Banner Content */}
      <div 
        className="cursor-pointer hover:scale-[1.02] transition-transform duration-300 ease-out"
        onClick={() => handleBannerClick(currentBanner)}
      >
        <div className="flex items-center justify-between p-4 md:px-8 min-h-[60px] md:min-h-[80px]">
          <div className="flex-1 mr-4">
            {/* Title - Safely rendered as text */}
            <h3 className="text-base md:text-xl font-bold mb-1 text-white">
              {currentBanner.title}
            </h3>
            
            {/* Subtitle - Safely rendered as text */}
            {currentBanner.subtitle && (
              <p className="text-sm md:text-base text-gray-100 leading-tight">
                {currentBanner.subtitle}
              </p>
            )}
          </div>

          {/* Image - Only from approved sources */}
          {currentBanner.image_url && (
            <div className="hidden md:block flex-shrink-0 mr-4">
              <img
                src={currentBanner.image_url}
                alt=""
                className="w-16 h-16 object-cover rounded-lg shadow-lg"
                loading="lazy"
                onError={(e) => {
                  // Hide image if it fails to load
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          )}

          {/* CTA Button - Enhanced mobile visibility */}
          <div className="flex-shrink-0">
            <span className="inline-flex items-center px-3 py-2 md:px-4 md:py-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg font-semibold text-sm text-gray-900 transition-all duration-200 shadow-lg">
              {currentBanner.cta_label}
            </span>
          </div>
        </div>
      </div>

      {/* Banner indicator dots - hidden on mobile, visible on desktop */}
      {banners.length > 1 && (
        <div className="hidden sm:flex absolute bottom-2 left-1/2 transform -translate-x-1/2 space-x-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentBannerIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentBannerIndex
                  ? 'bg-white'
                  : 'bg-white bg-opacity-50'
              }`}
              aria-label={`Go to banner ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
