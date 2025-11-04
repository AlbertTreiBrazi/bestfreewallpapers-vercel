/**
 * SEO Head Component
 * Manages all SEO meta tags, structured data, and social media tags
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { siteConfig, getCanonicalUrl, getImageUrl } from '@/config/site';
import type { SEOConfig } from '@/utils/seo';

interface SEOHeadProps {
  config: SEOConfig;
  structuredData?: object[];
  noIndex?: boolean;
  noFollow?: boolean;
}

export function SEOHead({ config, structuredData = [], noIndex = false, noFollow = false }: SEOHeadProps) {
  const location = useLocation();
  const currentUrl = getCanonicalUrl(`${location.pathname}${location.search}`);

  useEffect(() => {
    // Update document title
    document.title = config.title;

    // Update meta tags
    updateMetaTag('description', config.description);
    
    if (config.keywords) {
      updateMetaTag('keywords', config.keywords.join(', '));
    }

    // Open Graph meta tags
    updateMetaProperty('og:title', config.title);
    updateMetaProperty('og:description', config.description);
    updateMetaProperty('og:type', config.type || 'website');
    updateMetaProperty('og:url', currentUrl);
    updateMetaProperty('og:site_name', siteConfig.shortName);
    updateMetaProperty('og:locale', 'en_US');
    
    if (config.image) {
      const imageUrl = config.image.startsWith('http') ? config.image : getImageUrl(config.image);
      updateMetaProperty('og:image', imageUrl);
      updateMetaProperty('og:image:width', '1200');
      updateMetaProperty('og:image:height', '630');
      updateMetaProperty('og:image:alt', config.title);
    }

    // Twitter Card meta tags
    updateMetaName('twitter:card', 'summary_large_image');
    updateMetaName('twitter:site', '@bestfreewallpapers');
    updateMetaName('twitter:creator', '@bestfreewallpapers');
    updateMetaName('twitter:title', config.title);
    updateMetaName('twitter:description', config.description);
    
    if (config.image) {
      const imageUrl = config.image.startsWith('http') ? config.image : getImageUrl(config.image);
      updateMetaName('twitter:image', imageUrl);
      updateMetaName('twitter:image:alt', config.title);
    }

    // Additional SEO meta tags
    const robotsContent = noIndex || noFollow
      ? `${noIndex ? 'noindex' : 'index'}, ${noFollow ? 'nofollow' : 'follow'}`
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
    
    updateMetaName('robots', robotsContent);
    updateMetaName('googlebot', `${noIndex ? 'noindex' : 'index'}, ${noFollow ? 'nofollow' : 'follow'}`);
    updateMetaName('bingbot', `${noIndex ? 'noindex' : 'index'}, ${noFollow ? 'nofollow' : 'follow'}`);
    updateMetaName('theme-color', '#7c3aed');
    updateMetaName('msapplication-TileColor', '#7c3aed');
    
    if (config.author) {
      updateMetaName('author', config.author);
    }

    if (config.publishedTime) {
      updateMetaProperty('article:published_time', config.publishedTime);
    }

    if (config.modifiedTime) {
      updateMetaProperty('article:modified_time', config.modifiedTime);
    }

    if (config.section) {
      updateMetaProperty('article:section', config.section);
    }

    if (config.tags) {
      config.tags.forEach(tag => {
        updateMetaProperty('article:tag', tag);
      });
    }

    // Canonical URL
    updateCanonicalUrl(currentUrl);

    // Add structured data
    if (structuredData.length > 0) {
      structuredData.forEach((schema, index) => {
        addStructuredData(schema, `seo-schema-${index}`);
      });
    }

    // Cleanup function to remove meta tags when component unmounts
    return () => {
      // Remove structured data scripts
      structuredData.forEach((_, index) => {
        removeStructuredData(`seo-schema-${index}`);
      });
    };
  }, [config, currentUrl, structuredData]);

  return null; // This component only manages head elements
}

// Utility functions for managing meta tags
function updateMetaTag(name: string, content: string) {
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function updateMetaProperty(property: string, content: string) {
  let meta = document.querySelector(`meta[property="${property}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function updateMetaName(name: string, content: string) {
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function updateCanonicalUrl(url: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = url;
}

function addStructuredData(schema: object, id: string) {
  // Remove existing schema with same ID
  removeStructuredData(id);
  
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = id;
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

function removeStructuredData(id: string) {
  const existingScript = document.getElementById(id);
  if (existingScript) {
    existingScript.remove();
  }
}

// Hook for using SEO in components
export function useSEO(config: SEOConfig, structuredData: object[] = []) {
  useEffect(() => {
    const seoComponent = { config, structuredData };
    SEOHead(seoComponent);
  }, [config, structuredData]);
}
