import React from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { SEOHead } from '@/components/seo/SEOHead'
import { Monitor, Smartphone, Tablet, Tv, Check } from 'lucide-react'

export function SizesPage() {
  const { theme } = useTheme()

  const desktopResolutions = [
    { name: 'Full HD', resolution: '1920x1080', description: 'Most common desktop resolution', popular: true },
    { name: '2K QHD', resolution: '2560x1440', description: 'High-quality gaming and professional displays', popular: true },
    { name: '4K UHD', resolution: '3840x2160', description: 'Ultra high-definition for premium displays', popular: true },
    { name: 'HD Ready', resolution: '1366x768', description: 'Standard laptop resolution' },
    { name: 'WXGA+', resolution: '1440x900', description: 'Widescreen extended graphics' },
    { name: 'WUXGA', resolution: '1920x1200', description: 'Professional widescreen displays' },
    { name: '5K', resolution: '5120x2880', description: 'Ultra-high resolution for Mac displays' },
    { name: '8K', resolution: '7680x4320', description: 'Next-generation ultra-high definition' }
  ]

  const mobileResolutions = [
    { name: 'iPhone 15 Pro', resolution: '1179x2556', description: 'Latest iPhone resolution', popular: true },
    { name: 'iPhone 14', resolution: '1170x2532', description: 'Standard iPhone 14 series' },
    { name: 'Samsung Galaxy S24', resolution: '1080x2340', description: 'Latest Samsung flagship', popular: true },
    { name: 'Google Pixel 8', resolution: '1080x2400', description: 'Google Pixel series' },
    { name: 'Standard HD', resolution: '1080x1920', description: 'Common Android resolution', popular: true },
    { name: 'iPhone SE', resolution: '750x1334', description: 'Compact iPhone resolution' },
    { name: 'Samsung Note', resolution: '1440x3200', description: 'High-end Samsung devices' }
  ]

  const tabletResolutions = [
    { name: 'iPad Pro 12.9"', resolution: '2048x2732', description: 'Large iPad Pro resolution', popular: true },
    { name: 'iPad Air', resolution: '1668x2388', description: 'Standard iPad Air resolution' },
    { name: 'iPad Mini', resolution: '1488x2266', description: 'Compact iPad resolution' },
    { name: 'Samsung Tab S9', resolution: '1752x2800', description: 'Premium Android tablet', popular: true },
    { name: 'Surface Pro', resolution: '2880x1920', description: 'Microsoft Surface tablets' },
    { name: 'Standard Tablet', resolution: '1200x1920', description: 'Common Android tablet resolution' }
  ]

  const tvResolutions = [
    { name: '4K Ultra HD', resolution: '3840x2160', description: 'Standard 4K TV resolution', popular: true },
    { name: '8K Ultra HD', resolution: '7680x4320', description: 'Next-gen 8K TV resolution' },
    { name: 'Full HD TV', resolution: '1920x1080', description: 'Standard HD TV resolution' },
    { name: 'HD Ready TV', resolution: '1366x768', description: 'Basic HD TV resolution' }
  ]

  const aspectRatios = [
    { ratio: '16:9', description: 'Standard widescreen format', usage: 'Most monitors, TVs, and laptops' },
    { ratio: '21:9', description: 'Ultra-widescreen format', usage: 'Gaming monitors and cinematic displays' },
    { ratio: '16:10', description: 'Professional widescreen', usage: 'MacBooks and professional monitors' },
    { ratio: '4:3', description: 'Traditional square format', usage: 'Older monitors and some tablets' },
    { ratio: '18:9', description: 'Mobile widescreen', usage: 'Modern smartphones' },
    { ratio: '19.5:9', description: 'Extended mobile format', usage: 'iPhone X and newer models' }
  ]

  const ResolutionCard = ({ resolutions, icon, title }: { resolutions: any[], icon: React.ReactNode, title: string }) => (
    <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-secondary border border-dark-border' : 'bg-gray-50 border border-gray-200'}`}>
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-gray-600 to-blue-600 rounded-lg flex items-center justify-center text-white mr-4">
          {icon}
        </div>
        <h3 className="text-2xl font-bold">{title}</h3>
      </div>
      <div className="space-y-3">
        {resolutions.map((res, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-dark-tertiary' : 'bg-white'} border ${res.popular ? 'border-purple-300' : theme === 'dark' ? 'border-dark-border' : 'border-gray-200'} transition duration-200 hover:shadow-md`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center">
                  <h4 className="font-semibold">{res.name}</h4>
                  {res.popular && (
                    <span className="ml-2 px-2 py-1 bg-gray-100 text-purple-800 text-xs font-medium rounded-full">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-lg font-mono text-gray-600 mt-1">{res.resolution}</p>
                <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  {res.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <>
      <SEOHead
        config={{
          title: "Wallpaper Sizes & Resolutions - BestFreeWallpapers",
          description: "Complete guide to wallpaper sizes and resolutions for desktop, mobile, tablet, and TV. Find the perfect resolution for your device including 4K, HD, and mobile formats.",
          keywords: ["wallpaper sizes", "screen resolutions", "4K wallpapers", "HD wallpapers", "mobile wallpaper sizes", "desktop resolutions"]
        }}
      />
      
      <div className={`min-h-screen py-12 px-4 sm:px-6 lg:px-8 ${theme === 'dark' ? 'bg-dark-primary text-white' : 'bg-white text-gray-900'} transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-gray-600 to-blue-600 bg-clip-text text-transparent">
              Wallpaper Sizes & Resolutions
            </h1>
            <p className={`text-xl mb-8 max-w-3xl mx-auto leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Find the perfect wallpaper size for your device. Our comprehensive guide covers all popular screen resolutions 
              for desktop, mobile, tablet, and TV displays.
            </p>
          </div>

          {/* Quick Stats */}
          <div className={`rounded-lg p-8 mb-16 ${theme === 'dark' ? 'bg-gradient-to-r from-dark-secondary to-dark-tertiary' : 'bg-gradient-to-r from-purple-50 to-blue-50'}`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-gray-600 mb-2">25+</div>
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Supported Resolutions</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-2">8K</div>
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Highest Resolution</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600 mb-2">6</div>
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Aspect Ratios</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-600 mb-2">100%</div>
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Device Coverage</div>
              </div>
            </div>
          </div>

          {/* Resolution Categories */}
          <div className="space-y-12 mb-16">
            <ResolutionCard
              resolutions={desktopResolutions}
              icon={<Monitor className="w-6 h-6" />}
              title="Desktop & Laptop"
            />
            
            <ResolutionCard
              resolutions={mobileResolutions}
              icon={<Smartphone className="w-6 h-6" />}
              title="Mobile Phones"
            />
            
            <ResolutionCard
              resolutions={tabletResolutions}
              icon={<Tablet className="w-6 h-6" />}
              title="Tablets"
            />
            
            <ResolutionCard
              resolutions={tvResolutions}
              icon={<Tv className="w-6 h-6" />}
              title="TVs & Large Displays"
            />
          </div>

          {/* Aspect Ratios Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">Understanding Aspect Ratios</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {aspectRatios.map((aspect, index) => (
                <div
                  key={index}
                  className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-secondary border border-dark-border' : 'bg-gray-50 border border-gray-200'} hover:shadow-lg transition duration-200`}
                >
                  <h3 className="text-xl font-bold mb-2">{aspect.ratio}</h3>
                  <p className={`mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {aspect.description}
                  </p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    <strong>Usage:</strong> {aspect.usage}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* How to Choose Section */}
          <div className={`rounded-lg p-8 mb-16 ${theme === 'dark' ? 'bg-dark-secondary border border-dark-border' : 'bg-gray-50 border border-gray-200'}`}>
            <h2 className="text-3xl font-bold mb-8">How to Choose the Right Size</h2>
            <div className="space-y-6">
              <div className="flex items-start">
                <Check className="w-6 h-6 text-green-500 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Check Your Display Resolution</h3>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                    Right-click on your desktop and select "Display settings" (Windows) or "About This Mac" &gt; "System Report" &gt; "Graphics/Displays" (Mac) to find your screen resolution.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Check className="w-6 h-6 text-green-500 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Match or Go Higher</h3>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                    Always choose a wallpaper resolution that matches or exceeds your display resolution for the best quality. Higher resolution wallpapers will be scaled down automatically.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Check className="w-6 h-6 text-green-500 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Consider Aspect Ratio</h3>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                    Ensure the wallpaper's aspect ratio matches your screen to avoid stretching or black bars. Most modern displays use 16:9 aspect ratio.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Check className="w-6 h-6 text-green-500 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Mobile Optimization</h3>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                    For mobile devices, portrait orientation wallpapers work best. Consider both home screen and lock screen when selecting mobile wallpapers.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Popular Sizes Quick Reference */}
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-8">Quick Reference</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gradient-to-br from-purple-900 to-blue-900' : 'bg-gradient-to-br from-purple-100 to-blue-100'}`}>
                <h3 className="text-xl font-bold mb-4">Most Popular Desktop</h3>
                <div className="space-y-2">
                  <div className="text-lg font-mono">1920x1080</div>
                  <div className="text-lg font-mono">2560x1440</div>
                  <div className="text-lg font-mono">3840x2160</div>
                </div>
              </div>
              
              <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gradient-to-br from-green-900 to-teal-900' : 'bg-gradient-to-br from-green-100 to-teal-100'}`}>
                <h3 className="text-xl font-bold mb-4">Most Popular Mobile</h3>
                <div className="space-y-2">
                  <div className="text-lg font-mono">1080x1920</div>
                  <div className="text-lg font-mono">1170x2532</div>
                  <div className="text-lg font-mono">1080x2340</div>
                </div>
              </div>
              
              <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gradient-to-br from-orange-900 to-red-900' : 'bg-gradient-to-br from-orange-100 to-red-100'}`}>
                <h3 className="text-xl font-bold mb-4">Most Popular Tablet</h3>
                <div className="space-y-2">
                  <div className="text-lg font-mono">2048x2732</div>
                  <div className="text-lg font-mono">1668x2388</div>
                  <div className="text-lg font-mono">1752x2800</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default SizesPage
