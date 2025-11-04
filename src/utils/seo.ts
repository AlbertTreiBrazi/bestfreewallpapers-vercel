/**
 * SEO Configuration and Utilities
 * Centralized SEO management for the Best Free Wallpapers website
 */

import { siteConfig, getCanonicalUrl, getImageUrl } from '@/config/site'

export interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
}

export const DEFAULT_SEO: SEOConfig = {
  title: siteConfig.seo.defaultTitle,
  description: siteConfig.seo.defaultDescription,
  keywords: siteConfig.seo.keywords,
  image: getImageUrl('/images/og-default.jpg'),
  url: siteConfig.url,
  type: 'website',
  author: siteConfig.author
};

// Page-specific SEO configurations - Optimized for "best free wallpapers" primary keyword
export const PAGE_SEO: Record<string, SEOConfig> = {
  home: {
    title: 'Best Free Wallpapers - HD Desktop & Mobile Backgrounds 2025',
    description: 'Download the best free wallpapers in HD quality. 10,000+ desktop and mobile backgrounds including nature, abstract, gaming, AI art, and more. Updated daily with trending wallpapers.',
    keywords: ['best free wallpapers', 'free wallpapers', 'wallpapers free download', 'high quality wallpapers', 'HD wallpapers', 'desktop wallpapers', 'mobile wallpapers', 'best free mobile wallpapers', 'best free AI wallpapers', 'wallpaper download', '4K wallpapers free', 'free desktop backgrounds'],
  },
  mobileWallpapers: {
    title: 'Best Free Mobile Wallpapers - HD Phone Backgrounds 2025',
    description: 'Download the best free mobile wallpapers for iPhone, Android, Samsung Galaxy. 10,000+ HD phone backgrounds optimized for all mobile devices. Updated daily with trending mobile wallpapers.',
    keywords: ['best free mobile wallpapers', 'mobile wallpapers', 'phone wallpapers', 'iPhone wallpapers', 'Android wallpapers', 'Samsung wallpapers', 'HD mobile backgrounds', 'vertical wallpapers', 'phone backgrounds', 'mobile backgrounds', 'smartphone wallpapers', 'free mobile wallpapers', 'mobile wallpaper download', 'phone screen wallpapers', 'mobile phone wallpapers', 'cell phone wallpapers'],
  },
  aiWallpapers: {
    title: 'Best Free AI Wallpapers - Stunning AI Generated Backgrounds 2025',
    description: 'Discover the best free AI-generated wallpapers created by advanced artificial intelligence. Download stunning AI art backgrounds in 4K quality. New AI wallpapers added daily.',
    keywords: ['best free AI wallpapers', 'ai wallpapers', 'ai generated wallpapers', 'artificial intelligence wallpapers', 'ai art wallpapers', 'machine learning wallpapers', 'stable diffusion wallpapers', 'dall-e wallpapers', 'ai backgrounds', 'ai desktop wallpapers', 'neural network art', 'generative art wallpapers', 'ai mobile wallpapers'],
  },
  wallpapers: {
    title: 'Best Free HD Wallpapers Collection - High Quality Downloads',
    description: 'Browse the best free HD wallpapers collection. Download high-quality desktop and mobile backgrounds in various resolutions including 4K and 8K. All wallpapers free to download.',
    keywords: ['best free wallpapers', 'wallpaper collection', 'HD download', 'desktop wallpapers', 'mobile backgrounds', '4K wallpapers', 'free download', 'high quality wallpapers'],
  },
  about: {
    title: 'About BestFreeWallpapers - Your Source for HD Backgrounds',
    description: 'Learn about BestFreeWallpapers, your trusted source for high-quality free wallpapers. Discover our mission to provide the best desktop and mobile backgrounds.',
    keywords: ['about wallpapers', 'free wallpaper site', 'HD backgrounds', 'wallpaper mission'],
    image: getImageUrl('/images/og-about.jpg'),
  },
  contact: {
    title: 'Contact Us - BestFreeWallpapers Support & Feedback',
    description: 'Get in touch with the BestFreeWallpapers team. Submit feedback, report issues, or request new wallpaper categories. We\'d love to hear from you!',
    keywords: ['contact wallpapers', 'support', 'feedback', 'wallpaper requests'],
    image: getImageUrl('/images/og-contact.jpg'),
  },
  premium: {
    title: 'Premium Wallpapers - Exclusive 4K & 8K High-Resolution Collection',
    description: 'Unlock exclusive premium wallpapers in 4K and 8K resolution. Get access to exclusive collections, early releases, and the highest quality backgrounds.',
    keywords: ['premium wallpapers', '4K wallpapers', '8K wallpapers', 'exclusive wallpapers', 'high resolution'],
  },
  collections: {
    title: 'Wallpaper Collections - Curated HD Background Sets',
    description: 'Explore our curated wallpaper collections featuring themed sets of high-quality backgrounds. Find the perfect collection for your style and mood.',
    keywords: ['wallpaper collections', 'themed wallpapers', 'curated backgrounds', 'wallpaper sets'],
  },
  freeWallpapers: {
    title: 'Best Free Wallpapers - HD Quality Desktop & Mobile Backgrounds',
    description: 'Download the best free wallpapers in HD quality. Thousands of free desktop and mobile backgrounds in all categories. No cost, high quality, instant download.',
    keywords: ['best free wallpapers', 'free wallpapers', 'wallpapers free download', 'HD free wallpapers', 'free desktop wallpapers', 'free mobile wallpapers', 'high quality free wallpapers', 'wallpapers download free'],
  }
};

// Category-specific SEO - Enhanced for "best free wallpapers" strategy
export const CATEGORY_SEO: Record<string, Partial<SEOConfig>> = {
  nature: {
    title: 'Best Free Nature Wallpapers - Landscapes & Wildlife HD Backgrounds',
    description: 'Download the best free nature wallpapers featuring stunning landscapes, wildlife, forests, mountains, and natural scenes in HD quality.',
    keywords: ['best free nature wallpapers', 'nature wallpapers', 'landscape wallpapers', 'wildlife backgrounds', 'forest wallpapers', 'mountain wallpapers'],
  },
  abstract: {
    title: 'Best Free Abstract Wallpapers - Modern Art & Digital Backgrounds',
    description: 'Discover the best free abstract wallpapers featuring modern digital art, patterns, and artistic compositions in high resolution.',
    keywords: ['best free abstract wallpapers', 'abstract wallpapers', 'digital art wallpapers', 'modern backgrounds', 'artistic wallpapers'],
  },
  gaming: {
    title: 'Best Free Gaming Wallpapers - Video Game Art & Character Backgrounds',
    description: 'Download the best free gaming wallpapers featuring your favorite video game characters, artwork, and scenes from popular games.',
    keywords: ['best free gaming wallpapers', 'gaming wallpapers', 'video game wallpapers', 'game character backgrounds', 'gaming art'],
  },
  technology: {
    title: 'Best Free Technology Wallpapers - Tech & Digital Art Backgrounds',
    description: 'Get the best free technology wallpapers featuring futuristic digital themes, circuits, gadgets, and modern tech aesthetics.',
    keywords: ['best free technology wallpapers', 'technology wallpapers', 'tech backgrounds', 'digital wallpapers', 'futuristic wallpapers'],
  },
  space: {
    title: 'Best Free Space Wallpapers - Astronomy & Universe Backgrounds',
    description: 'Download the best free space wallpapers featuring breathtaking galaxies, planets, stars, nebulae, and astronomical phenomena.',
    keywords: ['best free space wallpapers', 'space wallpapers', 'astronomy backgrounds', 'galaxy wallpapers', 'planet wallpapers', 'universe wallpapers'],
  }
};

// Structured Data Schemas
export const generateOrganizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": siteConfig.shortName,
  "description": "Premium source for free HD wallpapers and desktop backgrounds",
  "url": siteConfig.url,
  "logo": getImageUrl('/images/logo.png'),
  "foundingDate": "2024",
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Customer Service",
    "email": siteConfig.email,
    "availableLanguage": "English"
  },
  "sameAs": [
    siteConfig.social.twitter,
    siteConfig.social.facebook,
    siteConfig.social.instagram
  ]
});

export const generateWebsiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": siteConfig.shortName,
  "description": "Free HD wallpapers and desktop backgrounds",
  "url": siteConfig.url,
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": `${siteConfig.url}/free-wallpapers?q={search_term_string}`
    },
    "query-input": "required name=search_term_string"
  },
  "publisher": {
    "@type": "Organization",
    "name": siteConfig.shortName,
    "logo": getImageUrl('/images/logo.png')
  }
});

export const generateWallpaperSchema = (wallpaper: any) => ({
  "@context": "https://schema.org",
  "@type": "ImageObject",
  "name": wallpaper.title,
  "description": wallpaper.description,
  "contentUrl": wallpaper.image_url,
  "thumbnailUrl": wallpaper.thumbnail_url,
  "uploadDate": wallpaper.created_at,
  "keywords": wallpaper.tags?.join(', '),
  "width": wallpaper.width || "1920",
  "height": wallpaper.height || "1080",
  "encodingFormat": "image/jpeg",
  "license": "https://creativecommons.org/licenses/by/4.0/",
  "acquireLicensePage": getCanonicalUrl(`/wallpaper/${wallpaper.slug}`),
  "creditText": siteConfig.shortName,
  "creator": {
    "@type": "Organization",
    "name": siteConfig.shortName
  },
  "isPartOf": {
    "@type": "WebSite",
    "name": siteConfig.shortName,
    "url": siteConfig.url
  }
});

// Alias for backward compatibility
export const generateImageObjectSchema = generateWallpaperSchema;

export const generateCollectionSchema = (collection: any, wallpapers: any[]) => ({
  "@context": "https://schema.org",
  "@type": "Collection",
  "name": collection.name,
  "description": collection.description,
  "url": getCanonicalUrl(`/collections/${collection.slug}`),
  "numberOfItems": wallpapers.length,
  "collectionSize": wallpapers.length,
  "hasPart": wallpapers.map(wallpaper => ({
    "@type": "ImageObject",
    "name": wallpaper.title,
    "contentUrl": wallpaper.image_url,
    "thumbnailUrl": wallpaper.thumbnail_url
  }))
});

// Advanced Schema Generation
export const generateBreadcrumbSchema = (breadcrumbs: Array<{name: string, url: string}>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": breadcrumbs.map((breadcrumb, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": breadcrumb.name,
    "item": breadcrumb.url
  }))
});

export const generateFAQSchema = (faqs: Array<{question: string, answer: string}>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(faq => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
});

// SEO Utility Functions
export const generatePageTitle = (pageTitle?: string, siteName: string = 'BestFreeWallpapers'): string => {
  return pageTitle ? `${pageTitle} | ${siteName}` : siteName;
};

export const generateMetaDescription = (description: string, maxLength: number = 160): string => {
  return description.length > maxLength 
    ? description.substring(0, maxLength - 3) + '...'
    : description;
};

export const generateKeywords = (keywords: string[]): string => {
  return keywords.join(', ');
};

export const generateCanonicalUrl = (path: string, baseUrl: string = siteConfig.url): string => {
  return getCanonicalUrl(path);
};

export const generateImageAlt = (title: string, category?: string): string => {
  const categoryText = category ? ` ${category}` : '';
  return `${title}${categoryText} wallpaper - free HD download`;
};

// SEO Performance Utilities
export const preloadCriticalResources = () => {
  // Preload critical fonts
  const fontLink = document.createElement('link');
  fontLink.rel = 'preload';
  fontLink.as = 'font';
  fontLink.type = 'font/woff2';
  fontLink.crossOrigin = 'anonymous';
  fontLink.href = '/fonts/inter-var.woff2';
  document.head.appendChild(fontLink);
  
  // Preload critical CSS
  const cssLink = document.createElement('link');
  cssLink.rel = 'preload';
  cssLink.as = 'style';
  cssLink.href = '/css/critical.css';
  document.head.appendChild(cssLink);
};

// Dynamic Sitemap URL Generation
export const generateSitemapUrls = (wallpapers: any[], categories: any[], collections: any[]) => {
  const urls = [];
  
  // Static pages
  const staticPages = [
    { loc: siteConfig.url, priority: '1.0', changefreq: 'daily' },
    { loc: getCanonicalUrl('/free-wallpapers'), priority: '0.9', changefreq: 'daily' },
    { loc: getCanonicalUrl('/collections'), priority: '0.8', changefreq: 'weekly' },
    { loc: getCanonicalUrl('/premium'), priority: '0.7', changefreq: 'monthly' },
    { loc: getCanonicalUrl('/about'), priority: '0.6', changefreq: 'monthly' },
    { loc: getCanonicalUrl('/contact'), priority: '0.5', changefreq: 'monthly' }
  ];
  
  // Category pages
  const categoryPages = categories.map(category => ({
    loc: getCanonicalUrl(`/category/${category.slug}`),
    priority: '0.8',
    changefreq: 'weekly'
  }));
  
  // Collection pages
  const collectionPages = collections.map(collection => ({
    loc: getCanonicalUrl(`/collections/${collection.slug}`),
    priority: '0.7',
    changefreq: 'weekly'
  }));
  
  return [...staticPages, ...categoryPages, ...collectionPages];
};

// SEO Analytics Tracking
export const trackSEOEvent = (event: string, data: any) => {
  // Google Analytics 4 tracking
  if (typeof (window as any).gtag !== 'undefined') {
    (window as any).gtag('event', event, {
      custom_parameter: data
    });
  }
  
  // Facebook Pixel tracking
  if (typeof (window as any).fbq !== 'undefined') {
    (window as any).fbq('track', 'CustomEvent', {
      event_name: event,
      ...data
    });
  }
};

// SEO Health Check
export const performSEOHealthCheck = () => {
  const issues = [];
  
  // Check title length
  const title = document.title;
  if (!title) issues.push('Missing page title');
  else if (title.length < 30) issues.push('Title too short (< 30 characters)');
  else if (title.length > 60) issues.push('Title too long (> 60 characters)');
  
  // Check meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription) {
    issues.push('Missing meta description');
  } else {
    const content = metaDescription.getAttribute('content');
    if (!content) issues.push('Empty meta description');
    else if (content.length < 120) issues.push('Meta description too short (< 120 characters)');
    else if (content.length > 160) issues.push('Meta description too long (> 160 characters)');
  }
  
  // Check canonical URL
  const canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) issues.push('Missing canonical URL');
  
  // Check Open Graph tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  const ogImage = document.querySelector('meta[property="og:image"]');
  
  if (!ogTitle) issues.push('Missing Open Graph title');
  if (!ogDescription) issues.push('Missing Open Graph description');
  if (!ogImage) issues.push('Missing Open Graph image');
  
  // Check structured data
  const structuredData = document.querySelectorAll('script[type="application/ld+json"]');
  if (structuredData.length === 0) issues.push('No structured data found');
  
  return issues;
};
