import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Download, Heart, Crown, ArrowLeft, Share2, Eye } from 'lucide-react'
import { SEOHead } from '@/components/seo/SEOHead'
import { generateWallpaperSchema } from '@/utils/seo'
import { EnhancedWallpaperCardAdapter } from '@/components/wallpapers/EnhancedWallpaperCardAdapter'
import { AuthModal } from '@/components/auth/AuthModal'
import { UnifiedDownloadModal } from '@/components/download/UnifiedDownloadModal'
import { useUnifiedDownload } from '@/hooks/useUnifiedDownload'
import { useFavorites } from '@/hooks/useFavorites'
import { safeToastError, extractErrorMessage, handleComponentError } from '@/utils/errorFormatting'
import toast from 'react-hot-toast'
import { getApiImageUrl } from '@/config/api'

interface Wallpaper {
  id: number
  title: string
  description: string
  slug: string
  image_url: string
  thumbnail_url: string | null
  download_url: string
  resolution_1080p: string | null
  resolution_4k: string | null
  resolution_8k: string | null
  asset_4k_url: string | null
  asset_8k_url: string | null
  show_4k: boolean
  show_8k: boolean
  width: number
  height: number
  download_count: number
  is_premium: boolean
  is_mobile: boolean
  device_type: string
  tags: string[]
  created_at: string
  live_video_url?: string | null
  live_poster_url?: string | null
  live_enabled?: boolean
  category?: {
    id: number
    name: string
    slug: string
  }
}

interface RelatedWallpaper {
  id: number
  title: string
  slug: string
  thumbnail_url: string | null
  image_url: string
  download_count: number
  is_premium: boolean
}

interface WallpaperDetailData {
  wallpaper: Wallpaper
  relatedWallpapers: RelatedWallpaper[]
}

export function WallpaperDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user, profile, session } = useAuth()
  
  const [data, setData] = useState<WallpaperDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  
  // Use unified download system for consistency
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
  
  // Use proven useFavorites hook (same as grid view)
  const { isFavorite, toggleFavorite } = useFavorites()

  const isPremiumUser = profile?.plan_type === 'premium' && 
                       (!profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date())

  useEffect(() => {
    if (slug) {
      loadWallpaperDetails()
    }
  }, [slug])

  // Fix auto-scroll issue: Scroll to top when page loads or slug changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [slug])
  


  const loadWallpaperDetails = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wallpaper-detail`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ slug })
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          setError('Wallpaper not found')
          return
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      if (result.data) {
        setData(result.data)
      } else {
        setError('Wallpaper not found')
      }
    } catch (err: any) {
      console.error('Failed to load wallpaper details:', err)
      setError(handleComponentError(err, 'WallpaperDetailPage.loadWallpaperDetails'))
    } finally {
      setLoading(false)
    }
  }



  const handleDownload = async (resolution: string = '1080p') => {
    if (!data?.wallpaper) return

    // CRITICAL FIX: Enhanced 4K/8K availability and premium gating
    if (resolution === '4k') {
      if (!data.wallpaper.asset_4k_url || !data.wallpaper.show_4k) {
        toast.error('4K resolution not available for this wallpaper')
        return
      }
      if (!isPremiumUser) {
        toast.error('Premium subscription required for 4K downloads')
        return
      }
    }
    
    if (resolution === '8k') {
      if (!data.wallpaper.asset_8k_url || !data.wallpaper.show_8k) {
        toast.error('8K resolution not available for this wallpaper')
        return
      }
      if (!isPremiumUser) {
        toast.error('Premium subscription required for 8K downloads')
        return
      }
    }

    // CRITICAL FIX: Enhanced unified download system with external URL support
    const wallpaperData = {
      id: data.wallpaper.id,
      title: data.wallpaper.title,
      slug: data.wallpaper.slug,
      image_url: data.wallpaper.image_url,
      is_premium: data.wallpaper.is_premium,
      resolution_1080p: data.wallpaper.resolution_1080p,
      resolution_4k: data.wallpaper.asset_4k_url, // External URLs for 4K
      resolution_8k: data.wallpaper.asset_8k_url, // External URLs for 8K
      asset_4k_url: data.wallpaper.asset_4k_url,  // Explicitly pass for external URL detection
      asset_8k_url: data.wallpaper.asset_8k_url,  // Explicitly pass for external URL detection
      show_4k: data.wallpaper.show_4k,
      show_8k: data.wallpaper.show_8k
    }
    
    try {
      await openDownloadModal(wallpaperData, resolution)
    } catch (error: any) {
      console.error('Download error:', error)
      toast.error(error.message || 'Download failed. Please try again.')
    }
  }





  // Handle Like button click
  const handleLikeClick = async () => {
    if (!data?.wallpaper) return

    if (!user) {
      setIsAuthModalOpen(true)
      return
    }

    // Use the proven useFavorites hook for toggling
    await toggleFavorite({
      id: data.wallpaper.id,
      title: data.wallpaper.title,
      slug: data.wallpaper.slug,
      image_url: data.wallpaper.image_url,
      thumbnail_url: data.wallpaper.thumbnail_url,
      is_premium: data.wallpaper.is_premium
    })
  }

  const handleShare = async () => {
    if (!data?.wallpaper) return

    const shareUrl = window.location.href
    const shareText = `Check out this awesome wallpaper: ${data.wallpaper.title}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: data.wallpaper.title,
          text: shareText,
          url: shareUrl
        })
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Link copied to clipboard!')
      } catch (error: any) {
        safeToastError(error, 'Failed to copy link')
      }
    }
  }

  const handleDownloadVideo = async () => {
    if (!data?.wallpaper?.live_video_url || !data?.wallpaper?.live_enabled) {
      toast.error('Live wallpaper video not available')
      return
    }

    // Use the unified download system for video downloads
    const wallpaperData = {
      id: data.wallpaper.id,
      title: data.wallpaper.title,
      slug: data.wallpaper.slug,
      image_url: data.wallpaper.image_url,
      is_premium: data.wallpaper.is_premium,
      live_video_url: data.wallpaper.live_video_url,
      live_enabled: data.wallpaper.live_enabled
    }
    
    try {
      await openDownloadModal(wallpaperData, 'video')
    } catch (error: any) {
      console.error('Video download error:', error)
      toast.error(error.message || 'Video download failed. Please try again.')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  

  
  // Helper function to get optimized image URL
  const getImageUrl = () => {
    return data?.wallpaper.image_url || getApiImageUrl(data?.wallpaper.id || 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="bg-gray-300 dark:bg-gray-700 h-8 w-64 rounded mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gray-300 dark:bg-gray-700 aspect-square rounded-lg"></div>
              <div className="space-y-4">
                <div className="bg-gray-300 dark:bg-gray-700 h-6 w-3/4 rounded"></div>
                <div className="bg-gray-300 dark:bg-gray-700 h-4 w-full rounded"></div>
                <div className="bg-gray-300 dark:bg-gray-700 h-4 w-2/3 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
            {error || 'Wallpaper not found'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            The wallpaper you're looking for doesn't exist or has been removed.
          </p>
          <Link
            to="/free-wallpapers"
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition duration-200"
          >
            Browse Wallpapers
          </Link>
        </div>
      </div>
    )
  }

  const { wallpaper, relatedWallpapers } = data

  // SEO configuration
  const seoConfig = {
    title: `${wallpaper.title} - Free HD Wallpaper Download | BestFreeWallpapers`,
    description: wallpaper.description || `Download ${wallpaper.title} in high quality. Free ${wallpaper.device_type} wallpaper in ${wallpaper.width}x${wallpaper.height} resolution.`,
    keywords: [
      wallpaper.title,
      ...(wallpaper.tags || []),
      `${wallpaper.device_type} wallpaper`,
      'free wallpaper',
      'HD wallpaper',
      'background'
    ],
    image: wallpaper.thumbnail_url || wallpaper.image_url,
    url: `${window.location.origin}/wallpaper/${wallpaper.slug}`
  }

  const structuredData = generateWallpaperSchema(wallpaper)

  return (
    <>
      <SEOHead config={seoConfig} structuredData={[structuredData]} />
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
            <Link to="/" className="hover:text-gray-600 dark:hover:text-gray-400">Home</Link>
            <span>/</span>
            <Link to="/free-wallpapers" className="hover:text-gray-600 dark:hover:text-gray-400">Wallpapers</Link>
            {wallpaper.category && (
              <>
                <span>/</span>
                <Link 
                  to={`/category/${wallpaper.category.slug}`}
                  className="hover:text-gray-600 dark:hover:text-gray-400"
                >
                  {wallpaper.category.name}
                </Link>
              </>
            )}
            <span>/</span>
            <span className="text-gray-900 dark:text-gray-100">{wallpaper.title}</span>
          </nav>

          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-400 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Image Section */}
            <div className="space-y-4">
              <div className="relative group">
                <div className={`relative overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-900 ${
                  wallpaper.is_mobile ? 'aspect-[9/16] max-w-sm mx-auto' : 'aspect-video'
                }`}>
                  {/* Premium Badge - Inside Image Container */}
                  {wallpaper.is_premium && (
                    <div className="absolute top-2 left-2 z-10">
                      <div className="flex items-center space-x-1 bg-yellow-500 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold shadow-md">
                        <Crown className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="hidden sm:inline">Premium</span>
                        <span className="sm:hidden">P</span>
                      </div>
                    </div>
                  )}

                  {/* Mobile Badge - Inside Image Container */}
                  {wallpaper.is_mobile && (
                    <div className={`absolute ${wallpaper.is_premium ? 'top-12' : 'top-2'} left-2 z-10`}>
                      <div className="flex items-center space-x-1 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-md">
                        <span>Mobile</span>
                      </div>
                    </div>
                  )}

                  <div
                    className={`w-full h-full wallpaper-image-display ${
                      wallpaper.is_mobile 
                        ? 'bg-cover sm:bg-contain'  // Mobile: cover, Desktop: contain
                        : 'bg-cover'                 // Desktop wallpapers: always cover
                    } bg-center bg-no-repeat`}
                    style={{
                      backgroundImage: `url(${getImageUrl()})`
                    }}
                    title={wallpaper.title}
                    onContextMenu={(e) => e.preventDefault()} // Prevent right-click context menu
                    onDragStart={(e) => e.preventDefault()} // Prevent dragging
                  />
                </div>
              </div>
            </div>

            {/* Details Section */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  {wallpaper.title}
                </h1>
                
                {wallpaper.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed mb-6">
                    {wallpaper.description}
                  </p>
                )}

                {/* Wallpaper Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 mb-1">
                      <Download className="w-4 h-4" />
                      <span className="text-sm">Downloads</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {wallpaper.download_count}
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 mb-1">
                      <Eye className="w-4 h-4" />
                      <span className="text-sm">Resolution</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {wallpaper.width}×{wallpaper.height}
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {wallpaper.tags && wallpaper.tags.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {wallpaper.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Date */}
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Added on {formatDate(wallpaper.created_at)}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">


                {/* Primary Download Button - Unified Label */}
                <button
                  onClick={() => handleDownload('1080p')}
                  className="w-full flex items-center justify-center space-x-2 py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 bg-gradient-to-r from-gray-600 to-blue-600 text-white hover:from-gray-700 hover:to-blue-700"
                >
                  <Download className="w-6 h-6" />
                  <span>Download</span>
                </button>

                {/* Download Video Button */}
                {wallpaper.live_enabled && wallpaper.live_video_url && (
                  <button
                    onClick={handleDownloadVideo}
                    className="w-full flex items-center justify-center space-x-2 py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 bg-gradient-to-r from-green-500 to-teal-600 text-white hover:from-green-600 hover:to-teal-700"
                  >
                    <Download className="w-6 h-6" />
                    <span>Download Video</span>
                  </button>
                )}

                {/* CRITICAL FIX: 4K/8K Resolution Options - Enhanced Premium Gating */}
                {(wallpaper.show_4k || wallpaper.show_8k) && (
                  <div className="flex gap-1">
                    {wallpaper.show_4k && wallpaper.asset_4k_url && (
                      <button
                        onClick={isPremiumUser ? () => handleDownload('4k') : undefined}
                        disabled={!isPremiumUser}
                        className={`flex-1 px-2 py-2 text-xs rounded transition ${
                          isPremiumUser
                            ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800 cursor-pointer'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed opacity-50'
                        }`}
                        title={!isPremiumUser ? 'Premium required for 4K' : 'Download in 4K resolution'}
                      >
                        {isPremiumUser ? '4K' : 'Premium Required'}
                      </button>
                    )}
                    {wallpaper.show_8k && wallpaper.asset_8k_url && (
                      <button
                        onClick={isPremiumUser ? () => handleDownload('8k') : undefined}
                        disabled={!isPremiumUser}
                        className={`flex-1 px-2 py-2 text-xs rounded transition ${
                          isPremiumUser
                            ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 cursor-pointer'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed opacity-50'
                        }`}
                        title={!isPremiumUser ? 'Premium required for 8K' : 'Download in 8K resolution'}
                      >
                        {isPremiumUser ? '8K' : 'Premium Required'}
                      </button>
                    )}
                  </div>
                )}

                {/* Secondary Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleLikeClick}
                    className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-all font-medium ${
                      data?.wallpaper && isFavorite(data.wallpaper.id)
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-600 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${data?.wallpaper && isFavorite(data.wallpaper.id) ? 'fill-current' : ''}`} />
                    <span>{data?.wallpaper && isFavorite(data.wallpaper.id) ? 'Liked' : 'Like'}</span>
                  </button>

                  <button
                    onClick={handleShare}
                    className="flex items-center justify-center space-x-2 py-3 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-medium"
                  >
                    <Share2 className="w-5 h-5" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Related Wallpapers */}
          {relatedWallpapers && relatedWallpapers.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
                Related Wallpapers
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {relatedWallpapers.map((relatedWallpaper) => (
                  <EnhancedWallpaperCardAdapter
                    key={relatedWallpaper.id}
                    wallpaper={{
                      ...relatedWallpaper,
                      download_url: relatedWallpaper.image_url, // Use image_url as fallback
                      device_type: 'mobile',
                      is_mobile: true,
                      width: 1080,
                      height: 1920,
                      resolution_1080p: null,
                      resolution_4k: null,
                      resolution_8k: null
                    }}
                    className="aspect-[9/16]"
                    onImageClick={() => navigate(`/wallpaper/${relatedWallpaper.slug}`)}
                  />
                ))}
              </div>
            </div>
          )}
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


    </>
  )
}

export default WallpaperDetailPage
