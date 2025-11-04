import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import { Plus, Edit, Trash2, Search, Filter, Tag, Users, Eye, EyeOff, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  sort_order: number
  is_active: boolean
  parent_id: number | null
  level: number
  is_premium: boolean
  name_en: string | null
  description_en: string | null
  preview_image: string | null
  wallpapers?: { count: number }[]
  created_at: string
  updated_at: string
}

export function CategoriesManagement() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'sort_order' | 'created_at'>('sort_order')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const { theme } = useTheme() // Add theme context

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    name_en: '',
    description_en: '',
    sort_order: 1,
    is_active: true,
    parent_id: '',
    level: 0,
    is_premium: false,
    preview_image: ''
  })

  useEffect(() => {
    loadCategories()
  }, [searchQuery, statusFilter, sortBy, sortDirection])

  const loadCategories = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-categories', {
        method: 'GET'
      })

      if (error) throw error
      
      let categoriesData = data.data || []
      
      // Apply filters
      if (searchQuery) {
        categoriesData = categoriesData.filter((cat: Category) => 
          cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cat.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      }
      
      if (statusFilter !== 'all') {
        categoriesData = categoriesData.filter((cat: Category) => 
          statusFilter === 'active' ? cat.is_active : !cat.is_active
        )
      }
      
      // Apply sorting
      categoriesData.sort((a: Category, b: Category) => {
        let aValue = a[sortBy]
        let bValue = b[sortBy]
        
        if (sortBy === 'name') {
          aValue = String(aValue || '').toLowerCase()
          bValue = String(bValue || '').toLowerCase()
        }
        
        if (sortDirection === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
        }
      })
      
      setCategories(categoriesData)
    } catch (error: any) {
      console.error('Failed to load categories:', error)
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      name_en: '',
      description_en: '',
      sort_order: 1,
      is_active: true,
      parent_id: '',
      level: 0,
      is_premium: false,
      preview_image: ''
    })
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      name_en: category.name_en || '',
      description_en: category.description_en || '',
      sort_order: category.sort_order,
      is_active: category.is_active,
      parent_id: category.parent_id ? category.parent_id.toString() : '',
      level: category.level,
      is_premium: category.is_premium,
      preview_image: category.preview_image || ''
    })
    setShowAddModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Auto-generate slug if not provided
      const slug = formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/^-+|-+$/g, '')
      
      const payload = {
        ...formData,
        slug,
        parent_id: formData.parent_id ? parseInt(formData.parent_id) : null,
        name_en: formData.name_en || formData.name,
        description_en: formData.description_en || formData.description
      }

      if (editingCategory) {
        const { data, error } = await supabase.functions.invoke(`admin-categories?id=${editingCategory.id}`, {
          method: 'PUT',
          body: payload
        })
        if (error) throw error
        toast.success('Category updated successfully')
      } else {
        const { data, error } = await supabase.functions.invoke('admin-categories', {
          method: 'POST',
          body: payload
        })
        if (error) throw error
        toast.success('Category created successfully')
      }
      
      setShowAddModal(false)
      setEditingCategory(null)
      resetForm()
      loadCategories()
    } catch (error: any) {
      console.error('Category operation failed:', error)
      toast.error(error.message || `Failed to ${editingCategory ? 'update' : 'create'} category`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (categoryId: number) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase.functions.invoke(`admin-categories?id=${categoryId}`, {
        method: 'DELETE'
      })
      
      if (error) throw error
      toast.success('Category deleted successfully')
      loadCategories()
    } catch (error: any) {
      console.error('Failed to delete category:', error)
      toast.error(error.message || 'Failed to delete category')
    }
  }

  const toggleStatus = async (category: Category) => {
    try {
      const { error } = await supabase.functions.invoke(`admin-categories?id=${category.id}`, {
        method: 'PUT',
        body: { is_active: !category.is_active }
      })
      
      if (error) throw error
      toast.success(`Category ${!category.is_active ? 'activated' : 'deactivated'}`)
      loadCategories()
    } catch (error: any) {
      console.error('Failed to toggle category status:', error)
      toast.error('Failed to update category status')
    }
  }

  const getWallpaperCount = (category: Category) => {
    return category.wallpapers?.[0]?.count || 0
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-theme-primary">Category Management</h2>
          <p className="text-theme-secondary">Organize wallpapers into categories for better browsing</p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null)
            resetForm()
            setShowAddModal(true)
          }}
          className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Category
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-theme-surface border border-theme-light rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-theme-primary">Filters & Search</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center text-gray-600 hover:text-gray-700 transition-colors"
          >
            <Filter className="w-5 h-5 mr-1" />
            {showFilters ? 'Hide' : 'Show'} Filters
            {showFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
          </button>
        </div>
        
        <div className={`space-y-4 ${showFilters ? 'block' : 'hidden'}`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-theme-tertiary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search categories..."
                  className="w-full pl-10 pr-3 py-2 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors placeholder:text-theme-tertiary"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="w-full px-3 py-2 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
              >
                <option value="all" className="bg-theme-surface text-theme-primary">All Statuses</option>
                <option value="active" className="bg-theme-surface text-theme-primary">Active Only</option>
                <option value="inactive" className="bg-theme-surface text-theme-primary">Inactive Only</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'sort_order' | 'created_at')}
                className="w-full px-3 py-2 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
              >
                <option value="sort_order" className="bg-theme-surface text-theme-primary">Sort Order</option>
                <option value="name" className="bg-theme-surface text-theme-primary">Name</option>
                <option value="created_at" className="bg-theme-surface text-theme-primary">Date Created</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-2">Direction</label>
              <select
                value={sortDirection}
                onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
                className="w-full px-3 py-2 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
              >
                <option value="asc" className="bg-theme-surface text-theme-primary">Ascending</option>
                <option value="desc" className="bg-theme-surface text-theme-primary">Descending</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
                setSortBy('sort_order')
                setSortDirection('asc')
              }}
              className="px-4 py-2 text-theme-secondary bg-theme-muted border border-theme-light rounded-lg hover:bg-theme-light transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      </div>

      {/* Categories List */}
      <div className="bg-theme-surface border border-theme-light rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
            <p className="mt-4 text-theme-secondary">Loading categories...</p>
          </div>
        ) : categories.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-theme-light">
              <thead className="bg-theme-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary uppercase tracking-wider">Slug</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary uppercase tracking-wider">Wallpapers</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary uppercase tracking-wider">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-light">
                {categories.map((category) => {
                  const wallpaperCount = getWallpaperCount(category)
                  return (
                    <tr key={category.id} className="bg-theme-surface hover:bg-theme-muted transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-10 h-10">
                            {category.preview_image ? (
                              <img
                                src={category.preview_image}
                                alt={category.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Tag className="w-5 h-5 text-gray-600" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-theme-primary flex items-center">
                              {category.name}
                              {category.is_premium && (
                                <span className="ml-2 px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800 rounded-full">
                                  Premium
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-theme-secondary">
                              {category.description || 'No description'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-theme-primary">
                        <code className="px-2 py-1 bg-theme-muted rounded text-xs">{category.slug}</code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-theme-primary">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 text-theme-tertiary mr-2" />
                          {wallpaperCount}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-theme-primary">
                        {category.sort_order}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleStatus(category)}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                            category.is_active 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/50' 
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/50'
                          }`}
                        >
                          {category.is_active ? (
                            <><Eye className="w-3 h-3 mr-1" /> Active</>
                          ) : (
                            <><EyeOff className="w-3 h-3 mr-1" /> Inactive</>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(category)}
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1 rounded hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                            title="Edit Category"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(category.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            title="Delete Category"
                            disabled={wallpaperCount > 0}
                          >
                            {wallpaperCount > 0 ? (
                              <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <Tag className="w-16 h-16 text-theme-tertiary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-theme-primary mb-2">No categories found</h3>
            <p className="text-theme-secondary mb-4">
              {searchQuery || statusFilter !== 'all' 
                ? 'No categories match your current filters.' 
                : 'Get started by creating your first category.'}
            </p>
            {(!searchQuery && statusFilter === 'all') && (
              <button
                onClick={() => {
                  setEditingCategory(null)
                  resetForm()
                  setShowAddModal(true)
                }}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create First Category
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className={`bg-theme-surface border border-theme-light rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl ${theme}`}>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-theme-primary">
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-theme-tertiary hover:text-theme-secondary text-2xl font-light transition-colors"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors placeholder:text-theme-tertiary"
                      placeholder="Category name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">Slug</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      className="w-full px-3 py-2 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors placeholder:text-theme-tertiary"
                      placeholder="category-slug (auto-generated if empty)"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">Sort Order</label>
                    <input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 1 }))}
                      min="1"
                      className="w-full px-3 py-2 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors placeholder:text-theme-tertiary"
                      placeholder="1"
                    />
                  </div>
                </div>
                
                {/* English Translations */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">English Name</label>
                    <input
                      type="text"
                      value={formData.name_en}
                      onChange={(e) => setFormData(prev => ({ ...prev, name_en: e.target.value }))}
                      className="w-full px-3 py-2 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors placeholder:text-theme-tertiary"
                      placeholder="English category name (optional)"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">Preview Image URL</label>
                    <input
                      type="url"
                      value={formData.preview_image}
                      onChange={(e) => setFormData(prev => ({ ...prev, preview_image: e.target.value }))}
                      className="w-full px-3 py-2 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors placeholder:text-theme-tertiary"
                      placeholder="https://example.com/preview.jpg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">Parent Category</label>
                    <select
                      value={formData.parent_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, parent_id: e.target.value }))}
                      className="w-full px-3 py-2 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                    >
                      <option value="" className="bg-theme-surface text-theme-primary">No parent (top level)</option>
                      {categories.filter(cat => cat.id !== editingCategory?.id).map((category) => (
                        <option key={category.id} value={category.id} className="bg-theme-surface text-theme-primary">
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors placeholder:text-theme-tertiary"
                  placeholder="Enter category description"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">English Description</label>
                <textarea
                  value={formData.description_en}
                  onChange={(e) => setFormData(prev => ({ ...prev, description_en: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors placeholder:text-theme-tertiary"
                  placeholder="English category description (optional)"
                />
              </div>
              
              {/* Checkboxes */}
              <div className="flex space-x-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="rounded text-gray-600 bg-theme-surface border-theme-light focus:ring-gray-500 focus:ring-2"
                  />
                  <span className="ml-2 text-sm font-medium text-theme-secondary">Active</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_premium}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_premium: e.target.checked }))}
                    className="rounded text-gray-600 bg-theme-surface border-theme-light focus:ring-gray-500 focus:ring-2"
                  />
                  <span className="ml-2 text-sm font-medium text-theme-secondary">Premium Category</span>
                </label>
              </div>
              
              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-theme-secondary bg-theme-muted border border-theme-light rounded-lg hover:bg-theme-light transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingCategory ? 'Update Category' : 'Create Category')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
