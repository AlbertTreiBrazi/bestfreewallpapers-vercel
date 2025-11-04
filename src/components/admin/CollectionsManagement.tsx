import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Eye, EyeOff, Save, X, Upload, ExternalLink, Image as ImageIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'
import { CollectionCoverUpload } from './CollectionCoverUpload'
import toast from 'react-hot-toast'

interface Collection {
  id: string
  name: string
  slug: string
  description?: string
  icon_name?: string
  cover_image_url?: string
  color_theme?: string
  is_seasonal: boolean
  season_start_month?: number
  season_end_month?: number
  is_featured: boolean
  is_active: boolean
  sort_order: number
  wallpaper_count: number
  view_count: number
  created_at: string
  updated_at: string
}

interface CollectionFormData {
  name: string
  slug: string
  description: string
  cover_image_url: string
  is_featured: boolean
  is_active: boolean
  sort_order: number
}

const initialFormData: CollectionFormData = {
  name: '',
  slug: '',
  description: '',
  cover_image_url: '',
  is_featured: false,
  is_active: true,
  sort_order: 0
}

export function CollectionsManagement() {
  const { profile } = useAuth()
  const { theme } = useTheme()
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCollection, setEditingCollection] = useState<string | null>(null)
  const [formData, setFormData] = useState<CollectionFormData>(initialFormData)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const isAdmin = profile?.is_admin === true

  useEffect(() => {
    if (isAdmin) {
      loadCollections()
    }
  }, [isAdmin])

  const loadCollections = async () => {
    setLoading(true)
    try {
      const session = await supabase.auth.getSession()
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/collections-management?action=list`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        const result = await response.json()
        setCollections(result.data || [])
      } else {
        const errorText = await response.text()
        console.error('Failed to load collections:', errorText)
        toast.error('Failed to load collections')
      }
    } catch (error: any) {
      console.error('Error loading collections:', error)
      toast.error('Failed to load collections')
    } finally {
      setLoading(false)
    }
  }

  const validateForm = (data: CollectionFormData): string | null => {
    if (!data.name.trim()) return 'Collection name is required'
    if (data.name.length > 100) return 'Collection name must be 100 characters or less'
    if (!data.slug.trim()) return 'Collection slug is required'
    if (data.slug.length > 100) return 'Collection slug must be 100 characters or less'
    if (data.description.length > 500) return 'Description must be 500 characters or less'
    if (data.cover_image_url && data.cover_image_url.length > 512) return 'Cover image URL must be 512 characters or less'
    
    // Basic URL validation for cover image
    if (data.cover_image_url) {
      try {
        new URL(data.cover_image_url)
      } catch {
        return 'Cover image URL must be a valid URL'
      }
    }

    return null
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .trim()
  }

  const handleCreateCollection = async () => {
    const validationError = validateForm(formData)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setSaving(true)
    try {
      const session = await supabase.auth.getSession()
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/collections-management`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            slug: formData.slug.trim(),
            description: formData.description.trim() || null,
            cover_image_url: formData.cover_image_url.trim() || null,
            is_featured: formData.is_featured,
            is_active: formData.is_active,
            sort_order: formData.sort_order
          })
        }
      )

      if (response.ok) {
        toast.success('Collection created successfully')
        setShowCreateForm(false)
        setFormData(initialFormData)
        loadCollections()
      } else {
        let errorMessage = 'Failed to create collection'
        try {
          const errorData = await response.json()
          if (errorData.error && errorData.error.message) {
            errorMessage = errorData.error.message
            if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
              errorMessage = 'A collection with this slug already exists. Please modify the name or slug.'
            }
          }
        } catch {
          const errorText = await response.text()
          console.error('Create collection error:', errorText)
          if (errorText.includes('duplicate') || errorText.includes('unique')) {
            errorMessage = 'A collection with this slug already exists. Please modify the name or slug.'
          }
        }
        toast.error(errorMessage)
      }
    } catch (error: any) {
      console.error('Error creating collection:', error)
      let errorMessage = 'Failed to create collection'
      if (error.message && (error.message.includes('duplicate') || error.message.includes('unique'))) {
        errorMessage = 'A collection with this slug already exists. Please modify the name or slug.'
      }
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateCollection = async (collectionId: string) => {
    const validationError = validateForm(formData)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setSaving(true)
    try {
      const session = await supabase.auth.getSession()
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/collections-management`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: collectionId,
            name: formData.name.trim(),
            slug: formData.slug.trim(),
            description: formData.description.trim() || null,
            cover_image_url: formData.cover_image_url.trim() || null,
            is_featured: formData.is_featured,
            is_active: formData.is_active,
            sort_order: formData.sort_order
          })
        }
      )

      if (response.ok) {
        toast.success('Collection updated successfully')
        setEditingCollection(null)
        setFormData(initialFormData)
        loadCollections()
      } else {
        let errorMessage = 'Failed to update collection'
        try {
          const errorData = await response.json()
          if (errorData.error && errorData.error.message) {
            errorMessage = errorData.error.message
            if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
              errorMessage = 'A collection with this slug already exists. Please modify the name or slug.'
            }
          }
        } catch {
          const errorText = await response.text()
          console.error('Update collection error:', errorText)
          if (errorText.includes('duplicate') || errorText.includes('unique')) {
            errorMessage = 'A collection with this slug already exists. Please modify the name or slug.'
          }
        }
        toast.error(errorMessage)
      }
    } catch (error: any) {
      console.error('Error updating collection:', error)
      let errorMessage = 'Failed to update collection'
      if (error.message && (error.message.includes('duplicate') || error.message.includes('unique'))) {
        errorMessage = 'A collection with this slug already exists. Please modify the name or slug.'
      }
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (collectionId: string, currentActive: boolean) => {
    try {
      const session = await supabase.auth.getSession()
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/collections-management`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: collectionId,
            is_active: !currentActive
          })
        }
      )

      if (response.ok) {
        toast.success(`Collection ${!currentActive ? 'activated' : 'deactivated'} successfully`)
        loadCollections()
      } else {
        const errorText = await response.text()
        console.error('Toggle collection error:', errorText)
        toast.error('Failed to update collection status')
      }
    } catch (error: any) {
      console.error('Error toggling collection status:', error)
      toast.error('Failed to update collection status')
    }
  }

  const handleDeleteCollection = async (collectionId: string) => {
    if (!confirm('Are you sure you want to delete this collection? This action cannot be undone.')) {
      return
    }

    try {
      const session = await supabase.auth.getSession()
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/collections-management`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id: collectionId })
        }
      )

      if (response.ok) {
        toast.success('Collection deleted successfully')
        loadCollections()
      } else {
        const errorText = await response.text()
        console.error('Delete collection error:', errorText)
        toast.error('Failed to delete collection')
      }
    } catch (error: any) {
      console.error('Error deleting collection:', error)
      toast.error('Failed to delete collection')
    }
  }

  const startEditing = (collection: Collection) => {
    setEditingCollection(collection.id)
    setFormData({
      name: collection.name,
      slug: collection.slug,
      description: collection.description || '',
      cover_image_url: collection.cover_image_url || '',
      is_featured: collection.is_featured,
      is_active: collection.is_active,
      sort_order: collection.sort_order
    })
  }

  const cancelEditing = () => {
    setEditingCollection(null)
    setFormData(initialFormData)
  }

  const cancelCreate = () => {
    setShowCreateForm(false)
    setFormData(initialFormData)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    setUploading(true)
    try {
      // Generate a unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `collection-covers/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('public-wallpapers')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw error
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('public-wallpapers')
        .getPublicUrl(fileName)

      setFormData(prev => ({ ...prev, cover_image_url: urlData.publicUrl }))
      toast.success('Image uploaded successfully')
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-8">
        <p className="text-theme-secondary">Admin privileges required to manage collections.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-theme-primary">Master Collections Management</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Collection</span>
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-theme-surface border border-theme-light p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-theme-primary">Create New Collection</h3>
            <button onClick={cancelCreate} className="text-theme-tertiary hover:text-theme-secondary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <CollectionForm
            formData={formData}
            setFormData={setFormData}
            onSave={handleCreateCollection}
            onCancel={cancelCreate}
            saving={saving}
            uploading={uploading}
            onFileUpload={handleFileUpload}
            isCreate={true}
          />
        </div>
      )}

      {/* Collections List */}
      <div className="bg-theme-surface border border-theme-light rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-theme-secondary">Loading collections...</p>
          </div>
        ) : collections.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-theme-secondary">No collections found. Create your first collection to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-theme-light">
            {collections.map((collection) => (
              <div key={collection.id} className="p-6">
                {editingCollection === collection.id ? (
                  <CollectionForm
                    formData={formData}
                    setFormData={setFormData}
                    onSave={() => handleUpdateCollection(collection.id)}
                    onCancel={cancelEditing}
                    saving={saving}
                    uploading={uploading}
                    onFileUpload={handleFileUpload}
                    isCreate={false}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 mr-4">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-theme-primary">{collection.name}</h3>
                          <span className={`status-badge ${
                            collection.is_active ? 'status-active' : 'status-inactive'
                          }`}>
                            {collection.is_active ? 'Active' : 'Inactive'}
                          </span>
                          {collection.is_featured && (
                            <span className="status-badge status-featured">Featured</span>
                          )}
                          <span className="text-xs text-theme-muted">Order: {collection.sort_order}</span>
                        </div>
                        {collection.description && (
                          <p className="text-theme-secondary mb-2">{collection.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-theme-muted">
                          <span>Slug: {collection.slug}</span>
                          <span>Wallpapers: {collection.wallpaper_count}</span>
                          <span>Views: {collection.view_count}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleActive(collection.id, collection.is_active)}
                          className={`p-2 rounded-lg transition-colors ${
                            collection.is_active 
                              ? 'text-green-600 hover:bg-green-50' 
                              : 'text-theme-tertiary hover:bg-theme-tertiary'
                          }`}
                          title={`Collection is currently ${collection.is_active ? 'ACTIVE (visible)' : 'INACTIVE (hidden)'}. Click to ${collection.is_active ? 'deactivate' : 'activate'}.`}
                        >
                          {collection.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => startEditing(collection)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCollection(collection.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Collection Cover Upload */}
                    <div className="border-t border-theme-light pt-4">
                      <CollectionCoverUpload
                        collectionId={collection.id}
                        currentCoverUrl={collection.cover_image_url}
                        onUploadSuccess={(url) => {
                          // Update the collection in state
                          setCollections(prev => prev.map(c => 
                            c.id === collection.id 
                              ? { ...c, cover_image_url: url }
                              : c
                          ))
                        }}
                        className="max-w-md"
                      />
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

// Form component for creating/editing collections
function CollectionForm({ 
  formData, 
  setFormData, 
  onSave, 
  onCancel, 
  saving, 
  uploading,
  onFileUpload,
  isCreate 
}: {
  formData: CollectionFormData
  setFormData: React.Dispatch<React.SetStateAction<CollectionFormData>>
  onSave: () => void
  onCancel: () => void
  saving: boolean
  uploading: boolean
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  isCreate: boolean
}) {
  const handleInputChange = (field: keyof CollectionFormData, value: string | number | boolean) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      
      // Auto-generate slug when name changes
      if (field === 'name' && typeof value === 'string') {
        updated.slug = value
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
          .trim()
      }
      
      return updated
    })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-1">
          Collection Name * (max 100 chars)
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          maxLength={100}
          className="w-full p-2 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors placeholder:text-theme-tertiary"
          placeholder="Enter collection name"
        />
        <div className="text-xs text-theme-muted mt-1">{formData.name.length}/100</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-1">
          Collection Slug * (auto-generated)
        </label>
        <input
          type="text"
          value={formData.slug}
          onChange={(e) => handleInputChange('slug', e.target.value)}
          maxLength={100}
          className="w-full p-2 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors placeholder:text-theme-tertiary"
          placeholder="collection-slug"
        />
        <div className="text-xs text-theme-muted mt-1">{formData.slug.length}/100</div>
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-theme-secondary mb-1">
          Description (max 500 chars)
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          maxLength={500}
          rows={3}
          className="w-full p-2 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors placeholder:text-theme-tertiary"
          placeholder="Enter collection description (optional)"
        />
        <div className="text-xs text-theme-muted mt-1">{formData.description.length}/500</div>
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-theme-secondary mb-1">
          Cover Image
        </label>
        <div className="space-y-2">
          <input
            type="url"
            value={formData.cover_image_url}
            onChange={(e) => handleInputChange('cover_image_url', e.target.value)}
            maxLength={512}
            className="w-full p-2 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors placeholder:text-theme-tertiary"
            placeholder="Enter image URL or upload a file"
          />
          <div className="flex items-center space-x-2">
            <input
              type="file"
              accept="image/*"
              onChange={onFileUpload}
              className="hidden"
              id="cover-image-upload"
            />
            <label
              htmlFor="cover-image-upload"
              className={`flex items-center space-x-2 px-3 py-1 text-sm border border-theme-light rounded-lg cursor-pointer transition-colors ${
                uploading 
                  ? 'bg-theme-muted text-theme-tertiary cursor-not-allowed'
                  : 'bg-theme-surface text-theme-secondary hover:bg-theme-light'
              }`}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload File</span>
                </>
              )}
            </label>
            {formData.cover_image_url && (
              <img 
                src={formData.cover_image_url} 
                alt="Preview" 
                className="w-12 h-8 object-cover rounded border"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            )}
          </div>
          <div className="text-xs text-theme-muted">{formData.cover_image_url.length}/512</div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-1">
          Sort Order
        </label>
        <input
          type="number"
          value={formData.sort_order}
          onChange={(e) => handleInputChange('sort_order', parseInt(e.target.value) || 0)}
          min={0}
          className="w-full p-2 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors placeholder:text-theme-tertiary"
          placeholder="0"
        />
      </div>

      <div className="space-y-3">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.is_featured}
            onChange={(e) => handleInputChange('is_featured', e.target.checked)}
            className="w-4 h-4 text-gray-600 bg-theme-surface border-theme-light rounded focus:ring-gray-500 focus:ring-2"
          />
          <span className="text-sm text-theme-secondary">Featured Collection</span>
        </label>
        
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => handleInputChange('is_active', e.target.checked)}
            className="w-4 h-4 text-gray-600 bg-theme-surface border-theme-light rounded focus:ring-gray-500 focus:ring-2"
          />
          <span className="text-sm text-theme-secondary">Active (Visible)</span>
        </label>
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
          disabled={saving || uploading || !formData.name.trim() || !formData.slug.trim()}
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
              <span>{isCreate ? 'Create' : 'Update'} Collection</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
