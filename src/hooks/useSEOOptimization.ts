import { useState, useEffect, useCallback } from 'react'
import { seoOptimizationService } from '@/services/seoOptimizationService'
import { supabase } from '@/lib/supabase'

interface UseSEOOptimizationOptions {
  autoOptimize?: boolean
  enableVoiceSearch?: boolean
  trackAnalytics?: boolean
}

interface SEOOptimizationState {
  isOptimizing: boolean
  optimizationProgress: number
  lastOptimized: string | null
  errors: string[]
  analytics: any
}

export function useSEOOptimization(options: UseSEOOptimizationOptions = {}) {
  const {
    autoOptimize = false,
    enableVoiceSearch = true,
    trackAnalytics = true
  } = options

  const [state, setState] = useState<SEOOptimizationState>({
    isOptimizing: false,
    optimizationProgress: 0,
    lastOptimized: null,
    errors: [],
    analytics: null
  })

  // Generate optimized alt text for wallpaper
  const generateAltText = useCallback(async (wallpaperId: number, wallpaperData: any) => {
    try {
      setState(prev => ({ ...prev, isOptimizing: true, errors: [] }))
      
      const result = await seoOptimizationService.generateAltText(wallpaperId, wallpaperData)
      
      setState(prev => ({ 
        ...prev, 
        isOptimizing: false, 
        lastOptimized: new Date().toISOString(),
        optimizationProgress: 100
      }))
      
      return result
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isOptimizing: false, 
        errors: [...prev.errors, error.message]
      }))
      throw error
    }
  }, [])

  // Enhance content for categories/collections
  const enhanceContent = useCallback(async (entityType: 'category' | 'collection', entityId: string, entityData: any) => {
    try {
      setState(prev => ({ ...prev, isOptimizing: true, errors: [] }))
      
      const result = await seoOptimizationService.enhanceContent(entityType, entityId, entityData)
      
      setState(prev => ({ 
        ...prev, 
        isOptimizing: false, 
        lastOptimized: new Date().toISOString()
      }))
      
      return result
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isOptimizing: false, 
        errors: [...prev.errors, error.message]
      }))
      throw error
    }
  }, [])

  // Process voice search queries
  const processVoiceSearch = useCallback(async (query: string, action: 'search' | 'faq' = 'search') => {
    if (!enableVoiceSearch) return null
    
    try {
      const result = await seoOptimizationService.processVoiceSearch(query, action)
      
      // Track voice search analytics
      if (trackAnalytics) {
        // This would be tracked automatically by the edge function
        console.log('Voice search processed:', query, result)
      }
      
      return result
    } catch (error) {
      console.error('Voice search processing failed:', error)
      return null
    }
  }, [enableVoiceSearch, trackAnalytics])

  // Get related wallpapers for internal linking
  const getRelatedWallpapers = useCallback(async (wallpaperId: number, limit: number = 6) => {
    try {
      return await seoOptimizationService.getRelatedWallpapers(wallpaperId, limit)
    } catch (error) {
      console.error('Failed to get related wallpapers:', error)
      return []
    }
  }, [])

  // Calculate SEO score
  const calculateSEOScore = useCallback(async (wallpaperId: number) => {
    try {
      return await seoOptimizationService.calculateSEOScore(wallpaperId)
    } catch (error) {
      console.error('Failed to calculate SEO score:', error)
      return 0
    }
  }, [])

  // Generate breadcrumbs
  const generateBreadcrumbs = useCallback(async (pageType: string, pageId?: string, categoryId?: number) => {
    try {
      return await seoOptimizationService.generateBreadcrumbs(pageType, pageId, categoryId)
    } catch (error) {
      console.error('Failed to generate breadcrumbs:', error)
      return [{ name: 'Home', url: '/', position: 1 }]
    }
  }, [])

  // Batch optimize wallpapers
  const batchOptimize = useCallback(async (wallpaperIds: number[], taskTypes: string[] = ['generate_alt_text']) => {
    try {
      setState(prev => ({ ...prev, isOptimizing: true, optimizationProgress: 0, errors: [] }))
      
      const results = await seoOptimizationService.batchOptimizeWallpapers(wallpaperIds, taskTypes)
      
      setState(prev => ({ 
        ...prev, 
        isOptimizing: false, 
        optimizationProgress: 100,
        lastOptimized: new Date().toISOString()
      }))
      
      return results
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isOptimizing: false, 
        errors: [...prev.errors, error.message]
      }))
      throw error
    }
  }, [])

  // Load SEO analytics
  const loadAnalytics = useCallback(async () => {
    if (!trackAnalytics) return
    
    try {
      const analytics = await seoOptimizationService.getSEOAnalytics()
      setState(prev => ({ ...prev, analytics }))
      return analytics
    } catch (error) {
      console.error('Failed to load SEO analytics:', error)
      return null
    }
  }, [trackAnalytics])

  // Auto-optimize new wallpapers
  useEffect(() => {
    if (!autoOptimize) return

    const handleNewWallpapers = async () => {
      try {
        // Get wallpapers without alt text
        const { data: wallpapers } = await supabase
          .from('wallpapers')
          .select('id, title, image_url, category_id, tags, device_type')
          .is('alt_text', null)
          .eq('is_published', true)
          .eq('is_active', true)
          .limit(5) // Process in small batches

        if (wallpapers && wallpapers.length > 0) {
          console.log(`Auto-optimizing ${wallpapers.length} wallpapers...`)
          
          for (const wallpaper of wallpapers) {
            try {
              await generateAltText(wallpaper.id, wallpaper)
              // Small delay to avoid overwhelming the system
              await new Promise(resolve => setTimeout(resolve, 1000))
            } catch (error) {
              console.error(`Failed to auto-optimize wallpaper ${wallpaper.id}:`, error)
            }
          }
        }
      } catch (error) {
        console.error('Auto-optimization failed:', error)
      }
    }

    // Run auto-optimization every 5 minutes
    const interval = setInterval(handleNewWallpapers, 5 * 60 * 1000)
    
    // Run once on mount
    handleNewWallpapers()

    return () => clearInterval(interval)
  }, [autoOptimize, generateAltText])

  // Load analytics on mount
  useEffect(() => {
    if (trackAnalytics) {
      loadAnalytics()
    }
  }, [trackAnalytics, loadAnalytics])

  // Clear errors after 10 seconds
  useEffect(() => {
    if (state.errors.length > 0) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, errors: [] }))
      }, 10000)
      
      return () => clearTimeout(timer)
    }
  }, [state.errors])

  return {
    // State
    isOptimizing: state.isOptimizing,
    optimizationProgress: state.optimizationProgress,
    lastOptimized: state.lastOptimized,
    errors: state.errors,
    analytics: state.analytics,
    
    // Actions
    generateAltText,
    enhanceContent,
    processVoiceSearch,
    getRelatedWallpapers,
    calculateSEOScore,
    generateBreadcrumbs,
    batchOptimize,
    loadAnalytics,
    
    // Utilities
    clearErrors: () => setState(prev => ({ ...prev, errors: [] })),
    resetProgress: () => setState(prev => ({ ...prev, optimizationProgress: 0 }))
  }
}