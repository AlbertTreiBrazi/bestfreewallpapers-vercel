import React from 'react'
import { SEOHead } from '@/components/seo/SEOHead'
import { Upload, CheckCircle, XCircle, AlertTriangle, FileImage, Users, Shield } from 'lucide-react'

export function GuidelinesPage() {
  return (
    <>
      <SEOHead 
        config={{
          title: "Upload Guidelines | BestFreeWallpapers",
          description: "Guidelines for uploading wallpapers to BestFreeWallpapers. Learn about image requirements, copyright, and content policies.",
          keywords: ['upload', 'guidelines', 'wallpapers', 'content policy'],
          type: 'article'
        }}
      />
      
      <div className="min-h-screen bg-theme-primary py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <Upload className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-theme-primary mb-4">Upload Guidelines</h1>
            <p className="text-xl text-theme-secondary max-w-2xl mx-auto">
              Please follow these guidelines to ensure your wallpapers meet our quality and legal standards.
            </p>
          </div>

          {/* Guidelines Content */}
          <div className="space-y-8">
            {/* Image Quality Requirements */}
            <div className="bg-theme-surface border border-theme-light rounded-lg p-6">
              <div className="flex items-center mb-4">
                <FileImage className="w-6 h-6 text-green-600 mr-3" />
                <h2 className="text-2xl font-semibold text-theme-primary">Image Quality Requirements</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-theme-primary">Minimum Resolution</h3>
                    <p className="text-theme-secondary">1920x1080 pixels (Full HD) or higher. 4K (3840x2160) preferred.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-theme-primary">Supported Formats</h3>
                    <p className="text-theme-secondary">JPEG, PNG, WebP. Maximum file size: 50MB.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-theme-primary">Image Quality</h3>
                    <p className="text-theme-secondary">Sharp, clear images without pixelation, noise, or compression artifacts.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Policies */}
            <div className="bg-theme-surface border border-theme-light rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Shield className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-2xl font-semibold text-theme-primary">Content Policies</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-theme-primary">Appropriate Content</h3>
                    <p className="text-theme-secondary">Nature, abstract, technology, minimalist, and artistic wallpapers are welcome.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <XCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-theme-primary">Prohibited Content</h3>
                    <p className="text-theme-secondary">No nudity, violence, hate speech, copyrighted material, or offensive content.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-theme-primary">Brand Guidelines</h3>
                    <p className="text-theme-secondary">Avoid logos, watermarks, or branded content unless you own the rights.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Copyright and Legal */}
            <div className="bg-theme-surface border border-theme-light rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Users className="w-6 h-6 text-gray-600 mr-3" />
                <h2 className="text-2xl font-semibold text-theme-primary">Copyright & Legal</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-theme-primary">Original Content</h3>
                    <p className="text-theme-secondary">Only upload images you created or have explicit permission to use.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-theme-primary">Creative Commons</h3>
                    <p className="text-theme-secondary">CC0 (Public Domain) images are acceptable. Provide attribution when required.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <XCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-theme-primary">Copyrighted Material</h3>
                    <p className="text-theme-secondary">No movie stills, screenshots, celebrity photos, or copyrighted artwork.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Review Process */}
            <div className="bg-theme-surface border border-theme-light rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-theme-primary mb-4">Review Process</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-medium text-theme-primary mb-2">1. Upload</h3>
                  <p className="text-sm text-theme-secondary">Submit your wallpaper with proper categorization and tags.</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                  </div>
                  <h3 className="font-medium text-theme-primary mb-2">2. Review</h3>
                  <p className="text-sm text-theme-secondary">Our team reviews for quality, content policy compliance, and copyright.</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-medium text-theme-primary mb-2">3. Publish</h3>
                  <p className="text-sm text-theme-secondary">Approved wallpapers are published and made available for download.</p>
                </div>
              </div>
              <div className="mt-6 p-4 bg-theme-secondary rounded-lg">
                <p className="text-sm text-theme-primary">
                  <strong>Note:</strong> Review typically takes 24-48 hours. You'll be notified via email about the status of your submission.
                </p>
              </div>
            </div>

            {/* Contact */}
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-theme-primary mb-4">Questions?</h2>
              <p className="text-theme-secondary mb-6">
                If you have questions about these guidelines or need clarification, please contact us.
              </p>
              <a 
                href="/contact" 
                className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default GuidelinesPage