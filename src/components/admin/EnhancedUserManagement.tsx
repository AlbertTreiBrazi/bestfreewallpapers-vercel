import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { Users, Search, Crown, Calendar, Mail, User, ChevronLeft, ChevronRight, MoreHorizontal, Shield, Edit, Trash2, Plus, Filter, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface EnhancedUser {
  id: string
  user_id: string
  email: string
  full_name: string
  plan_type: string
  premium_expires_at: string | null
  premium_purchase_date?: string | null
  is_admin: boolean
  admin_role?: string
  created_at: string
  subscription_tier?: string
  subscription_status?: string
  is_premium_active?: boolean
  premium_days_remaining?: number
  role_display_name?: string
  has_video_download?: boolean
}

interface UserFilters {
  search: string
  planType: 'all' | 'free' | 'premium'
  adminStatus: 'all' | 'admin' | 'user'
  hasVideoDownload: 'all' | 'true' | 'false'
}

interface PaginationInfo {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export function EnhancedUserManagement() {
  const { theme } = useTheme()
  const { profile: currentUserProfile } = useAuth()
  const [users, setUsers] = useState<EnhancedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [editingUser, setEditingUser] = useState<EnhancedUser | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedPremiumDuration, setSelectedPremiumDuration] = useState<string>('')
  
  // Filters and Search
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    planType: 'all',
    adminStatus: 'all',
    hasVideoDownload: 'all'
  })
  
  // Pagination
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50, // Increased from 20 to 50 to show more users
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })

  useEffect(() => {
    loadUsers()
  }, [filters, pagination.page])

  const loadUsers = async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    
    try {
      // Call Edge Function to get all users securely
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        throw new Error('No active session')
      }

      // Use native fetch to properly pass query parameters
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const functionUrl = `${supabaseUrl}/functions/v1/admin-auth-manager?action=list-users&page=${pagination.page}&limit=${pagination.limit}`

      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }))
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const responseData = await response.json()

      if (responseData.error) {
        throw new Error(responseData.error.message || 'Failed to fetch users')
      }

      const result = responseData.data
      
      let users = result.users || []
      
      // Apply client-side filters
      if (filters.search.trim()) {
        const searchTerm = filters.search.toLowerCase().trim()
        users = users.filter(user => 
          user.email?.toLowerCase().includes(searchTerm) ||
          user.profile?.full_name?.toLowerCase().includes(searchTerm)
        )
      }
      
      if (filters.planType !== 'all') {
        users = users.filter(user => user.profile?.plan_type === filters.planType)
      }
      
      if (filters.adminStatus !== 'all') {
        const isAdmin = filters.adminStatus === 'admin'
        users = users.filter(user => !!user.profile?.is_admin === isAdmin)
      }
      
      if (filters.hasVideoDownload !== 'all') {
        const hasVideo = filters.hasVideoDownload === 'true'
        users = users.filter(user => !!user.profile?.has_video_download === hasVideo)
      }
      
      // Transform users to match the expected format
      const enhancedUsers = users.map(user => {
        const profile = user.profile || {}
        const isPremiumActive = profile.plan_type === 'premium' && 
                               (!profile.premium_expires_at || new Date(profile.premium_expires_at) > new Date())
        
        const premiumDaysRemaining = profile.premium_expires_at ? 
            Math.max(0, Math.ceil((new Date(profile.premium_expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 0
        
        return {
          id: user.id,
          user_id: user.user_id,
          email: user.email,
          full_name: profile.full_name || '',
          plan_type: profile.plan_type || 'free',
          premium_expires_at: profile.premium_expires_at,
          is_admin: profile.is_admin || false,
          admin_role: profile.admin_role || '',
          created_at: user.created_at,
          is_premium_active: isPremiumActive,
          premium_days_remaining: premiumDaysRemaining,
          role_display_name: profile.admin_role || (profile.is_admin ? 'Admin' : 'User'),
          has_video_download: profile.has_video_download || false
        }
      })
      
      setUsers(enhancedUsers)
      
      setPagination(prev => ({
        ...prev,
        totalCount: result.totalCount,
        totalPages: result.totalPages
      }))
      
      if (forceRefresh) {
        toast.success('User data refreshed successfully!')
      }
    } catch (error: any) {
      console.error('Error loading users:', error)
      setError(error.message)
      toast.error(`Failed to load users: ${error.message}`)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
  }

  const handleFilterChange = (key: keyof UserFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }))
    }
  }

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  const selectAllUsers = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(users.map(user => user.user_id)))
    }
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      planType: 'all',
      adminStatus: 'all',
      hasVideoDownload: 'all'
    })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.search.trim()) count++
    if (filters.planType !== 'all') count++
    if (filters.adminStatus !== 'all') count++
    if (filters.hasVideoDownload !== 'all') count++
    return count
  }

  const handleEditUser = (user: EnhancedUser) => {
    setEditingUser({ ...user })
    setSelectedPremiumDuration('')
    setShowEditModal(true)
  }

  const calculatePremiumExpiry = (duration: string): string => {
    const now = new Date()
    const expiry = new Date(now)
    
    switch (duration) {
      case '7days':
        expiry.setDate(now.getDate() + 7)
        break
      case '1month':
        expiry.setDate(now.getDate() + 30)
        break
      case '6months':
        expiry.setDate(now.getDate() + 180)
        break
      case '1year':
        expiry.setDate(now.getDate() + 365)
        break
      default:
        return ''
    }
    
    return expiry.toISOString()
  }

  const handlePremiumDurationChange = (duration: string) => {
    setSelectedPremiumDuration(duration)
    
    if (duration && editingUser) {
      const expiryDate = calculatePremiumExpiry(duration)
      setEditingUser(prev => prev ? {
        ...prev,
        plan_type: 'premium',
        premium_expires_at: expiryDate,
        is_premium_active: true
      } : null)
    }
  }

  const handleSaveUser = async () => {
    if (!editingUser) return
    
    try {
      // Prepare update data
      const updateData: any = {
        is_admin: editingUser.is_admin,
        plan_type: editingUser.plan_type,
        has_video_download: editingUser.has_video_download,
        full_name: editingUser.full_name
      }
      
      // Add premium expiry date if premium duration was selected
      if (selectedPremiumDuration && editingUser.premium_expires_at) {
        updateData.premium_expires_at = editingUser.premium_expires_at
      }
      
      // Update the user profile in the database
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', editingUser.user_id)
      
      if (error) {
        console.error('Error updating user:', error)
        toast.error('Failed to update user')
        return
      }
      
      // Update the local state
      setUsers(prev => prev.map(user => 
        user.user_id === editingUser.user_id 
          ? { ...user, ...editingUser }
          : user
      ))
      
      setShowEditModal(false)
      setEditingUser(null)
      setSelectedPremiumDuration('')
      
      if (selectedPremiumDuration) {
        toast.success(`User updated successfully! Premium access granted for ${selectedPremiumDuration === '7days' ? '7 days' : selectedPremiumDuration === '1month' ? '1 month' : selectedPremiumDuration === '6months' ? '6 months' : '1 year'}.`)
      } else {
        toast.success('User updated successfully!')
      }
      
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('Failed to update user')
    }
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditingUser(null)
    setSelectedPremiumDuration('')
  }


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getUserStatusBadge = (user: EnhancedUser) => {
    if (user.is_admin) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">
          <Shield className="w-3 h-3 mr-1" />
          {user.admin_role || 'Admin'}
        </span>
      )
    }
    
    if (user.is_premium_active) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800">
          <Crown className="w-3 h-3 mr-1" />
          Premium ({user.premium_days_remaining}d left)
        </span>
      )
    }
    
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <User className="w-3 h-3 mr-1" />
        Free
      </span>
    )
  }

  if (loading && !refreshing) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <div className="h-8 bg-theme-light rounded animate-pulse"></div>
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-16 bg-theme-light rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <div className="text-red-600 font-medium mb-2">Failed to Load Users</div>
          <div className="text-red-500 text-sm mb-4">{error}</div>
          <button
            onClick={() => loadUsers(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-theme-primary mb-2">User Management</h2>
            <p className="text-theme-secondary">
              Total: {pagination.totalCount.toLocaleString()} users
              {selectedUsers.size > 0 && (
                <span className="ml-2 text-blue-600">({selectedUsers.size} selected)</span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => loadUsers(true)}
              disabled={refreshing}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                theme === 'light' 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600' 
                  : 'bg-theme-primary text-white hover:bg-theme-secondary'
              }`}
            >
              <Users className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-secondary w-5 h-5" />
          <input
            type="text"
            placeholder="Search by email or name..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-theme-light rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-theme-surface text-theme-primary"
          />
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              showFilters || getActiveFilterCount() > 0
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200'
                : 'bg-theme-light text-theme-secondary hover:bg-theme-surface'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {getActiveFilterCount() > 0 && (
              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                {getActiveFilterCount()}
              </span>
            )}
          </button>
          
          {getActiveFilterCount() > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center space-x-1 px-3 py-1 text-sm text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-theme-surface border border-theme-light rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Plan Type Filter */}
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-2">Plan Type</label>
                <select
                  value={filters.planType}
                  onChange={(e) => handleFilterChange('planType', e.target.value)}
                  className="w-full p-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-blue-500 bg-theme-surface text-theme-primary"
                >
                  <option value="all">All Plans</option>
                  <option value="free">Free</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              {/* Admin Status Filter */}
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-2">Admin Status</label>
                <select
                  value={filters.adminStatus}
                  onChange={(e) => handleFilterChange('adminStatus', e.target.value)}
                  className="w-full p-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-blue-500 bg-theme-surface text-theme-primary"
                >
                  <option value="all">All Users</option>
                  <option value="admin">Admins Only</option>
                  <option value="user">Regular Users</option>
                </select>
              </div>

              {/* Video Download Filter */}
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-2">Video Downloads</label>
                <select
                  value={filters.hasVideoDownload}
                  onChange={(e) => handleFilterChange('hasVideoDownload', e.target.value)}
                  className="w-full p-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-blue-500 bg-theme-surface text-theme-primary"
                >
                  <option value="all">All</option>
                  <option value="true">Has Video Downloads</option>
                  <option value="false">No Video Downloads</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-theme-surface rounded-lg border border-theme-light overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-theme-light">
              <tr>
                <th className="p-4 text-left">
                  <input
                    type="checkbox"
                    checked={users.length > 0 && selectedUsers.size === users.length}
                    onChange={selectAllUsers}
                    className="rounded border-theme-light"
                  />
                </th>
                <th className="p-4 text-left text-sm font-medium text-theme-secondary">User</th>
                <th className="p-4 text-left text-sm font-medium text-theme-secondary">Status</th>
                <th className="p-4 text-left text-sm font-medium text-theme-secondary">Joined</th>
                <th className="p-4 text-left text-sm font-medium text-theme-secondary">Video Downloads</th>
                <th className="p-4 text-left text-sm font-medium text-theme-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.user_id} className="border-b border-theme-light hover:bg-theme-light transition-colors">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.user_id)}
                      onChange={() => toggleUserSelection(user.user_id)}
                      className="rounded border-theme-light"
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-theme-primary">{user.email}</div>
                        {user.full_name && (
                          <div className="text-sm text-theme-secondary">{user.full_name}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {getUserStatusBadge(user)}
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-theme-primary">{formatDate(user.created_at)}</div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.has_video_download 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.has_video_download ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleEditUser(user)}
                        className="p-1 rounded hover:bg-theme-light transition-colors"
                        title="Edit user"
                      >
                        <Edit className="w-4 h-4 text-theme-secondary" />
                      </button>
                      <button className="p-1 rounded hover:bg-theme-light transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-theme-secondary" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-theme-secondary">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount} users
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="p-2 rounded-lg border border-theme-light disabled:opacity-50 disabled:cursor-not-allowed hover:bg-theme-light transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, pagination.page - 2)) + i
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pageNum === pagination.page
                        ? 'bg-blue-600 text-white'
                        : 'text-theme-secondary hover:bg-theme-light'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="p-2 rounded-lg border border-theme-light disabled:opacity-50 disabled:cursor-not-allowed hover:bg-theme-light transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {users.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-theme-secondary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-theme-primary mb-2">No users found</h3>
          <p className="text-theme-secondary">Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-theme-surface rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-theme-primary mb-4">Edit User</h3>
            
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingUser.full_name || ''}
                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                  className="w-full p-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-blue-500 bg-theme-surface text-theme-primary"
                  placeholder="Enter full name"
                />
              </div>

              {/* Plan Type */}
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-1">Plan Type</label>
                <select
                  value={editingUser.plan_type}
                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, plan_type: e.target.value } : null)}
                  className="w-full p-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-blue-500 bg-theme-surface text-theme-primary"
                >
                  <option value="free">Free</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              {/* Admin Status */}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingUser.is_admin}
                    onChange={(e) => setEditingUser(prev => prev ? { ...prev, is_admin: e.target.checked } : null)}
                    className="rounded border-theme-light"
                  />
                  <span className="text-sm font-medium text-theme-primary">Admin Access</span>
                </label>
              </div>

              {/* Video Download Access */}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingUser.has_video_download}
                    onChange={(e) => setEditingUser(prev => prev ? { ...prev, has_video_download: e.target.checked } : null)}
                    className="rounded border-theme-light"
                  />
                  <span className="text-sm font-medium text-theme-primary">Video Download Access</span>
                </label>
              </div>

              {/* Premium Duration Selector */}
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-2">Grant Premium Access</label>
                <select
                  value={selectedPremiumDuration}
                  onChange={(e) => handlePremiumDurationChange(e.target.value)}
                  className="w-full p-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-blue-500 bg-theme-surface text-theme-primary"
                >
                  <option value="">Select Duration (Optional)</option>
                  <option value="7days">7 Days</option>
                  <option value="1month">1 Month</option>
                  <option value="6months">6 Months</option>
                  <option value="1year">1 Year</option>
                </select>
                {selectedPremiumDuration && (
                  <p className="text-xs text-blue-600 mt-1">
                    Premium access will expire on: {editingUser?.premium_expires_at ? new Date(editingUser.premium_expires_at).toLocaleDateString() : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCloseEditModal}
                className="px-4 py-2 text-theme-secondary hover:text-theme-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  )
}

export default EnhancedUserManagement