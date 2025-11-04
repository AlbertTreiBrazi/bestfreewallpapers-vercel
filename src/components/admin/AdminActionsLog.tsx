import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'
import { 
  Activity, 
  Download, 
  Filter, 
  Search, 
  Calendar, 
  User, 
  Settings, 
  Trash2, 
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileDown,
  Plus,
  Mail
} from 'lucide-react'
import toast from 'react-hot-toast'

interface AdminAction {
  id: number
  admin_id: string
  admin_email: string
  user_id?: string
  user_email?: string
  action_type: string
  action_details: any
  duration_days?: number
  notes?: string
  timestamp: string
  ip_address?: string
}

interface Filters {
  admin_email: string
  user_email: string
  action_type: string
  start_date: string
  end_date: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

interface BulkPromoData {
  emails: string
  duration_days: number
  notes: string
}

export function AdminActionsLog() {
  const { profile } = useAuth()
  const { theme } = useTheme()
  const [actions, setActions] = useState<AdminAction[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    admin_email: '',
    user_email: '',
    action_type: 'all',
    start_date: '',
    end_date: ''
  })
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  })
  const [showFilters, setShowFilters] = useState(false)
  const [showBulkPromo, setShowBulkPromo] = useState(false)
  const [bulkPromoData, setBulkPromoData] = useState<BulkPromoData>({
    emails: '',
    duration_days: 7,
    notes: ''
  })
  const [processingBulk, setProcessingBulk] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const isSuperAdmin = profile?.admin_role === 'super_admin'
  const isAdmin = profile?.is_admin === true

  useEffect(() => {
    if (isAdmin) {
      loadActions()
    }
  }, [isAdmin, pagination.page, filters])

  const loadActions = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const params = new URLSearchParams({
        action: 'list',
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      })

      if (filters.admin_email) params.append('admin_email', filters.admin_email)
      if (filters.user_email) params.append('user_email', filters.user_email)
      if (filters.action_type !== 'all') params.append('action_type', filters.action_type)
      if (filters.start_date) params.append('start_date', filters.start_date)
      if (filters.end_date) params.append('end_date', filters.end_date)

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-actions-log?${params}`, {
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
      setActions(result.data)
      setPagination(result.pagination)

      if (isRefresh) {
        toast.success('Admin actions log refreshed')
      }
    } catch (error: any) {
      console.error('Error loading admin actions:', error)
      toast.error(`Failed to load admin actions: ${error.message}`)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const exportToCSV = async () => {
    if (!isSuperAdmin) {
      toast.error('CSV export is only available to super admins')
      return
    }

    try {
      const params = new URLSearchParams({
        action: 'export'
      })

      if (filters.admin_email) params.append('admin_email', filters.admin_email)
      if (filters.user_email) params.append('user_email', filters.user_email)
      if (filters.action_type !== 'all') params.append('action_type', filters.action_type)
      if (filters.start_date) params.append('start_date', filters.start_date)
      if (filters.end_date) params.append('end_date', filters.end_date)

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-actions-log?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `admin-actions-log-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Admin actions log exported successfully')
    } catch (error: any) {
      console.error('Error exporting admin actions:', error)
      toast.error(`Failed to export admin actions: ${error.message}`)
    }
  }

  const deleteAction = async (id: number) => {
    if (!isSuperAdmin) {
      toast.error('Only super admins can delete log entries')
      return
    }

    if (!confirm('Are you sure you want to delete this admin action log entry? This action cannot be undone.')) {
      return
    }

    setDeletingId(id)
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-actions-log?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      toast.success('Admin action log entry deleted successfully')
      loadActions()
    } catch (error: any) {
      console.error('Error deleting admin action:', error)
      toast.error(`Failed to delete admin action: ${error.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  const processBulkPromo = async () => {
    if (!bulkPromoData.emails.trim()) {
      toast.error('Please enter at least one email address')
      return
    }

    const emails = bulkPromoData.emails
      .split('\n')
      .map(email => email.trim())
      .filter(email => email.length > 0)

    if (emails.length === 0) {
      toast.error('No valid email addresses found')
      return
    }

    if (!confirm(`Grant ${bulkPromoData.duration_days} days of premium access to ${emails.length} users?`)) {
      return
    }

    setProcessingBulk(true)
    let successCount = 0
    let errorCount = 0

    try {
      for (const email of emails) {
        try {
          // Grant premium to user
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-dashboard`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: 'grant-manual-premium-by-email',
              email: email,
              duration_days: bulkPromoData.duration_days,
              notes: bulkPromoData.notes
            })
          })

          if (response.ok) {
            successCount++
          } else {
            errorCount++
          }
        } catch (error) {
          errorCount++
        }
      }

      // Log bulk action
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-actions-log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action_type: 'bulk_premium_grant',
          action_details: {
            total_emails: emails.length,
            success_count: successCount,
            error_count: errorCount,
            emails: emails
          },
          duration_days: bulkPromoData.duration_days,
          notes: `Bulk premium grant: ${bulkPromoData.notes}`
        })
      })

      toast.success(`Bulk operation completed: ${successCount} successful, ${errorCount} failed`)
      setShowBulkPromo(false)
      setBulkPromoData({ emails: '', duration_days: 7, notes: '' })
      loadActions()
    } catch (error: any) {
      console.error('Error processing bulk promotion:', error)
      toast.error(`Failed to process bulk promotion: ${error.message}`)
    } finally {
      setProcessingBulk(false)
    }
  }

  const resetFilters = () => {
    setFilters({
      admin_email: '',
      user_email: '',
      action_type: 'all',
      start_date: '',
      end_date: ''
    })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'grant_premium':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'revoke_premium':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'role_change':
        return <Settings className="w-4 h-4 text-blue-500" />
      case 'admin_created':
        return <Plus className="w-4 h-4 text-purple-500" />
      case 'admin_deleted':
        return <Trash2 className="w-4 h-4 text-red-500" />
      case 'bulk_premium_grant':
        return <Mail className="w-4 h-4 text-orange-500" />
      default:
        return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'grant_premium':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'revoke_premium':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'role_change':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'admin_created':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'admin_deleted':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'bulk_premium_grant':
        return 'bg-orange-50 text-orange-700 border-orange-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const formatActionType = (actionType: string) => {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-primary">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-theme-tertiary" />
          <h1 className="text-2xl font-bold mb-2 text-theme-primary">Admin Access Required</h1>
          <p className="text-theme-secondary">You need admin privileges to access admin actions log.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg shadow overflow-hidden bg-theme-surface border border-theme-light">
      {/* Header */}
      <div className="px-6 py-4 border-b border-theme-light">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h2 className="text-lg font-semibold text-theme-primary flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Admin Actions Log</span>
            </h2>
            <p className="text-sm text-theme-secondary mt-1">
              Comprehensive tracking of all administrative actions
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {refreshing && (
              <div className="flex items-center space-x-2 text-blue-600">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">Refreshing...</span>
              </div>
            )}
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                showFilters 
                  ? 'bg-blue-100 text-blue-700' 
                  : `${theme === 'light' ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-theme-muted hover:bg-theme-light text-theme-primary'}`
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
            
            <button
              onClick={() => setShowBulkPromo(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Bulk Promo</span>
            </button>
            
            {isSuperAdmin && (
              <button
                onClick={exportToCSV}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <FileDown className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            )}
            
            <button
              onClick={() => loadActions(true)}
              disabled={refreshing}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                refreshing 
                  ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400' 
                  : `${theme === 'light' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="px-6 py-4 bg-theme-muted border-b border-theme-light">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">
                Admin Email
              </label>
              <input
                type="text"
                value={filters.admin_email}
                onChange={(e) => setFilters(prev => ({ ...prev, admin_email: e.target.value }))}
                placeholder="Filter by admin email..."
                className="w-full px-3 py-2 border border-theme-light rounded-lg bg-theme-surface text-theme-primary focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">
                User Email
              </label>
              <input
                type="text"
                value={filters.user_email}
                onChange={(e) => setFilters(prev => ({ ...prev, user_email: e.target.value }))}
                placeholder="Filter by user email..."
                className="w-full px-3 py-2 border border-theme-light rounded-lg bg-theme-surface text-theme-primary focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">
                Action Type
              </label>
              <select
                value={filters.action_type}
                onChange={(e) => setFilters(prev => ({ ...prev, action_type: e.target.value }))}
                className="w-full px-3 py-2 border border-theme-light rounded-lg bg-theme-surface text-theme-primary focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Actions</option>
                <option value="grant_premium">Grant Premium</option>
                <option value="revoke_premium">Revoke Premium</option>
                <option value="role_change">Role Change</option>
                <option value="admin_created">Admin Created</option>
                <option value="admin_deleted">Admin Deleted</option>
                <option value="bulk_premium_grant">Bulk Premium Grant</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full px-3 py-2 border border-theme-light rounded-lg bg-theme-surface text-theme-primary focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full px-3 py-2 border border-theme-light rounded-lg bg-theme-surface text-theme-primary focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="mt-4 flex items-center space-x-3">
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-theme-light hover:bg-theme-muted text-theme-primary rounded-lg transition-colors"
            >
              Reset Filters
            </button>
            <span className="text-sm text-theme-secondary">
              Showing {pagination.total} total actions
            </span>
          </div>
        </div>
      )}

      {/* Actions Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-theme-light">
          <thead className="bg-theme-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-theme-secondary">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-theme-secondary">
                Admin
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-theme-secondary">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-theme-secondary">
                Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-theme-secondary">
                Timestamp
              </th>
              {isSuperAdmin && (
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-theme-secondary">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-theme-surface divide-y divide-theme-light">
            {loading && actions.length === 0 ? (
              <tr>
                <td colSpan={isSuperAdmin ? 6 : 5} className="px-6 py-8 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-theme-secondary" />
                    <span className="text-theme-secondary">Loading admin actions...</span>
                  </div>
                </td>
              </tr>
            ) : actions.length === 0 ? (
              <tr>
                <td colSpan={isSuperAdmin ? 6 : 5} className="px-6 py-8 text-center">
                  <div className="text-center">
                    <Activity className="w-12 h-12 mx-auto mb-4 text-theme-tertiary" />
                    <h3 className="text-lg font-medium text-theme-primary mb-2">No Actions Found</h3>
                    <p className="text-theme-secondary">
                      {Object.values(filters).some(v => v && v !== 'all') 
                        ? 'No admin actions match the current filters.'
                        : 'No admin actions have been logged yet.'
                      }
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              actions.map((action) => (
                <tr key={action.id} className="hover:bg-theme-light">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      {getActionIcon(action.action_type)}
                      <div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                          getActionColor(action.action_type)
                        }`}>
                          {formatActionType(action.action_type)}
                        </span>
                        {action.duration_days && (
                          <div className="text-xs text-theme-secondary mt-1">
                            {action.duration_days} days
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-theme-primary">
                      {action.admin_email}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-theme-primary">
                      {action.user_email || 'N/A'}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm text-theme-primary">
                      {action.notes && (
                        <div className="mb-1">{action.notes}</div>
                      )}
                      {action.action_details && Object.keys(action.action_details).length > 0 && (
                        <div className="text-xs text-theme-secondary bg-theme-muted rounded px-2 py-1">
                          {JSON.stringify(action.action_details, null, 2)}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-theme-primary">
                      {new Date(action.timestamp).toLocaleString()}
                    </div>
                  </td>
                  
                  {isSuperAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => deleteAction(action.id)}
                        disabled={deletingId === action.id}
                        className={`text-red-600 hover:text-red-900 ${
                          deletingId === action.id ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {deletingId === action.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="px-6 py-4 border-t border-theme-light">
          <div className="flex items-center justify-between">
            <div className="text-sm text-theme-secondary">
              Showing page {pagination.page} of {pagination.pages} ({pagination.total} total actions)
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-2 bg-theme-muted hover:bg-theme-light text-theme-primary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <span className="px-3 py-2 text-sm text-theme-primary">
                {pagination.page} / {pagination.pages}
              </span>
              
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-2 bg-theme-muted hover:bg-theme-light text-theme-primary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Promo Modal */}
      {showBulkPromo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-theme-surface rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-theme-light">
              <h3 className="text-lg font-semibold text-theme-primary">Bulk Premium Grant</h3>
              <p className="text-sm text-theme-secondary mt-1">
                Grant premium access to multiple users
              </p>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Email Addresses (one per line)
                </label>
                <textarea
                  value={bulkPromoData.emails}
                  onChange={(e) => setBulkPromoData(prev => ({ ...prev, emails: e.target.value }))}
                  placeholder="user1@example.com\nuser2@example.com\nuser3@example.com"
                  rows={6}
                  className="w-full px-3 py-2 border border-theme-light rounded-lg bg-theme-surface text-theme-primary focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Duration (Days)
                </label>
                <select
                  value={bulkPromoData.duration_days}
                  onChange={(e) => setBulkPromoData(prev => ({ ...prev, duration_days: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-theme-light rounded-lg bg-theme-surface text-theme-primary focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={365}>365 days</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Notes
                </label>
                <input
                  type="text"
                  value={bulkPromoData.notes}
                  onChange={(e) => setBulkPromoData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Reason for bulk grant..."
                  className="w-full px-3 py-2 border border-theme-light rounded-lg bg-theme-surface text-theme-primary focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-theme-light flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowBulkPromo(false)}
                disabled={processingBulk}
                className="px-4 py-2 bg-theme-muted hover:bg-theme-light text-theme-primary rounded-lg transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={processBulkPromo}
                disabled={processingBulk || !bulkPromoData.emails.trim()}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  processingBulk || !bulkPromoData.emails.trim()
                    ? 'opacity-50 cursor-not-allowed bg-theme-muted'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {processingBulk && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>{processingBulk ? 'Processing...' : 'Grant Premium'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminActionsLog