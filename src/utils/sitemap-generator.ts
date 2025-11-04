/**
 * Enhanced Sitemap Generation Utility
 * Generates comprehensive XML sitemaps for better SEO
 */

import { supabase } from '@/lib/supabase'

interface SitemapEntry {
  url: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
  images?: Array<{
    url: string
    title?: string
    caption?: string
  }>
}

export class SitemapGenerator {
  private baseUrl: string
  private entries: SitemapEntry[] = []

  constructor(baseUrl: string = 'https://bestfreewallpapers.com') {
    this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
  }

  /**
   * Add a URL to the sitemap
   */
  addUrl(entry: SitemapEntry): void {
    this.entries.push({
      ...entry,
      url: this.normalizeUrl(entry.url)
    })
  }

  /**
   * Add multiple URLs to the sitemap
   */
  addUrls(entries: SitemapEntry[]): void {
    entries.forEach(entry => this.addUrl(entry))
  }

  /**
   * Generate static pages for the sitemap
   */
  addStaticPages(): void {
    const staticPages: SitemapEntry[] = [
      {
        url: '/',
        changefreq: 'daily',
        priority: 1.0,
        lastmod: new Date().toISOString()
      },
      {
        url: '/wallpapers',
        changefreq: 'daily',
        priority: 0.9,
        lastmod: new Date().toISOString()
      },
      {
        url: '/categories',
        changefreq: 'weekly',
        priority: 0.8,
        lastmod: new Date().toISOString()
      },
      {
        url: '/premium',
        changefreq: 'monthly',
        priority: 0.7,
        lastmod: new Date().toISOString()
      },
      {
        url: '/about',
        changefreq: 'monthly',
        priority: 0.5,
        lastmod: new Date().toISOString()
      },
      {
        url: '/contact',
        changefreq: 'monthly',
        priority: 0.5,
        lastmod: new Date().toISOString()
      },
      {
        url: '/privacy',
        changefreq: 'yearly',
        priority: 0.3,
        lastmod: new Date().toISOString()
      },
      {
        url: '/terms',
        changefreq: 'yearly',
        priority: 0.3,
        lastmod: new Date().toISOString()
      },
      {
        url: '/help',
        changefreq: 'monthly',
        priority: 0.4,
        lastmod: new Date().toISOString()
      }
    ]

    this.addUrls(staticPages)
  }

  /**
   * Add wallpaper pages from database
   */
  async addWallpaperPages(): Promise<void> {
    try {
      const { data: wallpapers, error } = await supabase
        .from('wallpapers')
        .select('slug, updated_at, title, image_url, thumbnail_url')
        .eq('is_published', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50000) // Reasonable limit for sitemap

      if (error) {
        console.error('Error fetching wallpapers for sitemap:', error)
        return
      }

      if (wallpapers) {
        const wallpaperEntries: SitemapEntry[] = wallpapers.map(wallpaper => ({
          url: `/wallpaper/${wallpaper.slug}`,
          lastmod: wallpaper.updated_at || new Date().toISOString(),
          changefreq: 'weekly' as const,
          priority: 0.8,
          images: [
            {
              url: wallpaper.thumbnail_url || wallpaper.image_url || '',
              title: wallpaper.title,
              caption: `Free ${wallpaper.title} wallpaper download`
            }
          ].filter(img => img.url) // Remove empty image URLs
        }))

        this.addUrls(wallpaperEntries)
      }
    } catch (error) {
      console.error('Error adding wallpaper pages to sitemap:', error)
    }
  }

  /**
   * Add category pages from database
   */
  async addCategoryPages(): Promise<void> {
    try {
      const { data: categories, error } = await supabase
        .from('categories')
        .select('slug, updated_at, name, preview_image')
        .eq('is_active', true)
        .order('sort_order')

      if (error) {
        console.error('Error fetching categories for sitemap:', error)
        return
      }

      if (categories) {
        const categoryEntries: SitemapEntry[] = categories.map(category => ({
          url: `/category/${category.slug}`,
          lastmod: category.updated_at || new Date().toISOString(),
          changefreq: 'weekly' as const,
          priority: 0.7,
          images: category.preview_image ? [
            {
              url: category.preview_image,
              title: `${category.name} wallpapers`,
              caption: `Browse ${category.name} wallpapers collection`
            }
          ] : undefined
        }))

        this.addUrls(categoryEntries)
      }
    } catch (error) {
      console.error('Error adding category pages to sitemap:', error)
    }
  }

  /**
   * Generate XML sitemap
   */
  generateXML(): string {
    const header = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`

    const urls = this.entries.map(entry => {
      let xml = `  <url>
    <loc>${this.escapeXml(entry.url)}</loc>`
      
      if (entry.lastmod) {
        xml += `
    <lastmod>${entry.lastmod}</lastmod>`
      }
      
      if (entry.changefreq) {
        xml += `
    <changefreq>${entry.changefreq}</changefreq>`
      }
      
      if (entry.priority !== undefined) {
        xml += `
    <priority>${entry.priority.toFixed(1)}</priority>`
      }
      
      // Add image information
      if (entry.images && entry.images.length > 0) {
        entry.images.forEach(image => {
          xml += `
    <image:image>`
          xml += `
      <image:loc>${this.escapeXml(image.url)}</image:loc>`
          if (image.title) {
            xml += `
      <image:title>${this.escapeXml(image.title)}</image:title>`
          }
          if (image.caption) {
            xml += `
      <image:caption>${this.escapeXml(image.caption)}</image:caption>`
          }
          xml += `
    </image:image>`
        })
      }
      
      xml += `
  </url>`
      return xml
    }).join('\n')

    const footer = '</urlset>'

    return `${header}
${urls}
${footer}`
  }

  /**
   * Generate sitemap index for large sites
   */
  generateSitemapIndex(sitemapUrls: string[]): string {
    const header = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`

    const sitemaps = sitemapUrls.map(url => {
      return `  <sitemap>
    <loc>${this.escapeXml(url)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`
    }).join('\n')

    const footer = '</sitemapindex>'

    return `${header}
${sitemaps}
${footer}`
  }

  /**
   * Generate comprehensive sitemap with all content
   */
  async generateCompleteSitemap(): Promise<string> {
    // Clear existing entries
    this.entries = []

    // Add all content types
    this.addStaticPages()
    await this.addWallpaperPages()
    await this.addCategoryPages()

    // Sort entries by priority (descending) then by URL
    this.entries.sort((a, b) => {
      const priorityDiff = (b.priority || 0) - (a.priority || 0)
      if (priorityDiff !== 0) return priorityDiff
      return a.url.localeCompare(b.url)
    })

    return this.generateXML()
  }

  /**
   * Get sitemap statistics
   */
  getStats(): { totalUrls: number; byType: Record<string, number> } {
    const stats = {
      totalUrls: this.entries.length,
      byType: {} as Record<string, number>
    }

    this.entries.forEach(entry => {
      const type = this.getUrlType(entry.url)
      stats.byType[type] = (stats.byType[type] || 0) + 1
    })

    return stats
  }

  /**
   * Normalize URL to full absolute URL
   */
  private normalizeUrl(url: string): string {
    if (url.startsWith('http')) {
      return url
    }
    return `${this.baseUrl}${url.startsWith('/') ? url : '/' + url}`
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  /**
   * Determine URL type for statistics
   */
  private getUrlType(url: string): string {
    if (url.includes('/wallpaper/')) return 'wallpapers'
    if (url.includes('/category/')) return 'categories'
    if (url === this.baseUrl || url === `${this.baseUrl}/`) return 'homepage'
    return 'static'
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = []
  }
}

// Export singleton instance
export const sitemapGenerator = new SitemapGenerator()

// Utility function to generate and save sitemap
export async function generateAndSaveSitemap(): Promise<{ success: boolean; xml?: string; error?: string }> {
  try {
    const xml = await sitemapGenerator.generateCompleteSitemap()
    const stats = sitemapGenerator.getStats()
    
    console.log('Sitemap generated successfully:', stats)
    
    return {
      success: true,
      xml
    }
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
