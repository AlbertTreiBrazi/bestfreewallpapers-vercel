import React from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { SEOHead } from '@/components/seo/SEOHead'
import { Smartphone, Download, Star, Shield, Zap, Image } from 'lucide-react'

export function MobilePage() {
  const { theme } = useTheme()

  const features = [
    {
      icon: <Image className="w-6 h-6" />,
      title: 'HD & 4K Quality',
      description: 'Access thousands of high-resolution wallpapers optimized for mobile devices'
    },
    {
      icon: <Download className="w-6 h-6" />,
      title: 'Offline Access',
      description: 'Download wallpapers for offline viewing and set them instantly'
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: 'Curated Collections',
      description: 'Discover handpicked wallpapers organized by themes and categories'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Ad-Free Experience',
      description: 'Enjoy browsing wallpapers without interruptions'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Fast Performance',
      description: 'Lightweight app designed for smooth performance on all devices'
    }
  ]

  const screenshots = [
    {
      title: 'Browse Categories',
      description: 'Explore wallpapers by category with intuitive navigation'
    },
    {
      title: 'High Quality Preview',
      description: 'Preview wallpapers in full resolution before downloading'
    },
    {
      title: 'Easy Download',
      description: 'One-tap download and set as wallpaper functionality'
    }
  ]

  return (
    <>
      <SEOHead
        config={{
          title: "Mobile App - BestFreeWallpapers",
          description: "Download the BestFreeWallpapers mobile app for iOS and Android. Access thousands of HD & 4K wallpapers on the go with offline support and ad-free experience.",
          keywords: ["mobile app", "wallpaper app", "iOS app", "Android app", "free wallpapers mobile"]
        }}
      />
      
      <div className={`min-h-screen py-12 px-4 sm:px-6 lg:px-8 ${theme === 'dark' ? 'bg-dark-primary text-white' : 'bg-white text-gray-900'} transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-gray-600 to-blue-600 rounded-2xl flex items-center justify-center">
                <Smartphone className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-gray-600 to-blue-600 bg-clip-text text-transparent">
              BestFreeWallpapers Mobile App
            </h1>
            <p className={`text-xl mb-8 max-w-3xl mx-auto leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Take your favorite wallpapers everywhere with our mobile app. Browse, download, and set stunning HD & 4K wallpapers on your phone with the ultimate mobile experience.
            </p>
            
            {/* Download Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button className="flex items-center space-x-3 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition duration-200 w-full sm:w-auto">
                <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
                  <span className="text-black text-xs font-bold">📱</span>
                </div>
                <div className="text-left">
                  <div className="text-xs">Download on the</div>
                  <div className="text-lg font-semibold">App Store</div>
                </div>
              </button>
              
              <button className="flex items-center space-x-3 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition duration-200 w-full sm:w-auto">
                <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 via-red-500 to-pink-500 rounded-sm flex items-center justify-center">
                  <span className="text-white text-xs">▶</span>
                </div>
                <div className="text-left">
                  <div className="text-xs">Get it on</div>
                  <div className="text-lg font-semibold">Google Play</div>
                </div>
              </button>
            </div>
            
            <p className={`text-sm mt-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Coming Soon - Currently in development
            </p>
          </div>

          {/* Features Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose Our Mobile App?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-secondary border border-dark-border' : 'bg-gray-50 border border-gray-200'} hover:shadow-lg transition duration-200`}
                >
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-gray-600 to-blue-600 rounded-lg flex items-center justify-center text-white mr-4">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                  </div>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Screenshots Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">App Screenshots</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {screenshots.map((screenshot, index) => (
                <div key={index} className="text-center">
                  <div className={`w-full h-96 ${theme === 'dark' ? 'bg-dark-secondary border-dark-border' : 'bg-gray-100 border-gray-200'} border-2 rounded-2xl mb-4 flex items-center justify-center`}>
                    <div className="text-center">
                      <Smartphone className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        Screenshot Preview
                      </p>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{screenshot.title}</h3>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                    {screenshot.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Section */}
          <div className={`rounded-lg p-8 mb-16 ${theme === 'dark' ? 'bg-gradient-to-r from-dark-secondary to-dark-tertiary' : 'bg-gradient-to-r from-purple-50 to-blue-50'}`}>
            <h2 className="text-3xl font-bold text-center mb-8">App Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-gray-600 mb-2">10K+</div>
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Wallpapers Available</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-2">4.8★</div>
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>App Store Rating</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600 mb-2">50+</div>
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Categories</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-600 mb-2">Daily</div>
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>New Content</div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-8">Frequently Asked Questions</h2>
            <div className="max-w-3xl mx-auto space-y-6">
              <div className={`p-6 rounded-lg text-left ${theme === 'dark' ? 'bg-dark-secondary border border-dark-border' : 'bg-gray-50 border border-gray-200'}`}>
                <h3 className="text-lg font-semibold mb-2">When will the mobile app be available?</h3>
                <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                  Our mobile app is currently in development. Sign up for our newsletter to be notified when it launches on iOS and Android platforms.
                </p>
              </div>
              <div className={`p-6 rounded-lg text-left ${theme === 'dark' ? 'bg-dark-secondary border border-dark-border' : 'bg-gray-50 border border-gray-200'}`}>
                <h3 className="text-lg font-semibold mb-2">Will the app be free?</h3>
                <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                  Yes! The app will be free to download and use, with optional premium features for enhanced functionality and exclusive content.
                </p>
              </div>
              <div className={`p-6 rounded-lg text-left ${theme === 'dark' ? 'bg-dark-secondary border border-dark-border' : 'bg-gray-50 border border-gray-200'}`}>
                <h3 className="text-lg font-semibold mb-2">What devices will be supported?</h3>
                <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                  The app will support iOS 12+ and Android 6.0+ devices, ensuring compatibility with the vast majority of modern smartphones and tablets.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default MobilePage
