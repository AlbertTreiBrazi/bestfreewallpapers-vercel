import React, { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { Edit3, RefreshCw, Check, X, Search } from 'lucide-react'
import toast from 'react-hot-toast'

interface Wallpaper {
  id: number
  title: string
  slug: string
  is_published: boolean
  is_active: boolean
  created_at: string
}

export function SlugManagement() {
  const { theme } = useTheme()
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSlug, setEditingSlug] = useState<number | null>(null)
  const [editSlugValue, setEditSlugValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [updating, setUpdating] = useState<number | null>(null)

  useEffect(() => {
    loadWallpapers()
  }, [])

  const loadWallpapers = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-slug-management`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'list_wallpapers' })
        }
      )

      if (response.ok) {
        const result = await response.json()
        setWallpapers(result.data || [])
      } else {
        toast.error('Failed to load wallpapers')
      }
    } catch (error) {
      console.error('Failed to load wallpapers:', error)
      toast.error('Failed to load wallpapers')
    } finally {
      setLoading(false)
    }
  }

  const handleEditSlug = (wallpaper: Wallpaper) => {
    setEditingSlug(wallpaper.id)
    setEditSlugValue(wallpaper.slug)
  }

  const handleSaveSlug = async (wallpaperId: number) => {
    if (!editSlugValue.trim()) {
      toast.error('Slug cannot be empty')
      return
    }

    setUpdating(wallpaperId)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-slug-management`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'update_slug',
            data: {
              wallpaperId: wallpaperId,
              newSlug: editSlugValue.trim()
            }
          })
        }
      )

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Update the wallpaper in the list
          setWallpapers(prev => prev.map(w => 
            w.id === wallpaperId ? { ...w, slug: editSlugValue.trim() } : w
          ))
          setEditingSlug(null)
          setEditSlugValue('')
          toast.success('Slug updated successfully')
        }
      } else {
        const errorResult = await response.json()
        toast.error(errorResult.error?.message || 'Failed to update slug')
      }
    } catch (error) {
      console.error('Failed to update slug:', error)
      toast.error('Failed to update slug')
    } finally {
      setUpdating(null)
    }
  }

  const handleRegenerateSlug = async (wallpaperId: number) => {
    setUpdating(wallpaperId)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-slug-management`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'generate_slug',
            data: {
              wallpaperId: wallpaperId
            }
          })
        }
      )

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Update the wallpaper in the list
          setWallpapers(prev => prev.map(w => 
            w.id === wallpaperId ? { ...w, slug: result.slug } : w
          ))
          toast.success('Slug regenerated successfully')
        }
      } else {
        toast.error('Failed to regenerate slug')
      }
    } catch (error) {
      console.error('Failed to regenerate slug:', error)
      toast.error('Failed to regenerate slug')
    } finally {
      setUpdating(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingSlug(null)
    setEditSlugValue('')
  }

  const filteredWallpapers = wallpapers.filter(wallpaper => 
    wallpaper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wallpaper.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="bg-gray-300 h-8 w-64 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-gray-300 h-16 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-theme-primary">
          Slug Management
        </h3>
        <button
          onClick={loadWallpapers}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-tertiary w-5 h-5" />
        <input
          type="text"
          placeholder="Search wallpapers by title or slug..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-theme-surface border border-theme-light text-theme-primary"
        />
      </div>

      {/* Wallpapers List */}
      <div className="bg-theme-surface border border-theme-light rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-theme-light">
            <thead className="bg-theme-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary uppercase tracking-wider">
                  Current Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-theme-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-theme-surface border border-theme-light divide-y divide-theme-light">
              {filteredWallpapers.map((wallpaper) => (
                <tr key={wallpaper.id} className="hover:bg-theme-muted">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-theme-primary">
                      {wallpaper.title}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-theme-tertiary">
                      ID: {wallpaper.id}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {editingSlug === wallpaper.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editSlugValue}
                          onChange={(e) => setEditSlugValue(e.target.value)}
                          className="flex-1 px-3 py-1 border border-theme-light rounded focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white dark:bg-gray-700 text-theme-primary text-sm"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div className="text-sm text-theme-primary font-mono bg-theme-muted px-2 py-1 rounded">
                        {wallpaper.slug}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        wallpaper.is_published
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {wallpaper.is_published ? 'Published' : 'Draft'}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        wallpaper.is_active
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {wallpaper.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-theme-tertiary">
                    {formatDate(wallpaper.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingSlug === wallpaper.id ? (
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleSaveSlug(wallpaper.id)}
                          disabled={updating === wallpaper.id}
                          className="p-2 text-green-600 hover:text-green-700 disabled:opacity-50"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={updating === wallpaper.id}
                          className="p-2 text-gray-600 hover:text-gray-700 disabled:opacity-50"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditSlug(wallpaper)}
                          disabled={updating === wallpaper.id}
                          className="p-2 text-blue-600 hover:text-blue-700 disabled:opacity-50"
                          title="Edit Slug"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRegenerateSlug(wallpaper.id)}
                          disabled={updating === wallpaper.id}
                          className="p-2 text-gray-600 hover:text-gray-700 disabled:opacity-50"
                          title="Regenerate from Title"
                        >
                          <RefreshCw className={`w-4 h-4 ${updating === wallpaper.id ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredWallpapers.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-16 h-16 text-theme-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-theme-primary mb-2">
            No wallpapers found
          </h3>
          <p className="text-gray-600 dark:text-theme-tertiary">
            {searchQuery ? 'Try adjusting your search query' : 'No wallpapers available'}
          </p>
        </div>
      )}
    </div>
  )
}