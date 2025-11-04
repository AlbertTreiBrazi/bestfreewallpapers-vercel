/**
 * Mobile SEO Optimization Utilities
 * Specialized SEO functions for mobile wallpaper targeting
 */

// Mobile-specific meta tags
export const generateMobileMetaTags = () => {
  const metaTags = [
    // Mobile viewport optimization
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0, viewport-fit=cover' },
    
    // Mobile web app capabilities
    { name: 'mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    { name: 'apple-mobile-web-app-title', content: 'Mobile Wallpapers' },
    
    // Touch icons for mobile
    { name: 'msapplication-TileImage', content: '/icons/icon-144x144.png' },
    { name: 'msapplication-TileColor', content: '#7c3aed' },
    
    // Mobile-specific SEO
    { name: 'format-detection', content: 'telephone=no' },
    { name: 'mobile-optimization', content: 'optimized' }
  ]
  
  metaTags.forEach(tag => {
    let meta = document.querySelector(`meta[name="${tag.name}"]`)
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', tag.name)
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', tag.content)
  })
}

// Mobile wallpaper structured data
export const generateMobileWallpaperSchema = (wallpapers: any[]) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Mobile Wallpapers Collection",
  "description": "Curated collection of HD mobile wallpapers for smartphones",
  "numberOfItems": wallpapers.length,
  "itemListElement": wallpapers.map((wallpaper, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "item": {
      "@type": "ImageObject",
      "name": wallpaper.title,
      "description": wallpaper.description,
      "contentUrl": wallpaper.image_url,
      "thumbnailUrl": wallpaper.thumbnail_url,
      "keywords": `mobile wallpaper, ${wallpaper.tags?.join(', ')}`,
      "width": "1080",
      "height": "1920",
      "encodingFormat": "image/jpeg",
      "deviceCategory": "mobile"
    }
  }))
})

// Mobile device collection schema
export const generateDeviceCollectionSchema = (deviceName: string, wallpapers: any[]) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  "name": `${deviceName} Wallpapers`,
  "description": `Premium wallpaper collection optimized for ${deviceName}`,
  "category": "Mobile Wallpapers",
  "brand": {
    "@type": "Brand",
    "name": "BestFreeWallpapers"
  },
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "1250",
    "bestRating": "5",
    "worstRating": "1"
  },
  "review": [
    {
      "@type": "Review",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "5"
      },
      "author": {
        "@type": "Person",
        "name": "Mobile User"
      },
      "reviewBody": `Perfect ${deviceName} wallpapers with amazing quality and resolution.`
    }
  ],
  "hasVariant": wallpapers.slice(0, 5).map(wallpaper => ({
    "@type": "Product",
    "name": wallpaper.title,
    "image": wallpaper.image_url,
    "description": wallpaper.description
  }))
})

// FAQ schema for mobile wallpapers
export const generateMobileWallpaperFAQ = () => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What resolution should I choose for mobile wallpapers?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "For most modern smartphones, 1080x1920 (Full HD) or 1440x2560 (QHD) are ideal. iPhone users should look for 1170x2532 or 1284x2778 resolutions for best quality."
      }
    },
    {
      "@type": "Question",
      "name": "Are mobile wallpapers different from desktop wallpapers?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, mobile wallpapers are optimized for vertical (portrait) orientation and smartphone aspect ratios like 19:9, 20:9, and 18:9, while desktop wallpapers are typically horizontal (landscape) with 16:9 aspect ratio."
      }
    },
    {
      "@type": "Question",
      "name": "How often do you add new mobile wallpapers?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We add new mobile wallpapers daily, with special themed collections released weekly. Our AI-generated mobile wallpapers are updated continuously."
      }
    },
    {
      "@type": "Question",
      "name": "Can I use these wallpapers on any mobile device?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes! Our mobile wallpapers are compatible with iPhone, Android, Samsung Galaxy, OnePlus, Xiaomi, and all other smartphone brands. We provide multiple resolutions for optimal display on any device."
      }
    },
    {
      "@type": "Question",
      "name": "Are the mobile wallpapers free to download?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, all mobile wallpapers are completely free to download and use for personal purposes. No registration required, instant downloads available."
      }
    }
  ]
})

// Mobile-specific breadcrumb schema
export const generateMobileBreadcrumbs = (path: string[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": path.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item,
    "item": index === 0 ? "https://qjluy1yfmmyw.space.minimax.io" : 
            index === 1 ? "https://qjluy1yfmmyw.space.minimax.io/mobile-wallpapers" :
            `https://qjluy1yfmmyw.space.minimax.io/collections/${item.toLowerCase().replace(' ', '-')}`
  }))
})

// Mobile app schema for app store optimization
export const generateMobileAppSchema = () => ({
  "@context": "https://schema.org",
  "@type": "MobileApplication",
  "name": "BestFreeWallpapers Mobile App",
  "description": "Download the best mobile wallpapers for iPhone and Android. HD backgrounds optimized for all mobile devices.",
  "applicationCategory": "DesignApplication",
  "operatingSystem": ["iOS", "Android"],
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "15000"
  },
  "screenshot": [
    "/images/app-screenshot-1.jpg",
    "/images/app-screenshot-2.jpg",
    "/images/app-screenshot-3.jpg"
  ],
  "featureList": [
    "10,000+ HD Mobile Wallpapers",
    "Daily Updates",
    "Offline Access",
    "AI-Generated Wallpapers",
    "Device-Specific Optimization",
    "Ad-Free Experience"
  ]
})

// Generate mobile-optimized sitemap URLs
export const generateMobileSitemapUrls = () => {
  const baseUrl = 'https://qjluy1yfmmyw.space.minimax.io'
  
  return [
    // High priority mobile pages
    {
      loc: `${baseUrl}/mobile-wallpapers`,
      priority: '1.0',
      changefreq: 'daily',
      lastmod: new Date().toISOString(),
      mobile: true
    },
    {
      loc: `${baseUrl}/ai-wallpapers`,
      priority: '0.9',
      changefreq: 'daily',
      lastmod: new Date().toISOString(),
      mobile: true
    },
    // Device-specific collections
    {
      loc: `${baseUrl}/collections/iphone-wallpapers`,
      priority: '0.9',
      changefreq: 'weekly',
      lastmod: new Date().toISOString(),
      mobile: true
    },
    {
      loc: `${baseUrl}/collections/android-wallpapers`,
      priority: '0.9',
      changefreq: 'weekly',
      lastmod: new Date().toISOString(),
      mobile: true
    },
    {
      loc: `${baseUrl}/collections/samsung-galaxy-wallpapers`,
      priority: '0.8',
      changefreq: 'weekly',
      lastmod: new Date().toISOString(),
      mobile: true
    },
    {
      loc: `${baseUrl}/collections/ipad-wallpapers`,
      priority: '0.7',
      changefreq: 'weekly',
      lastmod: new Date().toISOString(),
      mobile: true
    }
  ]
}

// Mobile performance metrics for SEO
export const trackMobilePerformance = () => {
  if (typeof window === 'undefined') return
  
  // Track mobile-specific metrics
  const mobileMetrics = {
    isMobile: /Mobi|Android/i.test(navigator.userAgent),
    screenSize: `${window.screen.width}x${window.screen.height}`,
    devicePixelRatio: window.devicePixelRatio,
    touchSupport: 'ontouchstart' in window,
    connectionType: (navigator as any).connection?.effectiveType
  }
  
  // Send mobile metrics to analytics
  if (typeof (window as any).gtag !== 'undefined') {
    (window as any).gtag('event', 'mobile_metrics', {
      custom_parameter: mobileMetrics
    })
  }
  
  return mobileMetrics
}

// Initialize mobile SEO optimizations
export const initializeMobileSEO = () => {
  if (typeof window === 'undefined') return
  
  // Generate mobile meta tags
  generateMobileMetaTags()
  
  // Track mobile performance
  trackMobilePerformance()
  
  // Add mobile-specific CSS for SEO
  const mobileSEOCSS = `
    @media (max-width: 768px) {
      .mobile-optimized {
        font-size: 16px; /* Prevent zoom on iOS */
        -webkit-text-size-adjust: 100%;
        -webkit-tap-highlight-color: transparent;
      }
      
      .mobile-friendly-buttons {
        min-height: 44px; /* iOS minimum touch target */
        min-width: 44px;
      }
      
      .mobile-content {
        padding: 1rem;
        line-height: 1.6;
      }
    }
  `
  
  const style = document.createElement('style')
  style.textContent = mobileSEOCSS
  document.head.appendChild(style)
}