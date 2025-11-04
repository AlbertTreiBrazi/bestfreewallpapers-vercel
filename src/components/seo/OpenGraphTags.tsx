import React from 'react';
import { Helmet } from 'react-helmet-async';
import { getCanonicalUrl, getImageUrl } from '@/config/site';

interface OpenGraphTagsProps {
  title: string;
  description: string;
  url?: string;
  image?: string;
  type?: 'website' | 'article';
  siteName?: string;
  locale?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  twitterSite?: string;
  articleAuthor?: string;
  articlePublishedTime?: string;
  articleModifiedTime?: string;
  imageAlt?: string;
  imageWidth?: string;
  imageHeight?: string;
}

const OpenGraphTags: React.FC<OpenGraphTagsProps> = ({
  title,
  description,
  url,
  image,
  type = 'website',
  siteName = 'Best Free Mobile Wallpapers',
  locale = 'en_US',
  twitterCard = 'summary_large_image',
  twitterSite = '@bestfreewallpapers',
  articleAuthor,
  articlePublishedTime,
  articleModifiedTime,
  imageAlt,
  imageWidth = '1200',
  imageHeight = '630'
}) => {
  const canonicalUrl = url || getCanonicalUrl();
  const ogImage = image || getImageUrl('/images/og-default.jpg');
  const ogImageAlt = imageAlt || `${title} - ${siteName}`;

  return (
    <Helmet>
      {/* Basic Open Graph tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={ogImageAlt} />
      <meta property="og:image:width" content={imageWidth} />
      <meta property="og:image:height" content={imageHeight} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={locale} />
      
      {/* Article-specific tags */}
      {type === 'article' && articleAuthor && (
        <meta property="article:author" content={articleAuthor} />
      )}
      {type === 'article' && articlePublishedTime && (
        <meta property="article:published_time" content={articlePublishedTime} />
      )}
      {type === 'article' && articleModifiedTime && (
        <meta property="article:modified_time" content={articleModifiedTime} />
      )}
      
      {/* Twitter Card tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content={twitterSite} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={ogImageAlt} />
      
      {/* Additional SEO meta tags */}
      <meta name="theme-color" content="#7c3aed" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={siteName} />
      <meta name="application-name" content={siteName} />
      <meta name="msapplication-TileColor" content="#7c3aed" />
      <meta name="msapplication-config" content="/browserconfig.xml" />
    </Helmet>
  );
};

export default OpenGraphTags;