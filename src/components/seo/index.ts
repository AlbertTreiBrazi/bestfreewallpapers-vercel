export { default as StructuredData } from './StructuredData';
export { default as OpenGraphTags } from './OpenGraphTags';
export { default as SEOPageWrapper } from './SEOPageWrapper';

// Re-export useful types
export type { SEOConfig } from '@/utils/seo';

// Quick access to commonly used functions
export {
  generatePageTitle,
  generateMetaDescription,
  generateKeywords,
  generateCanonicalUrl,
  generateImageAlt,
  generateOrganizationSchema,
  generateWebsiteSchema,
  generateWallpaperSchema,
  generateCollectionSchema,
  generateBreadcrumbSchema,
  generateFAQSchema,
  PAGE_SEO,
  CATEGORY_SEO,
  DEFAULT_SEO
} from '@/utils/seo';

export {
  generateMobileMetaTags,
  generateMobileWallpaperSchema,
  generateDeviceCollectionSchema,
  generateMobileWallpaperFAQ,
  initializeMobileSEO
} from '@/utils/mobile-seo-optimization';