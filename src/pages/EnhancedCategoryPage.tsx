import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import SEO from '@/components/seo/SEO'
import { SEOBreadcrumbs } from '@/components/seo/SEOBreadcrumbs'
import { VoiceSearchFAQ } from '@/components/seo/VoiceSearchFAQ'
import { SEOWallpaperCard } from '@/components/wallpapers/SEOWallpaperCard'
import { VoiceSearchBar } from '@/components/search/VoiceSearchBar'
import { PageLoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { Tag, Grid, List, Filter, Sparkles } from 'lucide-react'

interface Category {
  id: number
  name: string
  slug: string
  description?: string
  seo_title?: string
  seo_description?: string
  meta_keywords?: string[]
  content_description?: string
  focus_keyphrase?: string
  voice_search_queries?: string[]
  related_categories?: number[]
  featured_content?: any
}

interface Wallpaper {
  id: number
  title: string
  slug?: string
  thumbnail_url: string | null
  image_url: string
  download_url: string
  resolution_1080p: string | null
  resolution_4k: string | null
  resolution_8k: string | null
  download_count: number
  is_premium: boolean
  width?: number
  height?: number
  device_type?: string
  category_id?: number
  alt_text?: string
  seo_description?: string
  voice_search_keywords?: string[]
  seo_keywords?: string[]
  focus_keyphrase?: string
  seo_score?: number
  webp_url?: string
  avif_url?: string
  dominant_color?: string
  tags?: string[]
}

export function EnhancedCategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const [category, setCategory] = useState<Category | null>(null)
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([])
  const [relatedCategories, setRelatedCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [wallpapersLoading, setWallpapersLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'seo_score'>('newest')
  const [showSEOInfo, setShowSEOInfo] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Load category data
  useEffect(() => {
    const loadCategory = async () => {
      if (!slug) return

      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle()

        if (error) throw error
        
        if (data) {
          setCategory(data)
          
          // Enhance category content if needed
          if (!data.seo_title || !data.content_description) {
            await enhanceCategoryContent(data)
          }
          
          // Load related categories
          if (data.related_categories && data.related_categories.length > 0) {
            await loadRelatedCategories(data.related_categories)
          }
        }
      } catch (error) {
        console.error('Failed to load category:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCategory()
  }, [slug])

  // Load wallpapers
  useEffect(() => {
    const loadWallpapers = async () => {
      if (!category) return

      setWallpapersLoading(true)
      try {
        let query = supabase
          .from('wallpapers')
          .select('*')
          .eq('category_id', category.id)
          .eq('is_published', true)
          .eq('is_active', true)
          .range((page - 1) * 20, page * 20 - 1)

        // Apply sorting
        if (sortBy === 'newest') {
          query = query.order('created_at', { ascending: false })
        } else if (sortBy === 'popular') {
          query = query.order('download_count', { ascending: false })
        } else if (sortBy === 'seo_score') {
          query = query.order('seo_score', { ascending: false })
        }

        const { data, error } = await query

        if (error) throw error

        if (data) {
          if (page === 1) {
            setWallpapers(data)
          } else {
            setWallpapers(prev => [...prev, ...data])
          }
          setHasMore(data.length === 20)
        }
      } catch (error) {
        console.error('Failed to load wallpapers:', error)
      } finally {
        setWallpapersLoading(false)
      }
    }

    loadWallpapers()
  }, [category, page, sortBy])

  const enhanceCategoryContent = async (categoryData: Category) => {
    try {
      const { data, error } = await supabase.functions.invoke('content-enhancement', {
        body: {
          entity_type: 'category',
          entity_id: categoryData.id,
          name: categoryData.name,
          current_description: categoryData.description,
          wallpaper_count: wallpapers.length
        }
      })

      if (!error && data?.data) {
        // Update category with enhanced content
        setCategory(prev => prev ? {
          ...prev,
          ...data.data.enhanced_content
        } : null)
      }
    } catch (error) {
      console.error('Failed to enhance category content:', error)
    }
  }

  const loadRelatedCategories = async (relatedIds: number[]) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, description')
        .in('id', relatedIds)
        .eq('is_active', true)
        .limit(4)

      if (!error && data) {
        setRelatedCategories(data)
      }
    } catch (error) {
      console.error('Failed to load related categories:', error)
    }
  }

  const handleVoiceSearch = (query: string, voiceData?: any) => {
    // Handle voice search within category context
    console.log('Voice search in category:', query, voiceData)
  }

  const loadMoreWallpapers = () => {
    if (hasMore && !wallpapersLoading) {
      setPage(prev => prev + 1)
    }
  }

  if (loading) {
    return <PageLoadingSkeleton />
  }

  if (!category) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Category Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            The requested category could not be found.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* SEO Optimization */}
      <SEO
        title={category.seo_title || `${category.name} Wallpapers`}
        description={category.seo_description || category.description}
        keywords={category.meta_keywords || [category.name, 'wallpapers', 'backgrounds']}
        type="website"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          'name': category.name,
          'description': category.content_description || category.description,
          'url': `https://bestfreewallpapers.com/category/${category.slug}`,
          'mainEntity': {
            '@type': 'ItemList',
            'numberOfItems': wallpapers.length,
            'itemListElement': wallpapers.map((wallpaper, index) => ({
              '@type': 'ImageObject',
              'position': index + 1,
              'name': wallpaper.title,
              'url': wallpaper.image_url
            }))
          }
        }}
      />

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <SEOBreadcrumbs 
          pageType="category" 
          pageId={category.slug}
          categoryId={category.id}
        />

        {/* Category Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Tag className="w-8 h-8" />
              {category.name} Wallpapers
            </h1>
            
            <button
              onClick={() => setShowSEOInfo(!showSEOInfo)}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              {showSEOInfo ? 'Hide' : 'Show'} SEO Info
            </button>
          </div>
          
          {category.content_description && (
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-4 max-w-4xl">
              {category.content_description}
            </p>
          )}
          
          {/* Voice Search Keywords */}
          {showSEOInfo && category.voice_search_queries && category.voice_search_queries.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Voice Search Optimized For:
              </p>
              <div className="flex flex-wrap gap-2">
                {category.voice_search_queries.slice(0, 6).map((query, index) => (
                  <span 
                    key={index}
                    className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full"
                  >
                    "{query}"
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Voice Search Bar */}
        <div className="mb-8">
          <VoiceSearchBar
            onSearch={handleVoiceSearch}
            placeholder={`Search ${category.name.toLowerCase()} wallpapers or try voice search...`}
            showVoiceButton={true}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any)
                setPage(1)
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="newest">Newest First</option>
              <option value="popular">Most Popular</option>
              {showSEOInfo && <option value="seo_score">SEO Score</option>}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Wallpapers Grid */}
        <div className={`${
          viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
            : 'space-y-4'
        } mb-8`}>
          {wallpapers.map((wallpaper) => (
            <SEOWallpaperCard
              key={wallpaper.id}
              wallpaper={wallpaper}
              showSEOInfo={showSEOInfo}
              onImageClick={() => {
                // Navigate to wallpaper detail page
                window.open(`/wallpaper/${wallpaper.slug || wallpaper.id}`, '_blank')
              }}
            />
          ))}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="text-center mb-8">
            <button
              onClick={loadMoreWallpapers}
              disabled={wallpapersLoading}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {wallpapersLoading ? 'Loading...' : 'Load More Wallpapers'}
            </button>
          </div>
        )}

        {/* Related Categories */}
        {relatedCategories.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Related Categories
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedCategories.map((relatedCategory) => (
                <a
                  key={relatedCategory.id}
                  href={`/category/${relatedCategory.slug}`}
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                >
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    {relatedCategory.name}
                  </h3>
                  {relatedCategory.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {relatedCategory.description}
                    </p>
                  )}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* FAQ Section */}
        <VoiceSearchFAQ 
          category={category.slug}
          showSearch={true}
          maxItems={6}
        />
      </div>
    </>
  )
}