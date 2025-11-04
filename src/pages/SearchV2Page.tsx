import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTheme } from '@/contexts/ThemeContext'
import { SEOHead } from '@/components/seo/SEOHead'
import { EnhancedWallpaperCardAdapter } from '@/components/wallpapers/EnhancedWallpaperCardAdapter'
import { Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react'

interface SearchResults {
  wallpapers: any[]
  totalCount: number
  totalPages: number
  currentPage: number
}

interface SearchCache {
  [key: string]: {
    data: SearchResults
    timestamp: number
  }
}

export default function SearchV2Page() {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Get all filter values from URL (URL is source of truth)
  const queryFromUrl = searchParams.get('q') || ''
  const categoryFromUrl = searchParams.get('category') || ''
  const deviceFromUrl = searchParams.get('device') || ''
  const resolutionFromUrl = searchParams.get('res') || ''
  const videoOnlyFromUrl = searchParams.get('video') === 'true'
  const premiumFromUrl = searchParams.get('premium') === 'true'
  const pageFromUrl = parseInt(searchParams.get('page') || '1')
  const sortByFromUrl = searchParams.get('sort') || 'newest'
  
  // Local state for search input (syncs with URL after debounce)
  const [searchInput, setSearchInput] = useState(queryFromUrl)
  const [results, setResults] = useState<SearchResults>({
    wallpapers: [],
    totalCount: 0,
    totalPages: 0,
    currentPage: 1
  })
  const [loading, setLoading] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  
  // Refs for performance optimization
  const abortControllerRef = useRef<AbortController | null>(null)
  const cacheRef = useRef<SearchCache>({})
  const maxCacheSize = 10
  const cacheTTL = 60000 // 1 minute
  
  // Sync search input with URL
  useEffect(() => {
    setSearchInput(queryFromUrl)
  }, [queryFromUrl])
  
  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== queryFromUrl) {
        updateUrlParam('q', searchInput)
      }
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchInput])
  
  // Load categories on mount
  useEffect(() => {
    loadCategories()
  }, [])
  
  // Perform search when URL changes
  useEffect(() => {
    performSearch()
  }, [searchParams])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search bar on '/' key (only if no input/textarea is focused)
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        document.getElementById('search-input')?.focus()
      }
      // Clear search on Escape
      if (e.key === 'Escape' && document.activeElement?.id === 'search-input') {
        setSearchInput('')
        updateUrlParam('q', '')
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  const loadCategories = async () => {
    try {
      const BASE_URL = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${BASE_URL}/rest/v1/categories?is_active=eq.true&order=sort_order`, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setCategories(data || [])
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }
  
  const performSearch = async () => {
    // Build cache key from all URL params
    const cacheKey = searchParams.toString()
    
    // Check cache
    const cached = cacheRef.current[cacheKey]
    if (cached && Date.now() - cached.timestamp < cacheTTL) {
      setResults(cached.data)
      return
    }
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    setLoading(true)
    
    try {
      const BASE_URL = import.meta.env.VITE_SUPABASE_URL
      const AUTH_HEADER = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      
      const response = await fetch(
        `${BASE_URL}/functions/v1/advanced-search`,
        {
          method: 'POST',
          headers: {
            'Authorization': AUTH_HEADER,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            action: 'search_wallpapers',
            query: queryFromUrl,
            filters: {
              category: categoryFromUrl || undefined,
              deviceType: deviceFromUrl || undefined,
              resolution: resolutionFromUrl || undefined,
              showPremium: premiumFromUrl,
              videoOnly: videoOnlyFromUrl
            },
            page: pageFromUrl,
            limit: 24,
            sortBy: sortByFromUrl
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
        const searchResults = result.data || {
          wallpapers: [],
          totalCount: 0,
          totalPages: 0,
          currentPage: pageFromUrl
        }
        
        setResults(searchResults)
        
        // Update cache (maintain max 10 entries)
        const cacheKeys = Object.keys(cacheRef.current)
        if (cacheKeys.length >= maxCacheSize) {
          // Remove oldest entry
          const oldestKey = cacheKeys.reduce((oldest, key) => 
            cacheRef.current[key].timestamp < cacheRef.current[oldest].timestamp ? key : oldest
          )
          delete cacheRef.current[oldestKey]
        }
        cacheRef.current[cacheKey] = {
          data: searchResults,
          timestamp: Date.now()
        }
      } else {
        setResults({
          wallpapers: [],
          totalCount: 0,
          totalPages: 0,
          currentPage: 1
        })
      }
    } catch (error: any) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        return
      }
      console.error('Search error:', error)
      setResults({
        wallpapers: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1
      })
    } finally {
      // Only clear loading if this is still the current request
      if (!abortController.signal.aborted) {
        setLoading(false)
      }
    }
  }
  
  const updateUrlParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value && value !== '' && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    // Reset page to 1 when filters change (except when changing page itself)
    if (key !== 'page') {
      params.delete('page')
    }
    navigate(`/search?${params.toString()}`, { replace: true })
  }
  
  const updateBooleanParam = (key: string, value: boolean) => {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set(key, 'true')
    } else {
      params.delete(key)
    }
    params.delete('page')
    navigate(`/search?${params.toString()}`, { replace: true })
  }
  
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams)
    if (page > 1) {
      params.set('page', page.toString())
    } else {
      params.delete('page')
    }
    navigate(`/search?${params.toString()}`, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  
  const handleClearAll = () => {
    navigate('/search', { replace: true })
  }
  
  const handleSuggestionClick = (term: string) => {
    navigate(`/search?q=${encodeURIComponent(term)}`, { replace: true })
  }
  
  const hasActiveFilters = categoryFromUrl || deviceFromUrl || resolutionFromUrl || 
    videoOnlyFromUrl || premiumFromUrl || queryFromUrl || sortByFromUrl !== 'newest'
  
  // SEO configuration
  const seoConfig = {
    title: queryFromUrl 
      ? `Search Results for "${queryFromUrl}" - Fast Search | BestFreeWallpapers`
      : 'Fast Wallpaper Search - Find Perfect Wallpapers | BestFreeWallpapers',
    description: queryFromUrl
      ? `Quick search results for "${queryFromUrl}". Find and download free HD wallpapers instantly.`
      : 'Lightning-fast wallpaper search. Filter by category, device, resolution and more to find your perfect wallpaper.',
    keywords: queryFromUrl 
      ? [queryFromUrl, `${queryFromUrl} wallpapers`, 'search results']
      : ['wallpaper search', 'fast search', 'find wallpapers']
  }
  
  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'} transition-colors duration-200`}>
      <SEOHead config={seoConfig} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
            <input
              id="search-input"
              type="text"
              placeholder="Search wallpapers... (Press '/' to focus)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateUrlParam('q', searchInput)
                }
              }}
              className={`pl-12 pr-12 py-4 w-full rounded-xl border-2 text-lg ${theme === 'dark' ? 'bg-dark-secondary border-dark-border text-white focus:border-purple-500' : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'} focus:outline-none transition-colors duration-200`}
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput('')
                  updateUrlParam('q', '')
                }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2"
              >
                <X className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`} />
              </button>
            )}
          </div>
          <p className={`text-center mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Keyboard: <kbd className="px-2 py-1 bg-gray-100 text-gray-700 rounded">Enter</kbd> to search, <kbd className="px-2 py-1 bg-gray-100 text-gray-700 rounded">Esc</kbd> to clear
          </p>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Filters Sidebar */}
          <div className="hidden lg:block lg:w-64 flex-shrink-0">
            <div className={`${theme === 'dark' ? 'bg-dark-secondary border-dark-border' : 'bg-white border-gray-200'} rounded-xl border-2 p-6 sticky top-4`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Filters</h3>
                {hasActiveFilters && (
                  <button
                    onClick={handleClearAll}
                    className={`text-sm ${theme === 'dark' ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'}`}
                  >
                    Clear All
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                {/* Category */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Category
                  </label>
                  <select
                    value={categoryFromUrl}
                    onChange={(e) => updateUrlParam('category', e.target.value)}
                    className={`w-full p-2 rounded-lg border ${theme === 'dark' ? 'bg-dark-tertiary border-dark-border text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Device Type */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Device Type
                  </label>
                  <select
                    value={deviceFromUrl}
                    onChange={(e) => updateUrlParam('device', e.target.value)}
                    className={`w-full p-2 rounded-lg border ${theme === 'dark' ? 'bg-dark-tertiary border-dark-border text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  >
                    <option value="">All Devices</option>
                    <option value="desktop">Desktop</option>
                    <option value="mobile">Mobile</option>
                    <option value="tablet">Tablet</option>
                  </select>
                </div>
                
                {/* Resolution */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Resolution
                  </label>
                  <select
                    value={resolutionFromUrl}
                    onChange={(e) => updateUrlParam('res', e.target.value)}
                    className={`w-full p-2 rounded-lg border ${theme === 'dark' ? 'bg-dark-tertiary border-dark-border text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  >
                    <option value="">Any Resolution</option>
                    <option value="hd">HD (720p+)</option>
                    <option value="1080x1920">Full HD (1080x1920)</option>
                    <option value="4k">4K (2160p+)</option>
                  </select>
                </div>
                
                {/* Sort By */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Sort By
                  </label>
                  <select
                    value={sortByFromUrl}
                    onChange={(e) => updateUrlParam('sort', e.target.value)}
                    className={`w-full p-2 rounded-lg border ${theme === 'dark' ? 'bg-dark-tertiary border-dark-border text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  >
                    <option value="newest">Newest First</option>
                    <option value="popular">Most Popular</option>
                    <option value="downloads">Most Downloads</option>
                  </select>
                </div>
                
                <div className="border-t border-gray-200 dark:border-dark-border my-4"></div>
                
                {/* Free Only / Include Premium */}
                <div>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={premiumFromUrl}
                      onChange={(e) => updateBooleanParam('premium', e.target.checked)}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500 rounded"
                    />
                    <span className={`ml-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Include Premium (Free + Premium)
                    </span>
                  </label>
                  <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Unchecked: Free wallpapers only
                  </p>
                </div>
                
                {/* Live/Video Only */}
                <div>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={videoOnlyFromUrl}
                      onChange={(e) => updateBooleanParam('video', e.target.checked)}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500 rounded"
                    />
                    <span className={`ml-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Live/Video Only
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          {/* Mobile Filters */}
          <div className="lg:hidden mb-6">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 ${theme === 'dark' ? 'bg-dark-secondary border-dark-border' : 'bg-white border-gray-200'}`}
            >
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
                <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Filters</span>
                {hasActiveFilters && (
                  <span className="bg-purple-100 text-purple-600 text-xs px-2 py-1 rounded-full">
                    Active
                  </span>
                )}
              </div>
              <ChevronDown className={`w-5 h-5 transition-transform ${showMobileFilters ? 'rotate-180' : ''} ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
            </button>
            
            {showMobileFilters && (
              <div className={`mt-4 p-4 rounded-xl border-2 ${theme === 'dark' ? 'bg-dark-secondary border-dark-border' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Filters</h3>
                  {hasActiveFilters && (
                    <button
                      onClick={handleClearAll}
                      className={`text-sm ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}
                    >
                      Clear All
                    </button>
                  )}
                </div>
                
                <div className="space-y-4">
                  {/* Same filter structure as desktop */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Category
                    </label>
                    <select
                      value={categoryFromUrl}
                      onChange={(e) => updateUrlParam('category', e.target.value)}
                      className={`w-full p-2 rounded-lg border ${theme === 'dark' ? 'bg-dark-tertiary border-dark-border text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    >
                      <option value="">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Device Type
                    </label>
                    <select
                      value={deviceFromUrl}
                      onChange={(e) => updateUrlParam('device', e.target.value)}
                      className={`w-full p-2 rounded-lg border ${theme === 'dark' ? 'bg-dark-tertiary border-dark-border text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    >
                      <option value="">All Devices</option>
                      <option value="desktop">Desktop</option>
                      <option value="mobile">Mobile</option>
                      <option value="tablet">Tablet</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Resolution
                    </label>
                    <select
                      value={resolutionFromUrl}
                      onChange={(e) => updateUrlParam('res', e.target.value)}
                      className={`w-full p-2 rounded-lg border ${theme === 'dark' ? 'bg-dark-tertiary border-dark-border text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    >
                      <option value="">Any Resolution</option>
                      <option value="hd">HD (720p+)</option>
                      <option value="1080x1920">Full HD (1080x1920)</option>
                      <option value="4k">4K (2160p+)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Sort By
                    </label>
                    <select
                      value={sortByFromUrl}
                      onChange={(e) => updateUrlParam('sort', e.target.value)}
                      className={`w-full p-2 rounded-lg border ${theme === 'dark' ? 'bg-dark-tertiary border-dark-border text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    >
                      <option value="newest">Newest First</option>
                      <option value="popular">Most Popular</option>
                      <option value="downloads">Most Downloads</option>
                    </select>
                  </div>
                  
                  <div className="border-t border-gray-200 dark:border-dark-border my-4"></div>
                  
                  <div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={premiumFromUrl}
                        onChange={(e) => updateBooleanParam('premium', e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className={`ml-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Include Premium (Free + Premium)
                      </span>
                    </label>
                    <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Unchecked: Free wallpapers only
                    </p>
                  </div>
                  
                  <div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={videoOnlyFromUrl}
                        onChange={(e) => updateBooleanParam('video', e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className={`ml-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Live/Video Only
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Main Content */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="mb-6">
              <h1 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {queryFromUrl ? `Search Results for "${queryFromUrl}"` : 'All Wallpapers'}
              </h1>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                {loading ? 'Loading...' : `${results.totalCount.toLocaleString()} wallpapers found`}
              </p>
            </div>
            
            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {Array.from({ length: 24 }).map((_, index) => (
                  <div
                    key={index}
                    className={`aspect-[9/16] rounded-lg ${theme === 'dark' ? 'bg-dark-secondary' : 'bg-gray-200'} animate-pulse`}
                  />
                ))}
              </div>
            )}
            
            {/* Empty State with Suggestion Chips */}
            {!loading && results.wallpapers.length === 0 && (
              <div className="text-center py-16">
                <Search className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  No results found
                </h3>
                <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Try these popular searches:
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                  {['nature', 'space', '4K', 'minimal', 'dark', 'abstract'].map(term => (
                    <button
                      key={term}
                      onClick={() => handleSuggestionClick(term)}
                      className={`px-4 py-2 rounded-full border-2 transition-colors ${theme === 'dark' ? 'border-purple-500 text-purple-400 hover:bg-purple-900/30' : 'border-purple-500 text-purple-600 hover:bg-purple-50'}`}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Results Grid */}
            {!loading && results.wallpapers.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
                  {results.wallpapers.map((wallpaper, index) => (
                    <EnhancedWallpaperCardAdapter
                      key={wallpaper.id}
                      wallpaper={wallpaper}
                      className="aspect-[9/16] hover:scale-105 transition-transform duration-200"
                      priority={index < 12}
                      variant="compact"
                    />
                  ))}
                </div>
                
                {/* Pagination */}
                {results.totalPages > 1 && (
                  <div className="flex justify-center mt-12">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(pageFromUrl - 1)}
                        disabled={pageFromUrl === 1}
                        className={`px-4 py-2 border rounded-lg transition-colors ${theme === 'dark' ? 'border-dark-border text-white hover:bg-dark-secondary disabled:opacity-50 disabled:cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                      >
                        Previous
                      </button>
                      
                      {[...Array(Math.min(5, results.totalPages))].map((_, i) => {
                        const page = Math.max(1, pageFromUrl - 2) + i
                        if (page > results.totalPages) return null
                        
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-4 py-2 rounded-lg transition-colors ${pageFromUrl === page ? 'bg-purple-600 text-white' : theme === 'dark' ? 'border border-dark-border text-white hover:bg-dark-secondary' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                          >
                            {page}
                          </button>
                        )
                      })}
                      
                      <button
                        onClick={() => handlePageChange(pageFromUrl + 1)}
                        disabled={pageFromUrl === results.totalPages}
                        className={`px-4 py-2 border rounded-lg transition-colors ${theme === 'dark' ? 'border-dark-border text-white hover:bg-dark-secondary disabled:opacity-50 disabled:cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
