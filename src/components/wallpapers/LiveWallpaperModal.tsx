import React, { useState, useRef, useEffect } from 'react'
import { X, Play, Pause, Volume2, VolumeX, Download, Crown } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { UnifiedDownloadModal } from '@/components/download/UnifiedDownloadModal'
import { AuthModal } from '@/components/auth/AuthModal'
import { useUnifiedDownload } from '@/hooks/useUnifiedDownload'
import toast from 'react-hot-toast'

interface LiveWallpaperModalProps {
  isOpen: boolean
  onClose: () => void
  wallpaper: {
    id: number
    title: string
    live_video_url: string
    live_poster_url: string
    is_premium: boolean
    description?: string
  } | null
}

export function LiveWallpaperModal({ isOpen, onClose, wallpaper }: LiveWallpaperModalProps) {
  const { theme } = useTheme()
  const { user, profile } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [videoError, setVideoError] = useState(false)
  const [videoLoading, setVideoLoading] = useState(true)
  const [showControls, setShowControls] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  
  // Use unified download system
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

  const isPremiumUser = profile?.plan_type === 'premium' && 
                       (!profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date())

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsPlaying(false)
      setVideoError(false)
      setVideoLoading(true)
      setShowControls(true)
    } else {
      // Pause video when modal closes
      if (videoRef.current) {
        videoRef.current.pause()
        setIsPlaying(false)
      }
    }
  }, [isOpen])

  // Auto-hide controls after 3 seconds of no interaction
  useEffect(() => {
    if (!showControls) return
    
    const timer = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [showControls, isPlaying])

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

  const handlePlayPause = () => {
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleMuteToggle = () => {
    if (!videoRef.current) return
    
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleVideoLoaded = () => {
    setVideoLoading(false)
    setVideoError(false)
  }

  const handleVideoError = () => {
    setVideoLoading(false)
    setVideoError(true)
    console.error('Video failed to load:', wallpaper?.live_video_url)
  }

  const handleDownloadVideo = async () => {
    if (!wallpaper) return

    // Create wallpaper data compatible with unified download system
    const wallpaperData = {
      id: wallpaper.id,
      title: wallpaper.title,
      image_url: wallpaper.live_video_url, // Use video URL as download source
      is_premium: wallpaper.is_premium,
      // Add video-specific data for external URL handling
      resolution_1080p: wallpaper.live_video_url, // Map video URL to resolution field
      resolution_4k: null,
      resolution_8k: null
    }

    try {
      await openDownloadModal(wallpaperData, 'video')
    } catch (error: any) {
      console.error('Download error:', error)
      toast.error(error.message || 'Download failed. Please try again.')
    }
  }

  const handleMouseMove = () => {
    setShowControls(true)
  }

  if (!isOpen || !wallpaper) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className={cn(
            'relative w-full max-w-4xl mx-auto rounded-xl shadow-2xl overflow-hidden transition-all duration-300 transform',
            theme === 'dark' 
              ? 'bg-dark-secondary border border-gray-700' 
              : 'bg-white border border-gray-200'
          )}
          onClick={(e) => e.stopPropagation()}
          onMouseMove={handleMouseMove}
        >
          {/* Header */}
          <div className={cn(
            'absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 transition-opacity duration-300',
            showControls ? 'opacity-100' : 'opacity-0'
          )}>
            <div className="flex-1">
              <h3 className={cn(
                'text-lg font-semibold',
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              )}>
                {wallpaper.title} - Live Preview
              </h3>
              {wallpaper.is_premium && (
                <div className="flex items-center space-x-1 mt-1">
                  <Crown className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-yellow-500 font-medium">Premium Content</span>
                </div>
              )}
            </div>
            
            <button
              onClick={onClose}
              className={cn(
                'p-2 rounded-full transition-colors',
                theme === 'dark' 
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Video Container */}
          <div className="relative aspect-video bg-black">
            {videoLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p className="text-sm">Loading video...</p>
                </div>
              </div>
            )}

            {videoError ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                  <p className="text-lg mb-2">Video unavailable</p>
                  <p className="text-sm opacity-75">Unable to load the live wallpaper video</p>
                  {wallpaper.live_poster_url && (
                    <img
                      src={wallpaper.live_poster_url}
                      alt={wallpaper.title}
                      className="mt-4 max-w-xs mx-auto rounded"
                      onError={(e) => e.currentTarget.style.display = 'none'}
                    />
                  )}
                </div>
              </div>
            ) : (
              <video
                ref={videoRef}
                src={wallpaper.live_video_url}
                poster={wallpaper.live_poster_url}
                className="w-full h-full object-contain"
                loop
                muted={isMuted}
                playsInline
                onLoadedData={handleVideoLoaded}
                onError={handleVideoError}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            )}

            {/* Video Controls Overlay */}
            {!videoError && (
              <div className={cn(
                'absolute inset-0 flex items-center justify-center transition-opacity duration-300',
                showControls ? 'opacity-100' : 'opacity-0'
              )}>
                {!videoLoading && (
                  <div className="flex items-center space-x-4 bg-black/50 backdrop-blur-sm rounded-full px-6 py-3">
                    <button
                      onClick={handlePlayPause}
                      className="text-white hover:text-blue-400 transition-colors"
                    >
                      {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                    </button>
                    
                    <button
                      onClick={handleMuteToggle}
                      className="text-white hover:text-blue-400 transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer with Download Button */}
          <div className={cn(
            'absolute bottom-0 left-0 right-0 z-10 p-4 transition-opacity duration-300',
            showControls ? 'opacity-100' : 'opacity-0'
          )}>
            <div className="flex items-center justify-between">
              <div>
                {wallpaper.description && (
                  <p className={cn(
                    'text-sm max-w-md',
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  )}>
                    {wallpaper.description}
                  </p>
                )}
              </div>
              
              <button
                onClick={handleDownloadVideo}
                disabled={isDownloading}
                className={cn(
                  'flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50',
                  wallpaper.is_premium && userType === 'guest'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                    : userType === 'premium'
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600'
                    : 'bg-gradient-to-r from-gray-600 to-blue-600 text-white hover:from-gray-700 hover:to-blue-700'
                )}
              >
                <Download className="w-5 h-5" />
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
          </div>
        </div>
      </div>

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
      
      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode="login"
      />
    </>
  )
}