import React from 'react'
import { SEOHead } from '@/components/seo/SEOHead'
import { PAGE_SEO, generateOrganizationSchema } from '@/utils/seo'
import { useTheme } from '@/contexts/ThemeContext'
import { Mail, MessageCircle } from 'lucide-react'

export function ContactPage() {
  const { theme } = useTheme()

  // SEO Configuration for Contact page
  const seoConfig = {
    ...PAGE_SEO.contact,
    image: '/images/og-contact.jpg'
  }

  const structuredData = [
    generateOrganizationSchema(),
    {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      "name": "Contact BestFreeWallpapers",
      "description": "Get in touch with the BestFreeWallpapers team for support and feedback.",
      "url": `${window.location.origin}/contact`,
      "mainEntity": {
        "@type": "Organization",
        "name": "BestFreeWallpapers",
        "contactPoint": {
          "@type": "ContactPoint",
          "contactType": "Customer Service",
          "email": "support@bestfreewallpapers.com",
          "availableLanguage": "English"
        }
      }
    }
  ]

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'} transition-colors duration-200`}>
      <SEOHead config={seoConfig} structuredData={structuredData} />
      
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Get Support</h1>
            <p className="text-xl text-gray-100 max-w-3xl mx-auto">
              Need help with downloads, have feedback, or want to report an issue? We're here to help!
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Email Support */}
          <div className={`${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} rounded-lg shadow-lg p-8 transition-colors duration-200`}>
            <div className="text-center">
              <div className={`${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6`}>
                <Mail className={`w-8 h-8 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`} />
              </div>
              <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
                Email Support
              </h3>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
                For general inquiries, technical support, or wallpaper submissions
              </p>
              <div className={`${theme === 'dark' ? 'bg-dark-primary border-dark-border' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4 mb-6`}>
                <a 
                  href="mailto:support@bestfreewallpapers.com"
                  className={`text-lg font-semibold ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors`}
                >
                  support@bestfreewallpapers.com
                </a>
              </div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                We typically respond within 24 hours
              </p>
            </div>
          </div>

          {/* Telegram Support */}
          <div className={`${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} rounded-lg shadow-lg p-8 transition-colors duration-200`}>
            <div className="text-center">
              <div className={`${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6`}>
                <MessageCircle className={`w-8 h-8 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`} />
              </div>
              <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
                Telegram Support
              </h3>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
                Quick support and community discussions
              </p>
              
              {/* Direct Message */}
              <div className={`${theme === 'dark' ? 'bg-dark-primary border-dark-border' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4 mb-4`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mb-2`}>Direct Message:</p>
                <a 
                  href="https://t.me/bestfreewallpapers_support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-lg font-semibold ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors`}
                >
                  @bestfreewallpapers_support
                </a>
              </div>
              
              {/* Group Chat */}
              <div className={`${theme === 'dark' ? 'bg-dark-primary border-dark-border' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4 mb-6`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mb-2`}>Community Group:</p>
                <a 
                  href="https://t.me/bestfreewallpapers_community"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-lg font-semibold ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors`}
                >
                  Join Community Group
                </a>
              </div>
              
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Get instant support and connect with other users
              </p>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className={`${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} rounded-lg shadow-lg p-8 mt-12 transition-colors duration-200`}>
          <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6 text-center`}>
            Frequently Asked Questions
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-3`}>
                Download Issues
              </h4>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                If you're having trouble downloading wallpapers, try clearing your browser cache or using a different browser. For premium downloads, ensure you're logged in to your account.
              </p>
            </div>
            
            <div>
              <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-3`}>
                Wallpaper Requests
              </h4>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                Have a specific wallpaper in mind? Send us your requests via email with detailed descriptions, and we'll do our best to add similar content to our collection.
              </p>
            </div>
            
            <div>
              <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-3`}>
                Premium Membership
              </h4>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                Questions about premium features, billing, or account management? Contact us via email for personalized assistance with your premium membership.
              </p>
            </div>
            
            <div>
              <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-3`}>
                Technical Support
              </h4>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                Experiencing website errors or technical issues? Please include your browser type, device information, and steps to reproduce the problem when contacting us.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContactPage