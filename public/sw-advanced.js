// Advanced Service Worker with Intelligent Caching
// BUILD_VERSION with timestamp for automatic cache busting
const BUILD_VERSION = '1761839072694'
const CACHE_NAME = `wallpapers-${BUILD_VERSION}`
const STATIC_CACHE = `static-${BUILD_VERSION}`
const IMAGE_CACHE = `images-${BUILD_VERSION}`
const API_CACHE = `api-${BUILD_VERSION}`
const FONT_CACHE = `fonts-${BUILD_VERSION}`

// Cache strategies configuration
const CACHE_CONFIG = {
  static: {
    name: STATIC_CACHE,
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    maxEntries: 100,
    strategy: 'cache-first'
  },
  images: {
    name: IMAGE_CACHE,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 500,
    strategy: 'cache-first'
  },
  api: {
    name: API_CACHE,
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxEntries: 100,
    strategy: 'network-first'
  },
  fonts: {
    name: FONT_CACHE,
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    maxEntries: 20,
    strategy: 'cache-first'
  }
}

// Resources to precache
const PRECACHE_RESOURCES = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/images/screenshot-desktop.png' // Desktop screenshot for PWA
]

// Install event - precache resources
self.addEventListener('install', event => {
  console.log('Service Worker installing...')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Precaching resources')
        return cache.addAll(PRECACHE_RESOURCES)
      })
      .then(() => {
        // Force activation of new service worker
        return self.skipWaiting()
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...')
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE && 
                cacheName !== IMAGE_CACHE && 
                cacheName !== API_CACHE &&
                cacheName !== FONT_CACHE) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      // Take control of all pages
      self.clients.claim()
    ])
  )
})

// Fetch event - intelligent caching based on request type
self.addEventListener('fetch', event => {
  const { request } = event
  const { url, method } = request
  
  // Only handle GET requests
  if (method !== 'GET') return
  
  // Skip cross-origin requests
  if (!url.startsWith(self.location.origin) && !url.includes('supabase.co')) {
    return
  }
  
  // Route to appropriate caching strategy
  if (isStaticResource(url)) {
    event.respondWith(handleStaticResource(request))
  } else if (isImageResource(url)) {
    event.respondWith(handleImageResource(request))
  } else if (isFontResource(url)) {
    event.respondWith(handleFontResource(request))
  } else if (isAPIResource(url)) {
    event.respondWith(handleAPIResource(request))
  } else {
    event.respondWith(handleGenericRequest(request))
  }
})

// Resource type detection
function isStaticResource(url) {
  return url.match(/\.(js|css|html|json|ico|svg)$/i)
}

function isImageResource(url) {
  return url.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i) || url.includes('/api-img/')
}

function isFontResource(url) {
  return url.match(/\.(woff|woff2|ttf|otf)$/i)
}

function isAPIResource(url) {
  return url.includes('/api/') || url.includes('/functions/v1/')
}

// Static resources - Cache First strategy
async function handleStaticResource(request) {
  const config = CACHE_CONFIG.static
  const cache = await caches.open(config.name)
  
  // Try cache first
  const cachedResponse = await cache.match(request)
  if (cachedResponse && !isExpired(cachedResponse, config.maxAge)) {
    return cachedResponse
  }
  
  try {
    // Fetch from network
    const response = await fetch(request)
    if (response.ok) {
      const responseToCache = response.clone()
      await cache.put(request, responseToCache)
      await cleanupCache(cache, config.maxEntries)
    }
    return response
  } catch (error) {
    // Return cached version if available, even if expired
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}

// Images - Cache First with WebP optimization
async function handleImageResource(request) {
  const config = CACHE_CONFIG.images
  const cache = await caches.open(config.name)
  
  // Try cache first
  const cachedResponse = await cache.match(request)
  if (cachedResponse && !isExpired(cachedResponse, config.maxAge)) {
    return cachedResponse
  }
  
  try {
    // Try to get WebP version if supported
    const optimizedRequest = getOptimizedImageRequest(request)
    const response = await fetch(optimizedRequest)
    
    if (response.ok) {
      const responseToCache = response.clone()
      await cache.put(request, responseToCache)
      await cleanupCache(cache, config.maxEntries)
    }
    return response
  } catch (error) {
    // Fallback to cached version
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Final fallback - placeholder image
    return new Response(
      `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="50%" text-anchor="middle" fill="#9ca3af">Image Unavailable</text>
      </svg>`,
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache'
        }
      }
    )
  }
}

// Fonts - Cache First with long expiration
async function handleFontResource(request) {
  const config = CACHE_CONFIG.fonts
  const cache = await caches.open(config.name)
  
  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const response = await fetch(request)
    if (response.ok) {
      const responseToCache = response.clone()
      await cache.put(request, responseToCache)
    }
    return response
  } catch (error) {
    console.warn('Font loading failed:', request.url)
    throw error
  }
}

// API - Network First with enhanced error handling and retry logic
async function handleAPIResource(request) {
  const config = CACHE_CONFIG.api
  const cache = await caches.open(config.name)
  const url = new URL(request.url)
  
  // Enhanced retry logic for Supabase endpoints
  const isSupabaseEndpoint = url.hostname.includes('supabase.co')
  const maxRetries = isSupabaseEndpoint ? 3 : 1
  let retryCount = 0
  
  while (retryCount < maxRetries) {
    try {
      // Try network first with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const networkResponse = await fetch(request, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      clearTimeout(timeoutId)
      
      if (networkResponse.ok) {
        const responseToCache = networkResponse.clone()
        await cache.put(request, responseToCache)
        await cleanupCache(cache, config.maxEntries)
        return networkResponse
      } else if (networkResponse.status === 401 || networkResponse.status === 403) {
        // Authentication errors - return as-is (expected behavior)
        return networkResponse
      } else {
        throw new Error(`HTTP ${networkResponse.status}`)
      }
    } catch (error) {
      retryCount++
      console.warn(`Network request failed (attempt ${retryCount}/${maxRetries}):`, error.message)
      
      // For DNS errors or network failures, wait before retry
      if (retryCount < maxRetries) {
        const backoffDelay = Math.pow(2, retryCount) * 1000 // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, backoffDelay))
      }
    }
  }
  
  // All retries failed, try cache
  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    console.warn('Using cached response for:', request.url)
    
    // If cached response is stale, try to update in background
    if (isExpired(cachedResponse, config.maxAge)) {
      // Background update with retry
      fetch(request).then(response => {
        if (response.ok) {
          cache.put(request, response.clone())
        }
      }).catch(error => {
        console.warn('Background update failed:', error.message)
      })
    }
    return cachedResponse
  }
  
  // Last resort: return a graceful error response for API calls
  if (url.pathname.includes('/api/') || url.pathname.includes('/auth/')) {
    return new Response(JSON.stringify({
      error: 'Network temporarily unavailable',
      message: 'Please check your internet connection and try again',
      cached: false
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })
  }
  
  throw new Error('Network request failed and no cached response available')
}

// Generic request handler with improved 404 handling
async function handleGenericRequest(request) {
  try {
    const response = await fetch(request)
    
    // Handle 404 responses for images gracefully
    if (response.status === 404 && request.url.includes('/images/')) {
      console.warn('Image not found:', request.url, '- returning placeholder or 1x1 pixel')
      
      // Return a minimal 1x1 pixel PNG for missing images
      const pixelResponse = new Response(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'max-age=31536000, immutable'
          }
        }
      )
      return pixelResponse
    }
    
    return response
  } catch (error) {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME)
      return await cache.match('/offline.html')
    }
    
    // For failed image requests, return a pixel instead of throwing
    if (request.url.includes('/images/')) {
      console.warn('Image request failed:', request.url, '- using fallback')
      return new Response(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'max-age=31536000, immutable'
          }
        }
      )
    }
    
    throw error
  }
}

// Helper functions
function isExpired(response, maxAge) {
  const dateHeader = response.headers.get('date')
  if (!dateHeader) return false
  
  const date = new Date(dateHeader)
  return Date.now() - date.getTime() > maxAge
}

function getOptimizedImageRequest(request) {
  const url = new URL(request.url)
  
  // Add WebP format if not already specified
  if (!url.searchParams.has('format')) {
    url.searchParams.set('format', 'webp')
  }
  
  // Add quality optimization
  if (!url.searchParams.has('quality')) {
    url.searchParams.set('quality', '85')
  }
  
  return new Request(url.toString(), {
    method: request.method,
    headers: request.headers,
    mode: request.mode,
    credentials: request.credentials,
    cache: request.cache,
    redirect: request.redirect,
    referrer: request.referrer
  })
}

async function cleanupCache(cache, maxEntries) {
  const keys = await cache.keys()
  
  if (keys.length > maxEntries) {
    const entriesToDelete = keys.slice(0, keys.length - maxEntries)
    await Promise.all(
      entriesToDelete.map(key => cache.delete(key))
    )
  }
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'background-wallpaper-sync') {
    event.waitUntil(syncWallpapers())
  }
})

async function syncWallpapers() {
  console.log('Background sync: Updating wallpaper cache')
  
  try {
    // Refresh popular wallpapers
    const response = await fetch('/api/wallpapers/popular?limit=20')
    if (response.ok) {
      const cache = await caches.open(API_CACHE)
      await cache.put('/api/wallpapers/popular?limit=20', response.clone())
    }
  } catch (error) {
    console.warn('Background sync failed:', error)
  }
}

// Performance monitoring
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'GET_CACHE_STATS') {
    getCacheStats().then(stats => {
      event.ports[0].postMessage({ type: 'CACHE_STATS', data: stats })
    })
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    clearAllCaches().then(() => {
      event.ports[0].postMessage({ type: 'CACHE_CLEARED' })
    })
  }
})

async function getCacheStats() {
  const cacheNames = await caches.keys()
  const stats = {}
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName)
    const keys = await cache.keys()
    stats[cacheName] = {
      entries: keys.length,
      urls: keys.map(request => request.url)
    }
  }
  
  return stats
}

async function clearAllCaches() {
  const cacheNames = await caches.keys()
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  )
}