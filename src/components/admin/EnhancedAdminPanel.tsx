import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'
import { Users, Crown, DollarSign, TrendingUp, Calendar, Settings, CheckCircle, XCircle, Clock, Image as ImageIcon, Megaphone, X, Gauge, Tag, Link, Zap, Server, Trash2, ChevronDown, Shield, UserCheck, Edit3, Save, Plus, Activity, BarChart3 } from 'lucide-react'
import toast from 'react-hot-toast'
import { WallpaperManagement } from './WallpaperManagement'
import { BannerManagement } from '../premium/BannerManagement'
import { CategoriesManagement } from './CategoriesManagement'
import { CollectionsManagement } from './CollectionsManagement'
import { EnhancedCollectionManagement } from './EnhancedCollectionManagement'
import { SlugManagement } from './SlugManagement'
import { AdSettingsManagement } from './AdSettingsManagement'
import { CacheManagement } from './CacheManagement'
import { AnalyticsDashboard } from './AnalyticsDashboard'
import { EnhancedAnalyticsDashboard } from './EnhancedAnalyticsDashboard'
import { ComprehensiveAnalyticsDashboard } from './ComprehensiveAnalyticsDashboard'
import { EnhancedUserManagement } from './EnhancedUserManagement'
import { VideoManagementDashboard } from './VideoManagementDashboard'
import { AdminActionsLog } from './AdminActionsLog'

interface AdminStats {
  totalUsers: number
  premiumUsers: number
  pendingRequests: number
  totalRevenue: number
  newUsersLast30Days: number
  downloadsLast30Days: number
  totalDownloads: number
  unreadMessages: number
  adminInfo?: {
    role: string
    roleDetails: any
    permissions: any
    canManageAdmins: boolean
    canDeleteAdmins: boolean
    isSuperAdmin: boolean
  }
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
  subscription_tier?: string
  subscription_status?: string
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'actionslog' | 'users' | 'admins' | 'wallpapers' | 'videos' | 'banners' | 'categories' | 'collections' | 'ratelimits' | 'slugs' | 'ads' | 'cache'>('dashboard')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [premiumRequests, setPremiumRequests] = useState<PremiumRequest[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [availableRoles, setAvailableRoles] = useState<any[]>([])
  const [rateLimitConfigs, setRateLimitConfigs] = useState<RateLimitConfig[]>([])
  const [editingRateLimit, setEditingRateLimit] = useState<RateLimitConfig | null>(null)
  const [processingRequest, setProcessingRequest] = useState<number | null>(null)
  const [editingRole, setEditingRole] = useState<AdminUser | null>(null)
  const [editingPremium, setEditingPremium] = useState<User | null>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [showAddAdminModal, setShowAddAdminModal] = useState(false)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminRole, setNewAdminRole] = useState('admin')
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [hasVideoDownloadFilter, setHasVideoDownloadFilter] = useState('all')
  const [saving, setSaving] = useState(false)
  
  // Invite Admin Modal State
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteFormData, setInviteFormData] = useState({
    email: '',
    full_name: '',
    role: 'moderator',
    permissions: {
      manage_wallpapers: false,
      manage_categories: false,
      manage_collections: false,
      manage_users: false,
      view_analytics: false,
      manage_settings: false
    }
  })
  const [inviteLoading, setInviteLoading] = useState(false)

  // Check if current user is admin
  const isAdmin = profile?.is_admin === true

  useEffect(() => {
    if (isAdmin) {
      loadDashboardData()
    }
  }, [isAdmin, activeTab])
  
  // Reload users when search/filter changes
  useEffect(() => {
    if (isAdmin && activeTab === 'users') {
      const timeoutId = setTimeout(() => {
        loadDashboardData()
      }, 300) // Debounce search
      
      return () => clearTimeout(timeoutId)
    }
  }, [userSearchQuery, hasVideoDownloadFilter])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'dashboard') {
        // Use new admin-metrics function for real-time data
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-metrics`, {
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
      } else if (activeTab === 'users') {
        // Build query parameters for user search
        const params = new URLSearchParams({
          action: 'users'
        })
        
        if (userSearchQuery) {
          params.append('search', userSearchQuery)
        }
        
        if (hasVideoDownloadFilter !== 'all') {
          params.append('has_video_download', hasVideoDownloadFilter)
        }
        
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-dashboard?${params}`, {
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
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-rate-limits`, {
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
        setRateLimitConfigs(result.data || [])
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

  const updateUserRole = async (userId: string, role: string | null, isAdmin: boolean) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-dashboard`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update-user-role',
          user_id: userId,
          admin_role: role,
          is_admin: isAdmin
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
      
      toast.success('User role updated successfully')
      loadDashboardData() // Refresh data
      setShowRoleModal(false)
      setEditingRole(null)
    } catch (error: any) {
      console.error('Error updating user role:', error)
      toast.error(`Failed to update user role: ${error.message}`)
    }
  }

  const grantManualPremium = async (userId: string, duration: number) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-dashboard`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'grant-manual-premium',
          user_id: userId,
          duration_days: duration
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
      
      toast.success('Manual premium access granted successfully')
      loadDashboardData() // Refresh data
      setShowPremiumModal(false)
      setEditingPremium(null)
    } catch (error: any) {
      console.error('Error granting manual premium:', error)
      toast.error(`Failed to grant manual premium: ${error.message}`)
    }
  }

  const revokeManualPremium = async (userId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-dashboard`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'revoke-manual-premium',
          user_id: userId
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
      
      toast.success('Manual premium access revoked successfully')
      loadDashboardData() // Refresh data
    } catch (error: any) {
      console.error('Error revoking manual premium:', error)
      toast.error(`Failed to revoke manual premium: ${error.message}`)
    }
  }

  const createAdmin = async (email: string, role: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-dashboard`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create-admin',
          email: email.trim(),
          admin_role: role
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.error?.code === 'USER_NOT_FOUND') {
          throw new Error('User must first sign up on the platform before being made an admin. Please ask them to create an account first.')
        }
        throw new Error(`HTTP ${response.status}: ${errorData.error?.message || await response.text()}`)
      }
      
      toast.success('Admin user created successfully')
      loadDashboardData() // Refresh data
      setShowAddAdminModal(false)
      setNewAdminEmail('')
      setNewAdminRole('admin')
    } catch (error: any) {
      console.error('Error creating admin:', error)
      toast.error(`Failed to create admin: ${error.message}`)
    }
  }

  const saveRateLimit = async (config: RateLimitConfig) => {
    setSaving(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-rate-limits`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          setting_name: config.setting_name,
          setting_value: config.setting_value,
          description: config.description,
          is_active: config.is_active
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
      
      toast.success('Rate limit updated successfully')
      
      // Log audit trail
      console.log(`Rate limit '${config.setting_name}' updated by admin: ${profile?.email} at ${new Date().toISOString()}`)
      
      setEditingRateLimit(null)
      loadDashboardData() // Refresh data
    } catch (error: any) {
      console.error('Error updating rate limit:', error)
      toast.error(`Failed to update rate limit: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const testRateLimit = async (settingName: string) => {
    try {
      toast.loading('Testing rate limit enforcement...')
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-rate-limits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'test',
          setting_name: settingName
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        toast.success(
          `${result.message}\n\nStatus: ${result.test_results.enforcement_status}\nCurrent Usage: ${result.test_results.current_usage}\nLimit: ${result.test_results.current_limit}`,
          { duration: 5000 }
        )
        
        // Log test results to console for debugging
        console.log('Rate Limit Test Results:', result.test_results)
      } else {
        toast.error(result.message)
      }
    } catch (error: any) {
      console.error('Error testing rate limit:', error)
      toast.error(`Failed to test rate limit: ${error.message}`)
    }
  }

  const handleInviteAdmin = async () => {
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteFormData.email)) {
      toast.error('Please enter a valid email address')
      return
    }

    if (!inviteFormData.role) {
      toast.error('Please select a role')
      return
    }

    setInviteLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('You must be logged in to invite admins')
        return
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: inviteFormData.email.trim(),
          full_name: inviteFormData.full_name.trim(),
          role: inviteFormData.role,
          permissions: inviteFormData.permissions
        })
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle specific error messages
        if (response.status === 403) {
          toast.error(result.error || 'You do not have permission to invite admins')
        } else {
          throw new Error(result.error || 'Failed to invite admin')
        }
        return
      }

      toast.success(result.message || 'Admin invited successfully!')
      
      // Reset form and close modal
      setInviteFormData({
        email: '',
        full_name: '',
        role: 'moderator',
        permissions: {
          manage_wallpapers: false,
          manage_categories: false,
          manage_collections: false,
          manage_users: false,
          view_analytics: false,
          manage_settings: false
        }
      })
      setShowInviteModal(false)
      
      // Refresh the admin list
      await loadDashboardData()
      
    } catch (error: any) {
      console.error('Error inviting admin:', error)
      toast.error(error.message || 'Failed to invite admin')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleCloseInviteModal = () => {
    setShowInviteModal(false)
    setInviteFormData({
      email: '',
      full_name: '',
      role: 'moderator',
      permissions: {
        manage_wallpapers: false,
        manage_categories: false,
        manage_collections: false,
        manage_users: false,
        view_analytics: false,
        manage_settings: false
      }
    })
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
                    { id: 'videos', name: 'Video Management', icon: Zap },
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
                    { id: 'actionslog', name: 'Admin Actions Log', icon: Activity },
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
                  {([
                    { id: 'dashboard' as const, name: 'Dashboard', icon: TrendingUp },
                    { id: 'analytics' as const, name: 'Enhanced Analytics', icon: BarChart3 },
                    { id: 'ratelimits' as const, name: 'Rate Limits', icon: Gauge },
                    { id: 'cache' as const, name: 'Cache & Performance', icon: Server },
                    { id: 'ads' as const, name: 'Ad Settings', icon: Zap },
                    { id: 'banners' as const, name: 'Premium Banners', icon: Megaphone },
                  ] as const).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        console.log('Button clicked:', tab.id);
                        setActiveTab(tab.id);
                      }}
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
                onChange={(e) => {
                  console.log('Mobile dropdown changed:', e.target.value);
                  setActiveTab(e.target.value as typeof activeTab);
                }}
                className="w-full p-3 border border-theme-light rounded-lg bg-theme-surface text-theme-primary"
              >
                <option value="dashboard">Dashboard</option>
                <option value="analytics">Enhanced Analytics</option>
                <option value="wallpapers">Free Wallpapers</option>
                <option value="categories">Categories</option>
                <option value="collections">Collections</option>
                <option value="users">User Management</option>
                <option value="actionslog">Admin Actions Log</option>
                <option value="admins">Admin Management</option>
                <option value="cache">Cache & Performance</option>
                <option value="ads">Ad Settings</option>
                <option value="banners">Premium Banners</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div style={{
          background: activeTab === 'cache' ? 'red' : 'yellow', 
          color: activeTab === 'cache' ? 'white' : 'black',
          padding: '5px', 
          marginBottom: '10px',
          textAlign: 'center',
          fontFamily: 'monospace'
        }}>
          {activeTab === 'cache' 
            ? 'DEBUG: Cache & Performance Tab is Active'
            : `DEBUG: Current activeTab = ${activeTab}`
          }
        </div>
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <AnalyticsDashboard />
        )}

        {/* Enhanced Analytics Tab */}
        {activeTab === 'analytics' && (
          <ComprehensiveAnalyticsDashboard />
        )}

        {/* Wallpapers Tab */}
        {activeTab === 'wallpapers' && (
          <WallpaperManagement />
        )}

        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <VideoManagementDashboard />
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <CategoriesManagement />
        )}

        {/* Collections Tab */}
        {activeTab === 'collections' && (
          <EnhancedCollectionManagement />
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
          <div>
            <div style={{background: 'red', color: 'white', padding: '10px', marginBottom: '10px'}}>DEBUG: Cache & Performance Tab is Active</div>
            <CacheManagement />
          </div>
        )}

        {/* Admin Actions Log Tab */}
        {activeTab === 'actionslog' && (
          <AdminActionsLog />
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <EnhancedUserManagement />
        )}

        {/* Admins Tab */}
        {activeTab === 'admins' && (
          <div className="shadow rounded-lg overflow-hidden bg-theme-surface border border-theme-light">
            <div className="px-6 py-4 border-b border-theme-light">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-theme-primary">Admin Management</h2>
                {stats?.adminInfo?.isSuperAdmin && (
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Invite Admin</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-theme-light">
                <thead className="bg-theme-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-theme-secondary">Admin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-theme-secondary">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-theme-secondary">Permissions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-theme-secondary">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-theme-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-theme-surface divide-y divide-theme-light">
                  {adminUsers.map((admin) => (
                    <tr key={admin.user_id} className="hover:bg-theme-light">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
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
                          admin.admin_role === 'super_admin' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            setEditingRole(admin)
                            setShowRoleModal(true)
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-3 py-1 rounded-lg transition-colors"
                          title="Edit role"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
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
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                          }`}>
                            {config.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <button
                            onClick={() => setEditingRateLimit(config)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-3 py-1 rounded-lg transition-colors"
                            title="Edit rate limit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {editingRateLimit?.id === config.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-theme-secondary mb-1">
                                Value (per hour)
                              </label>
                              <input
                                type="number"
                                value={editingRateLimit.setting_value === -1 ? '' : editingRateLimit.setting_value}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? -1 : parseInt(e.target.value)
                                  setEditingRateLimit({ ...editingRateLimit, setting_value: value })
                                }}
                                placeholder="Unlimited"
                                className="w-full px-3 py-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-theme-surface text-theme-primary"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-theme-secondary mb-1">
                                Status
                              </label>
                              <select
                                value={editingRateLimit.is_active ? 'true' : 'false'}
                                onChange={(e) => setEditingRateLimit({ ...editingRateLimit, is_active: e.target.value === 'true' })}
                                className="w-full px-3 py-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-theme-surface text-theme-primary"
                              >
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-theme-secondary mb-1">
                              Description
                            </label>
                            <input
                              type="text"
                              value={editingRateLimit.description || ''}
                              onChange={(e) => setEditingRateLimit({ ...editingRateLimit, description: e.target.value })}
                              placeholder="Enter description"
                              className="w-full px-3 py-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-theme-surface text-theme-primary"
                            />
                          </div>
                          <div className="flex space-x-3">
                            <button
                              onClick={() => saveRateLimit(editingRateLimit)}
                              disabled={saving}
                              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              <Save className="w-4 h-4" />
                              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                            </button>
                            <button
                              onClick={() => setEditingRateLimit(null)}
                              className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                              <span>Cancel</span>
                            </button>
                            <button
                              onClick={() => testRateLimit(config.setting_name)}
                              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Gauge className="w-4 h-4" />
                              <span>Test Limit</span>
                            </button>
                          </div>
                        </div>
                      ) : (
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
                      )}
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
      
      {/* Role Assignment Modal */}
      {showRoleModal && editingRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-theme-surface rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-theme-primary">Edit User Role</h3>
              <button
                onClick={() => {
                  setShowRoleModal(false)
                  setEditingRole(null)
                }}
                className="text-theme-tertiary hover:text-theme-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-theme-secondary mb-2">User: {editingRole.email}</p>
              <p className="text-sm text-theme-secondary mb-4">Current Role: {editingRole.admin_role || 'User'}</p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => updateUserRole(editingRole.user_id, 'super_admin', true)}
                className="w-full text-left px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-red-600" />
                  <div>
                    <div className="font-medium text-red-800">Super Admin</div>
                    <div className="text-sm text-red-600">Full system access</div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => updateUserRole(editingRole.user_id, 'admin', true)}
                className="w-full text-left px-4 py-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Settings className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-medium text-blue-800">Admin</div>
                    <div className="text-sm text-blue-600">Standard admin access</div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => updateUserRole(editingRole.user_id, 'moderator', true)}
                className="w-full text-left px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <UserCheck className="w-5 h-5 text-yellow-600" />
                  <div>
                    <div className="font-medium text-yellow-800">Moderator</div>
                    <div className="text-sm text-yellow-600">Content moderation only</div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => updateUserRole(editingRole.user_id, null, false)}
                className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-800">Regular User</div>
                    <div className="text-sm text-gray-600">Remove admin access</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Manual Premium Modal */}
      {showPremiumModal && editingPremium && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-theme-surface rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-theme-primary">Manual Premium Access</h3>
              <button
                onClick={() => {
                  setShowPremiumModal(false)
                  setEditingPremium(null)
                }}
                className="text-theme-tertiary hover:text-theme-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-theme-secondary mb-2">User: {editingPremium.email}</p>
              <p className="text-sm text-theme-secondary mb-4">Current Plan: {editingPremium.plan_type}</p>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This is for temporary premium access (support cases). 
                  It won't interfere with Stripe subscriptions.
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => grantManualPremium(editingPremium.user_id, 7)}
                className="w-full text-left px-4 py-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Crown className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="font-medium text-green-800">7 Days Premium</div>
                      <div className="text-sm text-green-600">Temporary access</div>
                    </div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => grantManualPremium(editingPremium.user_id, 30)}
                className="w-full text-left px-4 py-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Crown className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="font-medium text-blue-800">30 Days Premium</div>
                      <div className="text-sm text-blue-600">Extended temporary access</div>
                    </div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => revokeManualPremium(editingPremium.user_id)}
                className="w-full text-left px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <X className="w-5 h-5 text-red-600" />
                  <div>
                    <div className="font-medium text-red-800">Revoke Manual Premium</div>
                    <div className="text-sm text-red-600">Remove temporary access</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Admin Modal */}
      {showAddAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-theme-surface rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-theme-primary">Add Admin User</h3>
              <button
                onClick={() => {
                  setShowAddAdminModal(false)
                  setNewAdminEmail('')
                  setNewAdminRole('admin')
                }}
                className="text-theme-tertiary hover:text-theme-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> User must already have an account on the platform. 
                  If they don't exist, they need to sign up first.
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-theme-primary mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-3 py-2 border border-theme-light rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-theme-surface text-theme-primary"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-theme-primary mb-2">
                  Admin Role
                </label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value)}
                  className="w-full px-3 py-2 border border-theme-light rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-theme-surface text-theme-primary"
                >
                  <option value="admin">Admin</option>
                  <option value="moderator">Moderator</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowAddAdminModal(false)
                  setNewAdminEmail('')
                  setNewAdminRole('admin')
                }}
                className="flex-1 px-4 py-2 border border-theme-light text-theme-secondary hover:bg-theme-light rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => createAdmin(newAdminEmail, newAdminRole)}
                disabled={!newAdminEmail.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                Add Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Admin Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-theme-surface rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-theme-primary mb-4">Invite Admin / Moderator</h3>
            
            <div className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-1">Email *</label>
                <input
                  type="email"
                  value={inviteFormData.email}
                  onChange={(e) => setInviteFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full p-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-blue-500 bg-theme-surface text-theme-primary"
                  placeholder="admin@example.com"
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-1">Full Name (Optional)</label>
                <input
                  type="text"
                  value={inviteFormData.full_name}
                  onChange={(e) => setInviteFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full p-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-blue-500 bg-theme-surface text-theme-primary"
                  placeholder="John Doe"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-1">Role *</label>
                <select
                  value={inviteFormData.role}
                  onChange={(e) => setInviteFormData(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full p-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-blue-500 bg-theme-surface text-theme-primary"
                >
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-2">Permissions</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={inviteFormData.permissions.manage_wallpapers}
                      onChange={(e) => setInviteFormData(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, manage_wallpapers: e.target.checked }
                      }))}
                      className="rounded border-theme-light"
                    />
                    <span className="text-sm text-theme-primary">Manage Wallpapers</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={inviteFormData.permissions.manage_categories}
                      onChange={(e) => setInviteFormData(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, manage_categories: e.target.checked }
                      }))}
                      className="rounded border-theme-light"
                    />
                    <span className="text-sm text-theme-primary">Manage Categories</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={inviteFormData.permissions.manage_collections}
                      onChange={(e) => setInviteFormData(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, manage_collections: e.target.checked }
                      }))}
                      className="rounded border-theme-light"
                    />
                    <span className="text-sm text-theme-primary">Manage Collections</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={inviteFormData.permissions.manage_users}
                      onChange={(e) => setInviteFormData(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, manage_users: e.target.checked }
                      }))}
                      className="rounded border-theme-light"
                    />
                    <span className="text-sm text-theme-primary">Manage Users</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={inviteFormData.permissions.view_analytics}
                      onChange={(e) => setInviteFormData(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, view_analytics: e.target.checked }
                      }))}
                      className="rounded border-theme-light"
                    />
                    <span className="text-sm text-theme-primary">View Analytics</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={inviteFormData.permissions.manage_settings}
                      onChange={(e) => setInviteFormData(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, manage_settings: e.target.checked }
                      }))}
                      className="rounded border-theme-light"
                    />
                    <span className="text-sm text-theme-primary">Manage Settings</span>
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> If the email already exists in the system, the user will be promoted to admin.
                  For new users, a password reset email will be sent to set up their account.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCloseInviteModal}
                disabled={inviteLoading}
                className="px-4 py-2 text-theme-secondary hover:text-theme-primary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteAdmin}
                disabled={inviteLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {inviteLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Inviting...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Send Invitation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

}

export default EnhancedAdminPanel
