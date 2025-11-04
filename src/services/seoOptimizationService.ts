import { supabase } from '@/lib/supabase'

export interface SEOAnalytics {
  total_wallpapers: number
  seo_optimized_wallpapers: number
  average_seo_score: number
  voice_search_enabled: number
  alt_text_coverage: number
  structured_data_coverage: number
}

export interface SEOTask {
  id: string
  entity_type: 'wallpaper' | 'category' | 'collection'
  entity_id: string
  task_type: 'generate_alt_text' | 'enhance_content' | 'optimize_images' | 'update_structured_data'
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  priority: 'low' | 'medium' | 'high'
  created_at: string
  completed_at?: string
  error_message?: string
}

class SEOOptimizationService {
  /**
   * Generate AI-powered alt text for a wallpaper
   */
  async generateAltText(wallpaperId: number, wallpaperData: any) {
    try {
      const { data, error } = await supabase.functions.invoke('ai-alt-text-generator', {
        body: {
          wallpaper_id: wallpaperId,
          image_url: wallpaperData.image_url,
          title: wallpaperData.title,
          category: wallpaperData.category || 'wallpaper',
          tags: wallpaperData.tags || [],
          device_type: wallpaperData.device_type || 'desktop'
        }
      })

      if (error) throw error
      return data.data
    } catch (error) {
      console.error('Failed to generate alt text:', error)
      throw error
    }
  }

  /**
   * Enhance category or collection content
   */
  async enhanceContent(entityType: 'category' | 'collection', entityId: string, entityData: any) {
    try {
      const { data, error } = await supabase.functions.invoke('content-enhancement', {
        body: {
          entity_type: entityType,
          entity_id: entityId,
          name: entityData.name,
          current_description: entityData.description,
          wallpaper_count: entityData.wallpaper_count
        }
      })

      if (error) throw error
      return data.data
    } catch (error) {
      console.error('Failed to enhance content:', error)
      throw error
    }
  }

  /**
   * Optimize images for better performance
   */
  async optimizeImages(wallpaperId: number, imageUrl: string) {
    try {
      const { data, error } = await supabase.functions.invoke('image-optimization', {
        body: {
          wallpaper_id: wallpaperId,
          image_url: imageUrl
        }
      })

      if (error) throw error
      return data.data
    } catch (error) {
      console.error('Failed to optimize images:', error)
      throw error
    }
  }

  /**
   * Process voice search query
   */
  async processVoiceSearch(query: string, action: 'search' | 'faq' = 'search') {
    try {
      const { data, error } = await supabase.functions.invoke('voice-search-optimization', {
        body: {
          query,
          action
        }
      })

      if (error) throw error
      return data.data
    } catch (error) {
      console.error('Failed to process voice search:', error)
      throw error
    }
  }

  /**
   * Get related wallpapers for internal linking
   */
  async getRelatedWallpapers(wallpaperId: number, limit: number = 6) {
    try {
      const { data, error } = await supabase
        .rpc('find_related_wallpapers', {
          wallpaper_id_param: wallpaperId,
          limit_param: limit
        })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Failed to get related wallpapers:', error)
      return []
    }
  }

  /**
   * Calculate SEO score for a wallpaper
   */
  async calculateSEOScore(wallpaperId: number) {
    try {
      const { data, error } = await supabase
        .rpc('calculate_seo_score', {
          wallpaper_id_param: wallpaperId
        })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Failed to calculate SEO score:', error)
      return 0
    }
  }

  /**
   * Generate breadcrumbs for a page
   */
  async generateBreadcrumbs(pageType: string, pageId?: string, categoryId?: number) {
    try {
      const { data, error } = await supabase
        .rpc('generate_breadcrumbs', {
          page_type: pageType,
          page_id: pageId || null,
          category_id: categoryId || null
        })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Failed to generate breadcrumbs:', error)
      return [{ name: 'Home', url: '/', position: 1 }]
    }
  }

  /**
   * Get SEO analytics dashboard data
   */
  async getSEOAnalytics(): Promise<SEOAnalytics> {
    try {
      // Get total wallpapers
      const { count: totalWallpapers } = await supabase
        .from('wallpapers')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true)
        .eq('is_active', true)

      // Get SEO optimized wallpapers (with alt text)
      const { count: seoOptimizedWallpapers } = await supabase
        .from('wallpapers')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true)
        .eq('is_active', true)
        .not('alt_text', 'is', null)

      // Get average SEO score
      const { data: avgScoreData } = await supabase
        .from('wallpapers')
        .select('seo_score')
        .eq('is_published', true)
        .eq('is_active', true)
        .not('seo_score', 'is', null)

      const averageSeoScore = avgScoreData && avgScoreData.length > 0
        ? avgScoreData.reduce((sum, item) => sum + (item.seo_score || 0), 0) / avgScoreData.length
        : 0

      // Get voice search enabled wallpapers
      const { count: voiceSearchEnabled } = await supabase
        .from('wallpapers')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true)
        .eq('is_active', true)
        .not('voice_search_keywords', 'is', null)

      return {
        total_wallpapers: totalWallpapers || 0,
        seo_optimized_wallpapers: seoOptimizedWallpapers || 0,
        average_seo_score: Math.round(averageSeoScore),
        voice_search_enabled: voiceSearchEnabled || 0,
        alt_text_coverage: totalWallpapers ? Math.round((seoOptimizedWallpapers || 0) / totalWallpapers * 100) : 0,
        structured_data_coverage: 95 // Placeholder - could be calculated from structured_data table
      }
    } catch (error) {
      console.error('Failed to get SEO analytics:', error)
      return {
        total_wallpapers: 0,
        seo_optimized_wallpapers: 0,
        average_seo_score: 0,
        voice_search_enabled: 0,
        alt_text_coverage: 0,
        structured_data_coverage: 0
      }
    }
  }

  /**
   * Get trending wallpapers for content freshness
   */
  async getTrendingWallpapers(limit: number = 10) {
    try {
      const { data, error } = await supabase
        .rpc('get_trending_wallpapers', {
          limit_param: limit
        })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Failed to get trending wallpapers:', error)
      return []
    }
  }

  /**
   * Update content freshness scores
   */
  async updateContentFreshness() {
    try {
      const { data, error } = await supabase
        .rpc('update_content_freshness')

      if (error) throw error
      return data
    } catch (error) {
      console.error('Failed to update content freshness:', error)
      throw error
    }
  }

  /**
   * Batch process SEO optimization for multiple wallpapers
   */
  async batchOptimizeWallpapers(wallpaperIds: number[], taskTypes: string[] = ['generate_alt_text']) {
    const results = []
    
    for (const wallpaperId of wallpaperIds) {
      try {
        // Get wallpaper data
        const { data: wallpaper } = await supabase
          .from('wallpapers')
          .select('*')
          .eq('id', wallpaperId)
          .maybeSingle()

        if (!wallpaper) continue

        const wallpaperResults: any = { wallpaper_id: wallpaperId, tasks: {} }

        // Process each task type
        for (const taskType of taskTypes) {
          try {
            switch (taskType) {
              case 'generate_alt_text':
                if (!wallpaper.alt_text) {
                  const result = await this.generateAltText(wallpaperId, wallpaper)
                  wallpaperResults.tasks.alt_text = result
                }
                break
                
              case 'optimize_images':
                const imageResult = await this.optimizeImages(wallpaperId, wallpaper.image_url)
                wallpaperResults.tasks.image_optimization = imageResult
                break
                
              default:
                console.warn(`Unknown task type: ${taskType}`)
            }
          } catch (taskError) {
            wallpaperResults.tasks[taskType] = { error: taskError.message }
          }
        }

        // Calculate new SEO score
        const newSeoScore = await this.calculateSEOScore(wallpaperId)
        wallpaperResults.new_seo_score = newSeoScore

        results.push(wallpaperResults)
      } catch (error) {
        results.push({
          wallpaper_id: wallpaperId,
          error: error.message
        })
      }
    }

    return results
  }

  /**
   * Get voice search queries analytics
   */
  async getVoiceSearchAnalytics() {
    try {
      const { data: queries } = await supabase
        .from('voice_search_queries')
        .select('*')
        .order('usage_count', { ascending: false })
        .limit(20)

      const { data: intentData } = await supabase
        .from('voice_search_queries')
        .select('search_intent')
        .not('search_intent', 'is', null)

      const intentCounts = intentData?.reduce((acc, item) => {
        acc[item.search_intent] = (acc[item.search_intent] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      return {
        top_queries: queries || [],
        intent_distribution: intentCounts,
        total_queries: queries?.reduce((sum, q) => sum + q.usage_count, 0) || 0
      }
    } catch (error) {
      console.error('Failed to get voice search analytics:', error)
      return {
        top_queries: [],
        intent_distribution: {},
        total_queries: 0
      }
    }
  }
}

export const seoOptimizationService = new SEOOptimizationService()