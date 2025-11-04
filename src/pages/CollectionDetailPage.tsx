import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, Star, Eye, Image as ImageIcon, Download, Grid, List, Search } from 'lucide-react'
import { SortDropdown, type SortOption } from '../components/ui/SortDropdown'
import { useSort } from '../hooks/useSort'
import { EnhancedWallpaperCardAdapter } from '../components/wallpapers/EnhancedWallpaperCardAdapter'
import { useTheme } from '@/contexts/ThemeContext'
import { getCollectionDetail, incrementCollectionView } from '@/lib/getCollectionDetail'
import { serializeError, handleAndLogError } from '@/utils/errorFormatting'

interface Collection {
  id: string
  name: string
  slug: string
  description: string | null
  icon_name: string | null
  cover_image_url: string | null
  color_theme: {
    primary: string
    secondary: string
    accent: string
  } | null
  is_seasonal: boolean
  season_start_month: number | null
  season_end_month: number | null
  is_featured: boolean
  is_active: boolean
  sort_order: number
  wallpaper_count: number
  view_count: number
}

interface Wallpaper {
  id: number
  title: string
  description: string | null
  image_url: string
  thumbnail_url: string | null
  download_url: string
  resolution_1080p: string | null
  resolution_4k: string | null
  resolution_8k: string | null
  is_premium: boolean
  is_published: boolean
  is_active: boolean
  download_count: number
  created_at: string
  updated_at: string
  width?: number
  height?: number
  device_type?: string
}

const CollectionDetailPage: React.FC = () => {
  const { theme } = useTheme()
  const { slug } = useParams<{ slug: string }>()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const wallpapersPerPage = 12

  // Sort functionality
  const { sortBy, setSortBy } = useSort({ defaultSort: 'newest' })

  // Computed loading state for better UX
  const isInitialLoading = useMemo(() => {
    return loading && !collection
  }, [loading, collection])

  useEffect(() => {
    if (slug) {
      // Immediate data fetch for instant loading
      fetchCollectionAndWallpapers()
      incrementViewCount()
    }
  }, [slug])

  useEffect(() => {
    if (slug && sortBy) {
      setCurrentPage(1)
      fetchCollectionData(1)
    }
  }, [sortBy, slug])

  useEffect(() => {
    if (slug && currentPage > 1) {
      fetchCollectionData(currentPage)
    }
  }, [currentPage, slug])

  const incrementViewCount = async () => {
    if (slug) {
      await incrementCollectionView(slug)
    }
  }

  const fetchCollectionAndWallpapers = useCallback(async () => {
    if (!slug) return
    
    try {
      setLoading(true)
      setError(null)
      
      const data = await getCollectionDetail(slug, sortBy, currentPage)
      setCollection(data.collection)
      setWallpapers(data.wallpapers)
      setTotalCount(data.pagination.total)
      setTotalPages(data.pagination.total_pages)
    } catch (err) {
      const errorMessage = handleAndLogError(err, 'collection detail fetch');
      setError(errorMessage);
      console.error('Error fetching collection:', err)
    } finally {
      setLoading(false)
    }
  }, [slug, sortBy, currentPage])

  const fetchCollectionData = useCallback(async (page: number = 1) => {
    if (!slug) return
    
    try {
      setLoading(true)
      setError(null)
      
      const data = await getCollectionDetail(slug, sortBy, page)
      setCollection(data.collection)
      setWallpapers(data.wallpapers)
      setTotalCount(data.pagination.total)
      setTotalPages(data.pagination.total_pages)
    } catch (err) {
      const errorMessage = handleAndLogError(err, 'collection wallpapers fetch');
      setError(errorMessage);
      console.error('Error fetching wallpapers:', err);
      setWallpapers([])
    } finally {
      setLoading(false)
    }
  }, [slug, sortBy])



  const handleSortChange = (sortValue: SortOption) => {
    setSortBy(sortValue)
    setCurrentPage(1)
  }

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    window.scrollTo(0, 0)
  }, [])

  const getIconForCollection = (iconName: string | null) => {
    switch (iconName) {
      case 'halloween': return '🎃'
      case 'christmas': return '🎄'
      case 'winter': return '❄️'
      case 'summer': return '☀️'
      case 'spring': return '🌸'
      case 'autumn': return '🍂'
      case 'flag': return '🇺🇸'
      case 'thanksgiving': return '🦃'
      case 'memorial': return '🏛️'
      case 'labor': return '⚒️'
      case 'heart': return '💕'
      case 'flower': return '🌺'
      case 'tools': return '🔧'
      case 'celebration': return '🎊'
      default: return '📱'
    }
  }

  if (isInitialLoading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'} transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
            <p className={`mt-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Loading collection...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !collection) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'} transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-20">
            <div className={`text-lg mb-4 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{error || 'Collection not found'}</div>
            <Link 
              to="/collections"
              className={`inline-flex items-center px-6 py-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-600 hover:bg-gray-700 text-white'}`}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Collections
            </Link>
          </div>
        </div>
      </div>
    )
  }



  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'} transition-colors duration-200`}>
      {/* Compact Header Section */}
      <section className={`${theme === 'dark' ? 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900' : 'bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700'} text-white py-8`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Navigation */}
          <div className="mb-6">
            <Link 
              to="/collections"
              className="inline-flex items-center text-gray-200 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Collections
            </Link>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <div className="flex items-center justify-center md:justify-start mb-4">
                <div className="text-6xl mr-4">
                  {getIconForCollection(collection.icon_name)}
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">
                    {collection.name}
                  </h1>
                  <p className="text-lg text-gray-100">
                    {collection.description}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-end gap-4 text-sm">
              <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full">
                <ImageIcon className="w-4 h-4" />
                <span>{totalCount} wallpapers</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full">
                <Eye className="w-4 h-4" />
                <span>{collection.view_count} views</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full">
                <Download className="w-4 h-4" />
                <span>Free Download</span>
              </div>
              {collection.is_seasonal && (
                <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full">
                  <Calendar className="w-4 h-4" />
                  <span>Seasonal</span>
                </div>
              )}
              {collection.is_featured && (
                <div className="flex items-center space-x-2 bg-yellow-500/20 px-3 py-1 rounded-full">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400">Featured</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col">
          {/* Page Header with Sort Controls */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className={`text-2xl md:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2 transition-colors duration-200`}>
                Collection Wallpapers
              </h2>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-200`}>
                {loading ? 'Loading wallpapers...' : error ? 'Error loading wallpapers' : `Showing ${wallpapers.length} of ${totalCount} wallpapers`}
              </p>
            </div>
            
            {/* Sort and View Controls */}
            <div className="flex items-center space-x-4">
              {/* Sort Dropdown */}
              <div className="hidden sm:block">
                <SortDropdown
                  value={sortBy}
                  onChange={handleSortChange}
                  disabled={loading}
                />
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-gray-100 text-gray-600 dark:bg-purple-900 dark:text-purple-300' 
                      : theme === 'dark'
                        ? 'text-gray-400 hover:text-gray-300'
                        : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-gray-100 text-gray-600 dark:bg-purple-900 dark:text-purple-300' 
                      : theme === 'dark'
                        ? 'text-gray-400 hover:text-gray-300'
                        : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Sort */}
          <div className="sm:hidden mb-6">
            <SortDropdown
              value={sortBy}
              onChange={handleSortChange}
              disabled={loading}
              className="w-full"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className={`mb-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-red-900 text-red-200 border border-red-700' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              <p className="font-medium">Unable to load wallpapers</p>
              <p className="text-sm mt-1">{serializeError(error)}</p>
              <button 
                onClick={() => {
                  setError(null)
                  fetchCollectionData(currentPage)
                }}
                className="mt-2 text-sm font-medium underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Wallpapers Grid */}
          {loading && wallpapers.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className={`rounded-lg aspect-video mb-4 ${
                    theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                  }`}></div>
                  <div className={`h-4 rounded mb-2 ${
                    theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                  }`}></div>
                  <div className={`h-3 rounded w-3/4 ${
                    theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                  }`}></div>
                </div>
              ))}
            </div>
          ) : wallpapers.length > 0 ? (
            <div className={viewMode === 'grid' ? 
              'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4' :
              'space-y-6'
            }>
              {wallpapers.map((wallpaper) => (
                <EnhancedWallpaperCardAdapter
                  key={wallpaper.id}
                  wallpaper={wallpaper}
                  variant="compact"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className={`mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                <Search className="w-16 h-16 mx-auto" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                No wallpapers found
              </h3>
              <p className={`mb-4 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                No wallpapers available in this collection at the moment
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && !loading && !error && (
            <div className="mt-12 flex justify-center">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                    theme === 'dark'
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const page = Math.max(1, currentPage - 2) + i
                  if (page > totalPages) return null
                  
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-4 py-2 rounded-lg ${
                        currentPage === page
                          ? 'bg-gray-600 text-white'
                          : theme === 'dark'
                            ? 'border border-gray-600 text-gray-300 hover:bg-gray-700'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  )
                })}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                    theme === 'dark'
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CollectionDetailPage