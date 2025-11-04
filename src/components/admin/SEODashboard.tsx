import React, { useState, useEffect } from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import { 
  Search, Mic, Target, TrendingUp, Award, Eye, 
  Sparkles, RefreshCw, Download, Users
} from 'lucide-react'
import { seoOptimizationService, SEOAnalytics } from '@/services/seoOptimizationService'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface SEODashboardProps {
  className?: string
}

export function SEODashboard({ className = '' }: SEODashboardProps) {
  const [analytics, setAnalytics] = useState<SEOAnalytics | null>(null)
  const [voiceSearchData, setVoiceSearchData] = useState<any>(null)
  const [trendingWallpapers, setTrendingWallpapers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState('overview')

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [analyticsData, voiceData, trendingData] = await Promise.all([
        seoOptimizationService.getSEOAnalytics(),
        seoOptimizationService.getVoiceSearchAnalytics(),
        seoOptimizationService.getTrendingWallpapers(10)
      ])

      setAnalytics(analyticsData)
      setVoiceSearchData(voiceData)
      setTrendingWallpapers(trendingData)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await loadDashboardData()
    setRefreshing(false)
  }

  const updateContentFreshness = async () => {
    try {
      await seoOptimizationService.updateContentFreshness()
      await refreshData()
    } catch (error) {
      console.error('Failed to update content freshness:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-80 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const pieChartData = analytics ? [
    { name: 'Optimized', value: analytics.seo_optimized_wallpapers, color: '#22C55E' },
    { name: 'Needs Optimization', value: analytics.total_wallpapers - analytics.seo_optimized_wallpapers, color: '#EF4444' }
  ] : []

  const voiceSearchIntentData = voiceSearchData ? Object.entries(voiceSearchData.intent_distribution).map(([intent, count]) => ({
    intent: intent.charAt(0).toUpperCase() + intent.slice(1),
    count
  })) : []

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-purple-500" />
            SEO Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Monitor and optimize your content's search engine performance
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            onClick={updateContentFreshness}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Update Freshness
          </Button>
          
          <Button
            onClick={refreshData}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Wallpapers
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {analytics?.total_wallpapers.toLocaleString()}
              </p>
            </div>
            <Eye className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Published and active content
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                SEO Optimized
              </p>
              <p className="text-3xl font-bold text-green-600">
                {analytics?.alt_text_coverage}%
              </p>
            </div>
            <Target className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {analytics?.seo_optimized_wallpapers} wallpapers with alt text
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Average SEO Score
              </p>
              <p className="text-3xl font-bold text-purple-600">
                {analytics?.average_seo_score}
              </p>
            </div>
            <Award className="w-8 h-8 text-purple-500" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Out of 100 possible points
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Voice Search Ready
              </p>
              <p className="text-3xl font-bold text-orange-600">
                {analytics?.voice_search_enabled}
              </p>
            </div>
            <Mic className="w-8 h-8 text-orange-500" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Wallpapers with voice keywords
          </p>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SEO Optimization Coverage */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            SEO Optimization Coverage
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Alt Text Coverage</span>
                <span>{analytics?.alt_text_coverage}%</span>
              </div>
              <Progress value={analytics?.alt_text_coverage || 0} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Structured Data</span>
                <span>{analytics?.structured_data_coverage}%</span>
              </div>
              <Progress value={analytics?.structured_data_coverage || 0} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Voice Search Optimization</span>
                <span>
                  {analytics ? Math.round((analytics.voice_search_enabled / analytics.total_wallpapers) * 100) : 0}%
                </span>
              </div>
              <Progress 
                value={analytics ? (analytics.voice_search_enabled / analytics.total_wallpapers) * 100 : 0} 
                className="h-2" 
              />
            </div>
          </div>

          <div className="mt-6">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Voice Search Analytics */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Voice Search Analytics
          </h3>
          
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {voiceSearchData?.total_queries || 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Voice Searches
              </p>
            </div>
            
            {voiceSearchIntentData.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={voiceSearchIntentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="intent" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Top Voice Search Queries */}
      {voiceSearchData?.top_queries && voiceSearchData.top_queries.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Voice Search Queries
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {voiceSearchData.top_queries.slice(0, 10).map((query: any, index: number) => (
              <div 
                key={query.id} 
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    #{index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      "{query.query}"
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {query.search_intent}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-blue-600">
                  {query.usage_count}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Trending Wallpapers */}
      {trendingWallpapers.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Trending Wallpapers (Content Freshness)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendingWallpapers.slice(0, 6).map((wallpaper: any, index: number) => (
              <div 
                key={wallpaper.id} 
                className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <span className="text-lg font-bold text-gray-500 dark:text-gray-400">
                  #{index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {wallpaper.title}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    <Download className="w-3 h-3" />
                    <span>{wallpaper.download_count}</span>
                    <span>•</span>
                    <span>Score: {wallpaper.trend_score?.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}