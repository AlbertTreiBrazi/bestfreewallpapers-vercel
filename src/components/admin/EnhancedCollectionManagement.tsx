import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Edit2, Trash2, Eye, EyeOff, Save, X, Upload, ExternalLink, Image as ImageIcon, Search, Filter, ChevronDown, Grid, List, Maximize2, Crown, Calendar, Download, Tag, GridIcon, ListIcon, MoreHorizontal } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'
import { CollectionCoverUpload } from './CollectionCoverUpload'
import { useDebounce } from '@/hooks/useDebounce'
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

interface Wallpaper {
  id: number
  title: string
  description?: string
  image_url: string
  thumbnail_url?: string
  category_id?: number
  category_name?: string
  tags?: string[]
  is_premium: boolean
  is_published: boolean
  is_active: boolean
  device_type?: string
  width: number
  height: number
  download_count: number
  created_at: string
  file_size?: number
  seo_score?: number
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

type ViewMode = 'grid' | 'list' | 'compact'
type SortOption = 'newest' | 'oldest' | 'title' | 'downloads' | 'resolution'

const initialFormData: CollectionFormData = {
  name: '',
  slug: '',
  description: '',
  cover_image_url: '',
  is_featured: false,
  is_active: true,
  sort_order: 0
}

export function EnhancedCollectionManagement() {
  const { profile } = useAuth()
  const { theme } = useTheme()
  
  // State management
  const [collections, setCollections] = useState<Collection[]>([])
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([])
  const [availableWallpapers, setAvailableWallpapers] = useState<Wallpaper[]>([])
  const [collectionWallpapers, setCollectionWallpapers] = useState<Wallpaper[]>([])
  const [selectedWallpaperIds, setSelectedWallpaperIds] = useState<Set<number>>(new Set())
  
  // Loading states
  const [loading, setLoading] = useState(true)
  const [loadingWallpapers, setLoadingWallpapers] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  // UI states
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCollection, setEditingCollection] = useState<string | null>(null)
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [showWallpaperManagement, setShowWallpaperManagement] = useState(false)
  
  // Search and filtering
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [premiumFilter, setPremiumFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  
  // Form data
  const [formData, setFormData] = useState<CollectionFormData>(initialFormData)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 48
  
  // Refresh trigger for forcing data reload
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  // Categories for filtering
  const [categories, setCategories] = useState<Array<{id: number, name: string}>>([])
  
  const isAdmin = profile?.is_admin === true
  
  // Debounced search
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  
  // Load collections on mount
  useEffect(() => {
    if (isAdmin) {
      loadCollections()
      loadCategories()
    }
  }, [isAdmin])
  
  // Load wallpapers when search/filter changes
  useEffect(() => {
    if (showWallpaperManagement && selectedCollection) {
      loadWallpapers()
    }
  }, [debouncedSearchQuery, categoryFilter, premiumFilter, sortBy, currentPage, showWallpaperManagement, selectedCollection, refreshTrigger])
  
  // Persist view mode preference
  useEffect(() => {
    const savedViewMode = localStorage.getItem('admin-wallpaper-view-mode') as ViewMode
    if (savedViewMode && ['grid', 'list', 'compact'].includes(savedViewMode)) {
      setViewMode(savedViewMode)
    }
  }, [])
  
  useEffect(() => {
    localStorage.setItem('admin-wallpaper-view-mode', viewMode)
  }, [viewMode])
  
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
  
  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      setCategories(data || [])
    } catch (error: any) {
      console.error('Error loading categories:', error)
    }
  }
  
  const triggerRefresh = () => {
    // Small delay to ensure database operations complete
    setTimeout(() => {
      setRefreshTrigger(prev => prev + 1)
    }, 100)
  }
  
  const loadWallpapers = async () => {
    if (!selectedCollection) return
    
    setLoadingWallpapers(true)
    try {
      const session = await supabase.auth.getSession()
      
      // Build query parameters
      const params = new URLSearchParams({
        collection_id: selectedCollection.id,
        search: debouncedSearchQuery,
        category: categoryFilter !== 'all' ? categoryFilter : '',
        premium: premiumFilter !== 'all' ? premiumFilter : '',
        sort: sortBy,
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      })
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enhanced-collection-management?action=wallpapers&${params}`,
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
        setAvailableWallpapers(result.data?.available_wallpapers || [])
        setCollectionWallpapers(result.data?.collection_wallpapers || [])
        setTotalPages(result.data?.pagination?.total_pages || 1)
      } else {
        console.error('Failed to load wallpapers')
        toast.error('Failed to load wallpapers')
      }
    } catch (error: any) {
      console.error('Error loading wallpapers:', error)
      toast.error('Failed to load wallpapers')
    } finally {
      setLoadingWallpapers(false)
    }
  }
  
  const handleWallpaperSelection = (wallpaperId: number, isSelected: boolean) => {
    setSelectedWallpaperIds(prev => {
      const newSet = new Set(prev)
      if (isSelected) {
        newSet.add(wallpaperId)
      } else {
        newSet.delete(wallpaperId)
      }
      return newSet
    })
  }
  
  const handleBulkAddToCollection = async () => {
    if (!selectedCollection || selectedWallpaperIds.size === 0) return
    
    setSaving(true)
    try {
      const session = await supabase.auth.getSession()
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enhanced-collection-management`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'add_wallpapers',
            collection_id: selectedCollection.id,
            wallpaper_ids: Array.from(selectedWallpaperIds)
          })
        }
      )

      if (response.ok) {
        toast.success(`Added ${selectedWallpaperIds.size} wallpapers to collection`)
        setSelectedWallpaperIds(new Set())
        triggerRefresh() // Force refresh of wallpapers data
        loadCollections() // Refresh wallpaper counts
      } else {
        toast.error('Failed to add wallpapers to collection')
      }
    } catch (error: any) {
      console.error('Error adding wallpapers:', error)
      toast.error('Failed to add wallpapers to collection')
    } finally {
      setSaving(false)
    }
  }
  
  const handleBulkRemoveFromCollection = async () => {
    if (!selectedCollection || selectedWallpaperIds.size === 0) return
    
    setSaving(true)
    try {
      const session = await supabase.auth.getSession()
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enhanced-collection-management`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'remove_wallpapers',
            collection_id: selectedCollection.id,
            wallpaper_ids: Array.from(selectedWallpaperIds)
          })
        }
      )

      if (response.ok) {
        toast.success(`Removed ${selectedWallpaperIds.size} wallpapers from collection`)
        setSelectedWallpaperIds(new Set())
        triggerRefresh() // Force refresh of wallpapers data
        loadCollections() // Refresh wallpaper counts
      } else {
        toast.error('Failed to remove wallpapers from collection')
      }
    } catch (error: any) {
      console.error('Error removing wallpapers:', error)
      toast.error('Failed to remove wallpapers from collection')
    } finally {
      setSaving(false)
    }
  }
  
  const resetFilters = () => {
    setSearchQuery('')
    setCategoryFilter('all')
    setPremiumFilter('all')
    setSortBy('newest')
    setCurrentPage(1)
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
  
  const handleEditCollection = async () => {
    if (!editingCollection) return
    
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
            id: editingCollection,
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
  
  const getThumbnailSize = () => {
    switch (viewMode) {
      case 'compact': return 'w-16 h-20'
      case 'list': return 'w-20 h-24'
      case 'grid': return 'w-32 h-40'
      default: return 'w-32 h-40'
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-theme-primary">Enhanced Collections Management</h2>
          <p className="text-theme-secondary mt-1">Manage collections and their wallpapers with advanced search and filtering</p>
        </div>
        
        {!showWallpaperManagement && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Collection</span>
          </button>
        )}
        
        {showWallpaperManagement && (
          <button
            onClick={() => {
              setShowWallpaperManagement(false)
              setSelectedCollection(null)
              resetFilters()
            }}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Back to Collections</span>
          </button>
        )}
      </div>
      
      {/* Collections List View */}
      {!showWallpaperManagement && (
        <div className="space-y-6">
          {/* Create Form */}
          {showCreateForm && (
            <CollectionForm
              formData={formData}
              setFormData={setFormData}
              onSave={handleCreateCollection}
              onCancel={() => {
                setShowCreateForm(false)
                setFormData(initialFormData)
              }}
              saving={saving}
              uploading={uploading}
              isCreate={true}
            />
          )}
          
          {/* Edit Form */}
          {editingCollection && (
            <CollectionForm
              formData={formData}
              setFormData={setFormData}
              onSave={handleEditCollection}
              onCancel={() => {
                setEditingCollection(null)
                setFormData(initialFormData)
              }}
              saving={saving}
              uploading={uploading}
              isCreate={false}
            />
          )}

          {/* Collections Grid */}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
                {collections.map((collection) => (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                    onEdit={() => {
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
                    }}
                    onManageWallpapers={() => {
                      setSelectedCollection(collection)
                      setShowWallpaperManagement(true)
                    }}
                    onToggleActive={() => handleToggleActive(collection.id, collection.is_active)}
                    onDelete={() => handleDeleteCollection(collection.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Wallpaper Management View */}
      {showWallpaperManagement && selectedCollection && (
        <WallpaperManagementView
          collection={selectedCollection}
          availableWallpapers={availableWallpapers}
          collectionWallpapers={collectionWallpapers}
          selectedWallpaperIds={selectedWallpaperIds}
          onWallpaperSelection={handleWallpaperSelection}
          onBulkAdd={handleBulkAddToCollection}
          onBulkRemove={handleBulkRemoveFromCollection}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          premiumFilter={premiumFilter}
          onPremiumFilterChange={setPremiumFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          categories={categories}
          loading={loadingWallpapers}
          saving={saving}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onResetFilters={resetFilters}
        />
      )}
    </div>
  )
}

// Collection Card Component
interface CollectionCardProps {
  collection: Collection
  onEdit: () => void
  onManageWallpapers: () => void
  onToggleActive: () => void
  onDelete: () => void
}

function CollectionCard({ collection, onEdit, onManageWallpapers, onToggleActive, onDelete }: CollectionCardProps) {
  return (
    <div className="bg-theme-surface border border-theme-light rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Collection Cover */}
      <div className="aspect-video bg-gradient-to-br from-purple-500 to-blue-600 relative">
        {collection.cover_image_url ? (
          <img
            src={collection.cover_image_url}
            alt={collection.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-white/70" />
          </div>
        )}
        
        {/* Status Badges */}
        <div className="absolute top-2 left-2 flex space-x-1">
          {collection.is_featured && (
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
              <Crown className="w-3 h-3 mr-1" />
              Featured
            </span>
          )}
          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
            collection.is_active 
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {collection.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      
      {/* Collection Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-theme-primary truncate">{collection.name}</h3>
          <div className="flex items-center space-x-1 ml-2">
            <button
              onClick={onEdit}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Edit Collection"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleActive}
              className={`p-1 rounded transition-colors ${
                collection.is_active 
                  ? 'text-green-600 hover:bg-green-50' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title={`${collection.is_active ? 'Deactivate' : 'Activate'} Collection`}
            >
              {collection.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button
              onClick={onDelete}
              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete Collection"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {collection.description && (
          <p className="text-theme-secondary text-sm mb-3 line-clamp-2">{collection.description}</p>
        )}
        
        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-theme-muted mb-3">
          <span>{collection.wallpaper_count} wallpapers</span>
          <span>{collection.view_count} views</span>
        </div>
        
        {/* Actions */}
        <button
          onClick={onManageWallpapers}
          className="w-full inline-flex items-center justify-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
        >
          <Grid className="w-4 h-4" />
          <span>Manage Wallpapers</span>
        </button>
      </div>
    </div>
  )
}

// Collection Form Component
interface CollectionFormProps {
  formData: CollectionFormData
  setFormData: (data: CollectionFormData) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  uploading: boolean
  isCreate: boolean
}

function CollectionForm({ formData, setFormData, onSave, onCancel, saving, uploading, isCreate }: CollectionFormProps) {
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .trim()
  }
  
  return (
    <div className="bg-theme-surface border border-theme-light p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-theme-primary">
          {isCreate ? 'Create New Collection' : 'Edit Collection'}
        </h3>
        <button onClick={onCancel} className="text-theme-tertiary hover:text-theme-secondary transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-theme-primary mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value
                setFormData({
                  ...formData,
                  name,
                  slug: formData.slug || generateSlug(name)
                })
              }}
              className="w-full px-3 py-2 border border-theme-light rounded-md bg-theme-background text-theme-primary focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter collection name"
              required
            />
          </div>
          
          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-theme-primary mb-1">Slug</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-3 py-2 border border-theme-light rounded-md bg-theme-background text-theme-primary focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter URL slug"
              required
            />
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-theme-primary mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-theme-light rounded-md bg-theme-background text-theme-primary focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter collection description"
              rows={3}
            />
          </div>
        </div>
        
        <div className="space-y-4">
          {/* Cover Image URL */}
          <div>
            <label className="block text-sm font-medium text-theme-primary mb-1">Cover Image URL</label>
            <input
              type="url"
              value={formData.cover_image_url}
              onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
              className="w-full px-3 py-2 border border-theme-light rounded-md bg-theme-background text-theme-primary focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter cover image URL"
            />
          </div>
          
          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-theme-primary mb-1">Sort Order</label>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-theme-light rounded-md bg-theme-background text-theme-primary focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter sort order"
              min="0"
            />
          </div>
          
          {/* Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="w-4 h-4 text-purple-600 border-theme-light rounded focus:ring-purple-500"
              />
              <span className="text-sm text-theme-primary">Featured Collection</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-purple-600 border-theme-light rounded focus:ring-purple-500"
              />
              <span className="text-sm text-theme-primary">Active (Visible to users)</span>
            </label>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-theme-light">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-theme-secondary hover:text-theme-primary transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving || !formData.name.trim() || !formData.slug.trim()}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          <span>{isCreate ? 'Create Collection' : 'Save Changes'}</span>
        </button>
      </div>
    </div>
  )
}

// Wallpaper Management View Component
interface WallpaperManagementViewProps {
  collection: Collection
  availableWallpapers: Wallpaper[]
  collectionWallpapers: Wallpaper[]
  selectedWallpaperIds: Set<number>
  onWallpaperSelection: (id: number, selected: boolean) => void
  onBulkAdd: () => void
  onBulkRemove: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
  categoryFilter: string
  onCategoryFilterChange: (category: string) => void
  premiumFilter: string
  onPremiumFilterChange: (filter: string) => void
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  categories: Array<{id: number, name: string}>
  loading: boolean
  saving: boolean
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  onResetFilters: () => void
}

function WallpaperManagementView({
  collection,
  availableWallpapers,
  collectionWallpapers,
  selectedWallpaperIds,
  onWallpaperSelection,
  onBulkAdd,
  onBulkRemove,
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  premiumFilter,
  onPremiumFilterChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  categories,
  loading,
  saving,
  currentPage,
  totalPages,
  onPageChange,
  onResetFilters
}: WallpaperManagementViewProps) {
  const [activeTab, setActiveTab] = useState<'available' | 'collection'>('available')
  
  const currentWallpapers = activeTab === 'available' ? availableWallpapers : collectionWallpapers
  
  return (
    <div className="space-y-6">
      {/* Collection Header */}
      <div className="bg-theme-surface border border-theme-light rounded-lg p-6">
        <div className="flex items-center space-x-4">
          {collection.cover_image_url && (
            <img
              src={collection.cover_image_url}
              alt={collection.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
          )}
          <div>
            <h3 className="text-xl font-bold text-theme-primary">{collection.name}</h3>
            <p className="text-theme-secondary">{collection.description}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-theme-muted">
              <span>{collection.wallpaper_count} wallpapers</span>
              <span>{collection.view_count} views</span>
              <span>Slug: {collection.slug}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Search and Filter Controls */}
      <div className="bg-theme-surface border border-theme-light rounded-lg p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Search */}
          <div className="lg:col-span-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search wallpapers..."
                className="w-full pl-10 pr-4 py-2 border border-theme-light rounded-md bg-theme-background text-theme-primary focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Category Filter */}
          <div className="lg:col-span-2">
            <select
              value={categoryFilter}
              onChange={(e) => onCategoryFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-theme-light rounded-md bg-theme-background text-theme-primary focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id.toString()}>{category.name}</option>
              ))}
            </select>
          </div>
          
          {/* Premium Filter */}
          <div className="lg:col-span-2">
            <select
              value={premiumFilter}
              onChange={(e) => onPremiumFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-theme-light rounded-md bg-theme-background text-theme-primary focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Content</option>
              <option value="free">Free Only</option>
              <option value="premium">Premium Only</option>
            </select>
          </div>
          
          {/* Sort */}
          <div className="lg:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="w-full px-3 py-2 border border-theme-light rounded-md bg-theme-background text-theme-primary focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Title A-Z</option>
              <option value="downloads">Most Downloaded</option>
              <option value="resolution">Highest Resolution</option>
            </select>
          </div>
          
          {/* View Mode */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => onViewModeChange('compact')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'compact' ? 'bg-purple-100 text-purple-600' : 'text-theme-muted hover:text-theme-primary'
                }`}
                title="Compact View"
              >
                <GridIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => onViewModeChange('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-purple-100 text-purple-600' : 'text-theme-muted hover:text-theme-primary'
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => onViewModeChange('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-purple-100 text-purple-600' : 'text-theme-muted hover:text-theme-primary'
                }`}
                title="List View"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Filter Actions */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-theme-light">
          <button
            onClick={onResetFilters}
            className="text-sm text-theme-muted hover:text-theme-primary transition-colors"
          >
            Reset Filters
          </button>
          
          <div className="text-sm text-theme-muted">
            {currentWallpapers.length} wallpapers found
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-theme-light">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('available')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'available'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-theme-muted hover:text-theme-primary'
            }`}
          >
            Available Wallpapers ({availableWallpapers.length})
          </button>
          <button
            onClick={() => setActiveTab('collection')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'collection'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-theme-muted hover:text-theme-primary'
            }`}
          >
            In Collection ({collectionWallpapers.length})
          </button>
        </div>
      </div>
      
      {/* Bulk Actions */}
      {selectedWallpaperIds.size > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-purple-900">
              {selectedWallpaperIds.size} wallpaper{selectedWallpaperIds.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex space-x-2">
              {activeTab === 'available' && (
                <button
                  onClick={onBulkAdd}
                  disabled={saving}
                  className="inline-flex items-center space-x-2 px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm"
                >
                  {saving && <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Add to Collection</span>
                </button>
              )}
              {activeTab === 'collection' && (
                <button
                  onClick={onBulkRemove}
                  disabled={saving}
                  className="inline-flex items-center space-x-2 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors text-sm"
                >
                  {saving && <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Remove from Collection</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Wallpapers Grid/List */}
      <div className="bg-theme-surface border border-theme-light rounded-lg">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-theme-secondary">Loading wallpapers...</p>
          </div>
        ) : currentWallpapers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-theme-secondary">
              {activeTab === 'available' ? 'No wallpapers available' : 'No wallpapers in this collection'}
            </p>
          </div>
        ) : (
          <>
            <WallpaperGrid
              wallpapers={currentWallpapers}
              selectedIds={selectedWallpaperIds}
              onSelectionChange={onWallpaperSelection}
              viewMode={viewMode}
              showInCollection={activeTab === 'collection'}
            />
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 p-4 border-t border-theme-light">
                <button
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-theme-light rounded-md text-theme-primary hover:bg-theme-tertiary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                
                <span className="text-sm text-theme-muted">
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-theme-light rounded-md text-theme-primary hover:bg-theme-tertiary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Wallpaper Grid Component
interface WallpaperGridProps {
  wallpapers: Wallpaper[]
  selectedIds: Set<number>
  onSelectionChange: (id: number, selected: boolean) => void
  viewMode: ViewMode
  showInCollection: boolean
}

function WallpaperGrid({ wallpapers, selectedIds, onSelectionChange, viewMode, showInCollection }: WallpaperGridProps) {
  const getGridClasses = () => {
    switch (viewMode) {
      case 'compact':
        return 'grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-16 gap-2 p-4'
      case 'list':
        return 'divide-y divide-theme-light'
      case 'grid':
      default:
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 p-4'
    }
  }
  
  if (viewMode === 'list') {
    return (
      <div className={getGridClasses()}>
        {wallpapers.map((wallpaper) => (
          <WallpaperListItem
            key={wallpaper.id}
            wallpaper={wallpaper}
            isSelected={selectedIds.has(wallpaper.id)}
            onSelectionChange={onSelectionChange}
            showInCollection={showInCollection}
          />
        ))}
      </div>
    )
  }
  
  return (
    <div className={getGridClasses()}>
      {wallpapers.map((wallpaper) => (
        <WallpaperGridItem
          key={wallpaper.id}
          wallpaper={wallpaper}
          isSelected={selectedIds.has(wallpaper.id)}
          onSelectionChange={onSelectionChange}
          viewMode={viewMode}
          showInCollection={showInCollection}
        />
      ))}
    </div>
  )
}

// Wallpaper Grid Item Component
interface WallpaperGridItemProps {
  wallpaper: Wallpaper
  isSelected: boolean
  onSelectionChange: (id: number, selected: boolean) => void
  viewMode: ViewMode
  showInCollection: boolean
}

function WallpaperGridItem({ wallpaper, isSelected, onSelectionChange, viewMode, showInCollection }: WallpaperGridItemProps) {
  const getThumbnailSize = () => {
    switch (viewMode) {
      case 'compact': return 'aspect-[9/16] w-full'
      case 'grid': return 'aspect-[9/16] w-full'
      default: return 'aspect-[9/16] w-full'
    }
  }
  
  const getTextSize = () => {
    switch (viewMode) {
      case 'compact': return 'text-xs'
      case 'grid': return 'text-sm'
      default: return 'text-sm'
    }
  }
  
  return (
    <div className="relative group">
      {/* Selection Checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelectionChange(wallpaper.id, e.target.checked)}
          className="w-4 h-4 text-purple-600 border-white rounded shadow-sm focus:ring-purple-500"
        />
      </div>
      
      {/* Premium Badge */}
      {wallpaper.is_premium && (
        <div className="absolute top-2 right-2 z-10">
          <Crown className="w-4 h-4 text-yellow-500" />
        </div>
      )}
      
      {/* Thumbnail */}
      <div className={`${getThumbnailSize()} bg-gray-200 rounded-lg overflow-hidden cursor-pointer`}
           onClick={() => onSelectionChange(wallpaper.id, !isSelected)}>
        <img
          src={wallpaper.thumbnail_url || wallpaper.image_url}
          alt={wallpaper.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          loading="lazy"
        />
      </div>
      
      {/* Info Overlay (visible on hover for compact, always visible for grid) */}
      <div className={`${viewMode === 'compact' ? 'absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100' : 'mt-2'} transition-opacity duration-200 ${viewMode === 'compact' ? 'p-2 flex flex-col justify-end' : ''}`}>
        {viewMode === 'compact' ? (
          <div className="text-white">
            <p className="text-xs font-medium truncate">{wallpaper.title}</p>
            <p className="text-xs text-gray-300">{wallpaper.width}×{wallpaper.height}</p>
          </div>
        ) : (
          <div>
            <p className={`${getTextSize()} font-medium text-theme-primary truncate`}>{wallpaper.title}</p>
            <div className={`${getTextSize()} text-theme-muted flex items-center justify-between mt-1`}>
              <span>{wallpaper.width}×{wallpaper.height}</span>
              <span>{wallpaper.download_count} downloads</span>
            </div>
            {wallpaper.category_name && (
              <p className={`${getTextSize()} text-theme-tertiary mt-1`}>{wallpaper.category_name}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Wallpaper List Item Component
interface WallpaperListItemProps {
  wallpaper: Wallpaper
  isSelected: boolean
  onSelectionChange: (id: number, selected: boolean) => void
  showInCollection: boolean
}

function WallpaperListItem({ wallpaper, isSelected, onSelectionChange, showInCollection }: WallpaperListItemProps) {
  return (
    <div className="flex items-center space-x-4 p-4 hover:bg-theme-tertiary transition-colors">
      {/* Selection Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => onSelectionChange(wallpaper.id, e.target.checked)}
        className="w-4 h-4 text-purple-600 border-theme-light rounded focus:ring-purple-500"
      />
      
      {/* Thumbnail */}
      <div className="w-20 h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
        <img
          src={wallpaper.thumbnail_url || wallpaper.image_url}
          alt={wallpaper.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-theme-primary truncate">{wallpaper.title}</h4>
            {wallpaper.description && (
              <p className="text-sm text-theme-secondary mt-1 line-clamp-2">{wallpaper.description}</p>
            )}
            <div className="flex items-center space-x-4 mt-2 text-xs text-theme-muted">
              <span>{wallpaper.width}×{wallpaper.height}</span>
              <span>{wallpaper.download_count} downloads</span>
              {wallpaper.category_name && <span>{wallpaper.category_name}</span>}
              {wallpaper.file_size && <span>{(wallpaper.file_size / 1024 / 1024).toFixed(1)} MB</span>}
              {wallpaper.seo_score && <span>SEO: {wallpaper.seo_score}%</span>}
            </div>
            {wallpaper.tags && wallpaper.tags.length > 0 && (
              <div className="flex items-center space-x-1 mt-2">
                <Tag className="w-3 h-3 text-theme-muted" />
                <div className="flex flex-wrap gap-1">
                  {wallpaper.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="inline-block px-2 py-1 text-xs bg-theme-tertiary text-theme-primary rounded-full">
                      {tag}
                    </span>
                  ))}
                  {wallpaper.tags.length > 3 && (
                    <span className="text-xs text-theme-muted">+{wallpaper.tags.length - 3} more</span>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Badges */}
          <div className="flex flex-col items-end space-y-1 ml-4">
            {wallpaper.is_premium && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </span>
            )}
            {!wallpaper.is_active && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                Inactive
              </span>
            )}
            {!wallpaper.is_published && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                Unpublished
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EnhancedCollectionManagement