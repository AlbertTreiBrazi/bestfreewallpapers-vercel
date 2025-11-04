import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { EnhancedWallpaperCardAdapter } from '@/components/wallpapers/EnhancedWallpaperCardAdapter'
import { SortDropdown, type SortOption } from '@/components/ui/SortDropdown'
import { useSort } from '@/hooks/useSort'
import { SEOHead } from '@/components/seo/SEOHead'
import { PAGE_SEO, generateWallpaperSchema } from '@/utils/seo'
import { useTheme } from '@/contexts/ThemeContext'
import { Grid, List, Search, Download, Eye, Loader, Video, X, Crown } from 'lucide-react'
import { handleAndLogError, serializeError } from '@/utils/errorFormatting'

export function FreeWallpapersPage() {
  const { theme } = useTheme()
  const [searchParams, setSearchParams] = useSearchParams()
  const [wallpapers, setWallpapers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Search state with debouncing
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm)
  const [searchQuery, setSearchQuery] = useState(searchTerm)
  
  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchTerm])
  
  // Update searchQuery state when debouncedSearch changes
  useEffect(() => {
    setSearchQuery(debouncedSearch)
  }, [debouncedSearch])
  
  // Video filter state
  const [videoOnly, setVideoOnly] = useState(searchParams.get('video') === 'true')
  
  // Premium filter state
  const [premiumOnly, setPremiumOnly] = useState(searchParams.get('premium') === 'true')
  
  // Sort functionality
  const { sortBy, setSortBy } = useSort({ defaultSort: 'newest' })
  
  // Infinite scrolling state with cursor-based pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMorePages, setHasMorePages] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const wallpapersPerPage = 20
  const loadMoreRef = useRef<HTMLDivElement>(null)
  
  // AbortController ref for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Phase Three: Request guards and de-duplication
  const isLoadingNextRef = useRef(false)
  const seenIdsRef = useRef<Set<string>>(new Set())

  // Phase Three: Improved Intersection Observer with request guards
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        // Phase Three: Check request guard to prevent concurrent calls
        if (target.isIntersecting && hasMorePages && !loading && !loadingMore && !isLoadingNextRef.current) {
          console.log('[Phase 3] Infinite scroll triggered - loading more wallpapers')
          loadWallpapers(false)
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '200px'
      }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [hasMorePages, loading, loadingMore])



  // Load initial wallpapers when component mounts or when sort/search/video/premium filter changes
  useEffect(() => {
    loadWallpapers(true) // true = reset wallpapers array
  }, [sortBy, searchQuery, videoOnly, premiumOnly])

  // Update URL params when search or video filter changes
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (sortBy !== 'newest') params.set('sort', sortBy)
    if (videoOnly) params.set('video', 'true')
    if (premiumOnly) params.set('premium', 'true')
    
    setSearchParams(params, { replace: true })
  }, [debouncedSearch, sortBy, videoOnly, premiumOnly, setSearchParams])

  // Sync videoOnly and premiumOnly state with URL params on mount and navigation
  useEffect(() => {
    setVideoOnly(searchParams.get('video') === 'true')
    setPremiumOnly(searchParams.get('premium') === 'true')
  }, [searchParams])

  // SEO Configuration
  const getSEOConfig = () => {
    let config = {
      title: 'Free Wallpapers - High Quality HD Downloads | BestFreeWallpapers',
      description: 'Download free wallpapers in HD quality. Browse our extensive collection of free desktop backgrounds, phone wallpapers, and high-resolution images.',
      keywords: ['free wallpapers', 'HD wallpapers', 'desktop backgrounds', 'phone wallpapers', 'high resolution', 'download wallpapers'],
      image: '/images/og-free-wallpapers.jpg'
    }
    
    // Search-specific SEO
    if (searchQuery) {
      config = {
        ...config,
        title: `Free ${searchQuery} Wallpapers - HD Downloads | BestFreeWallpapers`,
        description: `Download free ${searchQuery} wallpapers in HD quality. Browse our collection of ${searchQuery} backgrounds and desktop images.`,
        keywords: [searchQuery, `${searchQuery} wallpapers`, `free ${searchQuery}`, ...config.keywords]
      }
    }
    
    return config
  }

  // Generate structured data for wallpapers
  const structuredData = wallpapers.slice(0, 6).map(wallpaper => 
    generateWallpaperSchema(wallpaper)
  )

  // Phase Three: Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Load wallpapers function with Phase Three improvements
  const loadWallpapers = useCallback(async (reset = false) => {
    // Phase Three: Request guard - prevent concurrent requests
    if (!reset && isLoadingNextRef.current) {
      console.log('[Phase 3] Request blocked - already loading')
      return
    }
    
    // Phase Three: Set loading flag
    if (!reset) {
      isLoadingNextRef.current = true
    }
    
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    if (reset) {
      setLoading(true)
      setCurrentPage(1)
      setWallpapers([])
      // Phase Three: Reset seen IDs on filter change
      seenIdsRef.current.clear()
    } else {
      setLoadingMore(true)
    }
    
    setError(null)
    
    try {
      const pageToLoad = reset ? 1 : currentPage + 1
      
      // Use the wallpapers-api edge function (show all free wallpapers)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wallpapers-api`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            // No device_type filter - show all wallpapers regardless of aspect ratio
            sort: sortBy,
            limit: wallpapersPerPage,
            page: pageToLoad,
            search: searchQuery || undefined,
            is_premium: premiumOnly ? true : undefined,
            video_only: videoOnly || undefined
          }),
          signal: abortController.signal
        }
      )
      
      // Check if request was aborted
      if (abortController.signal.aborted) {
        return
      }

      if (response.ok) {
        const result = await response.json()
        const newWallpapers = result.data?.wallpapers || []
        const totalPages = result.data?.totalPages || 1
        
        // Phase Three: De-duplication logic
        const uniqueWallpapers = newWallpapers.filter((wallpaper: any) => {
          if (seenIdsRef.current.has(wallpaper.id)) {
            console.log(`[Phase 3] Duplicate filtered: ${wallpaper.id}`)
            return false // Skip duplicate
          }
          seenIdsRef.current.add(wallpaper.id)
          return true
        })
        
        console.log(`[Phase 3] Loaded ${newWallpapers.length} wallpapers, ${uniqueWallpapers.length} unique for page ${pageToLoad}`, {
          totalPages,
          currentPage: pageToLoad,
          videoOnly,
          duplicatesFiltered: newWallpapers.length - uniqueWallpapers.length
        })
        
        if (reset) {
          setWallpapers(uniqueWallpapers)
        } else {
          setWallpapers(prev => [...prev, ...uniqueWallpapers])
        }
        
        // Use actual total count from API response
        setTotalCount(result.data?.totalCount || 0)
        setCurrentPage(pageToLoad)
        
        // Phase Three: Improved hasMore condition
        const hasMore = pageToLoad < totalPages && uniqueWallpapers.length > 0
        setHasMorePages(hasMore)
        
        if (!hasMore) {
          console.log('[Phase 3] No more pages available')
        }
      } else {
        console.error('Failed to load wallpapers:', response.status, response.statusText)
        if (reset) {
          setWallpapers([])
          setTotalCount(0)
        }
        setHasMorePages(false)
      }
    } catch (error) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        return
      }
      console.error('Error in loadWallpapers:', error)
      const errorMessage = handleAndLogError(error, 'wallpapers fetch')
      setError(errorMessage)
      if (reset) {
        setWallpapers([])
        setTotalCount(0)
      }
      setHasMorePages(false)
    } finally {
      // Only clear loading if this is still the current request
      if (!abortController.signal.aborted) {
        setLoading(false)
        setLoadingMore(false)
        // Phase Three: Clear loading flag
        isLoadingNextRef.current = false
      }
    }
  }, [searchQuery, sortBy, videoOnly, premiumOnly, wallpapersPerPage, currentPage])

  // Load more wallpapers for manual button click
  const loadMoreWallpapers = useCallback(() => {
    // Phase Three: Check request guard
    if (!loadingMore && hasMorePages && !isLoadingNextRef.current) {
      loadWallpapers(false)
    }
  }, [loadingMore, hasMorePages, loadWallpapers])

  // Event handlers
  const handleSortChange = (sortValue: SortOption) => {
    setSortBy(sortValue)
  }

  const handleClearFilters = () => {
    setSortBy('newest')
    setSearchTerm('')
    setVideoOnly(false)
    setPremiumOnly(false)
    setError(null)
  }

  const handleVideoToggle = () => {
    setVideoOnly(!videoOnly)
  }

  const handlePremiumToggle = () => {
    setPremiumOnly(!premiumOnly)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Search will trigger automatically via useEffect watching searchQuery
  }

  const handleClearSearch = () => {
    setSearchTerm('')
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClearSearch()
    }
  }

  const getPageTitle = () => {
    if (searchQuery) return `Search results for "${searchQuery}"`
    return 'Free Wallpapers'
  }

  const getPageDescription = () => {
    if (loading && wallpapers.length === 0) return 'Loading wallpapers...'
    if (error) return 'Error loading wallpapers'
    return `Showing ${wallpapers.length} of ${totalCount} free wallpapers`
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'} transition-colors duration-200`}>
      <SEOHead config={getSEOConfig()} structuredData={structuredData} />
      
      {/* Compact Header Section */}
      <section className={`${theme === 'dark' ? 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900' : 'bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700'} text-white py-8`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 leading-tight px-2">
                Best Free Wallpapers
              </h1>
              <p className="text-base sm:text-lg text-gray-100 px-4">
                Highest quality wallpapers, completely free to download
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-end gap-4 text-sm">
              <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full">
                <Eye className="w-4 h-4" />
                <span>HD Quality</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full">
                <Download className="w-4 h-4" />
                <span>Instant Download</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Category Tabs - REMOVED - This page is for free wallpapers only */}
      {/* Category filtering moved to individual category pages */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col">
          {/* Page Header with Sort Controls */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className={`text-2xl sm:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2 transition-colors duration-200 px-2`}>
                {getPageTitle()}
              </h2>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-200 text-sm sm:text-base px-4`}>
                {getPageDescription()}
              </p>
            </div>
            
            {/* Search, Sort and View Controls */}
            <div className="flex items-center space-x-4">
              {/* Search Input - Desktop */}
              <form onSubmit={handleSearchSubmit} className="hidden sm:block">
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search in Free Wallpapers..."
                    className={`pl-10 pr-10 py-2 rounded-lg border-2 text-sm transition-colors focus:outline-none focus:ring-2 ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500/20'
                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-purple-200'
                    } w-64`}
                    disabled={loading}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                        theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'
                      } transition-colors`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </form>
              
              {/* Premium Toggle */}
              <button
                onClick={handlePremiumToggle}
                className={`hidden sm:flex items-center space-x-2 px-4 py-2 min-h-[44px] rounded-lg font-medium transition-colors ${
                  premiumOnly
                    ? theme === 'dark'
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                    : theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                disabled={loading}
                title="Show only premium wallpapers"
              >
                <Crown className="w-4 h-4" />
                <span className="text-sm">Premium Only</span>
              </button>
              
              {/* Video Toggle */}
              <button
                onClick={handleVideoToggle}
                className={`hidden sm:flex items-center space-x-2 px-4 py-2 min-h-[44px] rounded-lg font-medium transition-colors ${
                  videoOnly
                    ? theme === 'dark'
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                    : theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                disabled={loading}
              >
                <Video className="w-4 h-4" />
                <span className="text-sm">Live/Video Only</span>
              </button>
              
              {/* Sort Dropdown */}
              <div className="hidden sm:block">
                <SortDropdown
                  value={sortBy}
                  onChange={handleSortChange}
                  disabled={loading}
                />
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-gray-100 text-gray-600 dark:bg-purple-900 dark:text-purple-300' 
                      : theme === 'dark'
                        ? 'text-gray-400 hover:text-gray-300'
                        : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-gray-100 text-gray-600 dark:bg-purple-900 dark:text-purple-300' 
                      : theme === 'dark'
                        ? 'text-gray-400 hover:text-gray-300'
                        : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Search, Video Toggle and Sort */}
          <div className="sm:hidden mb-6 space-y-3">
            {/* Search Input - Mobile */}
            <form onSubmit={handleSearchSubmit} className="w-full">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search in Free Wallpapers..."
                  className={`w-full pl-11 pr-11 py-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500/20'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-purple-200'
                  }`}
                  disabled={loading}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                      theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'
                    } transition-colors`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </form>
            
            {/* Premium Toggle - Mobile */}
            <button
              onClick={handlePremiumToggle}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                premiumOnly
                  ? theme === 'dark'
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                  : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              disabled={loading}
            >
              <Crown className="w-5 h-5" />
              <span>Premium Wallpapers Only</span>
            </button>
            
            {/* Video Toggle - Mobile */}
            <button
              onClick={handleVideoToggle}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                videoOnly
                  ? theme === 'dark'
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                  : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              disabled={loading}
            >
              <Video className="w-5 h-5" />
              <span>Live/Video Wallpapers Only</span>
            </button>
            
            <SortDropdown
              value={sortBy}
              onChange={handleSortChange}
              disabled={loading}
              className="w-full"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className={`mb-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-red-900 text-red-200 border border-red-700' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              <p className="font-medium">Unable to load wallpapers</p>
              <p className="text-sm mt-1">{serializeError(error)}</p>
              <button 
                onClick={() => {
                  setError(null)
                  loadWallpapers()
                }}
                className="mt-2 text-sm font-medium underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Results Counter */}
          {!loading && !error && wallpapers.length > 0 && (
            <div className={`mb-6 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              <div className="flex items-center justify-between">
                <div>
                  Showing {wallpapers.length.toLocaleString()} of {totalCount.toLocaleString()} free wallpapers
                  {hasMorePages && (
                    <span className="ml-2 text-xs opacity-75 animate-pulse">
                      • Scroll for more
                    </span>
                  )}
                </div>
                {loadingMore && (
                  <div className="flex items-center space-x-2 text-xs">
                    <Loader className="w-3 h-3 animate-spin" />
                    <span>Loading...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Wallpapers Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className={`rounded-lg aspect-video mb-4 ${
                    theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                  }`}></div>
                  <div className={`h-4 rounded mb-2 ${
                    theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                  }`}></div>
                  <div className={`h-3 rounded w-3/4 ${
                    theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                  }`}></div>
                </div>
              ))}
            </div>
          ) : wallpapers.length > 0 ? (
            <div className={viewMode === 'grid' ? 
              'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4' :
              'space-y-6'
            }>
              {wallpapers.map((wallpaper) => (
                <EnhancedWallpaperCardAdapter
                  key={wallpaper.id}
                  wallpaper={wallpaper}
                  variant="compact"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className={`mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                <Search className="w-16 h-16 mx-auto" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                No free wallpapers found
              </h3>
              <p className={`mb-4 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {searchQuery ? 
                  `No free wallpapers found matching "${searchQuery}"` :
                  'No free wallpapers available at the moment'
                }
              </p>
              <button
                onClick={handleClearFilters}
                className="text-gray-600 hover:text-gray-700 font-semibold"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Infinite Scrolling Load More */}
          {wallpapers.length > 0 && (
            <>
              {/* Intersection observer target for automatic loading */}
              <div 
                ref={loadMoreRef} 
                className="h-20 w-full flex items-center justify-center"
                aria-hidden="true"
              >
                {hasMorePages && !loadingMore && (
                  <div className={`text-xs opacity-50 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    Scroll to load more wallpapers...
                  </div>
                )}
              </div>
              
              {/* Loading more indicator */}
              {loadingMore && (
                <div className="mt-8 flex justify-center items-center py-6">
                  <Loader className={`w-6 h-6 animate-spin mr-3 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`} />
                  <span className={`${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Loading more wallpapers...
                  </span>
                </div>
              )}
              
              {/* Manual load more button (fallback) */}
              {hasMorePages && !loadingMore && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={loadMoreWallpapers}
                    className={`px-6 py-3 min-h-[44px] rounded-lg font-medium transition-colors ${
                      theme === 'dark'
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                  >
                    Load More Wallpapers
                  </button>
                </div>
              )}
              
              {/* End of results indicator */}
              {!hasMorePages && wallpapers.length > 0 && (
                <div className="mt-12 text-center py-6">
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    You've seen all {totalCount.toLocaleString()} free wallpapers
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>


    </div>
  )
}

export default FreeWallpapersPage