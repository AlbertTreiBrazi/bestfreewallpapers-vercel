/**
 * Performance Monitor Component
 * Real-time Core Web Vitals monitoring and SEO health dashboard
 */

import React, { useState, useEffect, useCallback } from 'react'
import { performanceOptimizer, CoreWebVitalsMetrics, getPerformanceScore } from '../utils/performance-optimizer'
import { getSitemapStats, validateSitemaps, triggerSitemapUpdate } from '../utils/sitemap-manager'
import { cn } from '../utils/cn'

interface PerformanceData {
  webVitals: CoreWebVitalsMetrics
  performanceScore: number
  sitemapStats: any
  sitemapValidation: any
  lastUpdated: string
}

interface MetricCardProps {
  title: string
  value: number | null
  unit: string
  threshold: { good: number; poor: number }
  description: string
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit, threshold, description }) => {
  const getRating = (value: number | null) => {
    if (value === null) return 'loading'
    if (value <= threshold.good) return 'good'
    if (value <= threshold.poor) return 'needs-improvement'
    return 'poor'
  }
  
  const rating = getRating(value)
  const displayValue = value !== null ? value.toFixed(value < 10 ? 2 : 0) : '--'
  
  const ratingColors = {
    good: 'text-green-600 bg-green-50 border-green-200',
    'needs-improvement': 'text-yellow-600 bg-yellow-50 border-yellow-200',
    poor: 'text-red-600 bg-red-50 border-red-200',
    loading: 'text-gray-500 bg-gray-50 border-gray-200'
  }
  
  return (
    <div className={cn(
      'p-4 rounded-lg border transition-all duration-200',
      ratingColors[rating]
    )}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-sm">{title}</h3>
        <div className="flex items-center space-x-1">
          <span className="text-xl font-bold">{displayValue}</span>
          <span className="text-sm opacity-75">{unit}</span>
        </div>
      </div>
      
      <p className="text-xs opacity-75 mb-2">{description}</p>
      
      {value !== null && (
        <div className="flex items-center space-x-2">
          <div className="flex-1 bg-white bg-opacity-50 rounded-full h-2">
            <div 
              className={cn(
                'h-2 rounded-full transition-all duration-500',
                rating === 'good' ? 'bg-green-500' :
                rating === 'needs-improvement' ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{
                width: `${Math.min(100, (value / (threshold.poor * 1.5)) * 100)}%`
              }}
            />
          </div>
          <span className={cn(
            'text-xs font-medium px-2 py-1 rounded-full',
            rating === 'good' ? 'bg-green-100 text-green-700' :
            rating === 'needs-improvement' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
          )}>
            {rating === 'good' ? 'Good' : rating === 'needs-improvement' ? 'Needs Work' : 'Poor'}
          </span>
        </div>
      )}
    </div>
  )
}

const PerformanceMonitor: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdatingSitemap, setIsUpdatingSitemap] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  
  // Core Web Vitals thresholds (in milliseconds, except CLS)
  const thresholds = {
    LCP: { good: 2500, poor: 4000 },
    FID: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    TTFB: { good: 800, poor: 1800 }
  }
  
  const fetchPerformanceData = useCallback(async () => {
    try {
      setIsLoading(true)
      
      const [webVitals, performanceScore, sitemapStats, sitemapValidation] = await Promise.all([
        Promise.resolve(performanceOptimizer.getWebVitals()),
        Promise.resolve(getPerformanceScore()),
        getSitemapStats(),
        validateSitemaps()
      ])
      
      setPerformanceData({
        webVitals,
        performanceScore,
        sitemapStats,
        sitemapValidation,
        lastUpdated: new Date().toISOString()
      })
      
      setLastUpdate(new Date().toLocaleTimeString())
    } catch (error) {
      console.error('Error fetching performance data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  const handleSitemapUpdate = async () => {
    try {
      setIsUpdatingSitemap(true)
      
      const result = await triggerSitemapUpdate({
        trigger: 'manual',
        reason: 'Manual update from admin dashboard'
      })
      
      if (result.success) {
        // Refresh performance data
        await fetchPerformanceData()
      }
    } catch (error) {
      console.error('Error updating sitemap:', error)
    } finally {
      setIsUpdatingSitemap(false)
    }
  }
  
  useEffect(() => {
    fetchPerformanceData()
    
    // Set up periodic updates
    const interval = setInterval(fetchPerformanceData, 30000) // Update every 30 seconds
    
    return () => clearInterval(interval)
  }, [fetchPerformanceData])
  
  if (isLoading && !performanceData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Performance Monitor</h2>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }
  
  const vitals = performanceData?.webVitals
  const overallScore = performanceData?.performanceScore || 0
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Monitor</h2>
          <p className="text-gray-600 mt-1">Core Web Vitals and SEO health monitoring</p>
          {lastUpdate && (
            <p className="text-sm text-gray-500 mt-1">Last updated: {lastUpdate}</p>
          )}
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={fetchPerformanceData}
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center space-x-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            <span>Refresh</span>
          </button>
        </div>
      </div>
      
      {/* Overall Performance Score */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Overall Performance Score</h3>
            <p className="text-gray-600">Based on Core Web Vitals metrics</p>
          </div>
          <div className="text-right">
            <div className={cn(
              'text-4xl font-bold',
              overallScore >= 80 ? 'text-green-600' :
              overallScore >= 50 ? 'text-yellow-600' : 'text-red-600'
            )}>
              {overallScore}
            </div>
            <div className="text-sm text-gray-500">out of 100</div>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="flex-1 bg-gray-200 rounded-full h-3">
            <div 
              className={cn(
                'h-3 rounded-full transition-all duration-1000',
                overallScore >= 80 ? 'bg-green-500' :
                overallScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${overallScore}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Core Web Vitals */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Core Web Vitals</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            title="LCP"
            value={vitals?.LCP || null}
            unit="ms"
            threshold={thresholds.LCP}
            description="Largest Contentful Paint - Loading performance"
          />
          
          <MetricCard
            title="FID"
            value={vitals?.FID || null}
            unit="ms"
            threshold={thresholds.FID}
            description="First Input Delay - Interactivity"
          />
          
          <MetricCard
            title="CLS"
            value={vitals?.CLS || null}
            unit=""
            threshold={thresholds.CLS}
            description="Cumulative Layout Shift - Visual stability"
          />
          
          <MetricCard
            title="FCP"
            value={vitals?.FCP || null}
            unit="ms"
            threshold={thresholds.FCP}
            description="First Contentful Paint - Perceived loading"
          />
          
          <MetricCard
            title="TTFB"
            value={vitals?.TTFB || null}
            unit="ms"
            threshold={thresholds.TTFB}
            description="Time to First Byte - Server response"
          />
        </div>
      </div>
      
      {/* SEO Health */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO Health</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sitemap Statistics */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">Sitemap Statistics</h4>
              <button
                onClick={handleSitemapUpdate}
                disabled={isUpdatingSitemap}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isUpdatingSitemap ? 'Updating...' : 'Update'}
              </button>
            </div>
            
            {performanceData?.sitemapStats ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total URLs:</span>
                  <span className="font-medium">{performanceData.sitemapStats.totalUrls}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Images:</span>
                  <span className="font-medium">{performanceData.sitemapStats.totalImages}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Combined Size:</span>
                  <span className="font-medium">{(performanceData.sitemapStats.totalSize / 1024).toFixed(2)} KB</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No sitemap data available</p>
            )}
          </div>
          
          {/* Sitemap Validation */}
          <div className="bg-white rounded-lg border p-6">
            <h4 className="font-medium text-gray-900 mb-4">Sitemap Validation</h4>
            
            {performanceData?.sitemapValidation ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className={cn(
                    'w-3 h-3 rounded-full',
                    performanceData.sitemapValidation.valid ? 'bg-green-500' : 'bg-red-500'
                  )} />
                  <span className={cn(
                    'font-medium',
                    performanceData.sitemapValidation.valid ? 'text-green-700' : 'text-red-700'
                  )}>
                    {performanceData.sitemapValidation.valid ? 'Valid' : 'Issues Found'}
                  </span>
                </div>
                
                {performanceData.sitemapValidation.issues.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-red-700">Issues:</p>
                    {performanceData.sitemapValidation.issues.map((issue, index) => (
                      <p key={index} className="text-sm text-red-600">• {issue}</p>
                    ))}
                  </div>
                )}
                
                {performanceData.sitemapValidation.recommendations.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-700">Recommendations:</p>
                    {performanceData.sitemapValidation.recommendations.map((rec, index) => (
                      <p key={index} className="text-sm text-blue-600">• {rec}</p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Validation in progress...</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Performance Tips */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Performance Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Improve Loading Speed:</h4>
            <ul className="space-y-1 text-blue-700">
              <li>• Optimize images with WebP format</li>
              <li>• Enable lazy loading for below-the-fold content</li>
              <li>• Minimize JavaScript bundle size</li>
              <li>• Use CDN for static assets</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 mb-2">SEO Best Practices:</h4>
            <ul className="space-y-1 text-blue-700">
              <li>• Keep sitemaps updated with new content</li>
              <li>• Use structured data markup</li>
              <li>• Optimize meta descriptions and titles</li>
              <li>• Ensure mobile-friendly design</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PerformanceMonitor