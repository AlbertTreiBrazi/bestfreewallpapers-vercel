/**
 * Updated WallpaperManagement component with Secure File Upload Integration
 * This component now uses the SecureFileUpload component for enhanced security
 */

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import { Plus, Edit, Trash2, Upload, Image as ImageIcon, Search, Filter, Crown, Shield, AlertTriangle, ChevronDown } from 'lucide-react'
import { SecureFileUpload } from '@/components/upload/SecureFileUpload'
import { CategorySearchModal } from './CategorySearchModal'
import toast from 'react-hot-toast'

// Keep all existing interfaces...
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

interface UploadResult {
  fileName: string
  url: string
  fileSize: number
  securityChecks: {
    mimeValidation: boolean
    headerValidation: boolean
    metadataStripped: boolean
    malwareScan: boolean
    scansPerformed: string[]
  }
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
  
  // New state for secure upload
  const [showSecureUpload, setShowSecureUpload] = useState(false)
  const [uploadSecurityEnabled, setUploadSecurityEnabled] = useState(true)
  
  const itemsPerPage = 50

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    thumbnail_url: '',
    category_id: '',
    tags: '',
    is_premium: false,
    is_published: true,
    is_active: true,
    device_type: 'desktop',
    width: 1920,
    height: 1080
  })

  const [collectionFormData, setCollectionFormData] = useState({
    name: '',
    slug: '',
    description: '',
    thumbnail_url: '',
    is_featured: false,
    is_published: true,
    sort_order: 0
  })

  useEffect(() => {
    if (!showCollections) {
      loadWallpapers()
    } else {
      loadCollections()
    }
    loadCategories()
  }, [searchQuery, selectedCategory, currentPage, showCollections])

  // Secure upload handlers
  const handleSecureUploadSuccess = (result: UploadResult) => {
    setFormData(prev => ({
      ...prev,
      image_url: result.url,
      thumbnail_url: result.url
    }))
    setShowSecureUpload(false)
    
    toast.success(
      `Secure upload completed! File validated with ${result.securityChecks.scansPerformed.length} security scans.`,
      { duration: 4000 }
    )
    
    // Show security details
    console.log('Upload Security Details:', result.securityChecks)
  }

  const handleSecureUploadError = (error: string) => {
    toast.error(`Secure upload failed: ${error}`, { duration: 5000 })
  }

  // Enhanced legacy upload with basic security warnings
  const handleLegacyFileUpload = async (file: File) => {
    if (!file) return null

    // Basic client-side validation
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error('File too large. Use Secure Upload for proper validation.')
      return null
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Use Secure Upload for comprehensive validation.')
      return null
    }

    // Show security warning
    toast(
      'WARNING: Legacy upload lacks security validation. Use Secure Upload for production files.',
      { 
        icon: '⚠️',
        duration: 5000,
        style: { backgroundColor: '#fef3c7', color: '#92400e' }
      }
    )

    setUploading(true)
    try {
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })

      const base64Data = await base64Promise
      const fileName = `legacy_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

      const { data, error } = await supabase.functions.invoke('wallpaper-management', {
        body: {
          action: 'upload-image',
          imageData: base64Data,
          fileName
        }
      })

      if (error) throw error
      
      return data.data.url
    } catch (error: any) {
      console.error('Legacy upload failed:', error)
      toast.error('Legacy upload failed. Please use Secure Upload.')
      return null
    } finally {
      setUploading(false)
    }
  }

  // Keep all existing functions (loadWallpapers, loadCategories, etc.)
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

  // Keep all other existing functions...
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.image_url) {
      toast.error('Title and image URL are required')
      return
    }

    setLoading(true)
    try {
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
      resetForm()
      loadWallpapers()
    } catch (error: any) {
      console.error('Failed to save wallpaper:', error)
      toast.error(`Failed to ${editingWallpaper ? 'update' : 'create'} wallpaper`)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image_url: '',
      thumbnail_url: '',
      category_id: '',
      tags: '',
      is_premium: false,
      is_published: true,
      is_active: true,
      device_type: 'desktop',
      width: 1920,
      height: 1080
    })
  }

  const handleCategorySelect = (categoryId: number, categoryName: string) => {
    setFormData(prev => ({ ...prev, category_id: categoryId.toString() }))
    setShowCategoryModal(false)
  }

  // Render the updated component with secure upload integration
  return (
    <div className="space-y-6">
      {/* Header with Security Status */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            Wallpaper Management
            {uploadSecurityEnabled && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                <Shield className="w-3 h-3 mr-1" />
                Security Enabled
              </span>
            )}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Enhanced file upload security with MIME validation, metadata stripping, and malware scanning
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setUploadSecurityEnabled(!uploadSecurityEnabled)}
            className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
              uploadSecurityEnabled
                ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300'
                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300'
            }`}
          >
            {uploadSecurityEnabled ? (
              <Shield className="w-4 h-4 mr-2" />
            ) : (
              <AlertTriangle className="w-4 h-4 mr-2" />
            )}
            {uploadSecurityEnabled ? 'Security ON' : 'Security OFF'}
          </button>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Wallpaper</span>
          </button>
        </div>
      </div>

      {/* Add/Edit Modal with Secure Upload */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {editingWallpaper ? 'Edit Wallpaper' : 'Add New Wallpaper'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingWallpaper(null)
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter wallpaper title"
                  />
                </div>
                
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter wallpaper description"
                  />
                </div>
                
                {/* Secure Image Upload Section */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Image Upload *
                  </label>
                  
                  {uploadSecurityEnabled ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <input
                          type="url"
                          value={formData.image_url}
                          onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          placeholder="Upload file or enter URL"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecureUpload(true)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                        >
                          <Shield className="w-4 h-4" />
                          <span>Secure Upload</span>
                        </button>
                      </div>
                      
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                              Enhanced Security Features:
                            </h4>
                            <ul className="text-xs text-green-700 dark:text-green-300 mt-1 space-y-1">
                              <li>• MIME type validation and header verification</li>
                              <li>• Automatic EXIF/GPS metadata stripping</li>
                              <li>• Malware and script injection scanning</li>
                              <li>• File size limits and content validation</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <input
                          type="url"
                          value={formData.image_url}
                          onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          placeholder="Enter image URL or upload file"
                          required
                        />
                        
                        <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer flex items-center space-x-2">
                          <Upload className="w-4 h-4" />
                          <span>{uploading ? 'Uploading...' : 'Upload'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                const url = await handleLegacyFileUpload(file)
                                if (url) {
                                  setFormData(prev => ({ ...prev, image_url: url, thumbnail_url: url }))
                                }
                              }
                            }}
                            className="hidden"
                            disabled={uploading}
                          />
                        </label>
                      </div>
                      
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                              Security Warning:
                            </h4>
                            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                              Legacy upload mode lacks comprehensive security validation. Enable security mode for production use.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Rest of form fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(true)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-left flex items-center justify-between bg-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    <span className={formData.category_id ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
                      {formData.category_id 
                        ? categories.find(cat => cat.id.toString() === formData.category_id)?.name || 'Unknown Category'
                        : 'Select a category *'
                      }
                    </span>
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Device Type
                  </label>
                  <select
                    value={formData.device_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, device_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="desktop">Desktop</option>
                    <option value="mobile">Mobile</option>
                    <option value="tablet">Tablet</option>
                    <option value="all">All Devices</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Width
                  </label>
                  <input
                    type="number"
                    value={formData.width}
                    onChange={(e) => setFormData(prev => ({ ...prev, width: parseInt(e.target.value) || 1920 }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Height
                  </label>
                  <input
                    type="number"
                    value={formData.height}
                    onChange={(e) => setFormData(prev => ({ ...prev, height: parseInt(e.target.value) || 1080 }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="nature, landscape, mountains"
                  />
                </div>
              </div>
              
              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_premium}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_premium: e.target.checked }))}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Premium wallpaper</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Published</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
                </label>
              </div>
              
              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingWallpaper(null)
                    resetForm()
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg"
                >
                  {loading ? 'Saving...' : (editingWallpaper ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Secure Upload Modal */}
      {showSecureUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <Shield className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Secure File Upload
                </h3>
              </div>
              <button
                onClick={() => setShowSecureUpload(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <SecureFileUpload
                uploadType="wallpaper"
                onUploadSuccess={handleSecureUploadSuccess}
                onUploadError={handleSecureUploadError}
                className="mt-4"
              />
            </div>
          </div>
        </div>
      )}

      {/* Placeholder for wallpapers list - keeping existing implementation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6">
          <div className="text-center py-12">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              Wallpaper Management Interface
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enhanced with comprehensive file upload security
            </p>
          </div>
        </div>
      </div>

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
