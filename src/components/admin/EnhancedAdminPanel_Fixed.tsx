import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'
import { Users, Crown, DollarSign, TrendingUp, Calendar, Settings, CheckCircle, XCircle, Clock, Image as ImageIcon, Megaphone, X, Gauge, Tag, Link, Zap, Server, Trash2, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { WallpaperManagement } from './WallpaperManagement'
import { BannerManagement } from '../premium/BannerManagement'
import { CategoriesManagement } from './CategoriesManagement'
import { CollectionsManagement } from './CollectionsManagement'
import { SlugManagement } from './SlugManagement'
import { AdSettingsManagement } from './AdSettingsManagement'
import { CacheManagement } from './CacheManagement'
import { AnalyticsDashboard } from './AnalyticsDashboard'

interface AdminStats {
  totalUsers: number
  premiumUsers: number
  pendingRequests: number
  totalRevenue: number
  newUsersLast30Days: number
  downloadsLast30Days: number
  totalDownloads: number
  unreadMessages: number
}

interface PremiumRequest {
  id: number
  user_id: string
  email: string
  full_name: string
  plan_type: string
  duration_months: number
  amount_paid: number
  payment_method: string
  payment_proof_url: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  admin_notes: string
}

interface User {
  id: string
  user_id: string
  email: string
  full_name: string
  plan_type: string
  premium_expires_at: string | null
  premium_purchase_date?: string | null
  is_admin: boolean
  created_at: string
}

interface AdminUser {
  id: string
  user_id: string
  email: string
  full_name: string
  is_admin: boolean
  admin_role: string | null
  admin_permissions: any
  role_details?: any
  can_be_deleted?: boolean
  created_at: string
}

interface RateLimitConfig {
  id: string
  setting_name: string
  setting_value: number
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export function EnhancedAdminPanel() {
  const { profile } = useAuth()
  const { theme } = useTheme()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'users' | 'admins' | 'wallpapers' | 'banners' | 'categories' | 'collections' | 'ratelimits' | 'slugs' | 'ads' | 'cache'>('dashboard')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [premiumRequests, setPremiumRequests] = useState<PremiumRequest[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [availableRoles, setAvailableRoles] = useState<any[]>([])
  const [rateLimitConfigs, setRateLimitConfigs] = useState<RateLimitConfig[]>([])
  const [editingRateLimit, setEditingRateLimit] = useState<RateLimitConfig | null>(null)
  const [processingRequest, setProcessingRequest] = useState<number | null>(null)

  // Check if current user is admin
  const isAdmin = profile?.is_admin === true

  useEffect(() => {
    if (isAdmin) {
      loadDashboardData()
    }
  }, [isAdmin, activeTab])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'dashboard') {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-dashboard?action=stats`, {
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
        setStats(result.data)
      } else if (activeTab === 'requests') {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-dashboard?action=premium-requests`, {
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
        setPremiumRequests(result.data)
      } else if (activeTab === 'users') {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-dashboard?action=users`, {
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
        setUsers(result.data)
      } else if (activeTab === 'admins') {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-dashboard?action=admins`, {
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
        setAdminUsers(result.data || [])
        setAvailableRoles(result.availableRoles || [])
      } else if (activeTab === 'ratelimits') {
        const { data, error } = await supabase.functions.invoke('admin-rate-limits', {
          method: 'GET',
          body: { action: 'list' }
        })
        if (error) throw error
        setRateLimitConfigs(data.data || [])
      }
    } catch (error: any) {
      console.error('Error loading data:', error)
      toast.error(`Failed to load dashboard data: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const processPremiumRequest = async (requestId: number, status: 'approved' | 'rejected', adminNotes = '') => {
    setProcessingRequest(requestId)
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-dashboard`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'process-premium-request',
          id: requestId,
          status,
          admin_notes: adminNotes
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
      
      const result = await response.json()
      toast.success(`Request ${status} successfully`)
      loadDashboardData() // Refresh data
    } catch (error: any) {
      console.error('Error processing request:', error)
      toast.error(`Failed to process request: ${error.message}`)
    } finally {
      setProcessingRequest(null)
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-primary">
        <div className="text-center">
          <Settings className="w-16 h-16 mx-auto mb-4 text-theme-tertiary" />
          <h1 className="text-2xl font-bold mb-2 text-theme-primary">Admin Access Required</h1>
          <p className="text-theme-secondary">You need admin privileges to access this panel.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-secondary">
      {/* Header */}
      <div className="shadow bg-theme-card border-b border-theme-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-3">
            <Settings className="w-8 h-8 text-gray-600" />
            <div>
              <h1 className="text-2xl font-bold text-theme-primary">
                Enhanced Admin Dashboard
              </h1>
              <p className="text-theme-secondary">
                Comprehensive management system
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-theme-light">
            {/* Desktop Navigation */}
            <nav className="hidden lg:block -mb-px">
              {/* Content Section */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-theme-secondary mb-3 px-1">Content Management</h3>
                <div className="flex flex-wrap gap-x-8 gap-y-2">
                  {[
                    { id: 'wallpapers', name: 'Free Wallpapers', icon: ImageIcon },
                    { id: 'categories', name: 'Categories', icon: Tag },
                    { id: 'collections', name: 'Collections', icon: ImageIcon },
                    { id: 'slugs', name: 'Slugs', icon: Link },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center space-x-2 py-2 px-3 border-b-2 font-medium text-sm transition-colors rounded-t-lg ${
                        activeTab === tab.id
                          ? 'border-gray-500 text-gray-600 bg-theme-light'
                          : 'border-transparent text-theme-secondary hover:text-theme-primary hover:border-theme-light hover:bg-theme-surface'
                      }`}
                    >
                      <tab.icon className="w-5 h-5" />
                      <span>{tab.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* User Management Section */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-theme-secondary mb-3 px-1">User Management</h3>
                <div className="flex flex-wrap gap-x-8 gap-y-2">
                  {[
                    { id: 'users', name: 'User Management', icon: Users },
                    { id: 'requests', name: 'Premium Requests', icon: Crown },
                    { id: 'admins', name: 'Admin Management', icon: Settings },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center space-x-2 py-2 px-3 border-b-2 font-medium text-sm transition-colors rounded-t-lg ${
                        activeTab === tab.id
                          ? 'border-gray-500 text-gray-600 bg-theme-light'
                          : 'border-transparent text-theme-secondary hover:text-theme-primary hover:border-theme-light hover:bg-theme-surface'
                      }`}
                    >
                      <tab.icon className="w-5 h-5" />
                      <span>{tab.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* System Section */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-theme-secondary mb-3 px-1">System & Performance</h3>
                <div className="flex flex-wrap gap-x-8 gap-y-2">
                  {[
                    { id: 'dashboard', name: 'Dashboard', icon: TrendingUp },
                    { id: 'ratelimits', name: 'Rate Limits', icon: Gauge },
                    { id: 'cache', name: 'Cache & Performance', icon: Server },
                    { id: 'ads', name: 'Ad Settings', icon: Zap },
                    { id: 'banners', name: 'Premium Banners', icon: Megaphone },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center space-x-2 py-2 px-3 border-b-2 font-medium text-sm transition-colors rounded-t-lg ${
                        activeTab === tab.id
                          ? 'border-gray-500 text-gray-600 bg-theme-light'
                          : 'border-transparent text-theme-secondary hover:text-theme-primary hover:border-theme-light hover:bg-theme-surface'
                      }`}
                    >
                      <tab.icon className="w-5 h-5" />
                      <span>{tab.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </nav>
            
            {/* Mobile Navigation - Simple */}
            <div className="lg:hidden">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as any)}
                className="w-full p-3 border border-theme-light rounded-lg bg-theme-surface text-theme-primary"
              >
                <option value="dashboard">Dashboard</option>
                <option value="wallpapers">Free Wallpapers</option>
                <option value="categories">Categories</option>
                <option value="collections">Collections</option>
                <option value="users">User Management</option>
                <option value="requests">Premium Requests</option>
                <option value="admins">Admin Management</option>
                <option value="cache">Cache & Performance</option>
                <option value="ads">Ad Settings</option>
                <option value="banners">Premium Banners</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <AnalyticsDashboard />
        )}

        {/* Wallpapers Tab */}
        {activeTab === 'wallpapers' && (
          <WallpaperManagement />
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <CategoriesManagement />
        )}

        {/* Collections Tab */}
        {activeTab === 'collections' && (
          <CollectionsManagement />
        )}

        {/* Slugs Tab */}
        {activeTab === 'slugs' && (
          <SlugManagement />
        )}

        {/* Ad Settings Tab */}
        {activeTab === 'ads' && (
          <AdSettingsManagement />
        )}

        {/* Banners Tab */}
        {activeTab === 'banners' && (
          <BannerManagement />
        )}

        {/* Cache & Performance Tab */}
        {activeTab === 'cache' && (
          <CacheManagement />
        )}

        {/* Premium Requests Tab */}
        {activeTab === 'requests' && (
          <div className="rounded-lg shadow overflow-hidden bg-theme-surface border border-theme-light">
            <div className="px-6 py-4 border-b border-theme-light">
              <h2 className="text-lg font-semibold text-theme-primary">Premium Membership Requests</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-theme-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-theme-secondary">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-theme-secondary">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-theme-secondary">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-theme-secondary">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-theme-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-theme-surface divide-y divide-theme-light">
                  {premiumRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-theme-light">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-theme-primary">{request.full_name || 'N/A'}</div>
                          <div className="text-sm text-theme-secondary">{request.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-theme-primary">{request.duration_months} month{request.duration_months > 1 ? 's' : ''}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-theme-primary">${request.amount_paid}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          request.status === 'approved' ? 'bg-green-100 text-green-800' :
                          request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {request.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => processPremiumRequest(request.id, 'approved')}
                              disabled={processingRequest === request.id}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => processPremiumRequest(request.id, 'rejected', 'Request declined')}
                              disabled={processingRequest === request.id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {premiumRequests.length === 0 && (
                <div className="text-center py-8 text-theme-secondary">
                  <Crown className="w-12 h-12 mx-auto mb-3 text-theme-tertiary" />
                  <p>No premium requests found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="shadow rounded-lg overflow-hidden bg-theme-surface border border-theme-light">
            <div className="px-6 py-4 border-b border-theme-light">
              <h2 className="text-lg font-semibold text-theme-primary">User Management</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-theme-light">
                <thead className="bg-theme-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-theme-secondary">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-theme-secondary">Plan Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-theme-secondary">Admin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-theme-secondary">Created</th>
                  </tr>
                </thead>
                <tbody className="bg-theme-surface divide-y divide-theme-light">
                  {users.map((user) => {
                    const isPremiumActive = user.plan_type === 'premium' && 
                                           (!user.premium_expires_at || new Date(user.premium_expires_at) > new Date())
                    
                    return (
                      <tr key={user.user_id} className="hover:bg-theme-light">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                isPremiumActive ? 'bg-yellow-100' : 'bg-gray-100'
                              }`}>
                                {isPremiumActive ? (
                                  <Crown className="h-5 w-5 text-yellow-600" />
                                ) : (
                                  <Users className="h-5 w-5 text-gray-600" />
                                )}
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-theme-primary">{user.full_name || 'N/A'}</div>
                              <div className="text-sm text-theme-secondary">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            isPremiumActive ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.plan_type}
                          </span>
                          {user.premium_expires_at && (
                            <div className="text-xs text-theme-secondary mt-1">
                              Expires: {new Date(user.premium_expires_at).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.is_admin ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.is_admin ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-theme-secondary">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              
              {users.length === 0 && (
                <div className="text-center py-8 text-theme-secondary">
                  <Users className="w-12 h-12 mx-auto mb-3 text-theme-tertiary" />
                  <p>No users found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admins Tab */}
        {activeTab === 'admins' && (
          <div className="shadow rounded-lg overflow-hidden bg-theme-surface border border-theme-light">
            <div className="px-6 py-4 border-b border-theme-light">
              <h2 className="text-lg font-semibold text-theme-primary">Admin Management</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-theme-light">
                <thead className="bg-theme-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-theme-secondary">Admin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-theme-secondary">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-theme-secondary">Permissions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-theme-secondary">Created</th>
                  </tr>
                </thead>
                <tbody className="bg-theme-surface divide-y divide-theme-light">
                  {adminUsers.map((admin) => (
                    <tr key={admin.user_id} className="hover:bg-theme-light">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                              <Settings className="h-5 w-5 text-red-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-theme-primary">{admin.full_name || 'N/A'}</div>
                            <div className="text-sm text-theme-secondary">{admin.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          admin.admin_role === 'super_admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {admin.admin_role || 'admin'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-theme-secondary">
                          {admin.admin_permissions && Object.keys(admin.admin_permissions).length > 0 ? (
                            `${Object.keys(admin.admin_permissions).length} permissions`
                          ) : (
                            'No permissions'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-theme-secondary">
                        {new Date(admin.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {adminUsers.length === 0 && (
                <div className="text-center py-8 text-theme-secondary">
                  <Settings className="w-12 h-12 mx-auto mb-3 text-theme-tertiary" />
                  <p>No admin users found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rate Limits Tab */}
        {activeTab === 'ratelimits' && (
          <div className="rounded-lg shadow overflow-hidden bg-theme-surface border border-theme-light">
            <div className="px-6 py-4 border-b border-theme-light">
              <h2 className="text-lg font-semibold text-theme-primary">Download Rate Limits Configuration</h2>
              <p className="text-sm mt-1 text-theme-secondary">Configure download limits for different user types. Changes apply immediately.</p>
            </div>
            
            <div className="p-6">
              {rateLimitConfigs.length > 0 ? (
                <div className="space-y-6">
                  {rateLimitConfigs.map((config) => (
                    <div key={config.id} className="border border-theme-light rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium capitalize text-theme-primary">
                            {config.setting_name.replace(/_/g, ' ')}
                          </h3>
                          <p className="text-sm text-theme-secondary">
                            {config.description || 'No description available'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            config.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {config.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-theme-secondary">Current Value:</span>
                          <span className="ml-2 font-semibold text-theme-primary">
                            {config.setting_value === -1 ? 'Unlimited' : `${config.setting_value} per hour`}
                          </span>
                        </div>
                        <div>
                          <span className="text-theme-secondary">Last Updated:</span>
                          <span className="ml-2 text-theme-primary">
                            {new Date(config.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-theme-secondary">
                  <Gauge className="w-12 h-12 mx-auto mb-3 text-theme-tertiary" />
                  <p>No rate limit configurations found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EnhancedAdminPanel