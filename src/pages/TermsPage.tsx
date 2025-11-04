import React from 'react'
import { SEOHead } from '@/components/seo/SEOHead'
import { FileText, Scale, AlertCircle, CheckCircle, XCircle, Users } from 'lucide-react'

export function TermsPage() {
  const seoConfig = {
    title: 'Terms & Conditions - BestFreeWallpapers',
    description: 'Read our terms and conditions for using BestFreeWallpapers. Understand your rights and responsibilities when using our wallpaper service.',
    keywords: ['terms and conditions', 'terms of service', 'user agreement', 'wallpapers', 'legal']
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead config={seoConfig} />
      
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Scale className="w-16 h-16 mx-auto mb-6 text-gray-200" />
            <h1 className="text-4xl font-bold mb-4">Terms & Conditions</h1>
            <p className="text-xl text-gray-100">
              Please read these terms carefully before using our service.
            </p>
            <p className="text-gray-200 mt-4">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          
          {/* Agreement to Terms */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <FileText className="w-6 h-6 mr-3 text-gray-600" />
              Agreement to Terms
            </h2>
            <p className="text-gray-700 leading-relaxed">
              By accessing and using BestFreeWallpapers ("we," "us," or "our"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          {/* Use License */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="w-6 h-6 mr-3 text-green-600" />
              Use License
            </h2>
            <div className="space-y-4">
              <p className="text-gray-700">Permission is granted to temporarily download wallpapers from BestFreeWallpapers for personal, non-commercial use only. This is the grant of a license, not a transfer of title, and under this license you may:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Download wallpapers for personal desktop/mobile backgrounds</li>
                <li>Use wallpapers for personal creative projects</li>
                <li>Share wallpapers with friends for personal use</li>
              </ul>
            </div>
          </section>

          {/* Restrictions */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <XCircle className="w-6 h-6 mr-3 text-red-600" />
              Restrictions
            </h2>
            <p className="text-gray-700 mb-4">This license shall automatically terminate if you violate any of these restrictions. Under this license you may NOT:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Modify or copy the materials for commercial use</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
              <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
              <li>Redistribute wallpapers on other platforms without permission</li>
              <li>Use automated tools to download large quantities of wallpapers</li>
            </ul>
          </section>

          {/* User Accounts */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Users className="w-6 h-6 mr-3 text-gray-600" />
              User Accounts
            </h2>
            <div className="space-y-4">
              <p className="text-gray-700">When you create an account with us, you must provide accurate and complete information. You are responsible for:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Safeguarding your password and account information</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
                <li>Maintaining the accuracy of your account information</li>
              </ul>
              <p className="text-gray-700 mt-4">
                We reserve the right to suspend or terminate accounts that violate these terms or are used for inappropriate activities.
              </p>
            </div>
          </section>

          {/* Premium Services */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Premium Services</h2>
            <div className="space-y-4">
              <p className="text-gray-700">Our premium subscription offers enhanced features and higher quality downloads. Premium terms include:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Monthly or annual billing cycles</li>
                <li>Automatic renewal unless cancelled</li>
                <li>30-day refund policy for new subscriptions</li>
                <li>Access to exclusive premium wallpapers</li>
                <li>Higher download limits and priority support</li>
              </ul>
            </div>
          </section>

          {/* Disclaimer */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <AlertCircle className="w-6 h-6 mr-3 text-orange-600" />
              Disclaimer
            </h2>
            <p className="text-gray-700 leading-relaxed">
              The materials on BestFreeWallpapers are provided on an 'as is' basis. BestFreeWallpapers makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          {/* Content Policy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Content Policy</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              All wallpapers on our platform are carefully curated and selected. We strive to ensure all content is appropriate and legally compliant. However, if you believe any content violates copyright or is inappropriate, please contact us immediately.
            </p>
            <p className="text-gray-700">
              Users who submit content agree that their submissions are original or properly licensed, and grant us permission to display and distribute the content.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Termination</h2>
            <p className="text-gray-700 leading-relaxed">
              We may terminate or suspend your account and access to our service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the service will cease immediately.
            </p>
          </section>

          {/* Contact Information */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Information</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have any questions about these Terms & Conditions, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-800 font-medium">Email: legal@bestfreewallpapers.com</p>
              <p className="text-gray-800">We will respond to your inquiry within 3 business days.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default TermsPage
