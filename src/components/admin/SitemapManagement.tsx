import React, { useState } from 'react'
import { Download, RefreshCw, Globe, BarChart3, AlertCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { sitemapGenerator, generateAndSaveSitemap } from '@/utils/sitemap-generator'

export function SitemapManagement() {
  const [generating, setGenerating] = useState(false)
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null)
  const [stats, setStats] = useState<{ totalUrls: number; byType: Record<string, number> } | null>(null)
  const [sitemapXml, setSitemapXml] = useState<string>('')

  const handleGenerateSitemap = async () => {
    setGenerating(true)
    try {
      const result = await generateAndSaveSitemap()
      
      if (result.success && result.xml) {
        setSitemapXml(result.xml)
        setStats(sitemapGenerator.getStats())
        setLastGenerated(new Date())
        toast.success('Sitemap generated successfully!')
      } else {
        toast.error(result.error || 'Failed to generate sitemap')
      }
    } catch (error) {
      console.error('Error generating sitemap:', error)
      toast.error('Failed to generate sitemap')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownloadSitemap = () => {
    if (!sitemapXml) {
      toast.error('No sitemap generated yet')
      return
    }

    const blob = new Blob([sitemapXml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sitemap.xml'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Sitemap downloaded!')
  }

  const handleCopySitemap = async () => {
    if (!sitemapXml) {
      toast.error('No sitemap generated yet')
      return
    }

    try {
      await navigator.clipboard.writeText(sitemapXml)
      toast.success('Sitemap copied to clipboard!')
    } catch (error) {
      toast.error('Failed to copy sitemap')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-theme-primary">
            Sitemap Management
          </h3>
          <p className="text-sm text-theme-secondary mt-1">
            Generate and manage XML sitemaps for better SEO indexing
          </p>
        </div>
        
        <button
          onClick={handleGenerateSitemap}
          disabled={generating}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
          <span>{generating ? 'Generating...' : 'Generate Sitemap'}</span>
        </button>
      </div>

      {/* Status */}
      {lastGenerated && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="font-medium text-green-700 dark:text-green-300">
              Sitemap Generated Successfully
            </span>
          </div>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
            Last generated: {lastGenerated.toLocaleString()}
          </p>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-theme-surface border border-theme-light rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <span className="font-medium text-theme-primary">Total URLs</span>
            </div>
            <div className="text-2xl font-bold text-theme-primary mt-2">
              {stats.totalUrls.toLocaleString()}
            </div>
          </div>
          
          {Object.entries(stats.byType).map(([type, count]) => (
            <div key={type} className="bg-theme-surface border border-theme-light rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-theme-primary capitalize">{type}</span>
              </div>
              <div className="text-2xl font-bold text-theme-primary mt-2">
                {count.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {sitemapXml && (
        <div className="bg-theme-surface border border-theme-light rounded-lg p-6">
          <h4 className="text-lg font-medium text-theme-primary mb-4">Sitemap Actions</h4>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownloadSitemap}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download XML</span>
            </button>
            
            <button
              onClick={handleCopySitemap}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Globe className="w-4 h-4" />
              <span>Copy to Clipboard</span>
            </button>
          </div>
          
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h5 className="text-sm font-medium text-theme-primary mb-2">Next Steps:</h5>
            <ul className="text-sm text-theme-secondary space-y-1">
              <li>1. Download the sitemap.xml file</li>
              <li>2. Upload it to your website's root directory (/sitemap.xml)</li>
              <li>3. Submit to Google Search Console and Bing Webmaster Tools</li>
              <li>4. Update robots.txt to include: Sitemap: https://yoursite.com/sitemap.xml</li>
            </ul>
          </div>
        </div>
      )}

      {/* Preview */}
      {sitemapXml && (
        <div className="bg-theme-surface border border-theme-light rounded-lg p-6">
          <h4 className="text-lg font-medium text-theme-primary mb-4">Sitemap Preview</h4>
          
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96 text-xs font-mono">
            <pre className="whitespace-pre-wrap">{sitemapXml.slice(0, 2000)}</pre>
            {sitemapXml.length > 2000 && (
              <div className="text-gray-500 mt-2">
                ... and {Math.ceil((sitemapXml.length - 2000) / 100)} more lines
              </div>
            )}
          </div>
        </div>
      )}

      {/* SEO Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <h4 className="text-lg font-medium text-blue-700 dark:text-blue-300 mb-2">
              SEO Best Practices
            </h4>
            <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
              <li>• Update sitemaps regularly as content changes</li>
              <li>• Keep individual sitemaps under 50,000 URLs</li>
              <li>• Use sitemap index files for large sites</li>
              <li>• Include high-quality images in image sitemaps</li>
              <li>• Set appropriate priority and changefreq values</li>
              <li>• Monitor sitemap submission status in search console</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
