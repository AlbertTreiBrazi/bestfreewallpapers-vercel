/**
 * SEO Canonical URL Utilities
 * Ensures all canonical URLs use the correct domain for SEO
 */

const DEPLOYMENT_DOMAIN = 'https://qjluy1yfmmyw.space.minimax.io'

// Update canonical URL to use correct domain
export function updateCanonicalUrl(path: string = '') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const canonicalUrl = `${DEPLOYMENT_DOMAIN}${cleanPath}`
  
  // Update existing canonical link or create new one
  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
  
  if (!canonicalLink) {
    canonicalLink = document.createElement('link')
    canonicalLink.rel = 'canonical'
    document.head.appendChild(canonicalLink)
  }
  
  canonicalLink.href = canonicalUrl
  return canonicalUrl
}

// Update Open Graph URLs
export function updateOpenGraphUrls(path: string = '') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const fullUrl = `${DEPLOYMENT_DOMAIN}${cleanPath}`
  
  // Update og:url
  let ogUrl = document.querySelector('meta[property="og:url"]')
  if (!ogUrl) {
    ogUrl = document.createElement('meta')
    ogUrl.setAttribute('property', 'og:url')
    document.head.appendChild(ogUrl)
  }
  ogUrl.setAttribute('content', fullUrl)
  
  // Update twitter:url if it exists
  const twitterUrl = document.querySelector('meta[name="twitter:url"]')
  if (twitterUrl) {
    twitterUrl.setAttribute('content', fullUrl)
  }
  
  return fullUrl
}

// Initialize canonical URL management
export function initializeCanonicalUrls() {
  if (typeof window === 'undefined') return
  
  // Update on initial load
  const currentPath = window.location.pathname + window.location.search
  updateCanonicalUrl(currentPath)
  updateOpenGraphUrls(currentPath)
  
  // Update on navigation (for SPA)
  const originalPushState = history.pushState
  const originalReplaceState = history.replaceState
  
  history.pushState = function(...args) {
    originalPushState.apply(history, args)
    const newPath = window.location.pathname + window.location.search
    updateCanonicalUrl(newPath)
    updateOpenGraphUrls(newPath)
  }
  
  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args)
    const newPath = window.location.pathname + window.location.search
    updateCanonicalUrl(newPath)
    updateOpenGraphUrls(newPath)
  }
  
  // Listen for popstate events (back/forward)
  window.addEventListener('popstate', () => {
    const newPath = window.location.pathname + window.location.search
    updateCanonicalUrl(newPath)
    updateOpenGraphUrls(newPath)
  })
}

// Generate structured data with correct URLs
export function generateStructuredDataWithCorrectUrls(data: any): any {
  const jsonString = JSON.stringify(data)
  const updatedJsonString = jsonString.replace(
    /https:\/\/bestfreewallpapers\.com/g,
    DEPLOYMENT_DOMAIN
  )
  return JSON.parse(updatedJsonString)
}

// Validate and fix any remaining old URLs
export function auditAndFixUrls() {
  if (typeof window === 'undefined') return
  
  const issues: string[] = []
  
  // Check canonical URL
  const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
  if (canonical && !canonical.href.includes(DEPLOYMENT_DOMAIN)) {
    issues.push(`Canonical URL incorrect: ${canonical.href}`)
    canonical.href = canonical.href.replace(/https:\/\/[^/]+/, DEPLOYMENT_DOMAIN)
  }
  
  // Check Open Graph URLs
  const ogUrl = document.querySelector('meta[property="og:url"]')
  if (ogUrl && !ogUrl.getAttribute('content')?.includes(DEPLOYMENT_DOMAIN)) {
    const content = ogUrl.getAttribute('content') || ''
    issues.push(`OG URL incorrect: ${content}`)
    ogUrl.setAttribute('content', content.replace(/https:\/\/[^/]+/, DEPLOYMENT_DOMAIN))
  }
  
  // Check structured data
  const structuredDataScripts = document.querySelectorAll('script[type="application/ld+json"]')
  structuredDataScripts.forEach((script, index) => {
    try {
      const data = JSON.parse(script.textContent || '{}')
      const jsonString = JSON.stringify(data)
      
      if (jsonString.includes('bestfreewallpapers.com')) {
        issues.push(`Structured data script ${index} contains old domain`)
        const fixedData = generateStructuredDataWithCorrectUrls(data)
        script.textContent = JSON.stringify(fixedData)
      }
    } catch (error) {
      console.warn('Error parsing structured data:', error)
    }
  })
  
  // Check sitemap references
  const sitemapLinks = document.querySelectorAll('link[rel="sitemap"]')
  sitemapLinks.forEach((link) => {
    const href = link.getAttribute('href')
    if (href && !href.includes(DEPLOYMENT_DOMAIN)) {
      issues.push(`Sitemap URL incorrect: ${href}`)
      link.setAttribute('href', href.replace(/https:\/\/[^/]+/, DEPLOYMENT_DOMAIN))
    }
  })
  
  if (issues.length > 0) {
    console.warn('SEO URL issues found and fixed:', issues)
  }
  
  return issues
}