/**
 * Service Worker - FIXED VERSION
 * Critical white screen bug fix with network-first HTML strategy
 * BUILD_VERSION: 1761839214957
 */

// BUILD_VERSION with timestamp for automatic cache busting
const BUILD_VERSION = '1761839214957'
const CURRENT_CACHE = `wallpapers-fixed-${BUILD_VERSION}`
const STATIC_CACHE = `static-assets-${BUILD_VERSION}`
const IMAGE_CACHE = `images-${BUILD_VERSION}`

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing... BUILD_VERSION:', BUILD_VERSION)
  
  event.waitUntil(
    Promise.all([
      // Cache static assets only (no HTML)
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('📦 Caching static assets')
        return cache.addAll([
          '/offline.html',
          '/manifest.json',
          // Static assets will be cached dynamically
        ])
      }),
      
      // Initialize other caches
      caches.open(IMAGE_CACHE)
    ]).then(() => {
      console.log('✅ Service Worker installed successfully')
      // Skip waiting to activate immediately
      return self.skipWaiting()
    }).catch((error) => {
      console.error('❌ Service Worker installation failed:', error)
    })
  )
})

/**
 * Activate event - clean up ALL old caches aggressively
 */
self.addEventListener('activate', (event) => {
  console.log(`🚀 Service Worker activating... BUILD_VERSION: ${BUILD_VERSION}`)
  
  event.waitUntil(
    Promise.all([
      // Clean up ALL old caches aggressively - no whitelist
      caches.keys().then((cacheNames) => {
        console.log('📋 Found caches:', cacheNames)
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CURRENT_CACHE && 
                cacheName !== STATIC_CACHE && 
                cacheName !== IMAGE_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      
      // Claim all clients immediately
      self.clients.claim()
    ]).then(() => {
      console.log(`✅ Service Worker activated successfully with BUILD_VERSION: ${BUILD_VERSION}`)
    })
  )
})

/**
 * Fetch event - CRITICAL FIX: Network-first for navigation requests
 */
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return
  }
  
  // CRITICAL FIX: Network-first for navigation requests (HTML)
  const isNavigation = request.mode === 'navigate' || 
                      (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))
  
  if (isNavigation) {
    console.log('🌐 Navigation request - using network-first strategy:', request.url)
    event.respondWith(
      fetch(request).catch(() => {
        console.log('🌐 Network failed for navigation, serving offline page')
        return caches.match('/offline.html')
      })
    )
    return
  }
  
  // For all other requests, use appropriate strategy
  event.respondWith(handleOtherRequests(request))
})

/**
 * Handle non-navigation requests
 */
async function handleOtherRequests(request) {
  const url = new URL(request.url)
  
  try {
    // Cache-first for images
    if (isImage(url)) {
      return await cacheFirstStrategy(request, IMAGE_CACHE)
    }
    
    // Cache-first for static assets (CSS, JS, fonts)
    if (isStaticAsset(url)) {
      return await cacheFirstStrategy(request, STATIC_CACHE)
    }
    
    // Network-first for API calls
    if (isAPI(url)) {
      return await networkFirstStrategy(request)
    }
    
    // Default: try network, fallback to cache
    return await networkWithCacheFallback(request)
    
  } catch (error) {
    console.error('❌ Fetch error:', error)
    return await getFallback(request)
  }
}

/**
 * Network-first strategy for API calls
 */
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request)
    
    // Cache successful API responses
    if (networkResponse.ok) {
      const cache = await caches.open(CURRENT_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('🌐 Network failed for API, trying cache:', request.url)
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}

/**
 * Cache-first strategy for static assets and images
 */
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    console.log('📦 Using cached version:', request.url)
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.error('❌ Failed to fetch and cache:', request.url, error)
    throw error
  }
}

/**
 * Network with cache fallback for other requests
 */
async function networkWithCacheFallback(request) {
  try {
    const networkResponse = await fetch(request)
    
    // Don't cache HTML responses
    if (networkResponse.ok && !isHTML(request)) {
      const cache = await caches.open(CURRENT_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}

/**
 * Get appropriate fallback for failed requests
 */
async function getFallback(request) {
  // For navigation requests, return offline page
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    const offlinePage = await caches.match('/offline.html')
    if (offlinePage) {
      return offlinePage
    }
  }
  
  // For images, return placeholder
  if (isImage(new URL(request.url))) {
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="sans-serif" font-size="14" fill="#9ca3af">Image unavailable</text></svg>',
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache'
        }
      }
    )
  }
  
  // Default fallback
  return new Response('Service temporarily unavailable', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache'
    }
  })
}

/**
 * Helper functions
 */
function isImage(url) {
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(url.pathname)
}

function isStaticAsset(url) {
  return /\.(css|js|woff|woff2|ttf|eot)$/i.test(url.pathname) || 
         url.pathname.startsWith('/assets/')
}

function isAPI(url) {
  return url.pathname.startsWith('/api/') || 
         url.hostname.includes('supabase.co')
}

function isHTML(request) {
  return request.headers.get('accept')?.includes('text/html')
}

/**
 * Background sync (optional)
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  try {
    console.log('🔄 Performing background sync')
    // Handle queued actions when back online
  } catch (error) {
    console.error('❌ Background sync failed:', error)
  }
}

/**
 * Handle messages from main thread
 */
self.addEventListener('message', (event) => {
  const { type } = event.data
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true })
      })
      break
      
    default:
      console.log('Unknown message type:', type)
  }
})

/**
 * Clear all caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys()
  await Promise.all(cacheNames.map(name => caches.delete(name)))
  console.log('🗑️ All caches cleared')
}