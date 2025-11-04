/**
 * Advanced Schema Markup Utilities
 * Enhanced structured data for better SEO and rich snippets
 * Supports Product, Review, How-To, Event, and more schema types
 */

export interface ProductSchemaData {
  id: string
  title: string
  description: string
  image_url: string
  thumbnail_url?: string
  category?: string
  tags?: string[]
  is_premium: boolean
  premium_price?: number
  dimensions?: string
  file_size?: number
  created_at: string
  download_count?: number
  rating?: {
    value: number
    count: number
  }
}

export interface ReviewSchemaData {
  id: string
  author: string
  rating: number
  title: string
  content: string
  date: string
  verified?: boolean
}

export interface HowToSchemaData {
  title: string
  description: string
  image?: string
  totalTime?: string
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced'
  steps: {
    title: string
    description: string
    image?: string
    url?: string
  }[]
}

export interface EventSchemaData {
  name: string
  description: string
  startDate: string
  endDate?: string
  location?: {
    name: string
    address?: string
    url?: string
  }
  organizer: {
    name: string
    url?: string
  }
  image?: string
  url: string
}

export interface CollectionSchemaData {
  id: string
  name: string
  description: string
  image?: string
  wallpapers: ProductSchemaData[]
  created_at: string
  updated_at: string
}

/**
 * Generate Product Schema for wallpapers
 */
export function generateProductSchema(wallpaper: ProductSchemaData): Record<string, any> {
  const baseUrl = process.env.VITE_SITE_URL || 'https://bestfreewallpapers.com'
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${baseUrl}/wallpaper/${wallpaper.id}`,
    name: wallpaper.title,
    description: wallpaper.description,
    image: [
      wallpaper.image_url,
      ...(wallpaper.thumbnail_url ? [wallpaper.thumbnail_url] : [])
    ],
    category: wallpaper.category || 'Wallpapers',
    brand: {
      '@type': 'Brand',
      name: 'BestFreeWallpapers',
      url: baseUrl
    },
    manufacturer: {
      '@type': 'Organization',
      name: 'BestFreeWallpapers',
      url: baseUrl
    },
    offers: {
      '@type': 'Offer',
      price: wallpaper.is_premium ? (wallpaper.premium_price || 2.99).toString() : '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${baseUrl}/wallpaper/${wallpaper.id}`,
      seller: {
        '@type': 'Organization',
        name: 'BestFreeWallpapers'
      },
      ...(wallpaper.is_premium && {
        priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })
    },
    aggregateRating: wallpaper.rating ? {
      '@type': 'AggregateRating',
      ratingValue: wallpaper.rating.value.toString(),
      reviewCount: wallpaper.rating.count.toString(),
      bestRating: '5',
      worstRating: '1'
    } : {
      '@type': 'AggregateRating',
      ratingValue: '4.5',
      reviewCount: Math.max(wallpaper.download_count || 10, 10).toString(),
      bestRating: '5',
      worstRating: '1'
    },
    keywords: wallpaper.tags?.join(', ') || `${wallpaper.category}, wallpaper, background, ${wallpaper.is_premium ? 'premium' : 'free'}`,
    datePublished: wallpaper.created_at,
    dateModified: wallpaper.created_at,
    inLanguage: 'en',
    ...(wallpaper.dimensions && {
      additionalProperty: [
        {
          '@type': 'PropertyValue',
          name: 'Dimensions',
          value: wallpaper.dimensions
        },
        ...(wallpaper.file_size ? [{
          '@type': 'PropertyValue',
          name: 'File Size',
          value: `${(wallpaper.file_size / 1024 / 1024).toFixed(2)} MB`
        }] : [])
      ]
    }),
    isAccessibleForFree: !wallpaper.is_premium,
    ...(wallpaper.is_premium && {
      hasPart: {
        '@type': 'DigitalDocument',
        name: `${wallpaper.title} - Premium Version`,
        description: 'High-resolution premium wallpaper without watermark'
      }
    })
  }
}

/**
 * Generate Review Schema for wallpaper reviews
 */
export function generateReviewSchema(reviews: ReviewSchemaData[], productData: ProductSchemaData): Record<string, any> {
  const baseUrl = process.env.VITE_SITE_URL || 'https://bestfreewallpapers.com'
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${baseUrl}/wallpaper/${productData.id}`,
    name: productData.title,
    review: reviews.map(review => ({
      '@type': 'Review',
      '@id': `${baseUrl}/wallpaper/${productData.id}#review-${review.id}`,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating.toString(),
        bestRating: '5',
        worstRating: '1'
      },
      author: {
        '@type': 'Person',
        name: review.author
      },
      headline: review.title,
      reviewBody: review.content,
      datePublished: review.date,
      publisher: {
        '@type': 'Organization',
        name: 'BestFreeWallpapers'
      },
      ...(review.verified && {
        additionalProperty: {
          '@type': 'PropertyValue',
          name: 'Verified Purchase',
          value: 'true'
        }
      })
    }))
  }
}

/**
 * Generate How-To Schema for wallpaper guides
 */
export function generateHowToSchema(guide: HowToSchemaData): Record<string, any> {
  const baseUrl = process.env.VITE_SITE_URL || 'https://bestfreewallpapers.com'
  
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: guide.title,
    description: guide.description,
    image: guide.image ? [guide.image] : undefined,
    totalTime: guide.totalTime || 'PT2M',
    estimatedCost: {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: '0'
    },
    supply: [
      {
        '@type': 'HowToSupply',
        name: 'Computer or Mobile Device'
      },
      {
        '@type': 'HowToSupply',
        name: 'Internet Connection'
      }
    ],
    tool: [
      {
        '@type': 'HowToTool',
        name: 'Web Browser'
      }
    ],
    step: guide.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.title,
      text: step.description,
      image: step.image ? [step.image] : undefined,
      url: step.url || undefined
    })),
    about: {
      '@type': 'Thing',
      name: 'Wallpaper Download and Setup'
    },
    audience: {
      '@type': 'Audience',
      audienceType: 'General Public'
    },
    ...(guide.difficulty && {
      difficulty: guide.difficulty
    }),
    inLanguage: 'en',
    publisher: {
      '@type': 'Organization',
      name: 'BestFreeWallpapers',
      url: baseUrl
    }
  }
}

/**
 * Generate Event Schema for content releases and updates
 */
export function generateEventSchema(event: EventSchemaData): Record<string, any> {
  const baseUrl = process.env.VITE_SITE_URL || 'https://bestfreewallpapers.com'
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate || event.startDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: event.location ? {
      '@type': 'VirtualLocation',
      name: event.location.name,
      url: event.location.url || baseUrl
    } : {
      '@type': 'VirtualLocation',
      url: baseUrl
    },
    organizer: {
      '@type': 'Organization',
      name: event.organizer.name,
      url: event.organizer.url || baseUrl
    },
    performer: {
      '@type': 'Organization',
      name: 'BestFreeWallpapers',
      url: baseUrl
    },
    image: event.image ? [event.image] : undefined,
    url: event.url,
    isAccessibleForFree: true,
    inLanguage: 'en',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: event.url
    }
  }
}

/**
 * Generate Collection Schema (ItemList)
 */
export function generateCollectionSchema(collection: CollectionSchemaData): Record<string, any> {
  const baseUrl = process.env.VITE_SITE_URL || 'https://bestfreewallpapers.com'
  
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${baseUrl}/collections/${collection.id}`,
    name: collection.name,
    description: collection.description,
    image: collection.image ? [collection.image] : undefined,
    numberOfItems: collection.wallpapers.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    datePublished: collection.created_at,
    dateModified: collection.updated_at,
    publisher: {
      '@type': 'Organization',
      name: 'BestFreeWallpapers',
      url: baseUrl
    },
    itemListElement: collection.wallpapers.map((wallpaper, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        '@id': `${baseUrl}/wallpaper/${wallpaper.id}`,
        name: wallpaper.title,
        description: wallpaper.description,
        image: wallpaper.image_url,
        url: `${baseUrl}/wallpaper/${wallpaper.id}`
      }
    })),
    mainEntity: {
      '@type': 'CreativeWork',
      name: collection.name,
      description: collection.description,
      creator: {
        '@type': 'Organization',
        name: 'BestFreeWallpapers'
      }
    }
  }
}

/**
 * Generate Website Schema
 */
export function generateWebsiteSchema(): Record<string, any> {
  const baseUrl = process.env.VITE_SITE_URL || 'https://bestfreewallpapers.com'
  
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${baseUrl}/#website`,
    name: 'BestFreeWallpapers',
    alternateName: 'Best Free Wallpapers',
    description: 'Discover the best free wallpapers for desktop and mobile. High-quality backgrounds, premium collections, and mobile-optimized wallpapers.',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: 'BestFreeWallpapers',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        '@id': `${baseUrl}/#logo`,
        url: `${baseUrl}/logo.png`,
        contentUrl: `${baseUrl}/logo.png`,
        width: 512,
        height: 512,
        caption: 'BestFreeWallpapers Logo'
      },
      sameAs: [
        // Add social media URLs when available
      ]
    },
    mainEntity: {
      '@type': 'ItemList',
      name: 'Wallpaper Categories',
      description: 'Browse wallpapers by category'
    },
    audience: {
      '@type': 'Audience',
      audienceType: 'General Public',
      geographicArea: {
        '@type': 'Place',
        name: 'Worldwide'
      }
    },
    inLanguage: 'en',
    copyrightYear: new Date().getFullYear(),
    copyrightHolder: {
      '@type': 'Organization',
      name: 'BestFreeWallpapers'
    }
  }
}

/**
 * Generate Organization Schema
 */
export function generateOrganizationSchema(): Record<string, any> {
  const baseUrl = process.env.VITE_SITE_URL || 'https://bestfreewallpapers.com'
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${baseUrl}/#organization`,
    name: 'BestFreeWallpapers',
    alternateName: 'Best Free Wallpapers',
    description: 'Provider of high-quality free and premium wallpapers for desktop and mobile devices.',
    url: baseUrl,
    logo: {
      '@type': 'ImageObject',
      '@id': `${baseUrl}/#logo`,
      url: `${baseUrl}/logo.png`,
      contentUrl: `${baseUrl}/logo.png`,
      width: 512,
      height: 512,
      caption: 'BestFreeWallpapers Logo'
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      url: `${baseUrl}/contact`,
      availableLanguage: 'English'
    },
    foundingDate: '2024',
    knowsAbout: [
      'Wallpapers',
      'Digital Art',
      'Background Images',
      'Mobile Wallpapers',
      'Desktop Backgrounds',
      'Premium Graphics'
    ],
    areaServed: {
      '@type': 'Place',
      name: 'Worldwide'
    },
    serviceType: 'Digital Content Distribution'
  }
}

/**
 * Generate Breadcrumb Schema
 */
export function generateBreadcrumbSchema(items: { name: string; url: string }[]): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  }
}

/**
 * Generate FAQ Schema
 */
export function generateFAQSchema(faqs: { question: string; answer: string }[]): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  }
}

/**
 * Helper function to render schema markup as JSON-LD
 */
export function renderSchemaMarkup(schema: Record<string, any>): string {
  return JSON.stringify(schema, null, 2)
}

/**
 * Helper function to inject schema markup into document head
 */
export function injectSchemaMarkup(schema: Record<string, any>, id?: string): void {
  if (typeof document === 'undefined') return
  
  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.textContent = renderSchemaMarkup(schema)
  
  if (id) {
    script.id = id
    // Remove existing schema with same ID
    const existing = document.getElementById(id)
    if (existing) {
      existing.remove()
    }
  }
  
  document.head.appendChild(script)
}