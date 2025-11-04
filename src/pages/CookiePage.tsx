import React from 'react'
import { SEOHead } from '@/components/seo/SEOHead'
import { Cookie, Settings, BarChart3, Shield } from 'lucide-react'

export function CookiePage() {
  const seoConfig = {
    title: 'Cookie Policy - BestFreeWallpapers',
    description: 'Learn about how BestFreeWallpapers uses cookies and similar technologies to improve your browsing experience and provide personalized content.',
    keywords: ['cookie policy', 'cookies', 'privacy', 'tracking', 'website analytics']
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead config={seoConfig} />
      
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Cookie className="w-16 h-16 mx-auto mb-6 text-gray-200" />
            <h1 className="text-4xl font-bold mb-4">Cookie Policy</h1>
            <p className="text-xl text-gray-100">
              Learn how we use cookies to enhance your experience.
            </p>
            <p className="text-gray-200 mt-4">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          
          {/* What Are Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Cookie className="w-6 h-6 mr-3 text-gray-600" />
              What Are Cookies?
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website. They help websites remember information about your visit, which can make your next visit easier and the site more useful to you.
            </p>
            <p className="text-gray-700 leading-relaxed">
              BestFreeWallpapers uses cookies to improve your browsing experience, remember your preferences, and provide you with more relevant content and advertisements.
            </p>
          </section>

          {/* Types of Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Types of Cookies We Use</h2>
            
            <div className="space-y-6">
              {/* Essential Cookies */}
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-green-600" />
                  Essential Cookies
                </h3>
                <p className="text-gray-700 mb-2">
                  These cookies are necessary for the website to function properly. They enable core functionality such as security, network management, and accessibility.
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>User authentication and session management</li>
                  <li>Security and fraud prevention</li>
                  <li>Website functionality and navigation</li>
                </ul>
              </div>

              {/* Performance Cookies */}
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                  Performance Cookies
                </h3>
                <p className="text-gray-700 mb-2">
                  These cookies help us understand how visitors interact with our website by collecting anonymous information about page visits, traffic sources, and user behavior.
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Website analytics and usage statistics</li>
                  <li>Page load times and performance monitoring</li>
                  <li>Error reporting and troubleshooting</li>
                </ul>
              </div>

              {/* Functionality Cookies */}
              <div className="border-l-4 border-gray-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-gray-600" />
                  Functionality Cookies
                </h3>
                <p className="text-gray-700 mb-2">
                  These cookies allow us to remember choices you make and provide enhanced, more personalized features.
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Language and region preferences</li>
                  <li>Display settings and layout preferences</li>
                  <li>Recently viewed wallpapers and favorites</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Third-Party Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Third-Party Cookies</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Some cookies on our site are set by third-party services that appear on our pages. These might include:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><strong>Analytics Services:</strong> Help us understand website traffic and user behavior</li>
              <li><strong>Social Media:</strong> Enable sharing content on social platforms</li>
              <li><strong>Content Delivery:</strong> Improve website loading speeds and performance</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              We do not control these third-party cookies and recommend reviewing the respective privacy policies of these services.
            </p>
          </section>

          {/* Managing Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Managing Your Cookie Preferences</h2>
            <div className="space-y-4">
              <p className="text-gray-700 leading-relaxed">
                You have several options for managing cookies:
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Browser Settings</h3>
                <p className="text-gray-700 text-sm">
                  Most web browsers allow you to control cookies through their settings. You can choose to accept all cookies, reject all cookies, or be notified when a cookie is set.
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Cookie Banner</h3>
                <p className="text-gray-700 text-sm">
                  When you first visit our site, you'll see a cookie banner where you can accept or customize your cookie preferences.
                </p>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  <strong>Note:</strong> Disabling certain cookies may affect the functionality of our website and limit your user experience.
                </p>
              </div>
            </div>
          </section>

          {/* Updates to This Policy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Updates to This Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. Any changes will be posted on this page with an updated revision date.
            </p>
          </section>

          {/* Contact Information */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have any questions about our use of cookies or this Cookie Policy, please contact us:
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-800 font-medium">Email: privacy@bestfreewallpapers.com</p>
              <p className="text-gray-800">Subject: Cookie Policy Inquiry</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default CookiePage
