import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useFavorites } from '@/hooks/useFavorites'
import { Download, Heart, Crown, Play } from 'lucide-react'
import toast from 'react-hot-toast'
import { AuthModal } from '@/components/auth/AuthModal'
import { UnifiedDownloadModal } from '@/components/download/UnifiedDownloadModal'
import { LiveWallpaperModal } from '@/components/wallpapers/LiveWallpaperModal'
import { OptimizedWallpaperImage } from '@/components/ui/OptimizedWallpaperImage'
import { useIntelligentPreloading } from '@/hooks/usePerformanceOptimization'
import { useUnifiedDownload } from '@/hooks/useUnifiedDownload'
import { useLiveWallpaper } from '@/hooks/useLiveWallpaper'

interface WallpaperCardProps {
  wallpaper: {
    id: number
    title: string
    thumbnail_url: string | null
    image_url: string
    download_url: string
    resolution_1080p: string | null
    resolution_4k: string | null
    resolution_8k: string | null
    download_count: number
    is_premium: boolean
    width?: number
    height?: number
    device_type?: string
    live_video_url?: string | null
    live_poster_url?: string | null
    live_enabled?: boolean
    description?: string
  }
  onImageClick?: () => void
}

export function WallpaperCard({ wallpaper, onImageClick }: WallpaperCardProps) {
  const { user, profile } = useAuth()
  const { isFavorite, toggleFavorite } = useFavorites()
  const { preloadOnHover } = useIntelligentPreloading()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  
  // UNIFIED DOWNLOAD SYSTEM - Single source of truth
  const {
    isDownloadModalOpen,
    isDownloading,
    showAdTimer,
    timerDuration,
    openDownloadModal,
    closeDownloadModal,
    startDownload,
    handleTimerComplete,
    currentWallpaper,
    currentResolution,
    userType,
    isGuestLiveVideoDownload
  } = useUnifiedDownload({
    onAuthRequired: () => setIsAuthModalOpen(true)
  })
  
  // Live wallpaper functionality
  const {
    isLiveModalOpen,
    currentLiveWallpaper,
    openLiveModal,
    closeLiveModal
  } = useLiveWallpaper()

  const isPremiumUser = profile?.plan_type === 'premium' && 
                       (!profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date())

  const canAccessWallpaper = !wallpaper.is_premium || isPremiumUser
  const isFaved = user ? isFavorite(wallpaper.id) : false

  const handleDownload = async (resolution: string = '1080p') => {
    // UNIFIED DOWNLOAD LOGIC - Check user type and requirements
    if (!user && resolution !== '1080p') {
      setIsAuthModalOpen(true)
      return
    }

    if (wallpaper.is_premium && userType === 'guest') {
      // Guest users can still download premium wallpapers with timer
      console.log('Guest user downloading premium wallpaper with timer')
    }

    if ((resolution === '4k' || resolution === '8k') && userType !== 'premium') {
      toast.error(`Premium subscription required for ${resolution.toUpperCase()} downloads`)
      return
    }

    // Use unified download system
    await openDownloadModal(wallpaper, resolution)
  }

  const handleFavoriteToggle = async () => {
    if (!user) {
      setIsAuthModalOpen(true)
      return
    }

    try {
      await toggleFavorite({
        id: wallpaper.id,
        title: wallpaper.title,
        slug: wallpaper.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        image_url: wallpaper.image_url,
        thumbnail_url: wallpaper.thumbnail_url,
        is_premium: wallpaper.is_premium
      })
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  const handleCardHover = () => {
    // Preload download modal component on hover
    preloadOnHover('downloadModal')
  }

  const handleViewLive = () => {
    if (!wallpaper.live_video_url || !wallpaper.live_poster_url) {
      toast.error('Live wallpaper content not available')
      return
    }

    openLiveModal({
      id: wallpaper.id,
      title: wallpaper.title,
      live_video_url: wallpaper.live_video_url,
      live_poster_url: wallpaper.live_poster_url,
      is_premium: wallpaper.is_premium,
      description: wallpaper.description
    })
  }

  return (
    <>
      <div 
        className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform sm:hover:scale-105 touch-manipulation"
        onMouseEnter={handleCardHover}
      >
        {/* Premium Badge - Mobile Optimized */}
        {wallpaper.is_premium && (
          <div className="absolute top-2 left-2 z-10">
            <div className="flex items-center space-x-1 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
              <Crown className="w-3 h-3" />
              <span>Premium</span>
            </div>
          </div>
        )}

        {/* Like Button - Mobile Optimized */}
        <button
          onClick={handleFavoriteToggle}
          className={`absolute top-2 right-2 z-10 p-2 rounded-full transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation ${
            isFaved ? 'bg-red-500 text-white' : 'bg-white/80 text-gray-600 hover:bg-red-500 hover:text-white'
          }`}
          aria-label={isFaved ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`w-4 h-4 ${isFaved ? 'fill-current' : ''}`} />
        </button>
        
        {/* BUG FIX 4: Download Icon Always Visible on Mobile */}
        <button
          onClick={() => handleDownload('1080p')}
          className="absolute bottom-2 right-2 z-10 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation shadow-lg
                     /* Show always on touch devices and small screens */
                     block
                     /* Hide on larger screens with hover capability */
                     sm:hidden sm:group-hover:flex"
          aria-label="Quick Download"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Optimized Image - Mobile Friendly Clickable */}
        <OptimizedWallpaperImage
          id={wallpaper.id}
          title={wallpaper.title}
          thumbnailUrl={wallpaper.thumbnail_url}
          onClick={onImageClick}
          priority="low"
          aspectRatio={wallpaper.height && wallpaper.width && wallpaper.height > wallpaper.width ? 'portrait' : 'video'}
          className="cursor-pointer touch-manipulation transition-transform duration-300 sm:group-hover:scale-110"
        />

        {/* Content - Mobile Optimized */}
        <div className="p-3 sm:p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3 line-clamp-1 text-sm sm:text-base">
            {wallpaper.title}
          </h3>
          
          <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
            <div className="flex items-center space-x-2">
              <span>{wallpaper.download_count} downloads</span>
              {wallpaper.width && wallpaper.height && (
                <span className="hidden sm:inline">• {wallpaper.width}x{wallpaper.height}</span>
              )}
            </div>
          </div>

          {/* Download Section - Mobile Optimized */}
          <div className="space-y-2">
            {/* Main Download Button - Enhanced for Mobile */}
            <button
              onClick={() => handleDownload('1080p')}
              disabled={isDownloading}
              className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 min-h-[44px] touch-manipulation text-sm sm:text-base ${
                wallpaper.is_premium && userType === 'guest'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                  : userType === 'premium'
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600'
                  : 'bg-gradient-to-r from-gray-600 to-blue-600 text-white hover:from-gray-700 hover:to-blue-700'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>
                {userType === 'premium'
                  ? 'Download HD'
                  : wallpaper.is_premium && userType === 'guest'
                  ? 'Download HD (15s)'
                  : wallpaper.is_premium && userType === 'free'
                  ? 'Download HD (6s)'
                  : isDownloading
                  ? 'Downloading...'
                  : 'Download HD'
                }
              </span>
            </button>

            {/* Live Wallpaper Buttons */}
            {wallpaper.live_enabled && wallpaper.live_video_url && (
              <div className="flex gap-2">
                <button
                  onClick={handleViewLive}
                  className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium transition-all duration-200 min-h-[40px] touch-manipulation text-sm bg-gradient-to-r from-green-500 to-teal-600 text-white hover:from-green-600 hover:to-teal-700"
                >
                  <Play className="w-4 h-4" />
                  <span>View Live</span>
                </button>
                <button
                  onClick={() => handleDownload('video')}
                  disabled={isDownloading}
                  className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium transition-all duration-200 min-h-[40px] touch-manipulation text-sm bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {userType === 'premium'
                      ? 'Download Video'
                      : wallpaper.is_premium && userType === 'guest'
                      ? 'Download Video (15s)'
                      : wallpaper.is_premium && userType === 'free'
                      ? 'Download Video (6s)'
                      : isDownloading
                      ? 'Downloading...'
                      : 'Download Video'
                    }
                  </span>
                </button>
              </div>
            )}

            {/* Resolution Options for Premium Users - Mobile Optimized */}
            {userType === 'premium' && (
              <div className="flex gap-1">
                <button
                  onClick={() => handleDownload('4k')}
                  disabled={isDownloading}
                  className="flex-1 px-2 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50 min-h-[36px] touch-manipulation"
                >
                  4K
                </button>
                <button
                  onClick={() => handleDownload('8k')}
                  disabled={isDownloading}
                  className="flex-1 px-2 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50 min-h-[36px] touch-manipulation"
                >
                  8K
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Unified Download Modal */}
      <UnifiedDownloadModal
        isOpen={isDownloadModalOpen}
        onClose={closeDownloadModal}
        wallpaper={currentWallpaper}
        resolution={currentResolution}
        userType={userType}
        timerDuration={timerDuration}
        showAdTimer={showAdTimer}
        isDownloading={isDownloading}
        onDownload={startDownload}
        onTimerComplete={handleTimerComplete}
        isGuestLiveVideoDownload={isGuestLiveVideoDownload}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Live Wallpaper Modal */}
      <LiveWallpaperModal
        isOpen={isLiveModalOpen}
        onClose={closeLiveModal}
        wallpaper={currentLiveWallpaper}
      />
    </>
  )
}