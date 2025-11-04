/**
 * Advanced Sitemap Manager
 * Provides utilities for sitemap generation and management
 * Integrates with the advanced sitemap generation system
 */

import { supabase } from '@/lib/supabase'

// Types for sitemap management
export interface SitemapStats {
  totalUrls: number
  totalImages: number
  totalSize: number
  lastGenerated: string
  sitemaps: {
    main: { urls: number; size: number }
    images: { urls: number; images: number; size: number }
    categories: { urls: number; size: number }
    index: { sitemaps: number; size: number }
  }
}

export interface SitemapGenerationRequest {
  trigger: 'manual' | 'auto' | 'webhook'
  userId?: string
  reason?: string
}

// Sitemap configuration
const SITEMAP_CONFIG = {
  maxUrlsPerSitemap: 50000, // Google's limit
  maxImageUrlsPerSitemap: 1000, // Conservative limit for image sitemaps
  updateFrequency: {
    main: 'daily',
    images: 'weekly', 
    categories: 'weekly'
  },
  priorities: {
    homepage: 1.0,
    categories: 0.8,
    collections: 0.7,
    wallpapers: 0.6,
    premium: 0.7,
    static: 0.5
  }
}

/**
 * Trigger sitemap regeneration via Supabase Edge Function
 */
export async function triggerSitemapUpdate(request: SitemapGenerationRequest): Promise<{
  success: boolean
  message: string
  stats?: SitemapStats
}> {
  try {
    console.log('🔄 Triggering sitemap update...', request)
    
    const { data, error } = await supabase.functions.invoke('sitemap-update-trigger', {
      body: {
        trigger: request.trigger,
        userId: request.userId,
        reason: request.reason,
        timestamp: new Date().toISOString()
      }
    })
    
    if (error) {
      console.error('❌ Error triggering sitemap update:', error)
      return {
        success: false,
        message: `Failed to trigger sitemap update: ${error.message}`
      }
    }
    
    console.log('✅ Sitemap update triggered successfully')
    return {
      success: true,
      message: 'Sitemap update triggered successfully',
      stats: data?.stats
    }
  } catch (error) {
    console.error('❌ Exception during sitemap update:', error)
    return {
      success: false,
      message: 'An unexpected error occurred during sitemap update'
    }
  }
}

/**
 * Get sitemap statistics and health information
 */
export async function getSitemapStats(): Promise<SitemapStats | null> {
  try {
    // Fetch data for statistics
    const [categoriesResult, wallpapersResult, collectionsResult] = await Promise.all([
      supabase.from('categories').select('id, updated_at').eq('is_active', true),
      supabase.from('wallpapers').select('id, updated_at').eq('is_published', true),
      supabase.from('collections').select('id, updated_at')
    ])
    
    const categoryCount = categoriesResult.data?.length || 0
    const wallpaperCount = wallpapersResult.data?.length || 0
    const collectionCount = collectionsResult.data?.length || 0
    
    // Calculate estimated sitemap statistics
    const staticPagesCount = 17 // From STATIC_PAGES in the generator
    const totalUrls = staticPagesCount + categoryCount + collectionCount + wallpaperCount
    
    // Estimate images (wallpapers typically have 2-3 image variants)
    const estimatedImages = wallpaperCount * 2.5
    
    // Estimate file sizes (rough calculation)
    const avgUrlSize = 200 // bytes per URL entry
    const avgImageSize = 300 // bytes per image entry
    const totalSize = (totalUrls * avgUrlSize) + (estimatedImages * avgImageSize)
    
    return {
      totalUrls,
      totalImages: Math.round(estimatedImages),
      totalSize,
      lastGenerated: new Date().toISOString(),
      sitemaps: {
        main: {
          urls: staticPagesCount + categoryCount + collectionCount + Math.min(wallpaperCount, 1000),
          size: Math.round(totalSize * 0.4)
        },
        images: {
          urls: wallpaperCount,
          images: Math.round(estimatedImages),
          size: Math.round(totalSize * 0.5)
        },
        categories: {
          urls: categoryCount * 2, // Regular + mobile versions
          size: Math.round(totalSize * 0.1)
        },
        index: {
          sitemaps: 4, // main, images, categories, plus index itself
          size: Math.round(totalSize * 0.01)
        }
      }
    }
  } catch (error) {
    console.error('❌ Error fetching sitemap stats:', error)
    return null
  }
}

/**
 * Check if sitemap update is needed based on content changes
 */
export async function shouldUpdateSitemap(): Promise<{
  needed: boolean
  reason?: string
  urgency: 'low' | 'medium' | 'high'
}> {
  try {
    // Check for recent content changes
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    const [recentWallpapers, recentCategories, recentCollections] = await Promise.all([
      supabase
        .from('wallpapers')
        .select('id, created_at')
        .gte('created_at', oneDayAgo)
        .eq('is_published', true),
      supabase
        .from('categories')
        .select('id, created_at, updated_at')
        .or(`created_at.gte.${oneDayAgo},updated_at.gte.${oneDayAgo}`)
        .eq('is_active', true),
      supabase
        .from('collections')
        .select('id, created_at, updated_at')
        .or(`created_at.gte.${oneDayAgo},updated_at.gte.${oneDayAgo}`)
    ])
    
    const newWallpapers = recentWallpapers.data?.length || 0
    const newCategories = recentCategories.data?.length || 0
    const newCollections = recentCollections.data?.length || 0
    
    // Check for urgent updates (within last hour)
    const urgentWallpapers = await supabase
      .from('wallpapers')
      .select('id')
      .gte('created_at', oneHourAgo)
      .eq('is_published', true)
    
    const urgentCount = urgentWallpapers.data?.length || 0
    
    // Determine if update is needed
    if (urgentCount > 0) {
      return {
        needed: true,
        reason: `${urgentCount} new wallpapers published in the last hour`,
        urgency: 'high'
      }
    }
    
    if (newWallpapers >= 10) {
      return {
        needed: true,
        reason: `${newWallpapers} new wallpapers published in the last 24 hours`,
        urgency: 'medium'
      }
    }
    
    if (newWallpapers > 0 || newCategories > 0 || newCollections > 0) {
      return {
        needed: true,
        reason: `Content updates: ${newWallpapers} wallpapers, ${newCategories} categories, ${newCollections} collections`,
        urgency: 'low'
      }
    }
    
    return {
      needed: false,
      urgency: 'low'
    }
  } catch (error) {
    console.error('❌ Error checking sitemap update need:', error)
    return {
      needed: true,
      reason: 'Error checking content changes',
      urgency: 'medium'
    }
  }
}

/**
 * Validate sitemap URLs and structure
 */
export async function validateSitemaps(): Promise<{
  valid: boolean
  issues: string[]
  recommendations: string[]
}> {
  try {
    const issues: string[] = []
    const recommendations: string[] = []
    
    // Check if sitemap files exist
    const sitemapUrls = [
      '/sitemap-index.xml',
      '/sitemap.xml',
      '/sitemap-images.xml',
      '/sitemap-categories.xml'
    ]
    
    for (const url of sitemapUrls) {
      try {
        const response = await fetch(url, { method: 'HEAD' })
        if (!response.ok) {
          issues.push(`Sitemap ${url} is not accessible (${response.status})`)
        }
      } catch (error) {
        issues.push(`Failed to check sitemap ${url}: ${error.message}`)
      }
    }
    
    // Check content statistics
    const stats = await getSitemapStats()
    if (stats) {
      if (stats.totalUrls > SITEMAP_CONFIG.maxUrlsPerSitemap) {
        issues.push(`Total URLs (${stats.totalUrls}) exceeds recommended limit (${SITEMAP_CONFIG.maxUrlsPerSitemap})`)
        recommendations.push('Consider splitting into multiple sitemaps or implementing pagination')
      }
      
      if (stats.sitemaps.images.images > SITEMAP_CONFIG.maxImageUrlsPerSitemap) {
        recommendations.push('Consider optimizing image sitemap size for better crawling performance')
      }
    }
    
    return {
      valid: issues.length === 0,
      issues,
      recommendations
    }
  } catch (error) {
    console.error('❌ Error validating sitemaps:', error)
    return {
      valid: false,
      issues: ['Failed to validate sitemaps'],
      recommendations: ['Check sitemap generation system']
    }
  }
}

/**
 * Schedule automatic sitemap updates
 */
export async function scheduleAutomaticUpdates(): Promise<void> {
  // This would typically be called by a cron job or scheduled task
  try {
    const updateCheck = await shouldUpdateSitemap()
    
    if (updateCheck.needed) {
      console.log(`🔄 Automatic sitemap update triggered: ${updateCheck.reason}`)
      
      await triggerSitemapUpdate({
        trigger: 'auto',
        reason: updateCheck.reason
      })
    } else {
      console.log('✅ No sitemap update needed')
    }
  } catch (error) {
    console.error('❌ Error in scheduled sitemap update:', error)
  }
}

/**
 * Get sitemap URLs for robots.txt and external submission
 */
export function getSitemapUrls(): {
  index: string
  main: string
  images: string
  categories: string
} {
  const baseUrl = process.env.VITE_SITE_URL || 'https://bestfreewallpapers.com'
  
  return {
    index: `${baseUrl}/sitemap-index.xml`,
    main: `${baseUrl}/sitemap.xml`,
    images: `${baseUrl}/sitemap-images.xml`,
    categories: `${baseUrl}/sitemap-categories.xml`
  }
}

export { SITEMAP_CONFIG }