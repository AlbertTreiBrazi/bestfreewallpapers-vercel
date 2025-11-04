import React, { Suspense, lazy } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '@/contexts/ThemeContext'
import { Crown, Download, Eye, ArrowRight, Calendar } from 'lucide-react'
import { SEOHead } from '@/components/seo/SEOHead'
import { PAGE_SEO, generateOrganizationSchema, generateWebsiteSchema } from '@/utils/seo'
import { EnhancedWallpaperCardAdapter } from '@/components/wallpapers/EnhancedWallpaperCardAdapter'
import { getApiImageUrl } from '@/config/api'
import { getCollections } from '@/lib/getCollections'
import { useCancellableRequest } from '@/hooks/useCancellableRequest'
import { ApiError } from '@/utils/api-helpers'
import { logError, logWarn } from '@/utils/errorLogger'

// Lazy load heavy components for better initial load performance
const BestFreeWallpapersTabCategories = lazy(() => 
  import('@/components/category/BestFreeWallpapersTabCategories').then(module => ({
    default: module.BestFreeWallpapersTabCategories
  }))
)

const BestFreeWallpapersFAQ = lazy(() => 
  import('@/components/faq/BestFreeWallpapersFAQ').then(module => ({
    default: module.BestFreeWallpapersFAQ
  }))
)

// Optimized image component with lazy loading
const OptimizedImage = React.memo(({ src, alt, className, onError }: {
  src: string
  alt: string
  className: string
  onError?: () => void
}) => {
  const [isLoaded, setIsLoaded] = React.useState(false)
  const [hasError, setHasError] = React.useState(false)
  const imgRef = React.useRef<HTMLImageElement>(null)

  React.useEffect(() => {
    const img = imgRef.current
    if (!img) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          img.src = src
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(img)
    return () => observer.disconnect()
  }, [src])

  if (hasError) {
    return (
      <div className={`${className} bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 flex items-center justify-center`}>
        <span className="text-2xl text-gray-400">📷</span>
      </div>
    )
  }

  return (
    <>
      {!isLoaded && (
        <div className={`absolute inset-0 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 flex items-center justify-center animate-pulse`}>
          <span className="text-2xl text-gray-400">📷</span>
        </div>
      )}
      <img
        ref={imgRef}
        alt={alt}
        className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true)
          onError?.()
        }}
        loading="lazy"
      />
    </>
  )
})

OptimizedImage.displayName = 'OptimizedImage'

export function HomePage() {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const { fetch: fetchCancellable, cancelAll } = useCancellableRequest()
  const [categories, setCategories] = React.useState<any[]>([])
  const [wallpapers, setWallpapers] = React.useState<any[]>([])
  const [featuredCollections, setFeaturedCollections] = React.useState<any[]>([])
  const [loadingStates, setLoadingStates] = React.useState({
    categories: false,
    wallpapers: false,
    collections: false,
    initial: false
  })
  const [errors, setErrors] = React.useState<{categories?: string, wallpapers?: string, collections?: string}>({})
  const [isDataLoaded, setIsDataLoaded] = React.useState(false)

  // Load data in background after initial render
  React.useEffect(() => {
    // Small delay to ensure smooth initial render
    const timer = setTimeout(() => {
      loadDataParallel()
    }, 50)
    return () => {
      clearTimeout(timer)
      cancelAll() // Cancel all pending requests on unmount
    }
  }, [])

  const loadDataParallel = async () => {
    const BASE_URL = import.meta.env.VITE_SUPABASE_URL
    const AUTH_HEADER = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
    
    // Debug environment variables
    console.log('[HomePage] Environment check:', {
      hasUrl: !!BASE_URL,
      hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      keyPrefix: import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
      url: BASE_URL
    })
    
    // Start all requests simultaneously for better performance with timeout protection
    const categoriesPromise = fetchCancellable(
      'homepage-categories',
      `${BASE_URL}/functions/v1/categories-api`,
      {
        method: 'POST',
        headers: {
          'Authorization': AUTH_HEADER,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({}),
        timeout: 15000, // 15s timeout for categories
        retries: 1
      }
    )

    const wallpapersPromise = fetchCancellable(
      'homepage-wallpapers',
      `${BASE_URL}/functions/v1/wallpapers-api`,
      {
        method: 'POST',
        headers: {
          'Authorization': AUTH_HEADER,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          sort: 'popular',
          limit: 8,
          page: 1
        }),
        timeout: 15000, // 15s timeout for wallpapers
        retries: 1
      }
    )

    // Load featured collections using the cached helper
    const collectionsPromise = getCollections().then(collections => 
      collections.filter(collection => collection.is_featured)
    )

    // Process categories
    try {
      const categoriesResponse = await categoriesPromise
      if (categoriesResponse.ok) {
        const categoriesResult = await categoriesResponse.json()
        const allCategories = categoriesResult.data || []
        setCategories(allCategories.slice(0, 6))
      } else {
        throw new Error(`Failed to load categories (${categoriesResponse.status})`)
      }
    } catch (err: any) {
      // Ignore AbortError when user navigates away
      if (err.name === 'AbortError') {
        logWarn('Categories request cancelled', { context: 'HomePage' })
        return
      }
      
      // Log structured error
      if (err instanceof ApiError) {
        logError('Categories API timeout', err, { context: 'HomePage', action: 'loadCategories' })
        setErrors(prev => ({ ...prev, categories: 'Request timed out. Please try again.' }))
      } else {
        logError('Categories load failed', err, { context: 'HomePage', action: 'loadCategories' })
        setErrors(prev => ({ ...prev, categories: err.message }))
      }
    } finally {
      setLoadingStates(prev => ({ ...prev, categories: false }))
    }

    // Process wallpapers
    try {
      const wallpapersResponse = await wallpapersPromise
      console.log('[HomePage] Wallpapers API response:', {
        ok: wallpapersResponse.ok,
        status: wallpapersResponse.status,
        statusText: wallpapersResponse.statusText,
        headers: Object.fromEntries(wallpapersResponse.headers.entries())
      })
      
      if (wallpapersResponse.ok) {
        const wallpapersResult = await wallpapersResponse.json()
        console.log('[HomePage] Wallpapers data:', {
          hasData: !!wallpapersResult.data,
          hasWallpapers: !!wallpapersResult.data?.wallpapers,
          wallpapersCount: wallpapersResult.data?.wallpapers?.length || 0
        })
        setWallpapers(wallpapersResult.data?.wallpapers || [])
      } else {
        const errorText = await wallpapersResponse.text()
        console.error('[HomePage] Wallpapers API error response:', errorText)
        throw new Error(`Failed to load wallpapers (${wallpapersResponse.status}): ${errorText}`)
      }
    } catch (err: any) {
      // Ignore AbortError when user navigates away
      if (err.name === 'AbortError') {
        logWarn('Wallpapers request cancelled', { context: 'HomePage' })
        return
      }
      
      // Log structured error
      if (err instanceof ApiError) {
        logError('Wallpapers API timeout', err, { context: 'HomePage', action: 'loadWallpapers' })
        setErrors(prev => ({ ...prev, wallpapers: 'Request timed out. Please try again.' }))
      } else {
        logError('Wallpapers load failed', err, { context: 'HomePage', action: 'loadWallpapers' })
        setErrors(prev => ({ ...prev, wallpapers: err.message }))
      }
    } finally {
      setLoadingStates(prev => ({ ...prev, wallpapers: false }))
    }

    // Process featured collections
    try {
      const collections = await collectionsPromise
      setFeaturedCollections(collections)
    } catch (err: any) {
      logError('Collections load failed', err, { context: 'HomePage', action: 'loadCollections' })
      setErrors(prev => ({ ...prev, collections: err.message }))
    } finally {
      setLoadingStates(prev => ({ ...prev, collections: false }))
    }

    // Mark data as loaded
    setIsDataLoaded(true)
  }

  const retryLoad = () => {
    setLoadingStates({ categories: false, wallpapers: false, collections: false, initial: false })
    setErrors({})
    setIsDataLoaded(false)
    loadDataParallel()
  }

  // SEO Configuration for Homepage
  const seoConfig = {
    ...PAGE_SEO.home,
    image: '/images/og-home.jpg'
  }

  const structuredData = [
    generateOrganizationSchema(),
    generateWebsiteSchema()
  ]

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'} transition-colors duration-200`}>
      <SEOHead config={seoConfig} structuredData={structuredData} />
      
      {/* Hero Section - Always render immediately */}
      <section className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 leading-tight">
              Best Free Wallpapers for Desktop & Mobile
            </h1>
            <p className="text-base sm:text-lg md:text-xl mb-6 text-gray-100 max-w-2xl mx-auto leading-relaxed px-2">
              Download 10,000+ of the best free wallpapers in HD quality. Desktop backgrounds, mobile wallpapers, AI art, and more. Updated daily with trending designs.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto px-2">
              <Link
                to="/free-wallpapers"
                className="bg-white text-gray-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition duration-200 inline-flex items-center justify-center min-h-[44px] whitespace-nowrap"
              >
                <Eye className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-sm sm:text-base">Browse Free Wallpapers</span>
              </Link>
              <Link
                to="/ai-wallpapers"
                className="bg-yellow-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-yellow-600 transition duration-200 inline-flex items-center justify-center min-h-[44px] whitespace-nowrap"
              >
                <Crown className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-sm sm:text-base">AI Generated</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Category Tabs - Lazy loaded */}
      <Suspense fallback={
        <div className={`${theme === 'dark' ? 'bg-dark-primary border-dark-border' : 'bg-white border-gray-100'} border-b h-16 flex items-center justify-center`}>
          <div className={`animate-pulse text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Loading navigation...
          </div>
        </div>
      }>
        <BestFreeWallpapersTabCategories
          onCategorySelect={(category) => {
            if (category === 'all') {
              navigate('/free-wallpapers')
            }
          }}
        />
      </Suspense>

      {/* Featured Collections Section */}
      {featuredCollections.length > 0 && (
        <section className={`py-16 ${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} transition-colors duration-200`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className={`text-2xl sm:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 px-2`}>
                Featured Collections
              </h2>
              <p className={`text-base sm:text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} px-4`}>
                Curated wallpaper collections for every style and mood
              </p>
            </div>
            
            {errors.collections ? (
              <div className="text-center py-8">
                <p className={`mb-4 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                  Failed to load collections: {errors.collections}
                </p>
                <button
                  onClick={retryLoad}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {featuredCollections.map((collection) => (
                  <Link
                    key={collection.id}
                    to={`/collections/${collection.slug}`}
                    className={`group ${theme === 'dark' ? 'bg-dark-tertiary' : 'bg-gray-50'} rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]`}
                  >
                    <div className="relative aspect-[16/9] overflow-hidden">
                      {collection.cover_image_url ? (
                        <OptimizedImage
                          src={collection.cover_image_url}
                          alt={collection.name}
                          className="absolute inset-0 w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
                        />
                      ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${theme === 'dark' ? 'from-purple-900 to-blue-900' : 'from-purple-100 to-blue-100'} flex items-center justify-center`}>
                          <Calendar className={`w-16 h-16 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                        </div>
                      )}
                      
                      {/* Collection overlay info */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="flex items-center justify-between text-white">
                            <span className="text-sm font-medium">
                              {collection.wallpaper_count} wallpapers
                            </span>
                            <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2 group-hover:text-purple-600 transition-colors`}>
                        {collection.name}
                      </h3>
                      
                      {collection.description && (
                        <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} text-sm leading-relaxed`}>
                          {collection.description}
                        </p>
                      )}
                      
                      <div className="mt-4 flex items-center justify-between">
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {collection.wallpaper_count} images
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          Featured
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            
            <div className="text-center mt-12">
              <Link
                to="/collections"
                className="inline-flex items-center space-x-2 bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition duration-200"
              >
                <span>View All Collections</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Us Section - Static content, always render */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className={`text-2xl sm:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 px-2`}>
              Why Choose Our Best Free Wallpapers?
            </h2>
            <p className={`text-base sm:text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} max-w-3xl mx-auto px-4`}>
              We provide the highest quality free wallpapers that transform your screens into works of art
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}>
                <Download className={`w-8 h-8 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
              </div>
              <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>
                Free HD Downloads
              </h3>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Download the best free wallpapers instantly with just one click. No cost, no registration required.
              </p>
            </div>
            
            <div className="text-center">
              <div className={`${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}>
                <Eye className={`w-8 h-8 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`} />
              </div>
              <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>
                Best Quality Wallpapers
              </h3>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                All wallpapers are carefully selected and available in HD, 4K, and 8K resolutions for crystal-clear quality.
              </p>
            </div>
            
            <div className="text-center">
              <div className={`${theme === 'dark' ? 'bg-green-900' : 'bg-green-100'} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}>
                <Crown className={`w-8 h-8 ${theme === 'dark' ? 'text-green-300' : 'text-green-600'}`} />
              </div>
              <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>
                Premium Collection
              </h3>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Access exclusive premium wallpapers with our subscription for the ultimate experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section - Progressive loading */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'} transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className={`text-2xl sm:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 px-2`}>
              Explore Categories
            </h2>
            <p className={`text-base sm:text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} px-4`}>
              Find wallpapers that match your style and interests
            </p>
          </div>
          
          {errors.categories ? (
            <div className="text-center py-8">
              <p className={`mb-4 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                Failed to load categories: {errors.categories}
              </p>
              <button
                onClick={retryLoad}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {categories.length > 0 ? categories.map((category) => {
                const imageSource = category.preview_wallpaper_image_url || 
                  category.preview_image || 
                  (category.preview_wallpaper_id ? 
                    getApiImageUrl(parseInt(category.preview_wallpaper_id), { format: 'webp', quality: 85, width: 300, height: 300 }) : 
                    null)
                
                return (
                  <Link
                    key={category.id}
                    to={`/category/${category.slug}`}
                    className={`group ${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105`}
                  >
                    <div className="aspect-square overflow-hidden relative">
                      {imageSource ? (
                        <OptimizedImage
                          src={imageSource}
                          alt={category.name}
                          className="absolute inset-0 w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
                        />
                      ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${theme === 'dark' ? 'from-purple-900 to-blue-900' : 'from-purple-100 to-blue-100'} flex items-center justify-center`}>
                          <span className={`text-2xl ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>📷</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} text-center text-sm`}>
                        {category.name}
                      </h3>
                    </div>
                  </Link>
                )
              }) : (!isDataLoaded ? (
                // Graceful skeleton loading
                [...Array(6)].map((_, i) => (
                  <div key={i} className={`${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} rounded-lg shadow-md overflow-hidden`}>
                    <div className={`aspect-square bg-gradient-to-br ${theme === 'dark' ? 'from-gray-700 to-gray-800' : 'from-gray-200 to-gray-300'} animate-pulse`}></div>
                    <div className="p-3">
                      <div className={`h-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded animate-pulse`}></div>
                    </div>
                  </div>
                ))
              ) : (
                // Empty state after data is loaded
                <div className="col-span-full text-center py-8">
                  <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    No categories available
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Popular Wallpapers Section - Progressive loading */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className={`text-2xl sm:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 px-2`}>
              Popular Wallpapers
            </h2>
            <p className={`text-base sm:text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} px-4`}>
              Discover the most downloaded and loved wallpapers
            </p>
          </div>
          
          {errors.wallpapers ? (
            <div className="text-center py-8">
              <p className={`mb-4 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                Failed to load wallpapers: {errors.wallpapers}
              </p>
              <button
                onClick={retryLoad}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : wallpapers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {wallpapers.map((wallpaper) => (
                <EnhancedWallpaperCardAdapter
                  key={wallpaper.id}
                  wallpaper={wallpaper}
                  variant="compact"
                />
              ))}
            </div>
          ) : (!isDataLoaded ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className={`${theme === 'dark' ? 'bg-dark-tertiary' : 'bg-gray-100'} rounded-lg aspect-[3/4] animate-pulse`}></div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} mb-4`}>
                <Eye className="w-16 h-16 mx-auto" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                No wallpapers found
              </h3>
              <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Popular wallpapers will appear here as they become available.
              </p>
            </div>
          ))}
          
          <div className="text-center mt-12">
            <button
              onClick={() => {
                navigate('/free-wallpapers');
                // Ensure scroll to top after navigation
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 100);
              }}
              className="inline-flex items-center space-x-2 bg-gray-600 text-white px-8 py-3 rounded-lg hover:bg-gray-700 transition duration-200"
            >
              <span>View All Wallpapers</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* FAQ Section - Lazy loaded */}
      <Suspense fallback={
        <div className={`py-16 ${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} flex items-center justify-center`}>
          <div className={`animate-pulse text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Loading FAQ...
          </div>
        </div>
      }>
        <BestFreeWallpapersFAQ />
      </Suspense>
    </div>
  )
}

export default HomePage
