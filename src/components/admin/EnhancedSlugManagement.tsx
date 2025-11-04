import React, { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { Edit3, RefreshCw, Check, X, Search, Zap, BarChart3, AlertTriangle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { 
  slugOptimizer, 
  generateSlug, 
  validateSlug, 
  analyzeSlug, 
  generateSlugVariations,
  type SlugValidationResult,
  type SlugAnalysis
} from '@/utils/slug-optimization'

interface Wallpaper {
  id: number
  title: string
  slug: string
  is_published: boolean
  is_active: boolean
  created_at: string
}

interface SlugEditState {
  wallpaperId: number
  currentSlug: string
  validation: SlugValidationResult | null
  analysis: SlugAnalysis | null
  variations: string[]
}

export function EnhancedSlugManagement() {
  const { theme } = useTheme()
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSlug, setEditingSlug] = useState<number | null>(null)
  const [editState, setEditState] = useState<SlugEditState | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [updating, setUpdating] = useState<number | null>(null)
  const [filterQuality, setFilterQuality] = useState<'all' | 'poor' | 'good' | 'excellent'>('all')

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
          body: JSON.stringify({ action: 'get_wallpapers' })
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
    const validation = validateSlug(wallpaper.slug)
    const analysis = analyzeSlug(wallpaper.slug)
    const variations = generateSlugVariations(wallpaper.title)

    setEditingSlug(wallpaper.id)
    setEditState({
      wallpaperId: wallpaper.id,
      currentSlug: wallpaper.slug,
      validation,
      analysis,
      variations
    })
  }

  const handleSlugChange = (newSlug: string) => {
    if (!editState) return

    const validation = validateSlug(newSlug)
    const analysis = analyzeSlug(newSlug)

    setEditState({
      ...editState,
      currentSlug: newSlug,
      validation,
      analysis
    })
  }

  const handleSaveSlug = async (wallpaperId: number) => {
    if (!editState || !editState.validation?.isValid) {
      toast.error('Please fix slug validation errors before saving')
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
            wallpaper_id: wallpaperId,
            new_slug: editState.currentSlug.trim()
          })
        }
      )

      if (response.ok) {
        const result = await response.json()
        if (result.data) {
          setWallpapers(prev => prev.map(w => 
            w.id === wallpaperId ? { ...w, slug: result.data.slug } : w
          ))
          setEditingSlug(null)
          setEditState(null)
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

  const handleOptimizeSlug = (wallpaper: Wallpaper) => {
    const optimizedSlug = generateSlug(wallpaper.title, {
      maxLength: 50,
      removeStopWords: true
    })
    
    const validation = validateSlug(optimizedSlug)
    const analysis = analyzeSlug(optimizedSlug)
    const variations = generateSlugVariations(wallpaper.title)

    setEditingSlug(wallpaper.id)
    setEditState({
      wallpaperId: wallpaper.id,
      currentSlug: optimizedSlug,
      validation,
      analysis,
      variations
    })
  }

  const handleUseVariation = (variation: string) => {
    if (!editState) return
    handleSlugChange(variation)
  }

  const handleCancelEdit = () => {
    setEditingSlug(null)
    setEditState(null)
  }

  const getSlugQuality = (slug: string): 'poor' | 'good' | 'excellent' => {
    const analysis = analyzeSlug(slug)
    const avgScore = (analysis.seoScore + analysis.readabilityScore) / 2
    
    if (avgScore >= 80) return 'excellent'
    if (avgScore >= 60) return 'good'
    return 'poor'
  }

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
      case 'good': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200'
      case 'poor': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const filteredWallpapers = wallpapers.filter(wallpaper => {
    const matchesSearch = wallpaper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         wallpaper.slug.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (!matchesSearch) return false
    
    if (filterQuality === 'all') return true
    
    const quality = getSlugQuality(wallpaper.slug)
    return quality === filterQuality
  })

  const qualityStats = wallpapers.reduce((stats, wallpaper) => {
    const quality = getSlugQuality(wallpaper.slug)
    stats[quality] = (stats[quality] || 0) + 1
    return stats
  }, {} as Record<string, number>)

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-theme-primary">
            Enhanced Slug Management
          </h3>
          <p className="text-sm text-theme-secondary mt-1">
            Optimize SEO-friendly URLs for better search engine visibility
          </p>
        </div>
        <button
          onClick={loadWallpapers}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Quality Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-theme-surface border border-theme-light rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <span className="font-medium text-theme-primary">Total Slugs</span>
          </div>
          <div className="text-2xl font-bold text-theme-primary mt-2">
            {wallpapers.length}
          </div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="font-medium text-green-700 dark:text-green-300">Excellent</span>
          </div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-300 mt-2">
            {qualityStats.excellent || 0}
          </div>
        </div>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <span className="font-medium text-yellow-700 dark:text-yellow-300">Good</span>
          </div>
          <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300 mt-2">
            {qualityStats.good || 0}
          </div>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <X className="w-5 h-5 text-red-500" />
            <span className="font-medium text-red-700 dark:text-red-300">Poor</span>
          </div>
          <div className="text-2xl font-bold text-red-700 dark:text-red-300 mt-2">
            {qualityStats.poor || 0}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-tertiary w-5 h-5" />
          <input
            type="text"
            placeholder="Search wallpapers by title or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-theme-surface text-theme-primary"
          />
        </div>
        
        <select
          value={filterQuality}
          onChange={(e) => setFilterQuality(e.target.value as any)}
          className="px-4 py-2 border border-theme-light rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-theme-surface text-theme-primary"
        >
          <option value="all">All Quality</option>
          <option value="excellent">Excellent</option>
          <option value="good">Good</option>
          <option value="poor">Poor</option>
        </select>
      </div>

      {/* Wallpapers List */}
      <div className="bg-theme-surface border border-theme-light rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-theme-light">
            <thead className="bg-theme-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary uppercase tracking-wider">
                  Title & ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary uppercase tracking-wider">
                  Current Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary uppercase tracking-wider">
                  Quality
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-theme-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-theme-surface divide-y divide-theme-light">
              {filteredWallpapers.map((wallpaper) => {
                const isEditing = editingSlug === wallpaper.id
                const quality = getSlugQuality(wallpaper.slug)
                
                return (
                  <tr key={wallpaper.id} className="hover:bg-theme-muted">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-theme-primary truncate max-w-xs">
                        {wallpaper.title}
                      </div>
                      <div className="text-xs text-theme-tertiary">
                        ID: {wallpaper.id}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      {isEditing && editState ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editState.currentSlug}
                            onChange={(e) => handleSlugChange(e.target.value)}
                            className={`w-full px-3 py-1 border rounded focus:ring-2 focus:ring-gray-500 text-sm ${
                              editState.validation?.isValid 
                                ? 'border-green-300 bg-green-50 dark:bg-green-900/20' 
                                : 'border-red-300 bg-red-50 dark:bg-red-900/20'
                            }`}
                            autoFocus
                          />
                          
                          {/* Validation Errors */}
                          {editState.validation && !editState.validation.isValid && (
                            <div className="text-xs text-red-600 space-y-1">
                              {editState.validation.errors.map((error, i) => (
                                <div key={i}>• {error}</div>
                              ))}
                            </div>
                          )}
                          
                          {/* SEO Analysis */}
                          {editState.analysis && (
                            <div className="flex space-x-4 text-xs">
                              <div className="flex items-center space-x-1">
                                <span className="text-theme-secondary">SEO:</span>
                                <span className={`font-medium ${
                                  editState.analysis.seoScore >= 80 ? 'text-green-600' :
                                  editState.analysis.seoScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {editState.analysis.seoScore}/100
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="text-theme-secondary">Length:</span>
                                <span className="font-medium text-theme-primary">
                                  {editState.analysis.length}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* Variations */}
                          {editState.variations.length > 1 && (
                            <div className="space-y-2">
                              <div className="text-xs font-medium text-theme-secondary">Suggestions:</div>
                              <div className="flex flex-wrap gap-1">
                                {editState.variations.slice(1, 4).map((variation, i) => (
                                  <button
                                    key={i}
                                    onClick={() => handleUseVariation(variation)}
                                    className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                                  >
                                    {variation}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-theme-primary font-mono bg-theme-muted px-2 py-1 rounded max-w-xs truncate">
                          {wallpaper.slug}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getQualityColor(quality)}`}>
                        {quality.charAt(0).toUpperCase() + quality.slice(1)}
                      </span>
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
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleSaveSlug(wallpaper.id)}
                            disabled={!editState?.validation?.isValid || updating === wallpaper.id}
                            className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 text-gray-600 hover:text-gray-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleOptimizeSlug(wallpaper)}
                            className="p-1 text-blue-600 hover:text-blue-700"
                            title="Optimize slug"
                          >
                            <Zap className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditSlug(wallpaper)}
                            className="p-1 text-gray-600 hover:text-gray-700"
                            title="Edit slug"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {filteredWallpapers.length === 0 && (
          <div className="text-center py-12 text-theme-secondary">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No wallpapers found matching your search criteria.</p>
          </div>
        )}
      </div>
    </div>
  )
}
