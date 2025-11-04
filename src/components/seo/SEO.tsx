import React, { useEffect } from 'react'
import { siteConfig, getCanonicalUrl, getImageUrl } from '@/config/site'

export interface SEOProps {
  title?: string
  description?: string
  keywords?: string[]
  image?: string
  url?: string
  type?: 'website' | 'article' | 'product'
  publishedTime?: string
  modifiedTime?: string
  author?: string
  section?: string
  tags?: string[]
  noIndex?: boolean
  noFollow?: boolean
  structuredData?: object
}

const updateMetaTag = (name: string, content: string, property = false) => {
  const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`
  let meta = document.querySelector(selector) as HTMLMetaElement
  
  if (!meta) {
    meta = document.createElement('meta')
    if (property) {
      meta.setAttribute('property', name)
    } else {
      meta.setAttribute('name', name)
    }
    document.head.appendChild(meta)
  }
  
  meta.setAttribute('content', content)
}

const updateLinkTag = (rel: string, href: string) => {
  let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement
  
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', rel)
    document.head.appendChild(link)
  }
  
  link.setAttribute('href', href)
}

const updateStructuredData = (data: object, id = 'structured-data') => {
  let script = document.querySelector(`#${id}`) as HTMLScriptElement
  
  if (!script) {
    script = document.createElement('script')
    script.setAttribute('type', 'application/ld+json')
    script.setAttribute('id', id)
    document.head.appendChild(script)
  }
  
  script.textContent = JSON.stringify(data)
}

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords = [],
  image,
  url,
  type = 'website',
  publishedTime,
  modifiedTime,
  author,
  section,
  tags = [],
  noIndex = false,
  noFollow = false,
  structuredData
}) => {
  useEffect(() => {
    const pageTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.seo.defaultTitle
    const pageDescription = description || siteConfig.seo.defaultDescription
    const pageKeywords = [...siteConfig.seo.keywords, ...keywords].join(', ')
    const pageImage = image ? getImageUrl(image) : `${siteConfig.url}/images/og-default.jpg`
    const pageUrl = getCanonicalUrl(url || '')
    const pageTags = [...tags]

    // Update title
    document.title = pageTitle
    
    // Update meta tags
    updateMetaTag('description', pageDescription)
    updateMetaTag('keywords', pageKeywords)
    updateMetaTag('author', author || siteConfig.author)
    updateMetaTag('robots', `${noIndex ? 'noindex' : 'index'}, ${noFollow ? 'nofollow' : 'follow'}`)
    
    // Update canonical URL
    updateLinkTag('canonical', pageUrl)
    
    // Open Graph
    updateMetaTag('og:type', type, true)
    updateMetaTag('og:title', pageTitle, true)
    updateMetaTag('og:description', pageDescription, true)
    updateMetaTag('og:image', pageImage, true)
    updateMetaTag('og:image:width', '1200', true)
    updateMetaTag('og:image:height', '630', true)
    updateMetaTag('og:image:alt', title || siteConfig.name, true)
    updateMetaTag('og:url', pageUrl, true)
    updateMetaTag('og:site_name', siteConfig.name, true)
    updateMetaTag('og:locale', 'en_US', true)
    
    // Article specific Open Graph
    if (type === 'article' && publishedTime) {
      updateMetaTag('article:published_time', publishedTime, true)
    }
    if (type === 'article' && modifiedTime) {
      updateMetaTag('article:modified_time', modifiedTime, true)
    }
    if (type === 'article' && author) {
      updateMetaTag('article:author', author, true)
    }
    if (type === 'article' && section) {
      updateMetaTag('article:section', section, true)
    }
    
    // Twitter Card
    updateMetaTag('twitter:card', 'summary_large_image')
    updateMetaTag('twitter:site', '@bestfreewallpapers')
    updateMetaTag('twitter:creator', '@bestfreewallpapers')
    updateMetaTag('twitter:title', pageTitle)
    updateMetaTag('twitter:description', pageDescription)
    updateMetaTag('twitter:image', pageImage)
    updateMetaTag('twitter:image:alt', title || siteConfig.name)
    
    // Additional Meta Tags
    updateMetaTag('theme-color', '#8B5CF6')
    updateMetaTag('msapplication-TileColor', '#8B5CF6')
    updateMetaTag('apple-mobile-web-app-capable', 'yes')
    updateMetaTag('apple-mobile-web-app-status-bar-style', 'default')
    updateMetaTag('apple-mobile-web-app-title', siteConfig.shortName)
    
    // Structured Data
    const defaultStructuredData = {
      '@context': 'https://schema.org',
      '@type': type === 'article' ? 'Article' : 'WebSite',
      name: siteConfig.name,
      url: pageUrl,
      description: pageDescription,
      publisher: {
        '@type': 'Organization',
        name: siteConfig.name,
        url: siteConfig.url,
        logo: {
          '@type': 'ImageObject',
          url: `${siteConfig.url}/images/logo.png`
        }
      }
    }

    const finalStructuredData = structuredData || defaultStructuredData
    updateStructuredData(finalStructuredData)
    
  }, [title, description, keywords, image, url, type, publishedTime, modifiedTime, author, section, tags, noIndex, noFollow, structuredData])

  return null
}

// Convenience components for specific page types
export const HomeSEO: React.FC<Partial<SEOProps>> = (props) => (
  <SEO
    title={"Best Free Wallpapers - HD Desktop & Mobile Backgrounds"}
    description={"Discover thousands of high-quality free wallpapers for desktop and mobile. Download HD backgrounds in various categories including nature, abstract, gaming, technology, and more."}
    keywords={['free wallpapers', 'HD wallpapers', 'desktop backgrounds', 'mobile wallpapers', 'high quality wallpapers']}
    type="website"
    structuredData={{
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteConfig.name,
      alternateName: 'BestFreeWallpapers',
      url: siteConfig.url,
      description: siteConfig.seo.defaultDescription,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${siteConfig.url}/search?q={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      },
      publisher: {
        '@type': 'Organization',
        name: siteConfig.name,
        url: siteConfig.url,
        logo: {
          '@type': 'ImageObject',
          url: `${siteConfig.url}/images/logo.png`,
          width: 512,
          height: 512
        },
        sameAs: [
          siteConfig.social.twitter,
          siteConfig.social.facebook,
          siteConfig.social.instagram
        ]
      }
    }}
    {...props}
  />
)

export const WallpaperSEO: React.FC<{
  wallpaper: {
    id: number
    title: string
    slug?: string
    description?: string
    tags?: string[]
    category?: string
    thumbnail_url?: string
    created_at: string
    updated_at?: string
  }
} & Partial<SEOProps>> = ({ wallpaper, ...props }) => {
  const wallpaperUrl = `/wallpaper/${wallpaper.slug || wallpaper.id}`
  const imageUrl = wallpaper.thumbnail_url || `${siteConfig.url}/images/wallpaper-placeholder.jpg`
  
  return (
    <SEO
      title={`${wallpaper.title} - Free HD Wallpaper`}
      description={wallpaper.description || `Download ${wallpaper.title} - High quality free wallpaper for desktop and mobile. Part of our ${wallpaper.category || 'premium'} collection.`}
      keywords={wallpaper.tags || [wallpaper.category || 'wallpaper', 'HD', 'free']}
      image={imageUrl}
      url={wallpaperUrl}
      type="article"
      publishedTime={wallpaper.created_at}
      modifiedTime={wallpaper.updated_at}
      section={wallpaper.category}
      tags={wallpaper.tags}
      structuredData={{
        '@context': 'https://schema.org',
        '@type': 'ImageObject',
        name: wallpaper.title,
        description: wallpaper.description || `High quality ${wallpaper.title} wallpaper`,
        url: imageUrl,
        contentUrl: imageUrl,
        datePublished: wallpaper.created_at,
        dateModified: wallpaper.updated_at || wallpaper.created_at,
        author: {
          '@type': 'Organization',
          name: siteConfig.name
        },
        publisher: {
          '@type': 'Organization',
          name: siteConfig.name,
          logo: {
            '@type': 'ImageObject',
            url: `${siteConfig.url}/images/logo.png`
          }
        },
        keywords: wallpaper.tags?.join(', '),
        genre: wallpaper.category,
        isFamilyFriendly: true
      }}
      {...props}
    />
  )
}

export const CategorySEO: React.FC<{
  category: {
    name: string
    slug: string
    description?: string
  }
  wallpaperCount?: number
} & Partial<SEOProps>> = ({ category, wallpaperCount, ...props }) => (
  <SEO
    title={`${category.name} Wallpapers - Free HD Backgrounds`}
    description={category.description || `Browse ${wallpaperCount || 'hundreds of'} high-quality ${category.name.toLowerCase()} wallpapers. Download free HD backgrounds for desktop and mobile.`}
    keywords={[category.name.toLowerCase(), 'wallpapers', 'HD', 'backgrounds', 'free']}
    url={`/category/${category.slug}`}
    type="website"
    structuredData={{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${category.name} Wallpapers`,
      description: category.description || `Collection of high-quality ${category.name.toLowerCase()} wallpapers`,
      url: getCanonicalUrl(`/category/${category.slug}`),
      mainEntity: {
        '@type': 'ItemList',
        name: `${category.name} Wallpapers`,
        description: `Free HD ${category.name.toLowerCase()} wallpapers and backgrounds`,
        numberOfItems: wallpaperCount
      },
      publisher: {
        '@type': 'Organization',
        name: siteConfig.name,
        url: siteConfig.url
      }
    }}
    {...props}
  />
)

export default SEO
