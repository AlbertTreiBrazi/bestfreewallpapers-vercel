import React, { useState } from 'react'
import { SEOHead } from '@/components/seo/SEOHead'
import { Code, Key, Database, Download, Search, Globe, Shield, Copy, CheckCircle } from 'lucide-react'

export function APIPage() {
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null)

  const copyToClipboard = (text: string, endpoint: string) => {
    navigator.clipboard.writeText(text)
    setCopiedEndpoint(endpoint)
    setTimeout(() => setCopiedEndpoint(null), 2000)
  }

  const endpoints = [
    {
      method: 'GET',
      path: '/api/wallpapers',
      description: 'Get all wallpapers with pagination',
      example: 'https://api.bestfreewallpapers.com/api/wallpapers?page=1&limit=20'
    },
    {
      method: 'GET',
      path: '/api/wallpapers/:id',
      description: 'Get a specific wallpaper by ID',
      example: 'https://api.bestfreewallpapers.com/api/wallpapers/123'
    },
    {
      method: 'GET',
      path: '/api/categories',
      description: 'Get all categories',
      example: 'https://api.bestfreewallpapers.com/api/categories'
    },
    {
      method: 'GET',
      path: '/api/search',
      description: 'Search wallpapers by query',
      example: 'https://api.bestfreewallpapers.com/api/search?q=nature&category=landscape'
    },
    {
      method: 'GET',
      path: '/api/popular',
      description: 'Get popular wallpapers',
      example: 'https://api.bestfreewallpapers.com/api/popular?period=week'
    }
  ]

  return (
    <>
      <SEOHead 
        config={{
          title: "API Documentation | BestFreeWallpapers",
          description: "Access thousands of high-quality wallpapers programmatically with our REST API. Free tier available with rate limiting.",
          keywords: ['API', 'documentation', 'REST', 'wallpapers', 'developer'],
          type: 'article'
        }}
      />
      
      <div className="min-h-screen bg-theme-primary py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <Code className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-theme-primary mb-4">API Documentation</h1>
            <p className="text-xl text-theme-secondary max-w-3xl mx-auto">
              Access our wallpaper database programmatically with our RESTful API. Perfect for apps, websites, and creative projects.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Getting Started */}
              <div className="bg-theme-surface border border-theme-light rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <Key className="w-6 h-6 text-green-600 mr-3" />
                  <h2 className="text-2xl font-semibold text-theme-primary">Getting Started</h2>
                </div>
                <div className="space-y-4">
                  <p className="text-theme-secondary">
                    Our API provides free access to thousands of high-quality wallpapers. Get started in minutes with our simple REST endpoints.
                  </p>
                  <div className="bg-theme-secondary p-4 rounded-lg">
                    <h3 className="font-medium text-theme-primary mb-2">Base URL</h3>
                    <div className="flex items-center space-x-2">
                      <code className="bg-theme-tertiary px-3 py-1 rounded text-sm text-theme-primary flex-1">
                        https://api.bestfreewallpapers.com
                      </code>
                      <button
                        onClick={() => copyToClipboard('https://api.bestfreewallpapers.com', 'base-url')}
                        className="p-2 text-theme-secondary hover:text-theme-primary transition-colors"
                      >
                        {copiedEndpoint === 'base-url' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Authentication */}
              <div className="bg-theme-surface border border-theme-light rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <Shield className="w-6 h-6 text-blue-600 mr-3" />
                  <h2 className="text-2xl font-semibold text-theme-primary">Authentication</h2>
                </div>
                <div className="space-y-4">
                  <p className="text-theme-secondary">
                    API access requires an API key. Free tier includes 1000 requests per day.
                  </p>
                  <div className="bg-theme-secondary p-4 rounded-lg">
                    <h3 className="font-medium text-theme-primary mb-2">Header</h3>
                    <code className="bg-theme-tertiary px-3 py-1 rounded text-sm text-theme-primary block">
                      Authorization: Bearer YOUR_API_KEY
                    </code>
                  </div>
                  <div className="flex space-x-4">
                    <a 
                      href="/contact" 
                      className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Request API Key
                    </a>
                    <a 
                      href="#pricing" 
                      className="inline-flex items-center px-4 py-2 border border-theme-light text-theme-primary rounded-lg hover:bg-theme-secondary transition-colors"
                    >
                      View Pricing
                    </a>
                  </div>
                </div>
              </div>

              {/* Endpoints */}
              <div className="bg-theme-surface border border-theme-light rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <Database className="w-6 h-6 text-gray-600 mr-3" />
                  <h2 className="text-2xl font-semibold text-theme-primary">API Endpoints</h2>
                </div>
                <div className="space-y-6">
                  {endpoints.map((endpoint, index) => (
                    <div key={index} className="border border-theme-light rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium mr-3 ${
                          endpoint.method === 'GET' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                        }`}>
                          {endpoint.method}
                        </span>
                        <code className="text-sm text-theme-primary font-mono">{endpoint.path}</code>
                      </div>
                      <p className="text-theme-secondary mb-3">{endpoint.description}</p>
                      <div className="bg-theme-secondary p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <code className="text-xs text-theme-primary break-all flex-1">
                            {endpoint.example}
                          </code>
                          <button
                            onClick={() => copyToClipboard(endpoint.example, endpoint.path)}
                            className="p-1 text-theme-secondary hover:text-theme-primary transition-colors flex-shrink-0"
                          >
                            {copiedEndpoint === endpoint.path ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Response Format */}
              <div className="bg-theme-surface border border-theme-light rounded-lg p-6">
                <h2 className="text-2xl font-semibold text-theme-primary mb-4">Response Format</h2>
                <div className="space-y-4">
                  <p className="text-theme-secondary">All responses are in JSON format with consistent structure:</p>
                  <div className="bg-theme-secondary p-4 rounded-lg">
                    <pre className="text-sm text-theme-primary overflow-x-auto">
{`{
  "success": true,
  "data": {
    "wallpapers": [
      {
        "id": 123,
        "title": "Beautiful Mountain Landscape",
        "category": "nature",
        "tags": ["mountain", "landscape", "nature"],
        "resolutions": {
          "thumbnail": "https://cdn.example.com/thumb_123.jpg",
          "preview": "https://cdn.example.com/prev_123.jpg",
          "full": "https://cdn.example.com/full_123.jpg"
        },
        "downloads": 1542,
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 25,
      "total_items": 500,
      "per_page": 20
    }
  }
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Links */}
              <div className="bg-theme-surface border border-theme-light rounded-lg p-6">
                <h3 className="text-lg font-semibold text-theme-primary mb-4">Quick Links</h3>
                <div className="space-y-3">
                  <a href="#getting-started" className="flex items-center text-theme-secondary hover:text-theme-primary transition-colors">
                    <Globe className="w-4 h-4 mr-2" />
                    Getting Started
                  </a>
                  <a href="#authentication" className="flex items-center text-theme-secondary hover:text-theme-primary transition-colors">
                    <Shield className="w-4 h-4 mr-2" />
                    Authentication
                  </a>
                  <a href="#endpoints" className="flex items-center text-theme-secondary hover:text-theme-primary transition-colors">
                    <Database className="w-4 h-4 mr-2" />
                    Endpoints
                  </a>
                  <a href="#examples" className="flex items-center text-theme-secondary hover:text-theme-primary transition-colors">
                    <Code className="w-4 h-4 mr-2" />
                    Code Examples
                  </a>
                </div>
              </div>

              {/* Rate Limits */}
              <div className="bg-theme-surface border border-theme-light rounded-lg p-6">
                <h3 className="text-lg font-semibold text-theme-primary mb-4">Rate Limits</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-theme-secondary">Free Tier</span>
                    <span className="text-theme-primary font-medium">1,000/day</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-theme-secondary">Pro Tier</span>
                    <span className="text-theme-primary font-medium">10,000/day</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-theme-secondary">Enterprise</span>
                    <span className="text-theme-primary font-medium">Unlimited</span>
                  </div>
                </div>
              </div>

              {/* Support */}
              <div className="bg-theme-surface border border-theme-light rounded-lg p-6">
                <h3 className="text-lg font-semibold text-theme-primary mb-4">Need Help?</h3>
                <p className="text-theme-secondary mb-4 text-sm">
                  Our team is here to help you integrate our API successfully.
                </p>
                <a 
                  href="/contact" 
                  className="inline-flex items-center w-full justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default APIPage