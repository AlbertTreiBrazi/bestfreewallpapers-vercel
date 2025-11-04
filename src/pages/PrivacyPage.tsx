import React from 'react'
import { SEOHead } from '@/components/seo/SEOHead'
import { Shield, Eye, Lock, UserCheck, Database, Globe } from 'lucide-react'

export function PrivacyPage() {
  const seoConfig = {
    title: 'Privacy Policy - BestFreeWallpapers',
    description: 'Learn how BestFreeWallpapers collects, uses, and protects your personal information. Our commitment to your privacy and data security.',
    keywords: ['privacy policy', 'data protection', 'personal information', 'wallpapers', 'privacy']
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead config={seoConfig} />
      
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-6 text-gray-200" />
            <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-xl text-gray-100">
              Your privacy is important to us. Learn how we protect your data.
            </p>
            <p className="text-gray-200 mt-4">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Eye className="w-6 h-6 mr-3 text-gray-600" />
              Introduction
            </h2>
            <p className="text-gray-700 leading-relaxed">
              At BestFreeWallpapers, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Database className="w-6 h-6 mr-3 text-gray-600" />
              Information We Collect
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Personal Information</h3>
                <p className="text-gray-700">When you create an account or contact us, we may collect:</p>
                <ul className="list-disc list-inside mt-2 text-gray-700 space-y-1">
                  <li>Name and email address</li>
                  <li>Account preferences and settings</li>
                  <li>Communication history with our support team</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Usage Data</h3>
                <p className="text-gray-700">We automatically collect certain information when you use our service:</p>
                <ul className="list-disc list-inside mt-2 text-gray-700 space-y-1">
                  <li>IP address and browser information</li>
                  <li>Pages visited and time spent on our site</li>
                  <li>Download history and preferences</li>
                  <li>Device information and screen resolution</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <UserCheck className="w-6 h-6 mr-3 text-gray-600" />
              How We Use Your Information
            </h2>
            <p className="text-gray-700 mb-4">We use the collected information to:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Provide and maintain our wallpaper service</li>
              <li>Process your account registration and manage your profile</li>
              <li>Send important updates and notifications about our service</li>
              <li>Improve our website functionality and user experience</li>
              <li>Respond to customer support requests</li>
              <li>Analyze usage patterns to optimize our content</li>
            </ul>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Lock className="w-6 h-6 mr-3 text-gray-600" />
              Data Security
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We implement industry-standard security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes encryption of sensitive data, secure server infrastructure, and regular security audits. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Globe className="w-6 h-6 mr-3 text-gray-600" />
              Third-Party Services
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Our website may contain links to third-party websites or integrate with third-party services. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies before providing any personal information.
            </p>
            <p className="text-gray-700">
              We use analytics services to understand how our website is used, which helps us improve our service for all users.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Rights</h2>
            <p className="text-gray-700 mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Access and update your personal information</li>
              <li>Delete your account and associated data</li>
              <li>Opt-out of non-essential communications</li>
              <li>Request a copy of your data</li>
              <li>Report privacy concerns to our team</li>
            </ul>
          </section>

          {/* Contact Information */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-800 font-medium">Email: privacy@bestfreewallpapers.com</p>
              <p className="text-gray-800">We will respond to your inquiry within 30 days.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPage
