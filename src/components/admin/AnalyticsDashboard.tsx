import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import { Users, Crown, DollarSign, TrendingUp, Calendar, Download, Activity } from 'lucide-react'
import toast from 'react-hot-toast'

interface DashboardStats {
  totalUsers: number
  premiumUsers: number
  totalRevenue: number
  newUsersLast30Days: number
  downloadsLast30Days: number
  totalDownloads: number
  growthRate?: number
  engagement?: number
  live_update?: boolean
}

interface AnalyticsData {
  stats: DashboardStats | null
  loading: boolean
  error: string | null
}

export function AnalyticsDashboard() {
  const { theme } = useTheme()
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    stats: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async (forceRefresh = false) => {
    setAnalytics(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const forceParam = forceRefresh ? '?force=true' : '';
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-metrics${forceParam}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
      
      const result = await response.json()
      setAnalytics({ stats: result.data, loading: false, error: null })
      
      if (forceRefresh) {
        toast.success('Dashboard data refreshed successfully!')
      }
    } catch (error: any) {
      console.error('Error loading analytics:', error)
      setAnalytics({ stats: null, loading: false, error: error.message })
      toast.error(`Failed to load analytics: ${error.message}`)
    }
  }

  const handleRefresh = () => {
    loadAnalytics(true)
  }

  if (analytics.loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
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
          <div className="text-red-600 font-medium mb-2">Failed to Load Dashboard</div>
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
        <h2 className="text-2xl font-bold text-theme-primary mb-2">Analytics Dashboard</h2>
        <p className="text-theme-secondary">Comprehensive overview of your platform metrics</p>
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

      {/* Secondary Stats Grid (Removed obsolete sections) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* User Growth Rate */}
        <div className="bg-theme-surface rounded-lg border border-theme-light p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-theme-primary">
                {stats.growthRate !== undefined ? stats.growthRate.toFixed(1) : 
                 stats.totalUsers > 0 ? ((stats.newUsersLast30Days / stats.totalUsers) * 100).toFixed(1) : '0'}%
              </div>
              <div className="text-sm font-medium text-theme-secondary">Growth Rate</div>
            </div>
          </div>
          <div className="text-sm text-indigo-600 font-medium">Monthly growth</div>
        </div>

        {/* Download Activity */}
        <div className="bg-theme-surface rounded-lg border border-theme-light p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-teal-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-theme-primary">
                {stats.engagement !== undefined ? stats.engagement.toFixed(1) :
                 stats.totalDownloads > 0 ? (stats.totalDownloads / stats.totalUsers).toFixed(1) : '0'}
              </div>
              <div className="text-sm font-medium text-theme-secondary">Avg Downloads/User</div>
            </div>
          </div>
          <div className="text-sm text-teal-600 font-medium">User engagement</div>
        </div>
      </div>

      {/* Refresh Button with improved visibility and live update indicator */}
      <div className="mt-8 text-center">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={handleRefresh}
            disabled={analytics.loading}
            className={`px-6 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
              theme === 'light' 
                ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600' 
                : 'bg-theme-primary text-white hover:bg-theme-secondary'
            }`}
          >
            {analytics.loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
          <div className="text-sm text-theme-secondary">
            {stats.live_update && (
              <span className="inline-flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live Data</span>
              </span>
            )}
          </div>
          <div className="text-sm text-theme-secondary">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsDashboard