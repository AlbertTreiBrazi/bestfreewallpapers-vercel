import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Link, useSearchParams } from 'react-router-dom'
import { EnhancedWallpaperCardAdapter } from '@/components/wallpapers/EnhancedWallpaperCardAdapter'
import { Crown, Check, Star, Download, Heart, Zap, Shield, Loader2, CreditCard, ExternalLink, Search, X, Video } from 'lucide-react'
import { SortDropdown, type SortOption } from '@/components/ui/SortDropdown'
import { useSort } from '@/hooks/useSort'
import { useDebounce } from '@/hooks/useDebounce'
import toast from 'react-hot-toast'

export function PremiumPage() {
  const { user, profile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [premiumWallpapers, setPremiumWallpapers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)
  const [userSubscription, setUserSubscription] = useState<any>(null)
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [videoOnly, setVideoOnly] = useState(searchParams.get('video') === 'true')
  const [includeFree, setIncludeFree] = useState(searchParams.get('include_free') === 'true')
  const [totalCount, setTotalCount] = useState(0)
  
  // Debounce search for better performance
  const debouncedSearch = useDebounce(searchQuery, 300)
  
  // Sort functionality
  const { sortBy, setSortBy } = useSort({ defaultSort: 'newest' })
  
  // Features expansion state for pricing card
  const [showAllFeatures, setShowAllFeatures] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'))
  const [totalPages, setTotalPages] = useState(1)
  const wallpapersPerPage = 24
  
  // Grid ref for pagination scroll
  const gridRef = useRef<HTMLDivElement>(null)
  
  // Fetch premium wallpapers and user subscription status
  useEffect(() => {
    fetchPremiumWallpapers()
    if (user) {
      fetchUserSubscription()
    }
  }, [user, debouncedSearch, videoOnly, includeFree, sortBy, currentPage])
  
  // Update URL params when search, video filter, includeFree, sort, or page changes
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (currentPage > 1) params.set('page', currentPage.toString())
    if (videoOnly) params.set('video', 'true')
    if (includeFree) params.set('include_free', 'true')
    if (sortBy !== 'newest') params.set('sort', sortBy)
    
    setSearchParams(params, { replace: true })
  }, [debouncedSearch, currentPage, videoOnly, includeFree, sortBy, setSearchParams])
  
  // Sync videoOnly, includeFree, and currentPage state with URL params on mount and navigation
  useEffect(() => {
    setVideoOnly(searchParams.get('video') === 'true')
    setIncludeFree(searchParams.get('include_free') === 'true')
    const pageFromUrl = parseInt(searchParams.get('page') || '1')
    if (pageFromUrl !== currentPage) {
      setCurrentPage(pageFromUrl)
    }
  }, [searchParams])
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, videoOnly, includeFree, sortBy])
  
  const fetchUserSubscription = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('bfw_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()
        
      if (error) {
        console.error('Error fetching subscription:', error)
        return
      }
      
      setUserSubscription(data)
    } catch (error) {
      console.error('Error fetching subscription:', error)
    }
  }
  
  const fetchPremiumWallpapers = useCallback(async () => {
    try {
      setLoading(true)
      
      // Use the advanced-search edge function with portrait filter and premium toggle
      const { data, error } = await supabase.functions.invoke('advanced-search', {
        body: {
          action: 'search_wallpapers',
          query: debouncedSearch || '',
          filters: {
            category: 'all',
            tags: [],
            deviceType: 'mobile', // Filter for 9:16 portrait wallpapers only
            resolution: 'all',
            showPremium: includeFree ? false : true, // true = premium only, false = all (premium + free)
            videoOnly: videoOnly
          },
          page: currentPage,
          limit: wallpapersPerPage,
          sortBy: sortBy
        }
      })

      if (error) {
        console.error('Error fetching premium wallpapers:', error)
        toast.error(`Failed to load premium wallpapers: ${error.message}`)
        setPremiumWallpapers([])
        setTotalCount(0)
        return
      }

      if (data?.data) {
        const newWallpapers = data.data.wallpapers || []
        setPremiumWallpapers(newWallpapers)
        setTotalCount(data.data.totalCount || 0)
        
        // Calculate total pages
        const pages = Math.ceil((data.data.totalCount || 0) / wallpapersPerPage)
        setTotalPages(pages)
        
        console.log(`Loaded ${newWallpapers.length} premium wallpapers`, {
          totalCount: data.data.totalCount,
          currentPage,
          totalPages: pages,
          debouncedSearch,
          videoOnly,
          includeFree
        })
      } else {
        setPremiumWallpapers([])
        setTotalCount(0)
        setTotalPages(1)
      }
      
    } catch (error: any) {
      console.error('Error in fetchPremiumWallpapers:', error)
      toast.error(`Failed to load premium wallpapers: ${error.message || 'Unknown error'}`)
      setPremiumWallpapers([])
      setTotalCount(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, videoOnly, includeFree, sortBy, currentPage, wallpapersPerPage])

  const handleSubscribe = async () => {
    if (!user) {
      toast.error('Please sign in to subscribe')
      return
    }

    setSubscriptionLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          planType: 'premium',
          customerEmail: user.email
        }
      })

      if (error) throw error

      if (data.data?.checkoutUrl) {
        toast.success('Redirecting to payment...')
        window.location.href = data.data.checkoutUrl
      }
    } catch (error: any) {
      console.error('Subscription error:', error)
      toast.error(error.message || 'Failed to create subscription')
    } finally {
      setSubscriptionLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    if (!user || !userSubscription) return

    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session')

      if (error) throw error

      if (data.data?.portalUrl) {
        window.location.href = data.data.portalUrl
      }
    } catch (error: any) {
      console.error('Portal error:', error)
      toast.error(error.message || 'Failed to open customer portal')
    }
  }

  const isPremiumUser = userSubscription && userSubscription.status === 'active'
  
  // Event handlers
  const handleSortChange = (sortValue: SortOption) => {
    setSortBy(sortValue)
  }
  
  const handleVideoToggle = () => {
    setVideoOnly(!videoOnly)
  }
  
  const handleIncludeFreeToggle = () => {
    setIncludeFree(!includeFree)
  }
  
  const scrollToGrid = () => {
    if (gridRef.current) {
      gridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Search will trigger automatically via useEffect watching searchQuery
  }
  
  const handleClearSearch = () => {
    setSearchQuery('')
  }
  
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClearSearch()
    }
  }
  
  const handleClearFilters = () => {
    setSortBy('newest')
    setSearchQuery('')
    setVideoOnly(false)
    setIncludeFree(false)
    setCurrentPage(1)
  }

  const features = [
    {
      icon: Download,
      title: 'Unlimited Downloads',
      description: 'Download as many wallpapers as you want without any limits'
    },
    {
      icon: Star,
      title: '8K Ultra HD Quality',
      description: 'Access to highest resolution wallpapers available'
    },
    {
      icon: Zap,
      title: 'Instant Access',
      description: 'No ads, no waiting times, instant premium downloads'
    },
    {
      icon: Heart,
      title: 'Exclusive Content',
      description: 'Access to premium-only wallpapers and early releases'
    },
    {
      icon: Shield,
      title: 'Commercial License',
      description: 'Use wallpapers for commercial projects and presentations'
    }
  ]

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Crown className="w-12 sm:w-16 h-12 sm:h-16 mx-auto mb-6 text-yellow-300" />
            <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold mb-6 leading-tight px-2">
              Premium Wallpapers
            </h1>
            <p className="text-base sm:text-xl md:text-2xl mb-8 text-gray-100 max-w-3xl mx-auto px-4">
              Unlock exclusive access to our premium collection with ultra-high quality wallpapers
            </p>
            
            {!isPremiumUser ? (
              <button
                onClick={handleSubscribe}
                disabled={subscriptionLoading}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-4 min-h-[44px] rounded-lg font-semibold text-lg hover:from-yellow-500 hover:to-orange-600 transition duration-200 inline-flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {subscriptionLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Crown className="w-6 h-6" />
                )}
                <span>{subscriptionLoading ? 'Processing...' : 'Upgrade to Premium'}</span>
              </button>
            ) : (
              <div className="space-y-4">
                <div className="inline-flex items-center space-x-2 bg-green-500 text-white px-8 py-4 rounded-lg font-semibold text-lg">
                  <Check className="w-6 h-6" />
                  <span>You have Premium Access!</span>
                </div>
                <div>
                  <button
                    onClick={handleManageSubscription}
                    className="bg-gray-700 text-white px-6 py-3 min-h-[44px] rounded-lg font-medium hover:bg-gray-600 transition duration-200 inline-flex items-center space-x-2"
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>Manage Subscription</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Premium Features */}
        <section className="py-16 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4 px-2">
                Why Choose Premium?
              </h2>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto px-4">
                Get the ultimate wallpaper experience with premium features designed for professionals
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="text-center">
                  <div className="bg-gray-100 dark:bg-gray-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-8 h-8 text-gray-600 dark:text-gray-300" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2 px-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section - Compact Teaser Card */}
        {!isPremiumUser && (
          <section className="py-8 sm:py-16 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-6 sm:mb-12">
                <h2 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-4 px-2">
                  Simple, Transparent Pricing
                </h2>
                <p className="text-sm sm:text-lg text-gray-600 dark:text-gray-300 px-4">
                  European tax compliance with automatic VAT calculation
                </p>
              </div>
              
              <div className="max-w-md mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden transform hover:scale-105 transition-transform duration-200 ring-2 ring-blue-500 max-h-[70vh] sm:max-h-none overflow-y-auto">
                  <div className="bg-blue-500 text-white text-center py-2 text-xs sm:text-sm font-medium">
                    Recommended
                  </div>
                  <div className="py-4 px-4 sm:p-8">
                    <h3 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-4 text-center">
                      BestFreeWallpapers Premium
                    </h3>
                    
                    <div className="text-center mb-3 sm:mb-6">
                      <div className="flex items-baseline justify-center space-x-1">
                        <span className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white">€4.99</span>
                        <span className="text-sm sm:text-lg text-gray-600 dark:text-gray-300">+ VAT</span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                        per month
                      </p>
                    </div>
                    
                    {/* Key Perks - Always Visible */}
                    <ul className="space-y-2 mb-3 sm:mb-4">
                      <li className="flex items-center space-x-3">
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                        <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">Unlimited Downloads</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                        <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">8K Ultra HD Quality</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                        <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">Ad-free Experience</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                        <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">Commercial License</span>
                      </li>
                    </ul>
                    
                    {/* Collapsible Additional Benefits */}
                    {showAllFeatures && (
                      <ul className="space-y-2 mb-3 sm:mb-4 transition-all duration-300">
                        <li className="flex items-center space-x-3">
                          <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                          <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">Instant Access</span>
                        </li>
                        <li className="flex items-center space-x-3">
                          <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                          <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">Exclusive Content</span>
                        </li>
                      </ul>
                    )}
                    
                    {/* See All Benefits Toggle */}
                    <button
                      onClick={() => setShowAllFeatures(!showAllFeatures)}
                      className="w-full text-center text-xs sm:text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium mb-3 sm:mb-4 py-2 min-h-[44px] rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                    >
                      {showAllFeatures ? 'Hide benefits' : 'See all benefits'}
                    </button>
                    
                    <button
                      onClick={handleSubscribe}
                      disabled={subscriptionLoading || !user}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 sm:py-4 min-h-[44px] rounded-lg font-semibold text-sm sm:text-lg hover:from-blue-700 hover:to-purple-700 transition duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {subscriptionLoading ? (
                        <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                      ) : (
                        <CreditCard className="w-4 h-4 sm:w-6 sm:h-6" />
                      )}
                      <span>
                        {!user ? 'Sign In to Subscribe' : subscriptionLoading ? 'Processing...' : 'Subscribe Now'}
                      </span>
                    </button>
                    
                    {/* VAT Notice - Below CTA */}
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      VAT will be calculated at checkout
                    </p>
                    
                    {!user && (
                      <div className="mt-3 text-center">
                        <Link
                          to="/auth"
                          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                        >
                          Sign in or create an account
                        </Link>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
                      Cancel anytime. Secure payment powered by Stripe.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Premium Wallpapers Preview */}
        <section className="py-16 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4 px-2">
                Premium Collection Preview
              </h2>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 px-4">
                {isPremiumUser ? 'Enjoy unlimited access to our premium collection' : 'Get a taste of what awaits you in our premium collection'}
              </p>
            </div>
            
            {/* Tab Header - All Premium | Live/Video Only */}
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex space-x-8">
                <button
                  onClick={() => setVideoOnly(false)}
                  className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    !videoOnly
                      ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  All Premium Wallpapers
                  {!loading && totalCount > 0 && !videoOnly && (
                    <span className="ml-2 text-xs opacity-75">({totalCount.toLocaleString()})</span>
                  )}
                </button>
                <button
                  onClick={() => setVideoOnly(true)}
                  className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                    videoOnly
                      ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  <span>Live/Video Only</span>
                  {!loading && totalCount > 0 && videoOnly && (
                    <span className="ml-2 text-xs opacity-75">({totalCount.toLocaleString()})</span>
                  )}
                </button>
              </div>
            </div>
            
            {/* Search and Filter Controls */}
            <div className="mb-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Search Input */}
                <form onSubmit={handleSearchSubmit} className="w-full md:w-auto md:flex-1 md:max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search premium wallpapers..."
                      className="w-full pl-11 pr-11 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-purple-500 focus:ring-purple-500/20 transition-colors"
                      disabled={loading}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </form>
                
                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  {/* Show All Mobile Toggle */}
                  <button
                    onClick={handleIncludeFreeToggle}
                    className={`flex items-center justify-between sm:justify-center space-x-2 px-4 py-3 min-h-[44px] rounded-lg font-medium transition-colors ${
                      includeFree
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    } w-full sm:w-auto`}
                    disabled={loading}
                  >
                    <Crown className="w-5 h-5" />
                    <span className="text-sm">Include Free</span>
                  </button>
                  
                  {/* Video Only Toggle */}
                  <button
                    onClick={handleVideoToggle}
                    className={`flex items-center justify-between sm:justify-center space-x-2 px-4 py-3 min-h-[44px] rounded-lg font-medium transition-colors ${
                      videoOnly
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    } w-full sm:w-auto`}
                    disabled={loading}
                  >
                    <Video className="w-5 h-5" />
                    <span className="text-sm">Live/Video Only</span>
                  </button>
                  
                  {/* Sort Dropdown */}
                  <div className="w-full sm:w-auto">
                    <SortDropdown
                      value={sortBy}
                      onChange={handleSortChange}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
              
              {/* Results Counter */}
              {!loading && premiumWallpapers.length > 0 && (
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                  Showing {((currentPage - 1) * wallpapersPerPage) + 1}-{Math.min(currentPage * wallpapersPerPage, totalCount)} of {totalCount.toLocaleString()} premium wallpapers
                </div>
              )}
            </div>
            
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {[...Array(24)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-lg aspect-video mb-4" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : premiumWallpapers.length > 0 ? (
              <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {premiumWallpapers.map((wallpaper) => (
                  <EnhancedWallpaperCardAdapter
                    key={wallpaper.id}
                    wallpaper={wallpaper}
                    variant="compact"
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 dark:text-gray-500 mb-4">
                  <Search className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {searchQuery || videoOnly ? 'No premium wallpapers found' : 'No premium wallpapers available'}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {searchQuery
                    ? `No premium wallpapers found matching "${searchQuery}"`
                    : videoOnly
                      ? 'No premium live/video wallpapers found'
                      : 'No premium wallpapers available at the moment'}
                </p>
                {(searchQuery || videoOnly) && (
                  <button
                    onClick={handleClearFilters}
                    className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
            
            {/* Numbered Pagination */}
            {totalPages > 1 && !loading && premiumWallpapers.length > 0 && (
              <div className="mt-12 flex justify-center">
                <div className="flex items-center space-x-2">
                  {/* Previous Button */}
                  <button
                    onClick={() => {
                      setCurrentPage(currentPage - 1)
                      scrollToGrid()
                    }}
                    disabled={currentPage === 1}
                    className="px-4 py-2 min-h-[44px] rounded-lg border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </button>
                  
                  {/* Page Numbers */}
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const page = Math.max(1, currentPage - 2) + i
                    if (page > totalPages) return null
                    
                    return (
                      <button
                        key={page}
                        onClick={() => {
                          setCurrentPage(page)
                          scrollToGrid()
                        }}
                        className={`px-4 py-2 min-h-[44px] rounded-lg transition-colors ${
                          currentPage === page
                            ? 'bg-purple-600 text-white'
                            : 'border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                  
                  {/* Next Button */}
                  <button
                    onClick={() => {
                      setCurrentPage(currentPage + 1)
                      scrollToGrid()
                    }}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 min-h-[44px] rounded-lg border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <span className="sm:hidden">Next</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  )
}

export default PremiumPage