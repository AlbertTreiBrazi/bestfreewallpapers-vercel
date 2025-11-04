import React, { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'
import { seoOptimizationService } from '@/services/seoOptimizationService'

interface StructuredDataProps {
  type: 'WebSite' | 'WebPage' | 'ImageObject' | 'BreadcrumbList' | 'FAQPage' | 'CollectionPage'
  data: any
  context?: string
}

export function StructuredData({ type, data, context = 'https://schema.org' }: StructuredDataProps) {
  const location = useLocation()

  // Generate enhanced structured data based on type
  const generateStructuredData = () => {
    const baseData = {
      '@context': context,
      '@type': type,
      ...data
    }

    // Add common website information
    if (type === 'WebSite' || type === 'WebPage') {
      return {
        ...baseData,
        publisher: {
          '@type': 'Organization',
          name: 'Best Free Wallpapers',
          url: 'https://bestfreewallpapers.com',
          logo: {
            '@type': 'ImageObject',
            url: 'https://bestfreewallpapers.com/images/logo.png',
            width: 512,
            height: 512
          },
          sameAs: [
            'https://twitter.com/bestfreewallpapers',
            'https://facebook.com/bestfreewallpapers',
            'https://instagram.com/bestfreewallpapers'
          ]
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://bestfreewallpapers.com/search?q={search_term_string}'
          },
          'query-input': 'required name=search_term_string'
        }
      }
    }

    // Enhanced ImageObject with SEO metadata
    if (type === 'ImageObject') {
      return {
        ...baseData,
        author: {
          '@type': 'Organization',
          name: 'Best Free Wallpapers'
        },
        copyrightHolder: {
          '@type': 'Organization',
          name: 'Best Free Wallpapers'
        },
        license: 'https://bestfreewallpapers.com/license',
        acquireLicensePage: data.is_premium ? 'https://bestfreewallpapers.com/premium' : null,
        usageInfo: 'Free for personal use',
        creditText: 'Best Free Wallpapers'
      }
    }

    // Enhanced BreadcrumbList with website context
    if (type === 'BreadcrumbList') {
      return {
        ...baseData,
        itemListElement: data.itemListElement?.map((item: any) => ({
          ...item,
          item: item.item.startsWith('http') ? item.item : `https://bestfreewallpapers.com${item.item}`
        }))
      }
    }

    return baseData
  }

  // Track structured data usage for analytics
  useEffect(() => {
    if (type && data) {
      // Track structured data implementation
      const trackStructuredData = async () => {
        try {
          await seoOptimizationService.processVoiceSearch(
            `structured data ${type} on ${location.pathname}`,
            'faq'
          )
        } catch (error) {
          console.error('Failed to track structured data:', error)
        }
      }

      trackStructuredData()
    }
  }, [type, data, location.pathname])

  const structuredData = generateStructuredData()

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData, null, 2)}
      </script>
    </Helmet>
  )
}

// Predefined structured data components for common use cases
export const WebSiteStructuredData: React.FC<{ data?: any }> = ({ data = {} }) => (
  <StructuredData
    type="WebSite"
    data={{
      name: 'Best Free Wallpapers',
      alternateName: 'BestFreeWallpapers',
      url: 'https://bestfreewallpapers.com',
      description: 'Download thousands of free HD wallpapers for desktop and mobile. High-quality backgrounds in various categories.',
      inLanguage: 'en-US',
      isAccessibleForFree: true,
      ...data
    }}
  />
)

export const WallpaperStructuredData: React.FC<{ wallpaper: any }> = ({ wallpaper }) => (
  <StructuredData
    type="ImageObject"
    data={{
      name: wallpaper.title,
      description: wallpaper.seo_description || wallpaper.alt_text || wallpaper.title,
      url: wallpaper.image_url,
      thumbnailUrl: wallpaper.thumbnail_url,
      contentUrl: wallpaper.image_url,
      width: wallpaper.width,
      height: wallpaper.height,
      encodingFormat: 'image/jpeg',
      keywords: wallpaper.seo_keywords?.join(', ') || wallpaper.tags?.join(', '),
      downloadUrl: wallpaper.download_url,
      is_premium: wallpaper.is_premium
    }}
  />
)

export const CategoryStructuredData: React.FC<{ category: any; wallpapers: any[] }> = ({ category, wallpapers }) => (
  <StructuredData
    type="CollectionPage"
    data={{
      name: `${category.name} Wallpapers`,
      description: category.seo_description || category.content_description || category.description,
      url: `https://bestfreewallpapers.com/category/${category.slug}`,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: wallpapers.length,
        itemListElement: wallpapers.map((wallpaper, index) => ({
          '@type': 'ImageObject',
          position: index + 1,
          name: wallpaper.title,
          url: wallpaper.image_url,
          thumbnailUrl: wallpaper.thumbnail_url
        }))
      },
      keywords: category.meta_keywords?.join(', ') || category.name,
      about: {
        '@type': 'Thing',
        name: category.name,
        description: category.description
      }
    }}
  />
)

export const BreadcrumbStructuredData: React.FC<{ breadcrumbs: any[] }> = ({ breadcrumbs }) => (
  <StructuredData
    type="BreadcrumbList"
    data={{
      itemListElement: breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url
      }))
    }}
  />
)

export const FAQStructuredData: React.FC<{ faqs: any[] }> = ({ faqs }) => (
  <StructuredData
    type="FAQPage"
    data={{
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    }}
  />
)