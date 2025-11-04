import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import { Users, Crown, DollarSign, TrendingUp, Calendar, Download, Activity, BarChart3, RefreshCw, Clock, Eye, Star } from 'lucide-react'
import toast from 'react-hot-toast'

interface AnalyticsStats {
  totalUsers: number
  premiumUsers: number
  totalRevenue: number
  newUsersLast30Days: number
  downloadsLast30Days: number
  totalDownloads: number
  growthRate: number
  engagement: number
  guestDownloads: number
  freeUserDownloads: number
  premiumDownloads: number
  live_update?: boolean
}

interface TrendData {
  date: string
  downloads: number
  users: number
  premiumUsers: number
}

interface TopDownload {
  id: number
  title: string
  download_count: number
  category: string
  thumbnail_url?: string
}

interface AnalyticsData {
  stats: AnalyticsStats | null
  trends: TrendData[]
  topDownloads7d: TopDownload[]
  topDownloads30d: TopDownload[]
  topDownloads90d: TopDownload[]
  loading: boolean
  error: string | null
}

export function EnhancedAnalyticsDashboard() {
  const { theme } = useTheme()
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    stats: null,
    trends: [],
    topDownloads7d: [],
    topDownloads30d: [],
    topDownloads90d: [],
    loading: true,
    error: null
  })
  const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | '90d'>('30d')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async (forceRefresh = false) => {
    setAnalytics(prev => ({ ...prev, loading: true, error: null }))
    setRefreshing(forceRefresh)
    
    try {
      // Load comprehensive analytics data
      const [statsResponse, trendsResponse, topDownloadsResponse] = await Promise.all([
        // Get enhanced metrics
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-metrics${forceRefresh ? '?force=true' : ''}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json'
          }
        }),
        // Get trend data
        loadTrendData(),
        // Get top downloads for all periods
        loadTopDownloads()
      ])
      
      if (!statsResponse.ok) {
        throw new Error(`HTTP ${statsResponse.status}: ${await statsResponse.text()}`)
      }
      
      const statsResult = await statsResponse.json()
      const enhancedStats = await enhanceStatsWithDownloadBreakdown(statsResult.data)
      
      setAnalytics({
        stats: enhancedStats,
        trends: trendsResponse,
        topDownloads7d: topDownloadsResponse['7d'] || [],
        topDownloads30d: topDownloadsResponse['30d'] || [],
        topDownloads90d: topDownloadsResponse['90d'] || [],
        loading: false,
        error: null
      })
      
      if (forceRefresh) {
        toast.success('Analytics data refreshed successfully!')
      }
    } catch (error: any) {
      console.error('Error loading analytics:', error)
      setAnalytics(prev => ({ ...prev, loading: false, error: error.message }))
      toast.error(`Failed to load analytics: ${error.message}`)
    } finally {
      setRefreshing(false)
    }
  }

  const enhanceStatsWithDownloadBreakdown = async (stats: AnalyticsStats): Promise<AnalyticsStats> => {
    try {
      // Get download breakdown by user type
      const { data: downloads, error } = await supabase
        .from('downloads')
        .select('user_id, user_type, created_at')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      const guestDownloads = downloads?.filter(d => d.user_id === null).length || 0
      const premiumDownloads = downloads?.filter(d => d.user_type === 'premium').length || 0
      const freeUserDownloads = downloads?.filter(d => d.user_id !== null && d.user_type !== 'premium').length || 0
      
      return {
        ...stats,
        guestDownloads,
        freeUserDownloads,
        premiumDownloads
      }
    } catch (error) {
      console.error('Error enhancing stats:', error)
      return {
        ...stats,
        guestDownloads: 0,
        freeUserDownloads: stats.totalDownloads,
        premiumDownloads: 0
      }
    }
  }

  const loadTrendData = async (): Promise<TrendData[]> => {
    try {
      // Generate trend data for the last 30 days
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (29 - i))
        return date.toISOString().split('T')[0]
      })
      
      const { data: downloads } = await supabase
        .from('downloads')
        .select('created_at')
        .gte('created_at', last30Days[0])
      
      const { data: users } = await supabase
        .from('profiles')
        .select('created_at, plan_type, premium_expires_at')
        .gte('created_at', last30Days[0])
      
      const trendData: TrendData[] = last30Days.map(date => {
        const dayDownloads = downloads?.filter(d => 
          d.created_at.startsWith(date)
        ).length || 0
        
        const dayUsers = users?.filter(u => 
          u.created_at.startsWith(date)
        ).length || 0
        
        const dayPremiumUsers = users?.filter(u => 
          u.created_at.startsWith(date) && 
          u.plan_type === 'premium' &&
          (!u.premium_expires_at || new Date(u.premium_expires_at) > new Date())
        ).length || 0
        
        return {
          date,
          downloads: dayDownloads,
          users: dayUsers,
          premiumUsers: dayPremiumUsers
        }
      })
      
      return trendData
    } catch (error) {
      console.error('Error loading trend data:', error)
      return []
    }
  }

  const loadTopDownloads = async (): Promise<{ '7d': TopDownload[], '30d': TopDownload[], '90d': TopDownload[] }> => {
    try {
      const periods = {
        '7d': 7,
        '30d': 30,
        '90d': 90
      }
      
      const results: { '7d': TopDownload[], '30d': TopDownload[], '90d': TopDownload[] } = {
        '7d': [],
        '30d': [],
        '90d': []
      }
      
      for (const [period, days] of Object.entries(periods)) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)
        
        // Get download counts for wallpapers in the period
        const { data: downloads } = await supabase
          .from('downloads')
          .select('wallpaper_id')
          .gte('created_at', cutoffDate.toISOString())
        
        if (downloads) {
          // Count downloads per wallpaper
          const downloadCounts: { [key: number]: number } = {}
          downloads.forEach(d => {
            if (d.wallpaper_id) {
              downloadCounts[d.wallpaper_id] = (downloadCounts[d.wallpaper_id] || 0) + 1
            }
          })
          
          // Get top wallpapers
          const topWallpaperIds = Object.entries(downloadCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([id]) => parseInt(id))
          
          if (topWallpaperIds.length > 0) {
            const { data: wallpapers } = await supabase
              .from('wallpapers')
              .select('id, title, category, thumbnail_url')
              .in('id', topWallpaperIds)
            
            if (wallpapers) {
              results[period as keyof typeof results] = topWallpaperIds
                .map(id => {
                  const wallpaper = wallpapers.find(w => w.id === id)
                  if (wallpaper) {
                    return {
                      ...wallpaper,
                      download_count: downloadCounts[id]
                    }
                  }
                  return null
                })
                .filter(Boolean) as TopDownload[]
            }
          }
        }
      }
      
      return results
    } catch (error) {
      console.error('Error loading top downloads:', error)
      return { '7d': [], '30d': [], '90d': [] }
    }
  }

  const handleRefresh = () => {
    loadAnalytics(true)
  }

  const getTopDownloadsForPeriod = () => {
    switch (timeFilter) {
      case '7d': return analytics.topDownloads7d
      case '30d': return analytics.topDownloads30d
      case '90d': return analytics.topDownloads90d
      default: return analytics.topDownloads30d
    }
  }

  if (analytics.loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-theme-surface rounded-lg border border-theme-light p-6 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-theme-light rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-theme-light rounded mb-2"></div>
                  <div className="h-6 bg-theme-light rounded mb-2"></div>
                  <div className="h-3 bg-theme-light rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (analytics.error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 font-medium mb-2">Failed to Load Analytics</div>
          <div className="text-red-500 text-sm mb-4">{analytics.error}</div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const stats = analytics.stats
  if (!stats) {
    return (
      <div className="p-6">
        <div className="text-center text-theme-secondary">No data available</div>
      </div>
    )
  }

  const conversionRate = stats.totalUsers > 0 ? ((stats.premiumUsers / stats.totalUsers) * 100) : 0
  const avgRevenuePerUser = stats.premiumUsers > 0 ? (stats.totalRevenue / stats.premiumUsers) : 0

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-theme-primary mb-2">Enhanced Analytics Dashboard</h2>
            <p className="text-theme-secondary">Comprehensive overview with download analytics and trends</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
              theme === 'light' 
                ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600' 
                : 'bg-theme-primary text-white hover:bg-theme-secondary'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Users */}
        <div className="bg-theme-surface rounded-lg border border-theme-light p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-theme-primary">{stats.totalUsers.toLocaleString()}</div>
              <div className="text-sm font-medium text-theme-secondary">Total Users</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-600 font-medium">+{stats.newUsersLast30Days} this month</span>
          </div>
        </div>

        {/* Premium Users */}
        <div className="bg-theme-surface rounded-lg border border-theme-light p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Crown className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-theme-primary">{stats.premiumUsers.toLocaleString()}</div>
              <div className="text-sm font-medium text-theme-secondary">Premium Users</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-blue-600 font-medium">{conversionRate.toFixed(1)}% conversion</span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-theme-surface rounded-lg border border-theme-light p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-theme-primary">${stats.totalRevenue.toLocaleString()}</div>
              <div className="text-sm font-medium text-theme-secondary">Total Revenue</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-600 font-medium">${avgRevenuePerUser.toFixed(0)} avg per user</span>
          </div>
        </div>

        {/* Total Downloads */}
        <div className="bg-theme-surface rounded-lg border border-theme-light p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Download className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-theme-primary">{stats.totalDownloads.toLocaleString()}</div>
              <div className="text-sm font-medium text-theme-secondary">Total Downloads</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-purple-600 font-medium">{stats.downloadsLast30Days} this month</span>
          </div>
        </div>
      </div>

      {/* Download Analytics Section */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-theme-primary mb-4">Download Analytics Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Guest Downloads */}
          <div className="bg-theme-surface rounded-lg border border-theme-light p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-gray-600" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-theme-primary">{stats.guestDownloads.toLocaleString()}</div>
                <div className="text-sm font-medium text-theme-secondary">Guest Downloads</div>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {stats.totalDownloads > 0 ? ((stats.guestDownloads / stats.totalDownloads) * 100).toFixed(1) : 0}% of total
            </div>
          </div>

          {/* Free User Downloads */}
          <div className="bg-theme-surface rounded-lg border border-theme-light p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-theme-primary">{stats.freeUserDownloads.toLocaleString()}</div>
                <div className="text-sm font-medium text-theme-secondary">Free User Downloads</div>
              </div>
            </div>
            <div className="text-sm text-blue-600">
              {stats.totalDownloads > 0 ? ((stats.freeUserDownloads / stats.totalDownloads) * 100).toFixed(1) : 0}% of total
            </div>
          </div>

          {/* Premium Downloads */}
          <div className="bg-theme-surface rounded-lg border border-theme-light p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Crown className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-theme-primary">{stats.premiumDownloads.toLocaleString()}</div>
                <div className="text-sm font-medium text-theme-secondary">Premium Downloads</div>
              </div>
            </div>
            <div className="text-sm text-yellow-600">
              {stats.totalDownloads > 0 ? ((stats.premiumDownloads / stats.totalDownloads) * 100).toFixed(1) : 0}% of total
            </div>
          </div>
        </div>
      </div>

      {/* Trend Charts Section */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-theme-primary mb-4">Download Trends (Last 30 Days)</h3>
        <div className="bg-theme-surface rounded-lg border border-theme-light p-6">
          {analytics.trends.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-2 text-xs text-theme-secondary font-medium">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="text-center">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {analytics.trends.slice(-7).map((trend, index) => {
                  const maxDownloads = Math.max(...analytics.trends.map(t => t.downloads))
                  const height = maxDownloads > 0 ? (trend.downloads / maxDownloads) * 60 : 4
                  return (
                    <div key={index} className="flex flex-col items-center space-y-1">
                      <div 
                        className="bg-blue-500 rounded-sm w-full transition-all duration-300 hover:bg-blue-600"
                        style={{ height: `${Math.max(height, 4)}px` }}
                        title={`${trend.date}: ${trend.downloads} downloads`}
                      ></div>
                      <span className="text-xs text-theme-secondary">{trend.downloads}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-theme-secondary mx-auto mb-2" />
                <div className="text-theme-secondary">No trend data available</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Downloads Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-theme-primary">Top Downloads</h3>
          <div className="flex space-x-2">
            {(['7d', '30d', '90d'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimeFilter(period)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  timeFilter === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-theme-light text-theme-secondary hover:bg-theme-surface'
                }`}
              >
                {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>
        
        <div className="bg-theme-surface rounded-lg border border-theme-light p-6">
          {getTopDownloadsForPeriod().length > 0 ? (
            <div className="space-y-4">
              {getTopDownloadsForPeriod().map((wallpaper, index) => (
                <div key={wallpaper.id} className="flex items-center space-x-4 p-3 rounded-lg bg-theme-light">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                    <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                  </div>
                  {wallpaper.thumbnail_url && (
                    <img 
                      src={wallpaper.thumbnail_url} 
                      alt={wallpaper.title}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-theme-primary">{wallpaper.title}</h4>
                    <p className="text-sm text-theme-secondary">{wallpaper.category}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1">
                      <Download className="w-4 h-4 text-theme-secondary" />
                      <span className="font-medium text-theme-primary">{wallpaper.download_count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Star className="w-12 h-12 text-theme-secondary mx-auto mb-2" />
                <div className="text-theme-secondary">No download data for this period</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data Status */}
      <div className="mt-8 text-center">
        <div className="flex items-center justify-center space-x-4">
          {stats.live_update && (
            <div className="flex items-center space-x-2 text-sm text-theme-secondary">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Data</span>
            </div>
          )}
          <div className="text-sm text-theme-secondary">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EnhancedAnalyticsDashboard