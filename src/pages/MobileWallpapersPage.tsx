import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTheme } from '@/contexts/ThemeContext'
import { SEOHead } from '@/components/seo/SEOHead'
import { generateImageObjectSchema, generateBreadcrumbSchema, generateFAQSchema } from '@/utils/seo'
import { Smartphone, Download, Star, Image, Zap, Filter, Search, Grid, Heart } from 'lucide-react'
import { EnhancedWallpaperCardAdapter } from '@/components/wallpapers/EnhancedWallpaperCardAdapter'

// Lazy load components for performance
// const CategoryFilter = React.lazy(() => 
//   import('@/components/category/CategoryFilter').then(module => ({
//     default: module.CategoryFilter || (() => <div>Category Filter</div>)
//   }))
// )

interface DeviceCollection {
  name: string
  slug: string
  description: string
  icon: string
  popular: boolean
}

const deviceCollections: DeviceCollection[] = [
  {
    name: 'iPhone Wallpapers',
    slug: 'iphone-wallpapers', 
    description: 'Optimized for iPhone 15, 14, 13, and older models',
    icon: '📱',
    popular: true
  },
  {
    name: 'Android Wallpapers',
    slug: 'android-wallpapers',
    description: 'Perfect for Samsung, Google Pixel, and all Android devices',
    icon: '🤖',
    popular: true
  },
  {
    name: 'Samsung Galaxy Wallpapers',
    slug: 'samsung-galaxy-wallpapers',
    description: 'Designed for Galaxy S24, S23, Note series',
    icon: '📲',
    popular: true
  },
  {
    name: 'iPad Wallpapers',
    slug: 'ipad-wallpapers',
    description: 'High-resolution backgrounds for iPad Pro and Air',
    icon: '📖',
    popular: false
  },
  {
    name: 'OnePlus Wallpapers',
    slug: 'oneplus-wallpapers',
    description: 'Optimized for OnePlus devices',
    icon: '📱',
    popular: false
  },
  {
    name: 'Xiaomi Wallpapers',
    slug: 'xiaomi-wallpapers',
    description: 'Perfect for Xiaomi and MIUI devices',
    icon: '📱',
    popular: false
  }
]

const mobileCategories = [
  { name: 'Nature Mobile', slug: 'nature-mobile', count: '2.5K+' },
  { name: 'Abstract Mobile', slug: 'abstract-mobile', count: '1.8K+' },
  { name: 'Dark Mobile', slug: 'dark-mobile', count: '3.2K+' },
  { name: 'Minimal Mobile', slug: 'minimal-mobile', count: '1.5K+' },
  { name: 'Gaming Mobile', slug: 'gaming-mobile', count: '2.1K+' },
  { name: 'Anime Mobile', slug: 'anime-mobile', count: '1.9K+' }
]

const faqs = [
  {
    question: 'What makes mobile wallpapers different from desktop wallpapers?',
    answer: 'Mobile wallpapers are specifically optimized for smartphone screens with aspect ratios like 19:9, 20:9, and 18:9. They feature vertical orientations and are optimized for touch interfaces with proper scaling for different device sizes.'
  },
  {
    question: 'What resolution should I choose for my mobile wallpaper?',
    answer: 'For modern smartphones, we recommend 1080x1920 (Full HD) or higher. iPhone users should look for 1170x2532 or 1284x2778 resolutions, while Android users can use 1080x1920 or 1440x2560 for best quality.'
  },
  {
    question: 'Are these mobile wallpapers free to download?',
    answer: 'Yes! All mobile wallpapers in our collection are completely free to download and use for personal purposes. No registration required, instant downloads available.'
  },
  {
    question: 'How often do you add new mobile wallpapers?',
    answer: 'We add new mobile wallpapers daily, with special collections released weekly. Follow our newsletter to get notified of new releases and trending mobile wallpaper collections.'
  },
  {
    question: 'Can I use these wallpapers for commercial purposes?',
    answer: 'Our free mobile wallpapers are for personal use. For commercial usage, please check our premium collection or contact us for licensing information.'
  }
]

export default function MobileWallpapersPage() {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [wallpapers, setWallpapers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // AbortController ref for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'))
  const [totalPages, setTotalPages] = useState(1)
  const wallpapersPerPage = 24

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Sync search and page to URL parameters
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (currentPage > 1) params.set('page', currentPage.toString())
    if (selectedCategory !== 'all') params.set('category', selectedCategory)
    
    setSearchParams(params, { replace: true })
  }, [debouncedSearch, currentPage, selectedCategory, setSearchParams])

  // Load mobile wallpapers
  useEffect(() => {
    loadMobileWallpapers()
  }, [selectedCategory, debouncedSearch, currentPage])

  const loadMobileWallpapers = async () => {
    // Cancel previous request if still pending
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
            device_type: 'mobile',
            sort: 'popular',
            limit: wallpapersPerPage,
            page: currentPage,
            search: debouncedSearch || undefined
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
        setWallpapers(result.data?.wallpapers || [])
        setTotalPages(result.data?.totalPages || 1)
      } else {
        console.error('Failed to load mobile wallpapers:', response.status, response.statusText)
        setWallpapers([])
      }
    } catch (error) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        return
      }
      console.error('Error loading mobile wallpapers:', error)
      setWallpapers([])
      setTotalPages(1)
    } finally {
      // Only clear loading if this is still the current request
      if (!abortController.signal.aborted) {
        setLoading(false)
      }
    }
  }

  // SEO Configuration for Mobile Wallpapers Landing Page
  const seoConfig = {
    title: 'Mobile Wallpapers - Best Free HD Phone Backgrounds 2025',
    description: 'Download the best free mobile wallpapers for iPhone, Android, Samsung Galaxy. 10,000+ HD phone backgrounds optimized for all mobile devices. Updated daily with trending mobile wallpapers.',
    keywords: [
      'mobile wallpapers',
      'phone wallpapers', 
      'iPhone wallpapers',
      'Android wallpapers',
      'Samsung wallpapers',
      'HD mobile backgrounds',
      'vertical wallpapers',
      'phone backgrounds',
      'mobile backgrounds',
      'smartphone wallpapers',
      'free mobile wallpapers',
      'mobile wallpaper download'
    ],
    image: '/images/og-mobile-wallpapers.jpg',
    type: 'website' as const
  }

  // Page change handler
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Category change handler (reset page and toggle)
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(selectedCategory === category ? 'all' : category)
    setCurrentPage(1)
  }
  
  // Clear all filters handler
  const handleClearFilters = () => {
    setSearchTerm('')
    setSelectedCategory('all')
    setCurrentPage(1)
  }

  // Generate structured data
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Mobile Wallpapers', url: '/mobile-wallpapers' }
  ]

  const structuredData = [
    generateBreadcrumbSchema(breadcrumbs),
    generateFAQSchema(faqs),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "Mobile Wallpapers Collection",
      "description": "Premium collection of mobile wallpapers optimized for smartphones",
      "url": "https://efioh8fr8no7.space.minimax.io/mobile-wallpapers",
      "mainEntity": {
        "@type": "ImageGallery",
        "name": "Mobile Wallpapers",
        "description": "High-quality mobile wallpapers for all devices",
        "numberOfItems": wallpapers.length
      }
    },
    // Add ImageObject schema for featured wallpapers
    ...wallpapers.slice(0, 6).map(wallpaper => generateImageObjectSchema(wallpaper))
  ]

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-primary text-white' : 'bg-gray-50 text-gray-900'} transition-colors duration-200`}>
      <SEOHead config={seoConfig} structuredData={structuredData} />
      
      {/* Hero Section - Above the fold optimization */}
      <section className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Best Free Mobile Wallpapers
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-100 max-w-4xl mx-auto leading-relaxed">
              Discover 10,000+ stunning HD mobile wallpapers optimized for iPhone, Android, and all smartphone devices. Updated daily with trending phone backgrounds.
            </p>
            
            {/* Key Stats */}
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
              <div className="text-center">
                <div className="text-2xl font-bold">10K+</div>
                <div className="text-sm opacity-90">Wallpapers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">Daily</div>
                <div className="text-sm opacity-90">Updates</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">100%</div>
                <div className="text-sm opacity-90">Free</div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <button 
                onClick={() => document.getElementById('mobile-gallery')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition duration-200 inline-flex items-center justify-center"
              >
                <Download className="w-5 h-5 mr-2" />
                Browse Collection
              </button>
              <Link
                to="/ai-wallpapers"
                className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition duration-200 inline-flex items-center justify-center"
              >
                <Zap className="w-5 h-5 mr-2" />
                AI Generated
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Device Collections */}
      <section className={`py-12 ${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
              Wallpapers by Device
            </h2>
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto`}>
              Find wallpapers perfectly optimized for your specific device
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deviceCollections.map((device, index) => (
              <Link
                key={device.slug}
                to={`/collections/${device.slug}`}
                className={`p-6 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                  theme === 'dark' 
                    ? 'bg-dark-tertiary border-dark-border hover:border-purple-500' 
                    : 'bg-white border-gray-200 hover:border-purple-400 hover:shadow-lg'
                } ${device.popular ? 'ring-2 ring-purple-400 ring-opacity-30' : ''}`}
              >
                <div className="flex items-center mb-4">
                  <span className="text-3xl mr-4">{device.icon}</span>
                  <div>
                    <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {device.name}
                      {device.popular && (
                        <span className="ml-2 text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                          Popular
                        </span>
                      )}
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {device.description}
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    View Collection
                  </span>
                  <Star className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section id="mobile-gallery" className={`py-8 ${theme === 'dark' ? 'bg-dark-primary border-dark-border' : 'bg-gray-50 border-gray-200'} border-t transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-8">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Search mobile wallpapers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 pr-4 py-3 w-full rounded-lg border ${theme === 'dark' ? 'bg-dark-secondary border-dark-border text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors duration-200`}
              />
            </div>
            
            {/* Clear Filters Button */}
            {(searchTerm || selectedCategory !== 'all') && (
              <button
                onClick={handleClearFilters}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 inline-flex items-center ${
                  theme === 'dark'
                    ? 'bg-dark-secondary text-gray-300 hover:bg-dark-tertiary border border-dark-border'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filters
              </button>
            )}
            
            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
              {mobileCategories.map((category) => (
                <button
                  key={category.slug}
                  onClick={() => handleCategoryChange(category.slug)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    selectedCategory === category.slug
                      ? 'bg-purple-600 text-white'
                      : theme === 'dark'
                      ? 'bg-dark-secondary text-gray-300 hover:bg-dark-tertiary'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {category.name}
                  <span className={`ml-1 text-xs ${selectedCategory === category.slug ? 'text-purple-200' : 'text-gray-500'}`}>
                    {category.count}
                  </span>
                </button>
              ))}
            </div>
            
            {/* View Mode Toggle */}
            <div className={`flex border rounded-lg ${theme === 'dark' ? 'border-dark-border' : 'border-gray-300'}`}>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-l-lg transition-colors duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-purple-600 text-white'
                    : theme === 'dark'
                    ? 'bg-dark-secondary text-gray-400 hover:text-white'
                    : 'bg-white text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Wallpapers Gallery */}
      <section className={`py-8 ${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'} transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {Array.from({ length: 24 }).map((_, index) => (
                <div
                  key={index}
                  className={`aspect-[9/16] rounded-lg ${theme === 'dark' ? 'bg-dark-secondary' : 'bg-gray-200'} animate-pulse`}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {wallpapers.map((wallpaper, index) => (
                <EnhancedWallpaperCardAdapter
                  key={wallpaper.id}
                  wallpaper={wallpaper}
                  className="aspect-[9/16] hover:scale-105 transition-transform duration-200"
                  priority={index < 12}
                />
              ))}
            </div>
          )}
          
          {!loading && wallpapers.length === 0 && (
            <div className="text-center py-12">
              <Image className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
              <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                No wallpapers found
              </h3>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Try adjusting your search or category filter
              </p>
            </div>
          )}
          
          {/* Pagination Controls */}
          {totalPages > 1 && !loading && (
            <div className="mt-12 flex justify-center">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 border rounded-lg transition-colors duration-200 ${
                    theme === 'dark'
                      ? 'border-dark-border text-white hover:bg-dark-secondary disabled:opacity-50 disabled:cursor-not-allowed'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </button>
                
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const page = Math.max(1, currentPage - 2) + i
                  if (page > totalPages) return null
                  
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                        currentPage === page
                          ? 'bg-purple-600 text-white'
                          : theme === 'dark'
                          ? 'border border-dark-border text-white hover:bg-dark-secondary'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  )
                })}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 border rounded-lg transition-colors duration-200 ${
                    theme === 'dark'
                      ? 'border-dark-border text-white hover:bg-dark-secondary disabled:opacity-50 disabled:cursor-not-allowed'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Next</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} transition-colors duration-200`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
              Frequently Asked Questions
            </h2>
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Everything you need to know about mobile wallpapers
            </p>
          </div>
          
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-tertiary border border-dark-border' : 'bg-gray-50 border border-gray-200'} transition-colors duration-200`}
              >
                <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {faq.question}
                </h3>
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} leading-relaxed`}>
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'} transition-colors duration-200`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6`}>
            Ready to Transform Your Mobile Screen?
          </h2>
          <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-8 max-w-2xl mx-auto`}>
            Join millions of users who have already discovered the perfect mobile wallpaper. Start browsing our collection today!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition duration-200 inline-flex items-center justify-center"
            >
              <Heart className="w-5 h-5 mr-2" />
              Start Browsing
            </button>
            <Link
              to="/premium"
              className={`border-2 border-purple-600 text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-purple-600 hover:text-white transition duration-200 inline-flex items-center justify-center`}
            >
              <Star className="w-5 h-5 mr-2" />
              Go Premium
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}