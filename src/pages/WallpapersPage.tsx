import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { BestFreeWallpapersTabCategories } from '@/components/category/BestFreeWallpapersTabCategories'
import { EnhancedWallpaperCardAdapter } from '@/components/wallpapers/EnhancedWallpaperCardAdapter'
import { SortDropdown, type SortOption } from '@/components/ui/SortDropdown'
import { useSort } from '@/hooks/useSort'
import { SEOHead } from '@/components/seo/SEOHead'
import { PAGE_SEO, CATEGORY_SEO, generateWallpaperSchema } from '@/utils/seo'
import { Grid, List, Search, Video, X, Loader, Crown } from 'lucide-react'
import { handleAndLogError, serializeError } from '@/utils/errorFormatting'

export function WallpapersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [wallpapers, setWallpapers] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all')
  
  // Search state with debouncing
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm)
  const [searchQuery, setSearchQuery] = useState(searchTerm)
  
  // Video filter state
  const [videoOnly, setVideoOnly] = useState(searchParams.get('video') === 'true')
  
  // Premium filter state
  const [premiumOnly, setPremiumOnly] = useState(searchParams.get('premium') === 'true')
  
  // Sort functionality
  const { sortBy, setSortBy } = useSort({ defaultSort: 'newest' })
  
  // Infinite scrolling state with cursor-based pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMorePages, setHasMorePages] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const wallpapersPerPage = 24
  const loadMoreRef = useRef<HTMLDivElement>(null)
  
  // AbortController ref for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Request guards and de-duplication
  const isLoadingNextRef = useRef(false)
  const seenIdsRef = useRef<Set<string>>(new Set())

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

  useEffect(() => {
    loadCategories()
  }, [])

  // Load initial wallpapers when component mounts or when filters change
  useEffect(() => {
    loadWallpapers(true) // true = reset wallpapers array
  }, [selectedCategory, sortBy, searchQuery, videoOnly, premiumOnly])

  useEffect(() => {
    // Update URL params when filters change
    const params = new URLSearchParams()
    if (selectedCategory !== 'all') params.set('category', selectedCategory)
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (sortBy !== 'newest') params.set('sort', sortBy)
    if (videoOnly) params.set('video', 'true')
    if (premiumOnly) params.set('premium', 'true')
    
    setSearchParams(params, { replace: true })
  }, [selectedCategory, debouncedSearch, sortBy, videoOnly, premiumOnly, setSearchParams])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting && hasMorePages && !loading && !loadingMore && !isLoadingNextRef.current) {
          console.log('[Infinite Scroll] Loading more wallpapers')
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

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // SEO Configuration
  const getSEOConfig = () => {
    let config = { ...PAGE_SEO.wallpapers }
    
    // Category-specific SEO
    if (selectedCategory !== 'all' && CATEGORY_SEO[selectedCategory]) {
      config = {
        ...config,
        ...CATEGORY_SEO[selectedCategory],
        image: `/images/og-category-${selectedCategory}.jpg`
      }
    }
    
    // Search-specific SEO
    if (searchQuery) {
      config = {
        ...config,
        title: `${searchQuery} Wallpapers - Free HD Downloads | BestFreeWallpapers`,
        description: `Download free ${searchQuery} wallpapers in HD quality. Browse our collection of ${searchQuery} backgrounds and desktop images.`,
        keywords: [searchQuery, `${searchQuery} wallpapers`, `${searchQuery} backgrounds`, ...config.keywords || []]
      }
    }
    
    return config
  }

  // Generate structured data for wallpapers
  const structuredData = wallpapers.slice(0, 6).map(wallpaper => 
    generateWallpaperSchema(wallpaper)
  )

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      
      if (error) {
        console.error('Error loading categories:', error)
      } else {
        setCategories(data || [])
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadWallpapers = useCallback(async (reset = false) => {
    // Request guard - prevent concurrent requests
    if (!reset && isLoadingNextRef.current) {
      console.log('[Infinite Scroll] Request blocked - already loading')
      return
    }
    
    // Set loading flag
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
      seenIdsRef.current.clear()
    } else {
      setLoadingMore(true)
    }
    
    setError(null)
    
    try {
      const pageToLoad = reset ? 1 : currentPage + 1
      
      const BASE_URL = import.meta.env.VITE_SUPABASE_URL
      const AUTH_HEADER = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      
      const response = await fetch(
        `${BASE_URL}/functions/v1/wallpapers-api`,
        {
          method: 'POST',
          headers: {
            'Authorization': AUTH_HEADER,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            category: selectedCategory === 'all' ? undefined : selectedCategory,
            search: searchQuery || undefined,
            sort: sortBy,
            limit: wallpapersPerPage,
            page: pageToLoad,
            video_only: videoOnly || undefined,
            is_premium: premiumOnly ? true : undefined
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
        
        // De-duplication logic
        const uniqueWallpapers = newWallpapers.filter((wallpaper: any) => {
          if (seenIdsRef.current.has(wallpaper.id)) {
            console.log(`[Infinite Scroll] Duplicate filtered: ${wallpaper.id}`)
            return false
          }
          seenIdsRef.current.add(wallpaper.id)
          return true
        })
        
        console.log(`[Infinite Scroll] Loaded ${newWallpapers.length} wallpapers, ${uniqueWallpapers.length} unique for page ${pageToLoad}`, {
          totalPages,
          currentPage: pageToLoad,
          duplicatesFiltered: newWallpapers.length - uniqueWallpapers.length
        })
        
        if (reset) {
          setWallpapers(uniqueWallpapers)
        } else {
          setWallpapers(prev => [...prev, ...uniqueWallpapers])
        }
        
        setTotalCount(result.data?.totalCount || 0)
        setCurrentPage(pageToLoad)
        
        // Check if there are more pages
        const hasMore = pageToLoad < totalPages && uniqueWallpapers.length > 0
        setHasMorePages(hasMore)
        
        if (!hasMore) {
          console.log('[Infinite Scroll] No more pages available')
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
        isLoadingNextRef.current = false
      }
    }
  }, [selectedCategory, searchQuery, sortBy, videoOnly, premiumOnly, wallpapersPerPage, currentPage])

  const handleCategoryChange = (categorySlug: string) => {
    setSelectedCategory(categorySlug)
  }

  const handleSortChange = (sortValue: SortOption) => {
    setSortBy(sortValue)
  }

  const loadMoreWallpapers = useCallback(() => {
    if (!loadingMore && hasMorePages && !isLoadingNextRef.current) {
      loadWallpapers(false)
    }
  }, [loadingMore, hasMorePages, loadWallpapers])

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

  const handleVideoToggle = () => {
    setVideoOnly(!videoOnly)
  }

  const handlePremiumToggle = () => {
    setPremiumOnly(!premiumOnly)
  }

  const handleClearFilters = () => {
    setSelectedCategory('all')
    setSortBy('newest')
    setSearchTerm('')
    setVideoOnly(false)
    setPremiumOnly(false)
    setError(null)
  }

  const getPageTitle = () => {
    if (searchQuery) return `Search results for "${searchQuery}"`
    if (selectedCategory !== 'all') {
      const category = categories.find(c => c.slug === selectedCategory)
      return category ? `${category.name} wallpapers` : 'Wallpapers'
    }
    return 'Free Wallpapers'
  }

  const getPageDescription = () => {
    if (loading && wallpapers.length === 0) return 'Loading wallpapers...'
    if (error) return 'Error loading wallpapers'
    return `Showing ${wallpapers.length} of ${totalCount} wallpapers`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead config={getSEOConfig()} structuredData={structuredData} noIndex={true} noFollow={true} />
      
      {/* Category Tabs */}
      <BestFreeWallpapersTabCategories
        selectedCategory={selectedCategory}
        onCategorySelect={(category) => {
          if (category === 'all') {
            setSelectedCategory('all')
            setCurrentPage(1)
          }
          // Navigation is handled within the component
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col">
          {/* Page Header with Sort Controls */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {getPageTitle()}
              </h1>
              <p className="text-gray-600">
                {getPageDescription()}
              </p>
            </div>
            
            {/* Search, Sort and View Controls */}
            <div className="flex items-center space-x-4">
              {/* Search Input - Desktop */}
              <form onSubmit={handleSearchSubmit} className="hidden sm:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search wallpapers..."
                    className="pl-10 pr-10 py-2 rounded-lg border-2 text-sm transition-colors focus:outline-none focus:ring-2 bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-purple-200 w-64"
                    disabled={loading}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </form>
              
              {/* Video Toggle */}
              <button
                onClick={handleVideoToggle}
                className={`hidden sm:flex items-center space-x-2 px-4 py-2 min-h-[44px] rounded-lg font-medium transition-colors ${
                  videoOnly
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                disabled={loading}
              >
                <Video className="w-4 h-4" />
                <span className="text-sm">Live/Video Only</span>
              </button>
              
              {/* Premium Toggle */}
              <button
                onClick={handlePremiumToggle}
                className={`hidden sm:flex items-center space-x-2 px-4 py-2 min-h-[44px] rounded-lg font-medium transition-colors ${
                  premiumOnly
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                disabled={loading}
              >
                <Crown className="w-4 h-4" />
                <span className="text-sm">Premium Only</span>
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
                      ? 'bg-gray-100 text-gray-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-gray-100 text-gray-600' 
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search wallpapers..."
                  className="w-full pl-11 pr-11 py-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-purple-200"
                  disabled={loading}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </form>
            
            {/* Video Toggle - Mobile */}
            <button
              onClick={handleVideoToggle}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                videoOnly
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              disabled={loading}
            >
              <Video className="w-5 h-5" />
              <span>Live/Video Wallpapers Only</span>
            </button>
            
            {/* Premium Toggle - Mobile */}
            <button
              onClick={handlePremiumToggle}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                premiumOnly
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              disabled={loading}
            >
              <Crown className="w-5 h-5" />
              <span>Premium Wallpapers Only</span>
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
            <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">
              <p className="font-medium">Unable to load wallpapers</p>
              <p className="text-sm mt-1">{serializeError(error)}</p>
              <button 
                onClick={() => {
                  setError(null)
                  loadWallpapers(true)
                }}
                className="mt-2 text-sm font-medium underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Results Counter */}
          {!loading && !error && wallpapers.length > 0 && (
            <div className="mb-6 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  Showing {wallpapers.length.toLocaleString()} of {totalCount.toLocaleString()} wallpapers
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
                {[...Array(24)].map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[9/16] rounded-lg bg-gray-200 animate-pulse"
                  />
                ))}
              </div>
            ) : wallpapers.length > 0 ? (
              <div className={viewMode === 'grid' ? 
                'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4' :
                'space-y-6'
              }>
                {wallpapers.map((wallpaper, index) => (
                  <EnhancedWallpaperCardAdapter
                    key={wallpaper.id}
                    wallpaper={wallpaper}
                    className="aspect-[9/16]"
                    variant="compact"
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Search className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No wallpapers found
                </h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your filters or search query
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
                    <div className="text-xs opacity-50 text-gray-400">
                      Scroll to load more wallpapers...
                    </div>
                  )}
                </div>
                
                {/* Loading more indicator */}
                {loadingMore && (
                  <div className="mt-8 flex justify-center items-center py-6">
                    <Loader className="w-6 h-6 animate-spin mr-3 text-gray-600" />
                    <span className="text-gray-600">
                      Loading more wallpapers...
                    </span>
                  </div>
                )}
                
                {/* Manual load more button (fallback) */}
                {hasMorePages && !loadingMore && (
                  <div className="mt-8 flex justify-center">
                    <button
                      onClick={loadMoreWallpapers}
                      className="px-6 py-3 min-h-[44px] rounded-lg font-medium transition-colors bg-gray-900 hover:bg-gray-800 text-white"
                    >
                      Load More Wallpapers
                    </button>
                  </div>
                )}
                
                {/* End of results indicator */}
                {!hasMorePages && wallpapers.length > 0 && (
                  <div className="mt-12 text-center py-6">
                    <p className="text-sm text-gray-400">
                      You've seen all {totalCount.toLocaleString()} wallpapers
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

export default WallpapersPage
