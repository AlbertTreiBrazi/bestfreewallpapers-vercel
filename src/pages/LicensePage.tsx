import React from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { SEOHead } from '@/components/seo/SEOHead'
import { Shield, Download, Share2, DollarSign, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

export function LicensePage() {
  const { theme } = useTheme()

  const licenseTypes = [
    {
      type: 'Free Personal Use',
      icon: <CheckCircle className="w-6 h-6 text-green-500" />,
      description: 'Use wallpapers for personal, non-commercial purposes',
      permissions: [
        'Download and save wallpapers',
        'Set as desktop/mobile wallpaper',
        'Share on social media with attribution',
        'Use for personal projects'
      ],
      restrictions: [
        'No commercial use without permission',
        'No redistribution on other platforms',
        'Cannot claim ownership of images'
      ]
    },
    {
      type: 'Premium Commercial',
      icon: <DollarSign className="w-6 h-6 text-gray-500" />,
      description: 'Extended license for commercial and business use',
      permissions: [
        'All personal use permissions',
        'Commercial use in projects',
        'Business presentations and materials',
        'Client work and commissioned projects',
        'Print materials and merchandise'
      ],
      restrictions: [
        'Cannot resell as standalone products',
        'Attribution required for public use',
        'Limited to license holder only'
      ]
    }
  ]

  const usageGuidelines = [
    {
      title: 'Personal Use Examples',
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      examples: [
        'Desktop and mobile wallpapers',
        'Personal social media posts',
        'Personal art projects',
        'Home decoration prints',
        'Personal website backgrounds'
      ]
    },
    {
      title: 'Commercial Use Examples',
      icon: <DollarSign className="w-5 h-5 text-gray-500" />,
      examples: [
        'Business website backgrounds',
        'Marketing materials and brochures',
        'Client presentations',
        'Product packaging design',
        'Digital advertising campaigns'
      ]
    },
    {
      title: 'Prohibited Uses',
      icon: <XCircle className="w-5 h-5 text-red-500" />,
      examples: [
        'Reselling wallpapers individually',
        'Creating competing wallpaper collections',
        'NFT creation without permission',
        'Trademark or logo usage',
        'Illegal or harmful content association'
      ]
    }
  ]

  const attributionExamples = [
    {
      platform: 'Social Media',
      example: 'Wallpaper from BestFreeWallpapers.com #wallpaper #background'
    },
    {
      platform: 'Website/Blog',
      example: 'Image source: <a href="https://bestfreewallpapers.com">BestFreeWallpapers</a>'
    },
    {
      platform: 'Print Materials',
      example: 'Background image courtesy of BestFreeWallpapers.com'
    }
  ]

  return (
    <>
      <SEOHead
        config={{
          title: "License Information - BestFreeWallpapers",
          description: "Understand the licensing terms for BestFreeWallpapers. Learn about personal use, commercial licensing, attribution requirements, and usage guidelines for our wallpaper collection.",
          keywords: ["wallpaper license", "usage rights", "commercial license", "attribution", "copyright", "terms of use"]
        }}
      />
      
      <div className={`min-h-screen py-12 px-4 sm:px-6 lg:px-8 ${theme === 'dark' ? 'bg-dark-primary text-white' : 'bg-white text-gray-900'} transition-colors duration-200`}>
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-gray-600 to-blue-600 rounded-2xl flex items-center justify-center">
                <Shield className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-gray-600 to-blue-600 bg-clip-text text-transparent">
              License Information
            </h1>
            <p className={`text-xl mb-8 max-w-3xl mx-auto leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Understanding your rights and responsibilities when using wallpapers from BestFreeWallpapers. 
              We believe in fair use while protecting creators' rights.
            </p>
          </div>

          {/* License Types */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">License Types</h2>
            <div className="space-y-8">
              {licenseTypes.map((license, index) => (
                <div
                  key={index}
                  className={`p-8 rounded-lg ${theme === 'dark' ? 'bg-dark-secondary border border-dark-border' : 'bg-gray-50 border border-gray-200'}`}
                >
                  <div className="flex items-center mb-6">
                    {license.icon}
                    <h3 className="text-2xl font-bold ml-3">{license.type}</h3>
                  </div>
                  <p className={`mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {license.description}
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-lg font-semibold mb-3 text-green-600">✓ What You Can Do</h4>
                      <ul className="space-y-2">
                        {license.permissions.map((permission, idx) => (
                          <li key={idx} className={`flex items-start ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            {permission}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-semibold mb-3 text-red-600">✗ Restrictions</h4>
                      <ul className="space-y-2">
                        {license.restrictions.map((restriction, idx) => (
                          <li key={idx} className={`flex items-start ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                            <XCircle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                            {restriction}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Usage Guidelines */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">Usage Guidelines</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {usageGuidelines.map((guideline, index) => (
                <div
                  key={index}
                  className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-secondary border border-dark-border' : 'bg-gray-50 border border-gray-200'}`}
                >
                  <div className="flex items-center mb-4">
                    {guideline.icon}
                    <h3 className="text-xl font-semibold ml-2">{guideline.title}</h3>
                  </div>
                  <ul className="space-y-2">
                    {guideline.examples.map((example, idx) => (
                      <li key={idx} className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        • {example}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Attribution Guidelines */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">Attribution Guidelines</h2>
            <div className={`p-8 rounded-lg ${theme === 'dark' ? 'bg-dark-secondary border border-dark-border' : 'bg-gray-50 border border-gray-200'} mb-8`}>
              <div className="flex items-start mb-4">
                <Share2 className="w-6 h-6 text-blue-500 mr-3 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">When Attribution is Required</h3>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                    Attribution is required when sharing wallpapers publicly, using them in commercial projects, 
                    or redistributing them in any form. Personal use as device wallpapers does not require attribution.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-4">Attribution Examples</h3>
              {attributionExamples.map((example, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-dark-tertiary border border-dark-border' : 'bg-white border border-gray-200'}`}
                >
                  <div className="font-medium mb-2">{example.platform}:</div>
                  <code className={`text-sm p-2 rounded ${theme === 'dark' ? 'bg-dark-primary text-green-400' : 'bg-gray-100 text-green-600'} block`}>
                    {example.example}
                  </code>
                </div>
              ))}
            </div>
          </div>

          {/* Important Notes */}
          <div className={`p-8 rounded-lg ${theme === 'dark' ? 'bg-gradient-to-r from-orange-900 to-red-900' : 'bg-gradient-to-r from-orange-50 to-red-50'} border ${theme === 'dark' ? 'border-orange-800' : 'border-orange-200'}`}>
            <div className="flex items-start">
              <AlertTriangle className="w-6 h-6 text-orange-500 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold mb-4 text-orange-600">Important Notes</h3>
                <ul className="space-y-2">
                  <li className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    • Some wallpapers may have additional restrictions based on their source or creator
                  </li>
                  <li className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    • License terms may change - always check for updates when downloading
                  </li>
                  <li className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    • For questions about specific usage, contact us before proceeding
                  </li>
                  <li className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    • Respect original creators and follow attribution guidelines
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-16">
            <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-secondary border border-dark-border' : 'bg-gray-50 border border-gray-200'}`}>
                <h3 className="text-lg font-semibold mb-3">Can I use wallpapers for my business website?</h3>
                <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                  Yes, but you'll need our Premium Commercial license for business use. This ensures you have proper 
                  rights and protects your business from potential copyright issues.
                </p>
              </div>
              
              <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-secondary border border-dark-border' : 'bg-gray-50 border border-gray-200'}`}>
                <h3 className="text-lg font-semibold mb-3">Do I need attribution for personal wallpapers?</h3>
                <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                  No attribution is required when using wallpapers as personal device backgrounds (desktop, phone, tablet). 
                  Attribution is only required for public sharing or commercial use.
                </p>
              </div>
              
              <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-secondary border border-dark-border' : 'bg-gray-50 border border-gray-200'}`}>
                <h3 className="text-lg font-semibold mb-3">Can I modify the wallpapers?</h3>
                <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                  Yes, you can modify wallpapers for personal use. For commercial use of modified wallpapers, 
                  ensure you have the appropriate license and maintain proper attribution.
                </p>
              </div>
              
              <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-secondary border border-dark-border' : 'bg-gray-50 border border-gray-200'}`}>
                <h3 className="text-lg font-semibold mb-3">How do I report copyright violations?</h3>
                <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                  If you believe content on our site violates copyright, please use our DMCA process or contact us 
                  directly. We take copyright concerns seriously and will investigate promptly.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold mb-4">Need Clarification?</h2>
            <p className={`mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Have questions about licensing or usage rights? We're here to help!
            </p>
            <a
              href="/contact"
              className="inline-block bg-gradient-to-r from-gray-600 to-blue-600 text-white px-8 py-3 rounded-lg hover:from-gray-700 hover:to-blue-700 transition duration-200"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </>
  )
}

export default LicensePage
