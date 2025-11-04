import React from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { siteConfig, getCanonicalUrl } from '@/config/site';
import StructuredData from './StructuredData';
import OpenGraphTags from './OpenGraphTags';
import AccessibilityWrapper from '../common/AccessibilityWrapper';
import {
  generateOrganizationSchema,
  generateWebsiteSchema,
  generateBreadcrumbSchema,
  PAGE_SEO,
  CATEGORY_SEO,
  generatePageTitle,
  generateMetaDescription,
  generateKeywords
} from '@/utils/seo';

interface SEOPageWrapperProps {
  children: React.ReactNode;
  pageKey?: keyof typeof PAGE_SEO;
  categoryKey?: keyof typeof CATEGORY_SEO;
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
  noFollow?: boolean;
  canonicalUrl?: string;
  breadcrumbs?: Array<{name: string, url: string}>;
  structuredData?: object | object[];
  className?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  articleSection?: string;
  articleTags?: string[];
}

const SEOPageWrapper: React.FC<SEOPageWrapperProps> = ({
  children,
  pageKey,
  categoryKey,
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  noIndex = false,
  noFollow = false,
  canonicalUrl,
  breadcrumbs,
  structuredData,
  className,
  publishedTime,
  modifiedTime,
  author,
  articleSection,
  articleTags
}) => {
  // Determine SEO data source priority: props > pageKey > categoryKey > defaults
  const seoData = {
    ...siteConfig.seo,
    ...(categoryKey ? CATEGORY_SEO[categoryKey] : {}),
    ...(pageKey ? PAGE_SEO[pageKey] : {}),
    ...(title && { title }),
    ...(description && { description }),
    ...(keywords && { keywords }),
    ...(image && { image }),
    ...(url && { url })
  };

  const finalTitle = generatePageTitle(seoData.title);
  const finalDescription = generateMetaDescription(seoData.description || '');
  const finalKeywords = generateKeywords(seoData.keywords || []);
  const finalCanonicalUrl = canonicalUrl || getCanonicalUrl(url || '');
  const robotsContent = `${noIndex ? 'noindex' : 'index'},${noFollow ? 'nofollow' : 'follow'}`;

  // Generate default structured data
  const defaultStructuredData: any[] = [
    generateOrganizationSchema(),
    generateWebsiteSchema()
  ];

  // Add breadcrumb schema if breadcrumbs provided
  if (breadcrumbs && breadcrumbs.length > 0) {
    defaultStructuredData.push(generateBreadcrumbSchema(breadcrumbs));
  }

  // Combine with custom structured data
  const allStructuredData = structuredData 
    ? [...defaultStructuredData, ...(Array.isArray(structuredData) ? structuredData : [structuredData])]
    : defaultStructuredData;

  return (
    <HelmetProvider>
      <Helmet>
        {/* Basic meta tags */}
        <title>{finalTitle}</title>
        <meta name="description" content={finalDescription} />
        <meta name="keywords" content={finalKeywords} />
        <meta name="author" content={author || siteConfig.author} />
        <meta name="robots" content={robotsContent} />
        <meta name="googlebot" content={robotsContent} />
        
        {/* Canonical URL */}
        <link rel="canonical" href={finalCanonicalUrl} />
        
        {/* Mobile optimization */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={siteConfig.shortName} />
        
        {/* Theme and brand colors */}
        <meta name="theme-color" content="#7c3aed" />
        <meta name="msapplication-TileColor" content="#7c3aed" />
        <meta name="msapplication-navbutton-color" content="#7c3aed" />
        <meta name="apple-mobile-web-app-status-bar-style" content="#7c3aed" />
        
        {/* Content security and optimization */}
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="referrer" content="origin-when-cross-origin" />
        
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        
        {/* Article-specific meta tags */}
        {type === 'article' && publishedTime && (
          <meta property="article:published_time" content={publishedTime} />
        )}
        {type === 'article' && modifiedTime && (
          <meta property="article:modified_time" content={modifiedTime} />
        )}
        {type === 'article' && articleSection && (
          <meta property="article:section" content={articleSection} />
        )}
        {type === 'article' && articleTags && articleTags.map(tag => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
        
        {/* DNS prefetch for performance */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        <link rel="dns-prefetch" href="//images.unsplash.com" />
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        
        {/* Favicon and touch icons */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </Helmet>
      
      {/* Open Graph and Twitter Cards */}
      <OpenGraphTags
        title={seoData.title || finalTitle}
        description={seoData.description || finalDescription}
        url={finalCanonicalUrl}
        image={seoData.image}
        type={type}
        articleAuthor={author}
        articlePublishedTime={publishedTime}
        articleModifiedTime={modifiedTime}
      />
      
      {/* Structured Data */}
      <StructuredData schema={allStructuredData} />
      
      {/* Accessible page content wrapper */}
      <AccessibilityWrapper
        className={className}
        role="main"
        ariaLabel={`${finalTitle} - Main Content`}
        tabIndex={-1}
      >
        {children}
      </AccessibilityWrapper>
    </HelmetProvider>
  );
};

export default SEOPageWrapper;