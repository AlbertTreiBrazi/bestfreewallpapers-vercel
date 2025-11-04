import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import { Plus, Edit, Trash2, Upload, Image as ImageIcon, Search, Filter, Crown, ChevronDown, Monitor, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import { CollectionCoverUpload } from './CollectionCoverUpload'
import { CategorySearchModal } from './CategorySearchModal'
import { LiveWallpaperSection } from './LiveWallpaperSection'

interface Wallpaper {
  id: number
  title: string
  description: string | null
  image_url: string
  thumbnail_url: string | null
  category_id: number | null
  tags: string[] | null
  is_premium: boolean
  is_published: boolean
  is_active: boolean
  device_type: string | null
  width: number
  height: number
  download_count: number
  created_at: string
  asset_4k_url?: string | null
  asset_8k_url?: string | null
  show_4k?: boolean
  show_8k?: boolean
  live_video_url?: string | null
  live_poster_url?: string | null
  live_enabled?: boolean
  local_video_path?: string | null
  video_file_size?: number | null
  video_duration?: number | null
}

interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  is_active: boolean
  parent_id: number | null
  is_premium: boolean
  sort_order: number
}

interface Collection {
  id: number
  name: string
  slug: string
  description: string | null
  cover_image_url: string | null
  is_featured: boolean
  is_active: boolean
  sort_order: number
  wallpaper_count: number
  created_at: string
  // Frontend compatibility fields
  thumbnail_url?: string | null
  is_published?: boolean
}

export function WallpaperManagement() {
  const { theme } = useTheme()
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [showCollectionWallpapersModal, setShowCollectionWallpapersModal] = useState(false)
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [collectionWallpapers, setCollectionWallpapers] = useState<Wallpaper[]>([])
  const [availableWallpapers, setAvailableWallpapers] = useState<Wallpaper[]>([])
  const [selectedWallpaperIds, setSelectedWallpaperIds] = useState<Set<number>>(new Set())
  const [managingCollectionWallpapers, setManagingCollectionWallpapers] = useState(false)
  const [editingWallpaper, setEditingWallpaper] = useState<Wallpaper | null>(null)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [showCollections, setShowCollections] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile')
  const itemsPerPage = 50 // Increased from 20

  // Default form values with mobile-optimized resolution and 4K/8K controls
  const getDefaultFormData = () => ({
    title: '',
    description: '',
    image_url: '',
    thumbnail_url: '',
    category_id: '',
    tags: '',
    is_premium: false,
    is_published: true,
    is_active: true,
    device_type: 'mobile',
    width: 1620,
    height: 2880,
    asset_4k_url: '',
    asset_8k_url: '',
    show_4k: false,
    show_8k: false,
    live_video_url: '',
    live_poster_url: '',
    live_enabled: false,
    local_video_path: null,
    video_file_size: null,
    video_duration: null
  })

  // Form persistence key for localStorage
  const FORM_STORAGE_KEY = 'wallpaper-form-draft'

  // Load persisted form data or defaults
  const loadPersistedFormData = () => {
    try {
      const saved = localStorage.getItem(FORM_STORAGE_KEY)
      if (saved) {
        const parsedData = JSON.parse(saved)
        // Validate the data structure
        if (parsedData && typeof parsedData === 'object') {
          return { ...getDefaultFormData(), ...parsedData }
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted form data:', error)
    }
    return getDefaultFormData()
  }

  const [formData, setFormData] = useState(loadPersistedFormData)
  const [isUsingDefaults, setIsUsingDefaults] = useState(true)

  const [collectionFormData, setCollectionFormData] = useState({
    name: '',
    slug: '',
    description: '',
    thumbnail_url: '',
    is_featured: false,
    is_published: true,
    sort_order: 0
  })

  // Enhanced setFormData with persistence
  const updateFormData = (updates: Partial<typeof formData> | ((prev: typeof formData) => typeof formData)) => {
    setFormData(prev => {
      const newData = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates }
      
      // Check if using default resolution values
      const usingDefaults = newData.width === 1620 && newData.height === 2880
      setIsUsingDefaults(usingDefaults)
      
      // Persist to localStorage (don't persist if editing existing wallpaper)
      if (!editingWallpaper) {
        try {
          localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(newData))
        } catch (error) {
          console.warn('Failed to persist form data:', error)
        }
      }
      
      return newData
    })
  }

  // Clear persisted form data
  const clearPersistedFormData = () => {
    try {
      localStorage.removeItem(FORM_STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to clear persisted form data:', error)
    }
  }

  // Load preview mode from URL parameter and localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const urlPreview = urlParams.get('preview')
    
    if (urlPreview === 'mobile' || urlPreview === 'desktop') {
      setPreviewMode(urlPreview)
    } else {
      // Try loading from localStorage
      const savedPreview = localStorage.getItem('wallpaper-preview-mode')
      if (savedPreview === 'mobile' || savedPreview === 'desktop') {
        setPreviewMode(savedPreview)
      }
    }
  }, [])

  useEffect(() => {
    if (!showCollections) {
      loadWallpapers()
    } else {
      loadCollections()
    }
    loadCategories()
  }, [searchQuery, selectedCategory, currentPage, showCollections])

  // Load persisted data when component mounts or modal opens
  useEffect(() => {
    if (showAddModal && !editingWallpaper) {
      // Load persisted data when opening add modal
      const persistedData = loadPersistedFormData()
      setFormData(persistedData)
      setIsUsingDefaults(persistedData.width === 1620 && persistedData.height === 2880)
    }
  }, [showAddModal, editingWallpaper])

  const loadWallpapers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('wallpaper-management', {
        body: {
          action: 'list',
          page: currentPage,
          limit: itemsPerPage,
          category: selectedCategory !== 'all' ? selectedCategory : null,
          search: searchQuery || null
        }
      })

      if (error) throw error
      
      if (data?.data) {
        setWallpapers(data.data.data || [])
        setTotalPages(data.data.pagination?.totalPages || 1)
        setTotalCount(data.data.pagination?.totalCount || 0)
      }
    } catch (error: any) {
      console.error('Failed to load wallpapers:', error)
      toast.error('Failed to load wallpapers')
      setWallpapers([])
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('wallpaper-management', {
        body: { action: 'categories' }
      })

      if (error) throw error
      setCategories(data.data || [])
    } catch (error: any) {
      console.error('Failed to load categories:', error)
    }
  }

  const loadCollections = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('wallpaper-management', {
        body: { action: 'collections' }
      })

      if (error) throw error
      
      // Map backend field names to frontend expectations
      const mappedCollections = (data.data || []).map(collection => ({
        ...collection,
        thumbnail_url: collection.cover_image_url,
        is_published: collection.is_active
      }))
      
      setCollections(mappedCollections)
    } catch (error: any) {
      console.error('Failed to load collections:', error)
      toast.error('Failed to load collections')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!file) return null

    // Validate file before upload
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const fileType = file.type.toLowerCase()
    
    if (!allowedTypes.includes(fileType)) {
      toast.error(`File type not allowed. Allowed types: JPG, PNG, WEBP`)
      return null
    }
    
    if (file.size > maxSize) {
      toast.error(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB, your file: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
      return null
    }

    setUploading(true)
    const toastId = toast.loading('Uploading image...')
    
    try {
      // Convert file to base64
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
      })

      const base64Data = await base64Promise
      const fileName = `wallpaper-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

      console.log('Starting upload:', {
        fileName,
        fileSize: file.size,
        fileType: file.type
      })

      const { data, error } = await supabase.functions.invoke('wallpaper-management', {
        body: {
          action: 'upload-image',
          imageData: base64Data,
          fileName
        }
      })

      console.log('Upload response:', { data, error })

      if (error) {
        console.error('Upload error details:', error)
        throw new Error(error.message || 'Upload failed')
      }
      
      if (!data?.data?.url) {
        console.error('No URL returned from upload:', data)
        throw new Error('No download URL generated after upload')
      }
      
      toast.dismiss(toastId)
      toast.success(`Image uploaded successfully! File: ${fileName}`)
      
      console.log('Upload successful:', {
        url: data.data.url,
        fileName: data.data.fileName,
        fileSize: data.data.fileSize
      })
      
      return data.data.url
    } catch (error: any) {
      console.error('Upload failed:', error)
      toast.dismiss(toastId)
      
      let errorMessage = 'Unknown error occurred'
      if (error.message) {
        if (error.message.includes('File type')) {
          errorMessage = error.message
        } else if (error.message.includes('File too large')) {
          errorMessage = error.message
        } else if (error.message.includes('Invalid image data')) {
          errorMessage = 'Invalid image file. Please select a valid JPG, PNG, or WEBP image.'
        } else if (error.message.includes('Upload failed')) {
          errorMessage = `Upload failed: ${error.message}`
        } else {
          errorMessage = `Upload error: ${error.message}`
        }
      }
      
      toast.error(errorMessage)
      return null
    } finally {
      setUploading(false)
    }
  }

  // URL validation function
  const validateUrl = (url: string): boolean => {
    if (!url.trim()) return true // Empty is valid (optional field)
    try {
      const urlObj = new URL(url)
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
    } catch {
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.image_url) {
      toast.error('Title and image URL are required')
      return
    }

    // Validate live wallpaper URLs if enabled
    if (formData.live_enabled) {
      if (!formData.live_video_url?.trim()) {
        toast.error('Live video URL is required when live wallpaper is enabled')
        return
      }
      
      if (!validateUrl(formData.live_video_url)) {
        toast.error('Please enter a valid video URL (must start with http:// or https://)')
        return
      }
      
      if (formData.live_poster_url && !validateUrl(formData.live_poster_url)) {
        toast.error('Please enter a valid poster URL (must start with http:// or https://)')
        return
      }
    }

    setLoading(true)
    try {
      // Generate slug if not present
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
      
      const payload = {
        ...formData,
        slug: slug,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []
      }
      

      // Validate required fields
      if (!payload.category_id) {
        throw new Error('Please select a specific category for the wallpaper')
      }

      const { data, error } = await supabase.functions.invoke('wallpaper-management', {
        body: {
          action: editingWallpaper ? 'update' : 'create',
          id: editingWallpaper?.id,
          ...payload
        }
      })

      if (error) throw error
      
      toast.success(`Wallpaper ${editingWallpaper ? 'updated' : 'created'} successfully`)
      setShowAddModal(false)
      setEditingWallpaper(null)
      resetForm(true) // Clear persisted data on success
      loadWallpapers()
    } catch (error: any) {
      console.error('Failed to save wallpaper:', error)
      toast.error(`Failed to ${editingWallpaper ? 'update' : 'create'} wallpaper`)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (wallpaper: Wallpaper) => {
    setEditingWallpaper(wallpaper)
    const editData = {
      title: wallpaper.title,
      description: wallpaper.description || '',
      image_url: wallpaper.image_url,
      thumbnail_url: wallpaper.thumbnail_url || '',
      category_id: wallpaper.category_id?.toString() || '',
      tags: wallpaper.tags?.join(', ') || '',
      is_premium: wallpaper.is_premium,
      is_published: wallpaper.is_published,
      is_active: wallpaper.is_active,
      device_type: wallpaper.device_type || 'mobile',
      width: wallpaper.width,
      height: wallpaper.height,
      asset_4k_url: wallpaper.asset_4k_url || '',
      asset_8k_url: wallpaper.asset_8k_url || '',
      show_4k: wallpaper.show_4k || false,
      show_8k: wallpaper.show_8k || false,
      live_video_url: wallpaper.live_video_url || '',
      live_poster_url: wallpaper.live_poster_url || '',
      live_enabled: wallpaper.live_enabled || false,
      local_video_path: wallpaper.local_video_path || null,
      video_file_size: wallpaper.video_file_size || null,
      video_duration: wallpaper.video_duration || null
    }
    // Don't persist when editing existing wallpaper
    setFormData(editData)
    setIsUsingDefaults(editData.width === 1620 && editData.height === 2880)
    setShowAddModal(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this wallpaper?')) return

    // Get the wallpaper info for better confirmation
    const wallpaper = wallpapers.find(w => w.id === id)
    const wallpaperTitle = wallpaper?.title || `Wallpaper #${id}`
    
    // Enhanced confirmation for wallpapers with downloads
    if (wallpaper?.download_count && wallpaper.download_count > 0) {
      const confirmMessage = `This wallpaper "${wallpaperTitle}" has ${wallpaper.download_count} downloads and may have associated records. Are you sure you want to delete it? This will automatically remove all associated downloads and premium orders.`
      if (!confirm(confirmMessage)) return
    }

    setLoading(true)
    try {
      // Use the new CASCADE deletion system
      const { data, error } = await supabase.functions.invoke('delete-wallpaper-complete', {
        body: { wallpaper_id: id }
      })

      if (error) throw error
      
      // Show detailed success message
      const successMessage = data?.data?.message || `Wallpaper "${wallpaperTitle}" deleted successfully`
      const cascadeInfo = data?.data?.cascade_verification
      
      if (cascadeInfo && (cascadeInfo.remaining_downloads === 0 && cascadeInfo.remaining_orders === 0)) {
        toast.success(`${successMessage} (Including all associated records)`)
      } else {
        toast.success(successMessage)
      }
      
      console.log('CASCADE Deletion Details:', data?.data)
      loadWallpapers()
    } catch (error: any) {
      console.error('Failed to delete wallpaper:', error)
      const errorMessage = error.message || 'Failed to delete wallpaper'
      
      // Show user-friendly error messages
      if (errorMessage.includes('foreign key')) {
        toast.error('Cannot delete wallpaper: It has associated records. Please contact support.')
      } else if (errorMessage.includes('not found')) {
        toast.error('Wallpaper not found. It may have been deleted already.')
      } else {
        toast.error(`Failed to delete wallpaper: ${errorMessage}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const resetForm = (clearPersisted = true) => {
    const defaultData = getDefaultFormData()
    setFormData(defaultData)
    setIsUsingDefaults(true)
    
    if (clearPersisted) {
      clearPersistedFormData()
    }
  }

  const handlePreviewModeChange = (mode: 'mobile' | 'desktop') => {
    setPreviewMode(mode)
    // Persist to localStorage
    localStorage.setItem('wallpaper-preview-mode', mode)
    // Update URL parameter
    const url = new URL(window.location.href)
    url.searchParams.set('preview', mode)
    window.history.pushState({}, '', url.toString())
  }

  const resetToDefaults = () => {
    const currentData = { ...formData }
    const defaultData = getDefaultFormData()
    
    updateFormData({
      ...currentData,
      width: defaultData.width,
      height: defaultData.height,
      device_type: defaultData.device_type
    })
    
    setIsUsingDefaults(true)
    toast.success('Reset to mobile-optimized defaults (1620x2880)')
  }

  const resetCollectionForm = () => {
    setCollectionFormData({
      name: '',
      slug: '',
      description: '',
      thumbnail_url: '',
      is_featured: false,
      is_published: true,
      sort_order: 0
    })
  }

  const handleCategorySelect = (categoryId: number, categoryName: string) => {
    updateFormData({ category_id: categoryId.toString() })
    setShowCategoryModal(false)
  }

  const validateCollectionForm = (data: typeof collectionFormData): string | null => {
    if (!data.name.trim()) return 'Collection name is required'
    if (data.name.length > 100) return 'Collection name must be 100 characters or less'
    if (!data.slug.trim()) return 'Collection slug is required'
    if (data.slug.length > 100) return 'Collection slug must be 100 characters or less'
    if (data.description.length > 500) return 'Description must be 500 characters or less'
    if (data.thumbnail_url && data.thumbnail_url.length > 512) return 'Thumbnail URL must be 512 characters or less'
    
    // Basic URL validation for thumbnail
    if (data.thumbnail_url) {
      try {
        new URL(data.thumbnail_url)
      } catch {
        return 'Thumbnail URL must be a valid URL'
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

  const handleCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Generate slug if not provided
    const formDataWithSlug = {
      ...collectionFormData,
      slug: collectionFormData.slug.trim() || generateSlug(collectionFormData.name)
    }
    
    const validationError = validateCollectionForm(formDataWithSlug)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setLoading(true)
    try {
      const session = await supabase.auth.getSession()
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/collections-management`,
        {
          method: editingCollection ? 'PUT' : 'POST',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...(editingCollection && { id: editingCollection.id }),
            name: formDataWithSlug.name.trim(),
            slug: formDataWithSlug.slug.trim(),
            description: formDataWithSlug.description.trim() || null,
            cover_image_url: formDataWithSlug.thumbnail_url.trim() || null,
            is_featured: formDataWithSlug.is_featured,
            is_active: formDataWithSlug.is_published,
            sort_order: formDataWithSlug.sort_order
          })
        }
      )

      if (response.ok) {
        toast.success(`Collection ${editingCollection ? 'updated' : 'created'} successfully`)
        setShowCollectionModal(false)
        setEditingCollection(null)
        resetCollectionForm()
        loadCollections()
      } else {
        let errorMessage = `Failed to ${editingCollection ? 'update' : 'create'} collection`
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
          console.error('Collection operation error:', errorText)
          if (errorText.includes('duplicate') || errorText.includes('unique')) {
            errorMessage = 'A collection with this slug already exists. Please modify the name or slug.'
          }
        }
        toast.error(errorMessage)
      }
    } catch (error: any) {
      console.error('Error saving collection:', error)
      let errorMessage = `Failed to ${editingCollection ? 'update' : 'create'} collection`
      if (error.message && (error.message.includes('duplicate') || error.message.includes('unique'))) {
        errorMessage = 'A collection with this slug already exists. Please modify the name or slug.'
      }
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleEditCollection = (collection: Collection) => {
    setEditingCollection(collection)
    setCollectionFormData({
      name: collection.name,
      slug: collection.slug,
      description: collection.description || '',
      thumbnail_url: collection.cover_image_url || collection.thumbnail_url || '',
      is_featured: collection.is_featured,
      is_published: collection.is_active ?? collection.is_published ?? true,
      sort_order: collection.sort_order
    })
    setShowCollectionModal(true)
  }

  const handleDeleteCollection = async (id: number) => {
    if (!confirm('Are you sure you want to delete this collection?')) return

    try {
      const { error } = await supabase.functions.invoke('collections-management', {
        body: { action: 'delete', id }
      })

      if (error) throw error
      
      toast.success('Collection deleted successfully')
      loadCollections()
    } catch (error: any) {
      console.error('Failed to delete collection:', error)
      toast.error('Failed to delete collection')
    }
  }

  // Collection Wallpaper Management Functions
  const handleManageCollectionWallpapers = async (collection: Collection) => {
    setSelectedCollection(collection)
    setManagingCollectionWallpapers(true)
    
    try {
      // Load current wallpapers in collection
      await loadCollectionWallpapers(collection.id)
      // Load all available wallpapers
      await loadAllAvailableWallpapers()
      
      setShowCollectionWallpapersModal(true)
    } catch (error: any) {
      console.error('Failed to load collection wallpapers:', error)
      toast.error('Failed to load collection wallpapers')
    } finally {
      setManagingCollectionWallpapers(false)
    }
  }

  const loadCollectionWallpapers = async (collectionId: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('collections-management', {
        body: {
          action: 'get_collection_wallpapers',
          collection_id: collectionId
        }
      })

      if (error) throw error
      
      const wallpapers = data?.data?.wallpapers || []
      setCollectionWallpapers(wallpapers)
      
      // Set currently selected wallpaper IDs
      const wallpaperIds: number[] = wallpapers.map((w: any) => Number(w.id))
      const currentIds = new Set<number>(wallpaperIds)
      setSelectedWallpaperIds(currentIds)
    } catch (error: any) {
      console.error('Failed to load collection wallpapers:', error)
      throw error
    }
  }

  const loadAllAvailableWallpapers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('wallpaper-management', {
        body: {
          action: 'list',
          page: 1,
          limit: 1000, // Load more wallpapers for selection
          search: null,
          category: null
        }
      })

      if (error) throw error
      
      setAvailableWallpapers(data?.data?.data || [])
    } catch (error: any) {
      console.error('Failed to load available wallpapers:', error)
      throw error
    }
  }

  const handleWallpaperToggle = (wallpaperId: number) => {
    const newSelected = new Set(selectedWallpaperIds)
    
    if (newSelected.has(wallpaperId)) {
      newSelected.delete(wallpaperId)
    } else {
      newSelected.add(wallpaperId)
    }
    
    setSelectedWallpaperIds(newSelected)
  }

  const handleSaveCollectionWallpapers = async () => {
    if (!selectedCollection) return
    
    setManagingCollectionWallpapers(true)
    
    try {
      const wallpaperIds = Array.from(selectedWallpaperIds)
      
      const { data, error } = await supabase.functions.invoke('collections-management', {
        body: {
          action: 'update_collection_wallpapers',
          collection_id: selectedCollection.id,
          wallpaper_ids: wallpaperIds
        }
      })

      if (error) throw error
      
      toast.success(`Successfully updated ${selectedCollection.name} with ${wallpaperIds.length} wallpapers`)
      setShowCollectionWallpapersModal(false)
      setSelectedCollection(null)
      setCollectionWallpapers([])
      setAvailableWallpapers([])
      setSelectedWallpaperIds(new Set())
      
      // Refresh collections list
      loadCollections()
    } catch (error: any) {
      console.error('Failed to save collection wallpapers:', error)
      toast.error('Failed to update collection wallpapers')
    } finally {
      setManagingCollectionWallpapers(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-theme-primary">
            {showCollections ? 'Wallpaper Collections Management' : 'Free Wallpaper Management'}
          </h2>
          <p className="text-theme-secondary">
            {showCollections 
              ? 'Organize wallpapers into curated collections' 
              : `Manage your free wallpaper collection (${totalCount} total wallpapers)`}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Toggle between Wallpapers and Collections */}
          <div className="flex items-center bg-theme-muted rounded-lg p-1">
            <button
              onClick={() => setShowCollections(false)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                !showCollections ? 'bg-theme-surface text-gray-600 shadow-sm' : 'text-theme-secondary'
              }`}
            >
              Wallpapers
            </button>
            <button
              onClick={() => setShowCollections(true)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                showCollections ? 'bg-theme-surface text-gray-600 shadow-sm' : 'text-theme-secondary'
              }`}
            >
              Collections
            </button>
          </div>
          
          {/* Preview Mode Toggle (only show for wallpapers view) */}
          {!showCollections && (
            <div className="flex items-center bg-theme-muted rounded-lg p-1">
              <button
                onClick={() => handlePreviewModeChange('mobile')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  previewMode === 'mobile' ? 'bg-theme-surface text-gray-600 shadow-sm' : 'text-theme-secondary'
                }`}
                title="Mobile Preview (9:16)"
              >
                <Smartphone className="w-4 h-4" />
                <span className="hidden sm:inline">Mobile</span>
              </button>
              <button
                onClick={() => handlePreviewModeChange('desktop')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  previewMode === 'desktop' ? 'bg-theme-surface text-gray-600 shadow-sm' : 'text-theme-secondary'
                }`}
                title="Desktop Preview (16:9)"
              >
                <Monitor className="w-4 h-4" />
                <span className="hidden sm:inline">Desktop</span>
              </button>
            </div>
          )}
          
          <button
            onClick={() => {
              if (showCollections) {
                setEditingCollection(null)
                resetCollectionForm()
                setShowCollectionModal(true)
              } else {
                setEditingWallpaper(null)
                resetForm()
                setShowAddModal(true)
              }
            }}
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            {showCollections ? 'Add Collection' : 'Add Free Wallpaper'}
          </button>
        </div>
      </div>

      {/* Filters */}
      {!showCollections && (
        <div className="bg-theme-surface border border-theme-light rounded-lg shadow p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-tertiary w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search wallpapers..."
                  className="w-full pl-10 pr-4 py-2 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-colors placeholder:text-theme-tertiary"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('all')
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 bg-theme-muted text-theme-primary rounded-lg hover:bg-theme-tertiary transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallpapers Grid */}
      {!showCollections && (
        <div className="bg-theme-surface rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
              <p className="mt-4 text-theme-secondary">Loading wallpapers...</p>
            </div>
          ) : wallpapers.length > 0 ? (
            <>
              <div className={`grid gap-4 p-6 ${
                previewMode === 'mobile' 
                  ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8' 
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              }`}>
                {wallpapers.map((wallpaper) => (
                  <div key={wallpaper.id} className="group relative bg-theme-muted rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300">
                    {/* Image */}
                    <div className={`overflow-hidden ${
                      previewMode === 'mobile' ? 'aspect-[9/16]' : 'aspect-video'
                    }`}>
                      <img
                        src={wallpaper.thumbnail_url || wallpaper.image_url}
                        alt={wallpaper.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                      {wallpaper.is_premium && (
                        <span className="inline-flex items-center px-2 py-1 bg-yellow-500 dark:bg-yellow-600 text-white text-xs font-semibold rounded-full shadow-sm">
                          <Crown className="w-3 h-3 mr-1" />
                          Premium
                        </span>
                      )}
                      {!wallpaper.is_published && (
                        <span className="px-2 py-1 bg-red-500 dark:bg-red-600 text-white text-xs font-semibold rounded-full shadow-sm">
                          Draft
                        </span>
                      )}
                      {!wallpaper.is_active && (
                        <span className="px-2 py-1 bg-gray-500 dark:bg-gray-600 text-white text-xs font-semibold rounded-full shadow-sm">
                          Inactive
                        </span>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(wallpaper)}
                        className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(wallpaper.id)}
                        className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Info */}
                    <div className={`p-4 ${
                      previewMode === 'mobile' ? 'p-3' : 'p-4'
                    }`}>
                      <h3 className="font-semibold text-theme-primary truncate mb-1">{wallpaper.title}</h3>
                      {previewMode === 'desktop' && (
                        <p className="text-sm text-theme-secondary mb-2">{wallpaper.width}x{wallpaper.height}</p>
                      )}
                      <p className="text-xs text-theme-tertiary">{wallpaper.download_count} downloads</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-theme-muted px-6 py-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-theme-secondary">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} wallpapers
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage <= 1}
                        className="px-3 py-2 text-sm font-medium text-theme-tertiary bg-theme-surface border border-theme-light rounded-md hover:bg-theme-muted disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-2 text-sm font-medium border rounded-md ${
                              currentPage === pageNum
                                ? 'bg-gray-600 text-white border-gray-600'
                                : 'text-theme-tertiary bg-theme-surface border-theme-light hover:bg-theme-muted'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage >= totalPages}
                        className="px-3 py-2 text-sm font-medium text-theme-tertiary bg-theme-surface border border-theme-light rounded-md hover:bg-theme-muted disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center">
              <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-theme-primary mb-2">No wallpapers found</h3>
              <p className="text-theme-secondary">Get started by adding your first wallpaper.</p>
            </div>
          )}
        </div>
      )}
      
      {/* Collections View */}
      {showCollections && (
        <div className="bg-theme-surface rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
              <p className="mt-4 text-theme-secondary">Loading collections...</p>
            </div>
          ) : collections.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {collections.map((collection) => (
                <div key={collection.id} className="group relative bg-theme-muted rounded-lg overflow-hidden">
                  {/* Collection Thumbnail */}
                  <div className="aspect-video overflow-hidden bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30">
                    {collection.thumbnail_url || collection.cover_image_url ? (
                      <img
                        src={collection.thumbnail_url || collection.cover_image_url}
                        alt={collection.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-purple-300 dark:text-purple-600" />
                      </div>
                    )}
                  </div>
                  
                  {/* Collection Badges */}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    {collection.is_featured && (
                      <span className="inline-flex items-center px-2 py-1 bg-yellow-500 dark:bg-yellow-600 text-white text-xs font-semibold rounded-full shadow-sm">
                        Featured
                      </span>
                    )}
                    {!collection.is_published && !collection.is_active && (
                      <span className="px-2 py-1 bg-red-500 dark:bg-red-600 text-white text-xs font-semibold rounded-full shadow-sm">
                        Draft
                      </span>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleManageCollectionWallpapers(collection)}
                      className="p-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      title="Manage Wallpapers"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditCollection(collection)}
                      className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      title="Edit Collection"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCollection(collection.id)}
                      className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      title="Delete Collection"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Collection Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-theme-primary truncate mb-1">{collection.name}</h3>
                    <p className="text-sm text-theme-secondary line-clamp-2 mb-2">
                      {collection.description || 'No description'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-theme-tertiary mb-3">
                      <span>{collection.wallpaper_count} wallpapers</span>
                      <span>Order: {collection.sort_order}</span>
                    </div>
                    
                    {/* Collection Cover Upload */}
                    <div className="border-t border-theme-light pt-3">
                      <CollectionCoverUpload
                        collectionId={collection.id.toString()}
                        currentCoverUrl={collection.cover_image_url || collection.thumbnail_url}
                        onUploadSuccess={(url) => {
                          // Update the collection in state
                          setCollections(prev => prev.map(c => 
                            c.id === collection.id 
                              ? { ...c, cover_image_url: url, thumbnail_url: url }
                              : c
                          ))
                        }}
                        className="max-w-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-theme-primary mb-2">No collections found</h3>
              <p className="text-theme-secondary mb-4">Get started by creating your first collection.</p>
              <button
                onClick={() => {
                  setEditingCollection(null)
                  resetCollectionForm()
                  setShowCollectionModal(true)
                }}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Collection
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-theme-surface rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-theme-primary">
                    {editingWallpaper ? 'Edit Free Wallpaper' : 'Add New Free Wallpaper'}
                  </h3>
                  {!editingWallpaper && (
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-theme-secondary">Form auto-saved</span>
                      </div>
                      {isUsingDefaults && (
                        <span className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-2 py-1 rounded-full">
                          Using mobile defaults (1620×2880)
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-theme-tertiary hover:text-theme-secondary"
                >
                  ×
                </button>
              </div>
              
              {/* Form Fields */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => updateFormData({ title: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="Enter wallpaper title"
                  />
                </div>
                
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateFormData({ description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="Enter wallpaper description"
                  />
                </div>
                
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Image Upload</label>
                  <div className="border-2 border-dashed border-theme-light rounded-lg p-6">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const url = await handleFileUpload(file)
                          if (url) {
                            updateFormData({ image_url: url, thumbnail_url: url })
                          }
                        }
                      }}
                      className="block w-full text-sm text-theme-tertiary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 dark:file:bg-purple-900/30 file:text-gray-700 dark:file:text-purple-200 hover:file:bg-purple-100 dark:hover:file:bg-purple-900/50"
                    />
                    {uploading && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Uploading image...</p>
                    )}
                  </div>
                </div>
                
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Image URL *</label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => updateFormData({ image_url: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Category *</label>
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(true)}
                    className="w-full px-3 py-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-left flex items-center justify-between bg-theme-surface hover:bg-theme-muted transition-colors"
                  >
                    <span className={formData.category_id ? 'text-theme-primary' : 'text-theme-tertiary'}>
                      {formData.category_id 
                        ? categories.find(cat => cat.id.toString() === formData.category_id)?.name || 'Unknown Category'
                        : 'Select a specific category *'
                      }
                    </span>
                    <ChevronDown className="w-5 h-5 text-theme-tertiary" />
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Device Type</label>
                  <select
                    value={formData.device_type}
                    onChange={(e) => updateFormData({ device_type: e.target.value })}
                    className="w-full px-3 py-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  >
                    <option value="desktop">Desktop</option>
                    <option value="mobile">Mobile</option>
                    <option value="tablet">Tablet</option>
                    <option value="all">All Devices</option>
                  </select>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-theme-secondary">Width</label>
                    {isUsingDefaults && (
                      <span className="text-xs text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 px-2 py-1 rounded-full">
                        Mobile Optimized
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={formData.width}
                    onChange={(e) => updateFormData({ width: parseInt(e.target.value) || 1620 })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent ${
                      isUsingDefaults && formData.width === 1620 
                        ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20' 
                        : 'border-theme-light'
                    }`}
                    placeholder="1620 (mobile default)"
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-theme-secondary">Height</label>
                    {!isUsingDefaults && (
                      <button
                        type="button"
                        onClick={resetToDefaults}
                        className="text-xs text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 px-2 py-1 rounded-full transition-colors"
                      >
                        Reset to Defaults
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    value={formData.height}
                    onChange={(e) => updateFormData({ height: parseInt(e.target.value) || 2880 })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent ${
                      isUsingDefaults && formData.height === 2880 
                        ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20' 
                        : 'border-theme-light'
                    }`}
                    placeholder="2880 (mobile default)"
                  />
                </div>
                
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => updateFormData({ tags: e.target.value })}
                    className="w-full px-3 py-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="nature, landscape, mountains"
                  />
                </div>

                {/* 4K/8K Asset Management */}
                <div className="lg:col-span-2">
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="text-lg font-semibold text-theme-primary mb-4 flex items-center">
                      High Resolution Assets
                      <span className="ml-2 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800 px-2 py-1 rounded-full">Premium Only</span>
                    </h4>
                    
                    {/* 4K Section */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-theme-secondary">4K Asset URL</label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.show_4k}
                            onChange={(e) => updateFormData({ show_4k: e.target.checked })}
                            className="rounded text-yellow-600 focus:ring-yellow-500"
                          />
                          <span className="ml-2 text-sm font-medium text-theme-secondary">Show 4K Button</span>
                        </label>
                      </div>
                      <input
                        type="url"
                        value={formData.asset_4k_url}
                        onChange={(e) => updateFormData({ asset_4k_url: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent ${
                          formData.show_4k ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20' : 'border-theme-light'
                        }`}
                        placeholder="https://example.com/wallpaper-4k.jpg"
                      />
                      {formData.asset_4k_url && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Preview: <a href={formData.asset_4k_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">View 4K Asset</a>
                        </p>
                      )}
                    </div>

                    {/* 8K Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-theme-secondary">8K Asset URL</label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.show_8k}
                            onChange={(e) => updateFormData({ show_8k: e.target.checked })}
                            className="rounded text-purple-600 focus:ring-purple-500"
                          />
                          <span className="ml-2 text-sm font-medium text-theme-secondary">Show 8K Button</span>
                        </label>
                      </div>
                      <input
                        type="url"
                        value={formData.asset_8k_url}
                        onChange={(e) => updateFormData({ asset_8k_url: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                          formData.show_8k ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20' : 'border-theme-light'
                        }`}
                        placeholder="https://example.com/wallpaper-8k.jpg"
                      />
                      {formData.asset_8k_url && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Preview: <a href={formData.asset_8k_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">View 8K Asset</a>
                        </p>
                      )}
                    </div>

                    {/* Live Wallpaper Section */}
                    <div className="mt-6 pt-6 border-t border-theme-light">
                      <LiveWallpaperSection
                        formData={{
                          live_enabled: formData.live_enabled,
                          live_video_url: formData.live_video_url,
                          live_poster_url: formData.live_poster_url,
                          local_video_path: formData.local_video_path || null,
                          video_file_size: formData.video_file_size || null,
                          video_duration: formData.video_duration || null
                        }}
                        onFormDataChange={(updates) => updateFormData(updates)}
                        wallpaperId={editingWallpaper?.id || null}
                        disabled={loading || uploading}
                      />
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-800 dark:text-blue-300">
                        <strong className="text-blue-900 dark:text-blue-200">Note:</strong> High resolution downloads are only available to premium users. Toggles control whether the 4K/8K buttons appear on the detail page.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_premium}
                    onChange={(e) => updateFormData({ is_premium: e.target.checked })}
                    className="rounded text-gray-600 focus:ring-gray-500"
                  />
                  <span className="ml-2 text-sm font-medium text-theme-secondary">Premium wallpaper</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) => updateFormData({ is_published: e.target.checked })}
                    className="rounded text-gray-600 focus:ring-gray-500"
                  />
                  <span className="ml-2 text-sm font-medium text-theme-secondary">Published</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => updateFormData({ is_active: e.target.checked })}
                    className="rounded text-gray-600 focus:ring-gray-500"
                  />
                  <span className="ml-2 text-sm font-medium text-theme-secondary">Active</span>
                </label>
              </div>
              
              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-theme-secondary bg-theme-muted rounded-lg hover:bg-theme-tertiary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || uploading}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingWallpaper ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Collection Modal */}
      {showCollectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-theme-surface rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleCollectionSubmit} className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-theme-primary">
                  {editingCollection ? 'Edit Collection' : 'Add New Collection'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCollectionModal(false)}
                  className="text-theme-tertiary hover:text-theme-secondary"
                >
                  ×
                </button>
              </div>
              
              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Name *</label>
                  <input
                    type="text"
                    value={collectionFormData.name}
                    onChange={(e) => setCollectionFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="Enter collection name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Slug</label>
                  <input
                    type="text"
                    value={collectionFormData.slug}
                    onChange={(e) => setCollectionFormData(prev => ({ ...prev, slug: e.target.value }))}
                    className="w-full px-3 py-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="collection-slug (auto-generated if empty)"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Description</label>
                  <textarea
                    value={collectionFormData.description}
                    onChange={(e) => setCollectionFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="Enter collection description"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Thumbnail URL</label>
                  <input
                    type="url"
                    value={collectionFormData.thumbnail_url}
                    onChange={(e) => setCollectionFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                    className="w-full px-3 py-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="https://example.com/thumbnail.jpg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Sort Order</label>
                  <input
                    type="number"
                    value={collectionFormData.sort_order}
                    onChange={(e) => setCollectionFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>
              
              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={collectionFormData.is_featured}
                    onChange={(e) => setCollectionFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
                    className="rounded text-gray-600 focus:ring-gray-500"
                  />
                  <span className="ml-2 text-sm font-medium text-theme-secondary">Featured collection</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={collectionFormData.is_published}
                    onChange={(e) => setCollectionFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                    className="rounded text-gray-600 focus:ring-gray-500"
                  />
                  <span className="ml-2 text-sm font-medium text-theme-secondary">Published</span>
                </label>
              </div>
              
              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCollectionModal(false)}
                  className="px-4 py-2 text-theme-secondary bg-theme-muted rounded-lg hover:bg-theme-tertiary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingCollection ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collection Wallpapers Management Modal */}
      {showCollectionWallpapersModal && selectedCollection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-theme-modal border border-theme-light rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-theme-primary">
                  Manage Wallpapers for "{selectedCollection.name}"
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCollectionWallpapersModal(false)}
                  className="text-theme-tertiary hover:text-theme-secondary"
                >
                  ×
                </button>
              </div>

              {managingCollectionWallpapers ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
                  <p className="mt-4 text-theme-secondary">Loading wallpapers...</p>
                </div>
              ) : (
                <>
                  {/* Current Selection Summary */}
                  <div className="bg-theme-muted rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-theme-primary">Selected Wallpapers</h4>
                        <p className="text-sm text-theme-secondary">
                          {selectedWallpaperIds.size} wallpapers selected for this collection
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedWallpaperIds(new Set())}
                          className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        >
                          Clear All
                        </button>
                        <button
                          onClick={() => setSelectedWallpaperIds(new Set(availableWallpapers.map(w => w.id)))}
                          className="px-3 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                        >
                          Select All
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Available Wallpapers Grid */}
                  <div>
                    <h4 className="font-medium text-theme-primary mb-4">Available Wallpapers</h4>
                    {availableWallpapers.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-h-96 overflow-y-auto">
                        {availableWallpapers.map((wallpaper) => {
                          const isSelected = selectedWallpaperIds.has(wallpaper.id)
                          return (
                            <div
                              key={wallpaper.id}
                              className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                                isSelected
                                  ? 'border-green-500 dark:border-green-600 ring-2 ring-green-200 dark:ring-green-800'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                              }`}
                              onClick={() => handleWallpaperToggle(wallpaper.id)}
                            >
                              {/* Image */}
                              <div className="aspect-video overflow-hidden">
                                <img
                                  src={wallpaper.thumbnail_url || wallpaper.image_url}
                                  alt={wallpaper.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              {/* Selection Overlay */}
                              <div className={`absolute inset-0 bg-green-500 dark:bg-green-600 bg-opacity-20 dark:bg-opacity-30 transition-opacity ${
                                isSelected ? 'opacity-100' : 'opacity-0'
                              }`}>
                                <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 dark:bg-green-600 rounded-full flex items-center justify-center shadow-sm">
                                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </div>

                              {/* Wallpaper Info */}
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white p-2">
                                <h5 className="text-xs font-medium truncate">{wallpaper.title}</h5>
                                <p className="text-xs opacity-75">{wallpaper.width}x{wallpaper.height}</p>
                              </div>

                              {/* Premium Badge */}
                              {wallpaper.is_premium && (
                                <div className="absolute top-2 left-2">
                                  <span className="inline-flex items-center px-2 py-1 bg-yellow-500 dark:bg-yellow-600 text-white text-xs font-semibold rounded-full shadow-sm">
                                    <Crown className="w-3 h-3 mr-1" />
                                    Premium
                                  </span>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-theme-secondary">No wallpapers available</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setShowCollectionWallpapersModal(false)}
                      className="px-4 py-2 text-theme-secondary bg-theme-muted rounded-lg hover:bg-theme-tertiary transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveCollectionWallpapers}
                      disabled={managingCollectionWallpapers}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      {managingCollectionWallpapers ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category Search Modal */}
      <CategorySearchModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSelect={handleCategorySelect}
        categories={categories}
        selectedCategoryId={formData.category_id}
      />
    </div>
  )
}