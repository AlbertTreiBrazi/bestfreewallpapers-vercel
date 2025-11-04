import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useFavorites } from '@/hooks/useFavorites'
import { Download, Heart, Crown, Eye, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { AuthModal } from '@/components/auth/AuthModal'
import { DownloadModal } from '@/components/download/DownloadModal'
import { useIntelligentPreloading } from '@/hooks/usePerformanceOptimization'
import analytics from '@/services/analytics'
import { supabase } from '@/lib/supabase'
import { SEOOptimizedImage } from './SEOOptimizedImage'

interface SEOWallpaperCardProps {
  wallpaper: {
    id: number
    title: string
    slug?: string
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
    category_id?: number
    alt_text?: string
    seo_description?: string
    voice_search_keywords?: string[]
    seo_keywords?: string[]
    focus_keyphrase?: string
    seo_score?: number
    webp_url?: string
    avif_url?: string
    dominant_color?: string
    tags?: string[]
  }
  onImageClick?: () => void
  showSEOInfo?: boolean
  lazyLoading?: boolean
}

export function SEOWallpaperCard({ 
  wallpaper, 
  onImageClick, 
  showSEOInfo = false,
  lazyLoading = true 
}: SEOWallpaperCardProps) {
  const { user, profile } = useAuth()
  const { isFavorite, toggleFavorite } = useFavorites()
  const { preloadOnHover } = useIntelligentPreloading()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false)
  const [selectedResolution, setSelectedResolution] = useState('1080p')
  const [downloading, setDownloading] = useState(false)
  const [seoEnhanced, setSeoEnhanced] = useState(false)
  const [relatedWallpapers, setRelatedWallpapers] = useState<any[]>([])

  const isPremiumUser = profile?.plan_type === 'premium' && 
                       (!profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date())

  const canAccessWallpaper = !wallpaper.is_premium || isPremiumUser
  const isFaved = user ? isFavorite(wallpaper.id) : false

  // Generate SEO-optimized alt text if not available
  useEffect(() => {
    const generateSEOContent = async () => {
      if (!wallpaper.alt_text && !seoEnhanced) {
        try {
          const { data, error } = await supabase.functions.invoke('ai-alt-text-generator', {
            body: {
              wallpaper_id: wallpaper.id,
              image_url: wallpaper.image_url,
              title: wallpaper.title,
              category: 'wallpaper', // Default category
              tags: wallpaper.tags || [],
              device_type: wallpaper.device_type || 'desktop'
            }
          })

          if (!error && data?.data) {
            setSeoEnhanced(true)
            // Update local wallpaper data with SEO content
            Object.assign(wallpaper, {
              alt_text: data.data.alt_text,
              seo_description: data.data.seo_description,
              voice_search_keywords: data.data.voice_search_keywords,
              seo_keywords: data.data.seo_keywords,
              focus_keyphrase: data.data.focus_keyphrase,
              seo_score: data.data.seo_score
            })
          }
        } catch (error) {
          console.error('Failed to generate SEO content:', error)
        }
      }
    }

    generateSEOContent()
  }, [wallpaper.id, wallpaper.alt_text, seoEnhanced])

  // Load related wallpapers for internal linking
  useEffect(() => {
    const loadRelatedWallpapers = async () => {
      try {
        const { data, error } = await supabase
          .rpc('find_related_wallpapers', {
            wallpaper_id_param: wallpaper.id,
            limit_param: 3
          })

        if (!error && data) {
          setRelatedWallpapers(data)
        }
      } catch (error) {
        console.error('Failed to load related wallpapers:', error)
      }
    }

    loadRelatedWallpapers()
  }, [wallpaper.id])

  const handleDownload = async (resolution: string = '1080p') => {
    if (!user) {
      setIsAuthModalOpen(true)
      return
    }

    if (wallpaper.is_premium && !isPremiumUser) {
      toast.error('Premium subscription required for this wallpaper')
      return
    }

    if ((resolution === '4k' || resolution === '8k') && !isPremiumUser) {
      toast.error(`Premium subscription required for ${resolution.toUpperCase()} downloads`)
      return
    }

    // Track download analytics with SEO keywords
    const downloadEvent = {
      wallpaper_id: wallpaper.id.toString(),
      wallpaper_title: wallpaper.title,
      category: wallpaper.device_type || 'general',
      resolution: resolution,
      download_type: (wallpaper.is_premium ? 'premium' : 'free') as 'premium' | 'free',
      user_type: (isPremiumUser ? 'premium' : (user ? 'registered' : 'guest')) as 'premium' | 'registered' | 'guest',
      seo_keywords: wallpaper.seo_keywords || [],
      focus_keyphrase: wallpaper.focus_keyphrase || wallpaper.title
    }

    if (wallpaper.is_premium) {
      analytics.trackWallpaperDownloadPremium(downloadEvent)
    } else {
      analytics.trackWallpaperDownloadFree(downloadEvent)
    }

    setSelectedResolution(resolution)
    setIsDownloadModalOpen(true)
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
        slug: wallpaper.slug || wallpaper.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        image_url: wallpaper.image_url,
        thumbnail_url: wallpaper.thumbnail_url,
        is_premium: wallpaper.is_premium
      })
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  const handleCardHover = () => {
    preloadOnHover('downloadModal')
    
    // Track wallpaper view with SEO context
    analytics.trackWallpaperView(
      wallpaper.id.toString(),
      wallpaper.title,
      wallpaper.device_type || 'general'
    )
  }

  // Generate structured data for the wallpaper
  const generateStructuredData = () => {
    return {
      '@type': 'ImageObject',
      'name': wallpaper.title,
      'description': wallpaper.seo_description || wallpaper.title,
      'url': wallpaper.image_url,
      'thumbnailUrl': wallpaper.thumbnail_url,
      'width': wallpaper.width,
      'height': wallpaper.height,
      'downloadUrl': wallpaper.download_url,
      'keywords': wallpaper.seo_keywords?.join(', ') || wallpaper.title,
      'author': {
        '@type': 'Organization',
        'name': 'Best Free Wallpapers'
      },
      'license': 'https://bestfreewallpapers.com/license',
      'contentUrl': wallpaper.image_url,
      'acquireLicensePage': wallpaper.is_premium ? 'https://bestfreewallpapers.com/premium' : null
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            ...generateStructuredData()
          })
        }}
      />
      
      <article 
        className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform sm:hover:scale-105 touch-manipulation"
        onMouseEnter={handleCardHover}
        itemScope
        itemType="https://schema.org/ImageObject"
      >
        {/* Premium Badge */}
        {wallpaper.is_premium && (
          <div className="absolute top-2 left-2 z-10">
            <div className="flex items-center space-x-1 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
              <Crown className="w-3 h-3" />
              <span>Premium</span>
            </div>
          </div>
        )}

        {/* SEO Score Badge */}
        {showSEOInfo && wallpaper.seo_score && wallpaper.seo_score > 70 && (
          <div className="absolute top-2 right-12 z-10">
            <div className="flex items-center space-x-1 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
              <Sparkles className="w-3 h-3" />
              <span>SEO: {wallpaper.seo_score}</span>
            </div>
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={handleFavoriteToggle}
          className={`absolute top-2 right-2 z-10 p-2 rounded-full transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation ${
            isFaved ? 'bg-red-500 text-white' : 'bg-white/80 text-gray-600 hover:bg-red-500 hover:text-white'
          }`}
          aria-label={isFaved ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`w-4 h-4 ${isFaved ? 'fill-current' : ''}`} />
        </button>

        {/* SEO Optimized Image */}
        <SEOOptimizedImage
          id={wallpaper.id}
          title={wallpaper.title}
          alt={wallpaper.alt_text || `${wallpaper.title} wallpaper`}
          thumbnailUrl={wallpaper.thumbnail_url}
          webpUrl={wallpaper.webp_url}
          avifUrl={wallpaper.avif_url}
          dominantColor={wallpaper.dominant_color}
          onClick={onImageClick}
          lazyLoading={lazyLoading}
          className="cursor-pointer touch-manipulation transition-transform duration-300 sm:group-hover:scale-110"
          itemProp="contentUrl"
        />

        {/* Content with Rich Metadata */}
        <div className="p-3 sm:p-4">
          <h3 
            className="font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3 line-clamp-1 text-sm sm:text-base"
            itemProp="name"
          >
            {wallpaper.title}
          </h3>
          
          {wallpaper.seo_description && (
            <meta itemProp="description" content={wallpaper.seo_description} />
          )}
          
          {wallpaper.seo_keywords && (
            <meta itemProp="keywords" content={wallpaper.seo_keywords.join(', ')} />
          )}
          
          <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
            <div className="flex items-center space-x-2">
              <span itemProp="interactionStatistic" itemScope itemType="https://schema.org/InteractionCounter">
                <meta itemProp="interactionType" content="https://schema.org/DownloadAction" />
                <span itemProp="userInteractionCount">{wallpaper.download_count}</span> downloads
              </span>
              {wallpaper.width && wallpaper.height && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">
                    <span itemProp="width">{wallpaper.width}</span>x<span itemProp="height">{wallpaper.height}</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Voice Search Keywords Display */}
          {showSEOInfo && wallpaper.voice_search_keywords && wallpaper.voice_search_keywords.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Voice Search:</p>
              <div className="flex flex-wrap gap-1">
                {wallpaper.voice_search_keywords.slice(0, 3).map((keyword, index) => (
                  <span 
                    key={index}
                    className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Download Section */}
          <div className="space-y-2">
            <button
              onClick={() => handleDownload('1080p')}
              disabled={downloading}
              className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 min-h-[44px] touch-manipulation text-sm sm:text-base ${
                wallpaper.is_premium && !isPremiumUser
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600'
                  : 'bg-gradient-to-r from-gray-600 to-blue-600 text-white hover:from-gray-700 hover:to-blue-700'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>
                {wallpaper.is_premium && !isPremiumUser
                  ? 'Upgrade to Download'
                  : downloading
                  ? 'Downloading...'
                  : 'Download HD'
                }
              </span>
            </button>

            {/* Resolution Options */}
            {(isPremiumUser || !wallpaper.is_premium) && (
              <div className="flex gap-1">
                <button
                  onClick={() => handleDownload('4k')}
                  disabled={downloading || (!isPremiumUser && !!wallpaper.resolution_4k)}
                  className="flex-1 px-2 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50 min-h-[36px] touch-manipulation"
                >
                  4K
                </button>
                <button
                  onClick={() => handleDownload('8k')}
                  disabled={downloading || (!isPremiumUser && !!wallpaper.resolution_8k)}
                  className="flex-1 px-2 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50 min-h-[36px] touch-manipulation"
                >
                  8K
                </button>
              </div>
            )}
          </div>

          {/* Related Wallpapers Internal Links */}
          {relatedWallpapers.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 mb-2">Related:</p>
              <div className="flex flex-wrap gap-1">
                {relatedWallpapers.map((related) => (
                  <a
                    key={related.id}
                    href={`/wallpaper/${related.slug || related.id}`}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Track internal link click for SEO
                      analytics.trackEvent('internal_link_click', {
                        source_wallpaper_id: wallpaper.id,
                        target_wallpaper_id: related.id,
                        relevance_score: related.relevance_score
                      })
                    }}
                  >
                    {related.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>

      {/* Modals */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
      
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        wallpaper={wallpaper}
        resolution={selectedResolution}
      />
    </>
  )
}