import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Users, Download, Crown, Filter, Calendar, RefreshCw, BarChart3, PieChart as PieChartIcon, FileDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSearchParams, useLocation } from 'react-router-dom'
import { useCancellableRequest } from '@/hooks/useCancellableRequest'
import { fetchWithTimeout, ApiError } from '@/utils/api-helpers'
import { logError, logWarn } from '@/utils/errorLogger'

interface AnalyticsData {
  guest: number
  free: number
  premium: number
  total: number
}

interface TrendData {
  date: string
  guest: number
  free: number
  premium: number
  total: number
}

interface TopDownload {
  wallpaper_id: number
  count: number
  wallpapers: {
    id: number
    title: string
    image_url: string
    video_url?: string
  }
}

interface TimeRange {
  value: number | string
  label: string
}

const TIME_RANGES: TimeRange[] = [
  { value: 0, label: 'Today' },
  { value: 7, label: '7 Days' },
  { value: 30, label: '30 Days' },
  { value: 'custom', label: 'Custom' }
]

const ITEM_LIMITS = [10, 25, 50]

const COLORS = {
  guest: '#94a3b8',
  free: '#3b82f6',
  premium: '#f59e0b',
  total: '#10b981'
}

export function ComprehensiveAnalyticsDashboard() {
  const { theme } = useTheme()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const { fetch: fetchCancellable, cancelAll } = useCancellableRequest()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTimeRange, setSelectedTimeRange] = useState<number | string>(30)
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [itemLimit, setItemLimit] = useState<number>(50)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [trendsData, setTrendsData] = useState<TrendData[]>([])
  const [topDownloads, setTopDownloads] = useState<TopDownload[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Initialize from URL params
    const range = searchParams.get('range')
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const limit = searchParams.get('limit')
    
    if (range) {
      if (range === 'custom' && start && end) {
        setSelectedTimeRange('custom')
        setCustomStartDate(start)
        setCustomEndDate(end)
      } else if (range !== 'custom') {
        setSelectedTimeRange(parseInt(range))
      }
    }
    
    if (limit) {
      setItemLimit(parseInt(limit))
    }
  }, [])

  useEffect(() => {
    // Only load data if we have valid date range
    if (selectedTimeRange === 'custom') {
      // For custom range, only load if both dates are set
      if (customStartDate && customEndDate) {
        loadAnalyticsData()
      }
    } else {
      // For preset ranges, load immediately
      loadAnalyticsData()
    }

    // Cleanup: Cancel all pending requests on unmount or when dependencies change
    return () => {
      cancelAll()
    }
  }, [selectedTimeRange, customStartDate, customEndDate, itemLimit])

  const loadAnalyticsData = async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      // Get user session
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        throw new Error('No active session')
      }

      const authHeader = `Bearer ${session.data.session.access_token}`
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

      // Helper function to call Edge Function with timeout and cancellation support
      const callEdgeFunction = async (action: string, params: Record<string, string> = {}) => {
        const queryParams = new URLSearchParams({ action, ...params }).toString()
        const functionUrl = `${supabaseUrl}/functions/v1/admin-auth-manager?${queryParams}`
        
        try {
          // Use fetchCancellable with timeout (15s default)
          const response = await fetchCancellable(
            `analytics-${action}`,
            functionUrl,
            {
              method: 'GET',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
              },
              timeout: 20000, // 20 second timeout for analytics
              retries: 1 // Only 1 retry for analytics
            }
          )
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }))
            throw new ApiError(
              errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
              response.status
            )
          }
          
          const responseData = await response.json()
          
          if (responseData.error) {
            throw new Error(responseData.error.message || 'Request failed')
          }
          
          return responseData.data
        } catch (error: any) {
          // Handle timeout specifically
          if (error instanceof ApiError && error.statusCode === 408) {
            logWarn('Analytics request timed out', {
              action,
              params,
              timeout: '20s'
            })
            throw new Error('Request timed out. Please try again or select a smaller date range.')
          }
          
          // Log other errors
          if (error.name !== 'AbortError') {
            logError('Analytics API call failed', error, {
              action,
              params
            })
          }
          
          throw error
        }
      }

      // Calculate days based on selected range
      let daysParam: string
      if (selectedTimeRange === 'custom') {
        if (!customStartDate || !customEndDate) {
          throw new Error('Please select both start and end dates')
        }
        const start = new Date(customStartDate)
        const end = new Date(customEndDate)
        const diffTime = Math.abs(end.getTime() - start.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        daysParam = diffDays.toString()
      } else {
        daysParam = selectedTimeRange.toString()
      }

      // Load all analytics data in parallel using Edge Function
      const [analytics, trends, topDL] = await Promise.all([
        callEdgeFunction('download-analytics', { days: daysParam }),
        callEdgeFunction('download-trends', { days: daysParam }),
        callEdgeFunction('top-downloads', { days: daysParam, limit: itemLimit.toString() })
      ])

      if (!analytics || !trends || !topDL) {
        throw new Error('Invalid response from server')
      }

      setAnalyticsData(analytics)
      setTrendsData(trends)
      setTopDownloads(topDL)

      if (forceRefresh) {
        toast.success('Analytics data refreshed successfully!')
      }
    } catch (error: any) {
      // Don't show error if request was cancelled (user navigated away)
      if (error.name === 'AbortError') {
        return
      }

      const errorMessage = error.message || 'An unexpected error occurred'
      
      // Log the error with context
      logError('Failed to load analytics data', error, {
        timeRange: selectedTimeRange,
        customDates: selectedTimeRange === 'custom' ? { start: customStartDate, end: customEndDate } : null,
        itemLimit,
        forceRefresh
      })
      
      setError(errorMessage)
      
      // Show user-friendly toast
      if (error instanceof ApiError && error.statusCode === 408) {
        toast.error('Request timed out. Try a smaller date range or refresh.')
      } else {
        toast.error(`Failed to load analytics: ${errorMessage}`)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleTimeRangeChange = (value: number | string) => {
    setSelectedTimeRange(value)
    
    // Update URL params
    const params = new URLSearchParams(searchParams)
    params.set('range', value.toString())
    
    if (value === 'custom') {
      // Set default dates if not already set (last 7 days to today)
      let startDate = customStartDate
      let endDate = customEndDate
      
      if (!startDate || !endDate) {
        const end = new Date()
        const start = new Date()
        start.setDate(start.getDate() - 7)
        
        startDate = start.toISOString().split('T')[0]
        endDate = end.toISOString().split('T')[0]
        
        setCustomStartDate(startDate)
        setCustomEndDate(endDate)
      }
      
      params.set('start', startDate)
      params.set('end', endDate)
    } else {
      params.delete('start')
      params.delete('end')
    }
    
    setSearchParams(params)
  }

  const handleCustomDateChange = (start: string, end: string) => {
    setCustomStartDate(start)
    setCustomEndDate(end)
    
    // Update URL params
    const params = new URLSearchParams(searchParams)
    params.set('range', 'custom')
    params.set('start', start)
    params.set('end', end)
    setSearchParams(params)
  }

  const handleItemLimitChange = (limit: number) => {
    setItemLimit(limit)
    
    // Update URL params
    const params = new URLSearchParams(searchParams)
    params.set('limit', limit.toString())
    setSearchParams(params)
  }

  const handleExportCSV = () => {
    try {
      // Prepare CSV data
      const csvRows: string[] = []
      
      // Add header
      csvRows.push('Date Range,Metric,Value')
      
      // Add summary stats
      const dateRangeLabel = selectedTimeRange === 'custom' 
        ? `${customStartDate} to ${customEndDate}`
        : `Last ${selectedTimeRange} days`
      
      if (analyticsData) {
        csvRows.push(`${dateRangeLabel},Total Downloads,${analyticsData.total}`)
        csvRows.push(`${dateRangeLabel},Guest Downloads,${analyticsData.guest}`)
        csvRows.push(`${dateRangeLabel},Free User Downloads,${analyticsData.free}`)
        csvRows.push(`${dateRangeLabel},Premium Downloads,${analyticsData.premium}`)
        csvRows.push('')
      }
      
      // Add trends data
      csvRows.push('Date,Guest,Free Users,Premium,Total')
      trendsData.forEach(trend => {
        csvRows.push(`${trend.date},${trend.guest},${trend.free},${trend.premium},${trend.total}`)
      })
      csvRows.push('')
      
      // Add top downloads
      csvRows.push('Rank,Wallpaper ID,Title,Downloads,Has Video')
      topDownloads.forEach((item, index) => {
        const title = item.wallpapers.title.replace(/,/g, ';') // Escape commas
        const hasVideo = item.wallpapers.video_url ? 'Yes' : 'No'
        csvRows.push(`${index + 1},${item.wallpaper_id},"${title}",${item.count},${hasVideo}`)
      })
      
      // Create CSV content
      const csvContent = csvRows.join('\n')
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      // Set filename with current date
      const today = new Date().toISOString().split('T')[0]
      link.setAttribute('href', url)
      link.setAttribute('download', `analytics-${today}.csv`)
      link.style.visibility = 'hidden'
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('Analytics data exported successfully!')
    } catch (error: any) {
      console.error('Error exporting CSV:', error)
      toast.error('Failed to export CSV')
    }
  }

  const handleRefresh = () => {
    loadAnalyticsData(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString()
  }

  const StatCard = ({ title, value, icon: Icon, color, change }: {
    title: string
    value: number
    icon: React.ElementType
    color: string
    change?: string
  }) => (
    <div className="bg-theme-surface rounded-lg border border-theme-light p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-theme-secondary">{title}</p>
          <p className="text-2xl font-bold text-theme-primary">{formatNumber(value)}</p>
          {change && (
            <p className="text-sm text-green-600 mt-1">{change}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )

  if (loading && !refreshing) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <div className="h-8 bg-theme-light rounded animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-theme-light rounded animate-pulse"></div>
            ))}
          </div>
          <div className="h-64 bg-theme-light rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 font-medium mb-2">Failed to Load Analytics</div>
          <div className="text-red-500 text-sm mb-4">{error}</div>
          <button
            onClick={() => loadAnalyticsData(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const pieData = analyticsData ? [
    { name: 'Guest', value: analyticsData.guest, color: COLORS.guest },
    { name: 'Free Users', value: analyticsData.free, color: COLORS.free },
    { name: 'Premium Users', value: analyticsData.premium, color: COLORS.premium }
  ] : []

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-theme-primary mb-2">Download Analytics</h2>
            <p className="text-theme-secondary">
              Comprehensive breakdown of download statistics by user type
            </p>
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

      {/* Time Range Selector */}
      <div className="mb-6">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-theme-secondary" />
              <span className="text-sm font-medium text-theme-primary">Time Range:</span>
            </div>
            <div className="flex space-x-2">
              {TIME_RANGES.map((range) => (
                <button
                  key={range.value}
                  onClick={() => handleTimeRangeChange(range.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedTimeRange === range.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-theme-light text-theme-secondary hover:bg-theme-surface'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Custom Date Range Inputs */}
          {selectedTimeRange === 'custom' && (
            <div className="flex items-center space-x-4 ml-11">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-theme-primary">Start Date:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => handleCustomDateChange(e.target.value, customEndDate)}
                  max={new Date().toISOString().split('T')[0]}
                  className="px-3 py-2 border border-theme-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-theme-surface text-theme-primary"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-theme-primary">End Date:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => handleCustomDateChange(customStartDate, e.target.value)}
                  min={customStartDate}
                  max={new Date().toISOString().split('T')[0]}
                  className="px-3 py-2 border border-theme-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-theme-surface text-theme-primary"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {analyticsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Downloads"
            value={analyticsData.total}
            icon={Download}
            color="bg-green-500"
          />
          <StatCard
            title="Guest Downloads"
            value={analyticsData.guest}
            icon={Users}
            color="bg-slate-500"
          />
          <StatCard
            title="Free User Downloads"
            value={analyticsData.free}
            icon={Users}
            color="bg-blue-500"
          />
          <StatCard
            title="Premium Downloads"
            value={analyticsData.premium}
            icon={Crown}
            color="bg-yellow-500"
          />
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Trend Chart */}
        <div className="bg-theme-surface rounded-lg border border-theme-light p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-theme-primary flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Download Trends
            </h3>
            <span className="text-sm text-theme-secondary">
              Last {selectedTimeRange} days
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendsData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  className="text-theme-secondary"
                />
                <YAxis className="text-theme-secondary" />
                <Tooltip 
                  labelFormatter={(value) => `Date: ${formatDate(value)}`}
                  formatter={(value: number, name: string) => [formatNumber(value), name]}
                />
                <Legend />
                <Line type="monotone" dataKey="guest" stroke={COLORS.guest} name="Guest" strokeWidth={2} />
                <Line type="monotone" dataKey="free" stroke={COLORS.free} name="Free Users" strokeWidth={2} />
                <Line type="monotone" dataKey="premium" stroke={COLORS.premium} name="Premium" strokeWidth={2} />
                <Line type="monotone" dataKey="total" stroke={COLORS.total} name="Total" strokeWidth={3} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-theme-surface rounded-lg border border-theme-light p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-theme-primary flex items-center">
              <PieChartIcon className="w-5 h-5 mr-2" />
              User Type Distribution
            </h3>
            <span className="text-sm text-theme-secondary">
              {formatNumber(analyticsData?.total || 0)} total
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatNumber(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Downloads Table */}
      <div className="bg-theme-surface rounded-lg border border-theme-light overflow-hidden">
        <div className="p-6 border-b border-theme-light">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-theme-primary flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Top Downloads ({selectedTimeRange === 'custom' ? 'Custom Range' : `Last ${selectedTimeRange} days`})
            </h3>
            <div className="flex items-center space-x-4">
              {/* Item Limit Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-theme-secondary">Show:</span>
                {ITEM_LIMITS.map((limit) => (
                  <button
                    key={limit}
                    onClick={() => handleItemLimitChange(limit)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      itemLimit === limit
                        ? 'bg-blue-600 text-white'
                        : 'bg-theme-light text-theme-secondary hover:bg-theme-surface'
                    }`}
                  >
                    {limit}
                  </button>
                ))}
              </div>
              {/* Export CSV Button */}
              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <FileDown className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-theme-light">
              <tr>
                <th className="p-4 text-left text-sm font-medium text-theme-secondary">Rank</th>
                <th className="p-4 text-left text-sm font-medium text-theme-secondary">Wallpaper</th>
                <th className="p-4 text-left text-sm font-medium text-theme-secondary">Downloads</th>
                <th className="p-4 text-left text-sm font-medium text-theme-secondary">Type</th>
              </tr>
            </thead>
            <tbody>
              {topDownloads.map((item, index) => (
                <tr key={item.wallpaper_id} className="border-b border-theme-light hover:bg-theme-light transition-colors">
                  <td className="p-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                      {index + 1}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={item.wallpapers.image_url}
                        alt={item.wallpapers.title}
                        className="w-12 h-12 rounded-lg object-cover"
                        loading="lazy"
                      />
                      <div>
                        <div className="font-medium text-theme-primary truncate max-w-xs">
                          {item.wallpapers.title}
                        </div>
                        <div className="text-sm text-theme-secondary">
                          ID: {item.wallpaper_id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-lg font-semibold text-theme-primary">
                      {formatNumber(item.count)}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      {item.wallpapers.video_url && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Video
                        </span>
                      )}
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Image
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {topDownloads.length === 0 && !loading && (
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 text-theme-secondary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-theme-primary mb-2">No download data</h3>
          <p className="text-theme-secondary">
            No downloads found for the selected time period.
          </p>
        </div>
      )}
    </div>
  )
}

export default ComprehensiveAnalyticsDashboard