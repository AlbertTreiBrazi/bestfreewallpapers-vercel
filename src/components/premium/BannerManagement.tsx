import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Eye, EyeOff, Save, X, ExternalLink } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { API_ENDPOINTS } from '@/config/api'

interface Banner {
  id: number
  title: string
  subtitle?: string
  cta_label: string
  cta_url: string
  image_url?: string
  active: boolean
  display_order: number
  created_at: string
}

interface BannerFormData {
  title: string
  subtitle: string
  cta_label: string
  cta_url: string
  image_url: string
  display_order: number
}

const initialFormData: BannerFormData = {
  title: '',
  subtitle: '',
  cta_label: '',
  cta_url: '',
  image_url: '',
  display_order: 0
}

export function BannerManagement() {
  const { profile } = useAuth()
  const { theme } = useTheme()
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingBanner, setEditingBanner] = useState<number | null>(null)
  const [formData, setFormData] = useState<BannerFormData>(initialFormData)
  const [saving, setSaving] = useState(false)

  const isAdmin = profile?.is_admin === true

  useEffect(() => {
    if (isAdmin) {
      loadBanners()
    }
  }, [isAdmin])

  const loadBanners = async () => {
    setLoading(true)
    try {
      // For admin view, we need to get ALL banners (including inactive ones)
      // Use direct database access since edge function has authentication issues
      const { data, error: dbError } = await supabase
        .from('premium_banners')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (dbError) {
        console.error('Database error:', dbError)
        // If direct access fails, try the edge function as fallback
        try {
          const { data: functionData, error: functionError } = await supabase.functions.invoke('premium-banners', {
            method: 'GET'
          })
          
          if (functionError) throw functionError
          
          setBanners(functionData.data || [])
        } catch (fallbackError: any) {
          console.error('Edge function fallback error:', fallbackError)
          throw new Error('Unable to load banners from database or API')
        }
      } else {
        setBanners(data || [])
      }
    } catch (error: any) {
      console.error('Error loading banners:', error)
      toast.error('Failed to load banners')
      setBanners([]) // Set empty array to show "No banners found" message
    } finally {
      setLoading(false)
    }
  }

  const validateForm = (data: BannerFormData): string | null => {
    if (!data.title.trim()) return 'Title is required'
    if (data.title.length > 120) return 'Title must be 120 characters or less'
    if (data.subtitle.length > 240) return 'Subtitle must be 240 characters or less'
    if (!data.cta_label.trim()) return 'CTA label is required'
    if (data.cta_label.length > 50) return 'CTA label must be 50 characters or less'
    if (!data.cta_url.trim()) return 'CTA URL is required'
    if (data.cta_url.length > 512) return 'CTA URL must be 512 characters or less'
    if (data.image_url && data.image_url.length > 512) return 'Image URL must be 512 characters or less'
    
    // Basic URL validation
    try {
      new URL(data.cta_url)
    } catch {
      return 'CTA URL must be a valid URL'
    }

    if (data.image_url) {
      try {
        new URL(data.image_url)
      } catch {
        return 'Image URL must be a valid URL'
      }
    }

    return null
  }

  const handleCreateBanner = async () => {
    const validationError = validateForm(formData)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setSaving(true)
    try {
      const { data, error } = await supabase.functions.invoke('premium-banners', {
        method: 'POST',
        body: {
          title: formData.title.trim(),
          subtitle: formData.subtitle.trim() || null,
          cta_label: formData.cta_label.trim(),
          cta_url: formData.cta_url.trim(),
          image_url: formData.image_url.trim() || null,
          display_order: formData.display_order
        }
      })

      if (error) {
        throw error
      }

      toast.success('Banner created successfully')
      setShowCreateForm(false)
      setFormData(initialFormData)
      loadBanners()
    } catch (error: any) {
      console.error('Error creating banner:', error)
      toast.error(error.message || 'Failed to create banner')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateBanner = async (bannerId: number) => {
    const validationError = validateForm(formData)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setSaving(true)
    try {
      const { data, error } = await supabase.functions.invoke('premium-banners', {
        method: 'PUT',
        body: {
          id: bannerId,
          title: formData.title.trim(),
          subtitle: formData.subtitle.trim() || null,
          cta_label: formData.cta_label.trim(),
          cta_url: formData.cta_url.trim(),
          image_url: formData.image_url.trim() || null,
          display_order: formData.display_order
        }
      })

      if (error) {
        throw error
      }

      toast.success('Banner updated successfully')
      setEditingBanner(null)
      setFormData(initialFormData)
      loadBanners()
    } catch (error: any) {
      console.error('Error updating banner:', error)
      toast.error(error.message || 'Failed to update banner')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (bannerId: number, currentActive: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke('premium-banners', {
        method: 'PUT',
        body: {
          id: bannerId,
          active: !currentActive
        }
      })

      if (error) {
        throw error
      }

      toast.success(`Banner ${!currentActive ? 'activated' : 'deactivated'} successfully`)
      loadBanners()
    } catch (error: any) {
      console.error('Error toggling banner status:', error)
      toast.error(error.message || 'Failed to update banner status')
    }
  }

  const handleDeleteBanner = async (bannerId: number) => {
    if (!confirm('Are you sure you want to delete this banner? This action cannot be undone.')) {
      return
    }

    try {
      // Use the correct URL with query parameter
      const deleteUrl = API_ENDPOINTS.premiumBanners(bannerId.toString())
      const session = await supabase.auth.getSession()
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to delete banner')
      }

      toast.success('Banner deleted successfully')
      loadBanners()
    } catch (error: any) {
      console.error('Error deleting banner:', error)
      toast.error(error.message || 'Failed to delete banner')
    }
  }

  const startEditing = (banner: Banner) => {
    setEditingBanner(banner.id)
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || '',
      cta_label: banner.cta_label,
      cta_url: banner.cta_url,
      image_url: banner.image_url || '',
      display_order: banner.display_order
    })
  }

  const cancelEditing = () => {
    setEditingBanner(null)
    setFormData(initialFormData)
  }

  const cancelCreate = () => {
    setShowCreateForm(false)
    setFormData(initialFormData)
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-8">
        <p className="text-theme-secondary">Admin privileges required to manage banners.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-theme-primary">Premium Banner Management</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Banner</span>
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-theme-surface border border-theme-light p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-theme-primary">Create New Banner</h3>
            <button onClick={cancelCreate} className="text-theme-tertiary hover:text-theme-secondary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <BannerForm
            formData={formData}
            setFormData={setFormData}
            onSave={handleCreateBanner}
            onCancel={cancelCreate}
            saving={saving}
            isCreate={true}
          />
        </div>
      )}

      {/* Banners List */}
      <div className="bg-theme-surface border border-theme-light rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-theme-secondary">Loading banners...</p>
          </div>
        ) : banners.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-theme-secondary">No banners found. Create your first banner to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-theme-light">
            {banners.map((banner) => (
              <div key={banner.id} className="p-6">
                {editingBanner === banner.id ? (
                  <BannerForm
                    formData={formData}
                    setFormData={setFormData}
                    onSave={() => handleUpdateBanner(banner.id)}
                    onCancel={cancelEditing}
                    saving={saving}
                    isCreate={false}
                  />
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1 mr-4">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-theme-primary">{banner.title}</h3>
                        <span className={`status-badge ${
                          banner.active ? 'status-active' : 'status-inactive'
                        }`}>
                          {banner.active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-xs text-theme-muted">Order: {banner.display_order}</span>
                      </div>
                      {banner.subtitle && (
                        <p className="text-theme-secondary mb-2">{banner.subtitle}</p>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-theme-muted">
                        <span>CTA: {banner.cta_label}</span>
                        <a 
                          href={banner.cta_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                        >
                          <span>{new URL(banner.cta_url).hostname}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      {banner.image_url && (
                        <div className="mt-2">
                          <img 
                            src={banner.image_url} 
                            alt="Banner preview" 
                            className="w-16 h-16 object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleActive(banner.id, banner.active)}
                        className={`p-2 rounded-lg transition-colors ${
                          banner.active 
                            ? 'text-green-600 hover:bg-green-50' 
                            : 'text-theme-tertiary hover:bg-theme-tertiary'
                        }`}
                        title={`Banner is currently ${banner.active ? 'ACTIVE (visible)' : 'INACTIVE (hidden)'}. Click to ${banner.active ? 'deactivate' : 'activate'}.`}
                      >
                        {banner.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => startEditing(banner)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBanner(banner.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Form component for creating/editing banners
function BannerForm({ 
  formData, 
  setFormData, 
  onSave, 
  onCancel, 
  saving, 
  isCreate 
}: {
  formData: BannerFormData
  setFormData: React.Dispatch<React.SetStateAction<BannerFormData>>
  onSave: () => void
  onCancel: () => void
  saving: boolean
  isCreate: boolean
}) {
  const handleInputChange = (field: keyof BannerFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-1">
          Title * (max 120 chars)
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          maxLength={120}
          className="w-full p-2 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors placeholder:text-theme-tertiary"
          placeholder="Enter banner title"
        />
        <div className="text-xs text-theme-muted mt-1">{formData.title.length}/120</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-1">
          Subtitle (max 240 chars)
        </label>
        <input
          type="text"
          value={formData.subtitle}
          onChange={(e) => handleInputChange('subtitle', e.target.value)}
          maxLength={240}
          className="w-full p-2 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors placeholder:text-theme-tertiary"
          placeholder="Enter banner subtitle (optional)"
        />
        <div className="text-xs text-theme-muted mt-1">{formData.subtitle.length}/240</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-1">
          CTA Label * (max 50 chars)
        </label>
        <input
          type="text"
          value={formData.cta_label}
          onChange={(e) => handleInputChange('cta_label', e.target.value)}
          maxLength={50}
          className="w-full p-2 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors placeholder:text-theme-tertiary"
          placeholder="e.g., Upgrade Now"
        />
        <div className="text-xs text-theme-muted mt-1">{formData.cta_label.length}/50</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-1">
          CTA URL * (max 512 chars)
        </label>
        <input
          type="url"
          value={formData.cta_url}
          onChange={(e) => handleInputChange('cta_url', e.target.value)}
          maxLength={512}
          className="w-full p-2 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors placeholder:text-theme-tertiary"
          placeholder="https://example.com/premium"
        />
        <div className="text-xs text-theme-muted mt-1">{formData.cta_url.length}/512</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-1">
          Image URL (max 512 chars)
        </label>
        <input
          type="url"
          value={formData.image_url}
          onChange={(e) => handleInputChange('image_url', e.target.value)}
          maxLength={512}
          className="w-full p-2 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors placeholder:text-theme-tertiary"
          placeholder="https://example.com/image.jpg (optional)"
        />
        <div className="text-xs text-theme-muted mt-1">{formData.image_url.length}/512</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-1">
          Display Order
        </label>
        <input
          type="number"
          value={formData.display_order}
          onChange={(e) => handleInputChange('display_order', parseInt(e.target.value) || 0)}
          min={0}
          className="w-full p-2 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors placeholder:text-theme-tertiary"
          placeholder="0"
        />
      </div>

      <div className="md:col-span-2 flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-theme-secondary bg-theme-muted border border-theme-light rounded-lg hover:bg-theme-tertiary transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving || !formData.title.trim() || !formData.cta_label.trim() || !formData.cta_url.trim()}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{isCreate ? 'Create' : 'Update'} Banner</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
