import React from 'react'
import { Helmet } from 'react-helmet-async'
import { generateImageMetadata } from '@/utils/responsiveImages'

interface SEOPreRendererProps {
  title: string
  description: string
  keywords?: string[]
  canonicalUrl?: string
  imageUrl?: string
  imageAlt?: string
  imageWidth?: number
  imageHeight?: number
  type?: 'website' | 'article' | 'product'
  publishedTime?: string
  modifiedTime?: string
  author?: string
  category?: string
  tags?: string[]
  structuredData?: object
}

/**
 * SEO Pre-renderer component for better search engine optimization
 * Generates meta tags, Open Graph data, Twitter cards, and structured data
 */
export function SEOPreRenderer({
  title,
  description,
  keywords = [],
  canonicalUrl,
  imageUrl,
  imageAlt,
  imageWidth,
  imageHeight,
  type = 'website',
  publishedTime,
  modifiedTime,
  author,
  category,
  tags = [],
  structuredData
}: SEOPreRendererProps) {
  // Generate image metadata if image is provided
  const imageMetadata = imageUrl && imageAlt 
    ? generateImageMetadata({
        src: imageUrl,
        alt: imageAlt,
        width: imageWidth,
        height: imageHeight,
        type
      })
    : {}

  // Generate structured data for wallpapers
  const defaultStructuredData = {
    '@context': 'https://schema.org',
    '@type': type === 'product' ? 'Product' : 'WebPage',
    name: title,
    description,
    ...(imageUrl && {
      image: {
        '@type': 'ImageObject',
        url: imageUrl,
        width: imageWidth,
        height: imageHeight
      }
    }),
    ...(canonicalUrl && { url: canonicalUrl }),
    ...(publishedTime && { datePublished: publishedTime }),
    ...(modifiedTime && { dateModified: modifiedTime }),
    ...(author && {
      author: {
        '@type': 'Organization',
        name: author
      }
    }),
    ...(category && { category }),
    ...(tags.length > 0 && { keywords: tags.join(', ') })
  }

  const finalStructuredData = structuredData || defaultStructuredData

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}
      
      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      
      {/* Image Meta Tags */}
      {Object.entries(imageMetadata).map(([key, value]) => (
        <meta key={key} property={key} content={String(value)} />
      ))}
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      
      {/* Article Meta Tags */}
      {type === 'article' && (
        <>
          {publishedTime && (
            <meta property="article:published_time" content={publishedTime} />
          )}
          {modifiedTime && (
            <meta property="article:modified_time" content={modifiedTime} />
          )}
          {author && <meta property="article:author" content={author} />}
          {category && <meta property="article:section" content={category} />}
          {tags.map(tag => (
            <meta key={tag} property="article:tag" content={tag} />
          ))}
        </>
      )}
      
      {/* Product Meta Tags */}
      {type === 'product' && (
        <>
          <meta property="product:availability" content="in stock" />
          <meta property="product:condition" content="new" />
          <meta property="product:price:amount" content="0" />
          <meta property="product:price:currency" content="USD" />
        </>
      )}
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(finalStructuredData)}
      </script>
      
      {/* Performance and SEO Meta Tags */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      
      {/* Preconnect to external domains for performance */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://images.unsplash.com" />
      <link rel="dns-prefetch" href="//www.google-analytics.com" />
    </Helmet>
  )
}

/**
 * Generate SEO-optimized meta data for wallpaper pages
 */
export function generateWallpaperSEO({
  wallpaper,
  category,
  baseUrl = ''
}: {
  wallpaper: {
    id: number
    title: string
    slug: string
    description?: string
    thumbnail_url: string
    width?: number
    height?: number
    tags?: string[]
    created_at: string
    download_count?: number
  }
  category?: {
    name: string
    slug: string
  }
  baseUrl?: string
}) {
  const title = `${wallpaper.title} - Free HD Wallpaper Download`
  const description = wallpaper.description || 
    `Download ${wallpaper.title} in high quality. ${wallpaper.width && wallpaper.height ? `${wallpaper.width}x${wallpaper.height} resolution.` : ''} ${category ? `${category.name} wallpaper.` : ''} Free download with ${wallpaper.download_count || 0} downloads.`
  
  const keywords = [
    wallpaper.title.toLowerCase(),
    'wallpaper',
    'hd wallpaper',
    'free download',
    ...(category ? [category.name.toLowerCase()] : []),
    ...(wallpaper.tags || []),
    ...(wallpaper.width && wallpaper.height ? [`${wallpaper.width}x${wallpaper.height}`] : [])
  ]

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': `${baseUrl}/wallpaper/${wallpaper.slug}`,
    name: wallpaper.title,
    description,
    image: {
      '@type': 'ImageObject',
      url: wallpaper.thumbnail_url,
      width: wallpaper.width,
      height: wallpaper.height
    },
    url: `${baseUrl}/wallpaper/${wallpaper.slug}`,
    datePublished: wallpaper.created_at,
    keywords: keywords.join(', '),
    genre: category?.name,
    downloadUrl: `${baseUrl}/download/${wallpaper.slug}`,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    copyrightHolder: {
      '@type': 'Organization',
      name: 'Best Free Wallpapers'
    },
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/DownloadAction',
      userInteractionCount: wallpaper.download_count || 0
    }
  }

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${baseUrl}/wallpaper/${wallpaper.slug}`,
    imageUrl: wallpaper.thumbnail_url,
    imageAlt: wallpaper.title,
    imageWidth: wallpaper.width,
    imageHeight: wallpaper.height,
    type: 'product' as const,
    publishedTime: wallpaper.created_at,
    category: category?.name,
    tags: wallpaper.tags,
    structuredData
  }
}

/**
 * Generate SEO-optimized meta data for category pages
 */
export function generateCategorySEO({
  category,
  wallpaperCount,
  featuredImage,
  baseUrl = ''
}: {
  category: {
    name: string
    slug: string
    description?: string
  }
  wallpaperCount: number
  featuredImage?: string
  baseUrl?: string
}) {
  const title = `${category.name} Wallpapers - Free HD Downloads (${wallpaperCount} Images)`
  const description = category.description || 
    `Browse and download ${wallpaperCount} high-quality ${category.name.toLowerCase()} wallpapers for free. HD and 4K resolution wallpapers for desktop and mobile.`
  
  const keywords = [
    category.name.toLowerCase(),
    `${category.name.toLowerCase()} wallpapers`,
    'hd wallpapers',
    'free wallpapers',
    'desktop wallpapers',
    'mobile wallpapers',
    '4k wallpapers'
  ]

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${baseUrl}/category/${category.slug}`,
    name: title,
    description,
    url: `${baseUrl}/category/${category.slug}`,
    mainEntity: {
      '@type': 'ItemList',
      name: `${category.name} Wallpapers`,
      numberOfItems: wallpaperCount,
      itemListElement: {
        '@type': 'CreativeWork',
        genre: category.name
      }
    },
    ...(featuredImage && {
      image: {
        '@type': 'ImageObject',
        url: featuredImage
      }
    })
  }

  return {
    title,
    description,
    keywords,
    canonicalUrl: `${baseUrl}/category/${category.slug}`,
    imageUrl: featuredImage,
    imageAlt: `${category.name} wallpapers collection`,
    type: 'website' as const,
    category: category.name,
    structuredData
  }
}

export default SEOPreRenderer
