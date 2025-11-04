import React from 'react'
import { SEOHead } from '@/components/seo/SEOHead'
import { PAGE_SEO, generateOrganizationSchema } from '@/utils/seo'
import { Star, Smartphone, FolderOpen, Zap, Camera, Palette, Gamepad2, TabletSmartphone } from 'lucide-react'

export function AboutPage() {
  const features = [
    {
      icon: Star,
      title: 'Pure Quality',
      description: 'Professional selection of HD wallpapers, meticulous curation and organization for perfect quality.'
    },
    {
      icon: Smartphone,
      title: 'Multiple Resolutions',
      description: 'Support for various devices with multiple resolution options, from mobile to 8K desktop.'
    },
    {
      icon: FolderOpen,
      title: 'Organized Categories',
      description: 'Logical and well-organized categories to easily find the perfect wallpaper for your style.'
    },
    {
      icon: Zap,
      title: 'Fast & Free',
      description: 'Fast and free download for most wallpapers, with premium options for exclusive content.'
    }
  ]

  const categories = [
    {
      icon: Camera,
      title: 'Nature & Landscapes',
      description: 'Stunning natural landscapes, forests, mountains and outdoor scenes.'
    },
    {
      icon: Palette,
      title: 'Abstract Art',
      description: 'Modern abstract designs, patterns and artistic compositions.'
    },
    {
      icon: Gamepad2,
      title: 'Gaming',
      description: 'Video game art, characters and gaming-themed wallpapers.'
    },
    {
      icon: TabletSmartphone,
      title: 'Mobile Optimized',
      description: 'Specially curated wallpapers optimized for mobile devices and tablets.'
    }
  ]

  // SEO Configuration for About page
  const seoConfig = {
    ...PAGE_SEO.about,
    image: '/images/og-about.jpg'
  }

  const structuredData = [
    generateOrganizationSchema(),
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": "About BestFreeWallpapers",
      "description": "Learn about BestFreeWallpapers, your trusted source for high-quality free wallpapers and desktop backgrounds.",
      "url": `${window.location.origin}/about`,
      "mainEntity": {
        "@type": "Organization",
        "name": "BestFreeWallpapers",
        "description": "Premium source for free HD wallpapers and desktop backgrounds"
      }
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead config={seoConfig} structuredData={structuredData} />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-gray-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">About BestFreeWallpapers</h1>
            <p className="text-xl md:text-2xl text-gray-100 max-w-4xl mx-auto leading-relaxed">
              We believe every screen deserves a beautiful background. Our mission is to offer accessible, 
              high-quality HD wallpapers that inspire and transform your devices into a special visual experience.
            </p>
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">Our Mission</h2>
          <div className="max-w-4xl mx-auto">
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-6">
              At BestFreeWallpapers, we believe every screen deserves a beautiful background. Our mission is to offer 
              accessible, high-quality HD wallpapers that inspire and transform your devices into a special visual experience.
            </p>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
              Our dedicated team meticulously curates a comprehensive collection of wallpapers from all categories, 
              from stunning natural landscapes to modern abstract art. Whether you're looking for something calming for 
              relaxation, vibrant for energy, or professional for work, we help you find the perfect background.
            </p>
          </div>
        </div>
      </div>

      {/* Why Choose Us Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Choose Us?</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Discover what makes BestFreeWallpapers the perfect choice for your wallpaper needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center group">
                <div className="bg-gradient-to-r from-gray-600 to-blue-600 rounded-2xl p-4 w-16 h-16 mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                  <feature.icon className="w-8 h-8 text-white mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Our Collection Section */}
      <div className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">Our Collection</h2>
            <div className="max-w-4xl mx-auto">
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                Our vast collection covers a wide range of styles and themes, ensuring there's something for every taste 
                and preference. From stunning naturalist photography to sophisticated digital artistic creations, all our 
                wallpapers are manually selected for exceptional quality and visual impact.
              </p>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-gray-600 mb-2">1000+</div>
              <div className="text-gray-600 font-medium">HD Wallpapers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-gray-600 mb-2">20+</div>
              <div className="text-gray-600 font-medium">Categories</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-gray-600 mb-2">3</div>
              <div className="text-gray-600 font-medium">Resolutions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-gray-600 mb-2">100%</div>
              <div className="text-gray-600 font-medium">Free Access</div>
            </div>
          </div>
        </div>
      </div>

      {/* Popular Categories Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Popular Categories</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Explore our most loved wallpaper collections, carefully organized for easy discovery
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors duration-200 group cursor-pointer">
                <div className="bg-gradient-to-r from-gray-600 to-blue-600 rounded-lg p-3 w-12 h-12 mb-4 group-hover:scale-110 transition-transform duration-200">
                  <category.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{category.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{category.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quality Promise Section */}
      <div className="bg-gradient-to-r from-gray-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Quality Promise</h2>
            <div className="max-w-4xl mx-auto">
              <p className="text-lg md:text-xl text-gray-100 leading-relaxed mb-8">
                Every wallpaper in our collection goes through a rigorous quality check. We ensure each image meets 
                our high standards for resolution, composition, and visual appeal. Your satisfaction is our priority.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="/free-wallpapers" 
                  className="bg-white text-gray-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200"
                >
                  Browse Collection
                </a>
                <a 
                  href="/contact" 
                  className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-gray-600 transition-colors duration-200"
                >
                  Contact Us
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


export default AboutPage
