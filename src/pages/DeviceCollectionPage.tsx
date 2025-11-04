import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTheme } from '@/contexts/ThemeContext'
import { SEOHead } from '@/components/seo/SEOHead'
import { generateImageObjectSchema, generateBreadcrumbSchema } from '@/utils/seo'
import { Smartphone, Download, Star, Image, Filter, Grid, Heart } from 'lucide-react'
import { EnhancedWallpaperCardAdapter } from '@/components/wallpapers/EnhancedWallpaperCardAdapter'

interface DeviceInfo {
  name: string
  slug: string
  description: string
  icon: string
  specifications: {
    resolutions: string[]
    aspectRatio: string
    screenSize: string
  }
  seoTitle: string
  seoDescription: string
  keywords: string[]
}

const deviceInfo: Record<string, DeviceInfo> = {
  'iphone-wallpapers': {
    name: 'iPhone Wallpapers',
    slug: 'iphone-wallpapers',
    description: 'Optimized wallpapers for iPhone 15, 14, 13, 12, 11, X, and older models',
    icon: '📱',
    specifications: {
      resolutions: ['1170x2532', '1284x2778', '1125x2436', '828x1792'],
      aspectRatio: '19.5:9',
      screenSize: '5.4" - 6.7"'
    },
    seoTitle: 'iPhone Wallpapers - Best Free HD Backgrounds for iPhone 2025',
    seoDescription: 'Download stunning iPhone wallpapers optimized for iPhone 15, 14, 13, 12, 11, X. HD backgrounds perfect for all iPhone models. Free iPhone wallpaper collection updated daily.',
    keywords: ['iPhone wallpapers', 'iPhone backgrounds', 'iPhone 15 wallpapers', 'iPhone 14 wallpapers', 'iPhone 13 wallpapers', 'iPhone 12 wallpapers', 'iPhone X wallpapers', 'iOS wallpapers', 'Apple wallpapers', 'retina wallpapers']
  },
  'android-wallpapers': {
    name: 'Android Wallpapers',
    slug: 'android-wallpapers',
    description: 'Perfect for Samsung, Google Pixel, OnePlus, and all Android devices',
    icon: '🤖',
    specifications: {
      resolutions: ['1080x1920', '1440x2560', '1080x2400', '1440x3200'],
      aspectRatio: '16:9 / 18:9 / 20:9',
      screenSize: '5.0" - 6.8"'
    },
    seoTitle: 'Android Wallpapers - HD Backgrounds for All Android Devices 2025',
    seoDescription: 'Best Android wallpapers for Samsung, Google Pixel, OnePlus, Xiaomi. HD mobile backgrounds optimized for all Android phones. Free Android wallpaper downloads.',
    keywords: ['Android wallpapers', 'Android backgrounds', 'Samsung wallpapers', 'Google Pixel wallpapers', 'OnePlus wallpapers', 'Android phone wallpapers', 'material design wallpapers', 'android mobile wallpapers']
  },
  'samsung-galaxy-wallpapers': {
    name: 'Samsung Galaxy Wallpapers',
    slug: 'samsung-galaxy-wallpapers',
    description: 'Designed for Galaxy S24, S23, S22, Note series, and Galaxy A series',
    icon: '📲',
    specifications: {
      resolutions: ['1440x3200', '1080x2400', '1440x2960', '1080x1920'],
      aspectRatio: '20:9 / 18.5:9',
      screenSize: '5.8" - 6.8"'
    },
    seoTitle: 'Samsung Galaxy Wallpapers - S24, S23, S22 HD Backgrounds 2025',
    seoDescription: 'Premium Samsung Galaxy wallpapers for S24, S23, S22, Note series. HD backgrounds designed for Samsung displays with perfect resolution and quality.',
    keywords: ['Samsung Galaxy wallpapers', 'Galaxy S24 wallpapers', 'Galaxy S23 wallpapers', 'Galaxy S22 wallpapers', 'Samsung wallpapers', 'Galaxy Note wallpapers', 'Samsung backgrounds', 'One UI wallpapers']
  },
  'ipad-wallpapers': {
    name: 'iPad Wallpapers',
    slug: 'ipad-wallpapers',
    description: 'High-resolution backgrounds for iPad Pro, Air, and standard models',
    icon: '📖',
    specifications: {
      resolutions: ['2048x2732', '2224x1668', '2360x1640', '2048x1536'],
      aspectRatio: '4:3 / 1.4:1',
      screenSize: '7.9" - 12.9"'
    },
    seoTitle: 'iPad Wallpapers - HD Backgrounds for iPad Pro, Air & Mini 2025',
    seoDescription: 'Beautiful iPad wallpapers for iPad Pro, Air, Mini. High-resolution tablet backgrounds optimized for Retina displays. Free iPad wallpaper collection.',
    keywords: ['iPad wallpapers', 'iPad Pro wallpapers', 'iPad Air wallpapers', 'iPad Mini wallpapers', 'tablet wallpapers', 'iPad backgrounds', 'retina display wallpapers', 'iPadOS wallpapers']
  },
  'oneplus-wallpapers': {
    name: 'OnePlus Wallpapers',
    slug: 'oneplus-wallpapers',
    description: 'Optimized for OnePlus 12, 11, 10, 9, and older models',
    icon: '📱',
    specifications: {
      resolutions: ['1440x3216', '1080x2400', '1440x3168'],
      aspectRatio: '20:9',
      screenSize: '6.1" - 6.8"'
    },
    seoTitle: 'OnePlus Wallpapers - HD Backgrounds for OnePlus Devices 2025',
    seoDescription: 'Exclusive OnePlus wallpapers for OnePlus 12, 11, 10, 9 series. Premium HD backgrounds optimized for OnePlus displays and OxygenOS.',
    keywords: ['OnePlus wallpapers', 'OnePlus 12 wallpapers', 'OnePlus 11 wallpapers', 'OnePlus backgrounds', 'OxygenOS wallpapers', 'OnePlus phone wallpapers']
  },
  'xiaomi-wallpapers': {
    name: 'Xiaomi Wallpapers',
    slug: 'xiaomi-wallpapers',
    description: 'Perfect for Xiaomi phones with MIUI interface',
    icon: '📱',
    specifications: {
      resolutions: ['1080x2400', '1440x3200', '1080x1920'],
      aspectRatio: '20:9 / 16:9',
      screenSize: '5.5" - 6.8"'
    },
    seoTitle: 'Xiaomi Wallpapers - MIUI HD Backgrounds for Xiaomi Phones 2025',
    seoDescription: 'Best Xiaomi wallpapers for MIUI interface. HD backgrounds for Redmi, Mi, Poco devices. Free Xiaomi phone wallpapers optimized for all models.',
    keywords: ['Xiaomi wallpapers', 'MIUI wallpapers', 'Redmi wallpapers', 'Mi wallpapers', 'Poco wallpapers', 'Xiaomi backgrounds', 'Xiaomi phone wallpapers']
  }
}

export default function DeviceCollectionPage() {
  const { slug } = useParams<{ slug: string }>()
  const { theme } = useTheme()
  const [wallpapers, setWallpapers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<string>('popular')
  const [category, setCategory] = useState<string>('all')

  const device = slug ? deviceInfo[slug] : null

  useEffect(() => {
    if (device) {
      loadDeviceWallpapers()
    }
  }, [device, sortBy, category])

  const loadDeviceWallpapers = async () => {
    if (!device) return
    
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
            category: category === 'all' ? undefined : category,
            tags: [device.slug.replace('-wallpapers', ''), 'mobile', 'vertical'],
            sort: sortBy,
            limit: 30,
            page: 1
          })
        }
      )

      if (response.ok) {
        const result = await response.json()
        setWallpapers(result.data?.wallpapers || [])
      }
    } catch (error) {
      console.error('Error loading device wallpapers:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!device) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-primary text-white' : 'bg-gray-50 text-gray-900'} flex items-center justify-center`}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Device not found</h1>
          <Link to="/mobile-wallpapers" className="text-purple-600 hover:text-purple-700">
            Browse all mobile wallpapers
          </Link>
        </div>
      </div>
    )
  }

  // SEO Configuration
  const seoConfig = {
    title: device.seoTitle,
    description: device.seoDescription,
    keywords: device.keywords,
    image: `/images/og-${device.slug}.jpg`,
    type: 'website' as const
  }

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Mobile Wallpapers', url: '/mobile-wallpapers' },
    { name: device.name, url: `/collections/${device.slug}` }
  ]

  const structuredData = [
    generateBreadcrumbSchema(breadcrumbs),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": device.name,
      "description": device.description,
      "url": `https://efioh8fr8no7.space.minimax.io/collections/${device.slug}`,
      "mainEntity": {
        "@type": "ImageGallery",
        "name": device.name,
        "description": device.description,
        "numberOfItems": wallpapers.length
      }
    },
    ...wallpapers.slice(0, 8).map(wallpaper => generateImageObjectSchema(wallpaper))
  ]

  const categories = [
    { name: 'All Categories', slug: 'all' },
    { name: 'Nature', slug: 'nature' },
    { name: 'Abstract', slug: 'abstract' },
    { name: 'Dark', slug: 'dark' },
    { name: 'Minimal', slug: 'minimal' },
    { name: 'Gaming', slug: 'gaming' },
    { name: 'Space', slug: 'space' }
  ]

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-primary text-white' : 'bg-gray-50 text-gray-900'} transition-colors duration-200`}>
      <SEOHead config={seoConfig} structuredData={structuredData} />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center text-4xl">
                {device.icon}
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              {device.name}
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-purple-100 max-w-4xl mx-auto leading-relaxed">
              {device.description}
            </p>
            
            {/* Device Specifications */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto mb-8">
              <div className="text-center">
                <div className="text-lg font-semibold">Resolutions</div>
                <div className="text-sm opacity-90">{device.specifications.resolutions[0]}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">Aspect Ratio</div>
                <div className="text-sm opacity-90">{device.specifications.aspectRatio}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">Screen Size</div>
                <div className="text-sm opacity-90">{device.specifications.screenSize}</div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <button 
                onClick={() => document.getElementById('device-gallery')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition duration-200 inline-flex items-center justify-center"
              >
                <Download className="w-5 h-5 mr-2" />
                Browse Collection
              </button>
              <Link
                to="/mobile-wallpapers"
                className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition duration-200 inline-flex items-center justify-center"
              >
                <Smartphone className="w-5 h-5 mr-2" />
                All Mobile
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Category and Sort Controls */}
      <section id="device-gallery" className={`py-8 ${theme === 'dark' ? 'bg-dark-secondary border-dark-border' : 'bg-white border-gray-200'} border-b transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-8">
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {device.name} Collection ({wallpapers.length})
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Category Filter */}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-dark-tertiary border-dark-border text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
              >
                {categories.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
              
              {/* Sort Filter */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-dark-tertiary border-dark-border text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
              >
                <option value="popular">Most Popular</option>
                <option value="newest">Newest First</option>
                <option value="trending">Trending</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Wallpapers Gallery */}
      <section className={`py-8 ${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'} transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 20 }).map((_, index) => (
                <div
                  key={index}
                  className={`aspect-[9/16] rounded-lg ${theme === 'dark' ? 'bg-dark-secondary' : 'bg-gray-200'} animate-pulse`}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {wallpapers.map((wallpaper, index) => (
                <EnhancedWallpaperCardAdapter
                  key={wallpaper.id}
                  wallpaper={wallpaper}
                  className="aspect-[9/16] hover:scale-105 transition-transform duration-200"
                  priority={index < 10}
                  variant="compact"
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
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                We're working on adding more {device.name.toLowerCase()} to our collection
              </p>
              <Link
                to="/mobile-wallpapers"
                className="text-purple-600 hover:text-purple-700 font-semibold"
              >
                Browse all mobile wallpapers
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Related Collections */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
              More Device Collections
            </h2>
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Explore wallpapers for other devices
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(deviceInfo)
              .filter(([key]) => key !== device.slug)
              .slice(0, 6)
              .map(([key, info]) => (
                <Link
                  key={key}
                  to={`/collections/${info.slug}`}
                  className={`p-6 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                    theme === 'dark' 
                      ? 'bg-dark-tertiary border-dark-border hover:border-purple-500' 
                      : 'bg-gray-50 border-gray-200 hover:border-purple-400 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center mb-4">
                    <span className="text-3xl mr-4">{info.icon}</span>
                    <div>
                      <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {info.name}
                      </h3>
                    </div>
                  </div>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {info.description}
                  </p>
                </Link>
              ))
            }
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'} transition-colors duration-200`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6`}>
            Perfect Wallpapers for Your {device.name.replace(' Wallpapers', '')}
          </h2>
          <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-8 max-w-2xl mx-auto`}>
            Download high-quality wallpapers specifically optimized for your device's display and resolution.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition duration-200 inline-flex items-center justify-center"
            >
              <Heart className="w-5 h-5 mr-2" />
              Browse More
            </button>
            <Link
              to="/ai-wallpapers"
              className={`border-2 border-purple-600 text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-purple-600 hover:text-white transition duration-200 inline-flex items-center justify-center`}
            >
              <Star className="w-5 h-5 mr-2" />
              AI Generated
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}