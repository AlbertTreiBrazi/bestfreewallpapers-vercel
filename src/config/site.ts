/**
 * Site Configuration
 * Centralized configuration for URLs, branding, and SEO
 */

// Get the current domain or use production domain
const getCurrentDomain = (): string => {
  // Production domain for best free wallpapers (exact match domain)
  const PRODUCTION_DOMAIN = 'https://bestfreewallpapers.com'
  const STAGING_DOMAIN = 'https://qjluy1yfmmyw.space.minimax.io'
  
  if (typeof window !== 'undefined') {
    // In production, use production domain for canonical URLs
    if (window.location.hostname.includes('bestfreewallpapers.com')) {
      return PRODUCTION_DOMAIN
    }
    // In browser, use actual current origin for development/staging
    return window.location.origin
  }
  
  // For SSR or build time, prioritize production domain
  return process.env.NODE_ENV === 'production' ? PRODUCTION_DOMAIN : STAGING_DOMAIN
}

export const siteConfig = {
  name: 'Best Free Wallpapers',
  shortName: 'BestFreeWallpapers',
  description: 'Download the best free wallpapers in HD quality. Thousands of desktop and mobile backgrounds in various categories. Your ultimate source for high-quality free wallpapers.',
  url: getCurrentDomain(),
  author: 'BestFreeWallpapers Team',
  email: 'contact@bestfreewallpapers.com',
  
  // Social media
  social: {
    twitter: 'https://twitter.com/bestfreewallpapers',
    facebook: 'https://facebook.com/bestfreewallpapers',
    instagram: 'https://instagram.com/bestfreewallpapers'
  },
  
  // SEO defaults - Best Free Wallpapers focused (exact match domain)
  seo: {
    defaultTitle: 'Best Free Wallpapers - HD Desktop & Mobile Backgrounds 2025',
    titleTemplate: '%s | Best Free Wallpapers',
    defaultDescription: 'Download the best free wallpapers in HD quality. 10,000+ desktop and mobile backgrounds including nature, abstract, gaming, AI art, and more. Updated daily with trending wallpapers.',
    keywords: [
      'best free wallpapers',
      'free wallpapers',
      'wallpapers free download',
      'high quality wallpapers',
      'HD wallpapers',
      'desktop wallpapers',
      'mobile wallpapers',
      'best free mobile wallpapers',
      'best free AI wallpapers',
      'wallpaper download',
      '4K wallpapers free',
      'free desktop backgrounds'
    ]
  },
  
  // API endpoints
  api: {
    supabase: {
      url: import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
    }
  }
}

// Utility functions
export const getCanonicalUrl = (path: string = ''): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${siteConfig.url}${cleanPath}`
}

export const getImageUrl = (imagePath: string): string => {
  if (imagePath.startsWith('http')) {
    return imagePath
  }
  return `${siteConfig.url}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`
}

export const getPageTitle = (title?: string): string => {
  if (!title) {
    return siteConfig.seo.defaultTitle
  }
  return siteConfig.seo.titleTemplate.replace('%s', title)
}
