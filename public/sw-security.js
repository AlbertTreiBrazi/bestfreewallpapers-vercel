// Security-Enhanced Service Worker
// BUILD_VERSION with timestamp for automatic cache busting
const BUILD_VERSION = '1761865800'
const CACHE_NAME = `secure-wallpapers-${BUILD_VERSION}`
const STATIC_CACHE = `static-secure-${BUILD_VERSION}`

// Security headers to add to all responses
const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.minimax.io; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; media-src 'self' https: data:; connect-src 'self' https://*.supabase.co https://*.minimax.io data:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; script-src-elem 'self' data:; connect-src 'self' data:",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()',
  'X-Permitted-Cross-Domain-Policies': 'none'
};

// Files to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Security-Enhanced Service Worker');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets with security headers');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Security-Enhanced Service Worker installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating Security-Enhanced Service Worker BUILD_VERSION: ${BUILD_VERSION}`)
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        console.log('[SW] Found caches:', cacheNames)
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log(`[SW] Security-Enhanced Service Worker activated with BUILD_VERSION: ${BUILD_VERSION}`)
        return self.clients.claim()
      })
      .then(() => {
        // Notify all clients to reload
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'CACHE_UPDATED', version: BUILD_VERSION })
          })
        })
      })
  )
})

// Fetch event - intercept requests and add security headers
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  event.respondWith(
    handleRequest(event.request)
      .catch((error) => {
        console.error('[SW] Fetch error:', error);
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
        // For other requests, return a basic error response
        return new Response('Service Worker Error', {
          status: 500,
          headers: SECURITY_HEADERS
        });
      })
  );
});

// Handle individual requests with security headers
async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Network-first strategy for HTML navigation to prevent white screen
    if (request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
      console.log('[SW] Network-first strategy for HTML navigation:', url.pathname);
      
      try {
        // Always fetch from network first for HTML
        const response = await fetch(request, {
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.ok) {
          console.log('[SW] Network response successful for HTML navigation');
          return addSecurityHeaders(response);
        }
      } catch (networkError) {
        console.warn('[SW] Network failed for HTML, falling back to cache:', networkError);
      }
      
      // Fallback to cache for HTML only if network fails
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log('[SW] Serving HTML from cache as fallback');
        return addSecurityHeaders(cachedResponse);
      }
      
      // Return offline page only when actually offline
      if (!navigator.onLine) {
        const offlinePage = await caches.match('/offline.html');
        return offlinePage ? addSecurityHeaders(offlinePage) : createOfflineResponse();
      }
      
      throw new Error('Navigation failed: no network or cache available');
    }
    
    // Cache-first strategy for static assets (CSS, JS, images)
    if (isStaticAsset(url.pathname)) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log('[SW] Cache hit for static asset:', url.pathname);
        return addSecurityHeaders(cachedResponse);
      }
      
      // Fetch from network and cache
      const response = await fetch(request);
      if (response.ok) {
        const responseToCache = response.clone();
        const cache = await caches.open(CACHE_NAME);
        const cacheRequest = request.method === 'HEAD' 
          ? new Request(request.url, { method: 'GET', headers: request.headers })
          : request;
        
        try {
          cache.put(cacheRequest, responseToCache);
          console.log('[SW] Cached static asset:', url.pathname);
        } catch (cacheError) {
          console.warn('[SW] Cache put failed for static asset:', cacheError.message);
        }
      }
      
      return addSecurityHeaders(response);
    }
    
    // Network-first for everything else (API calls, etc.)
    const response = await fetch(request);
    return addSecurityHeaders(response);
    
  } catch (error) {
    console.error('[SW] Request failed:', error);
    
    // Try cache fallback for everything else
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return addSecurityHeaders(cachedResponse);
    }
    
    // Return offline page only for navigation when offline
    if (request.mode === 'navigate' && !navigator.onLine) {
      const offlinePage = await caches.match('/offline.html');
      return offlinePage ? addSecurityHeaders(offlinePage) : createOfflineResponse();
    }
    
    throw error;
  }
}

// Add security headers to a response
function addSecurityHeaders(response) {
  const newHeaders = new Headers(response.headers);
  
  // Add all security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  
  // Create new response with security headers
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

// Check if a path is a static asset
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg', '.woff', '.woff2'];
  const staticPaths = ['/images/', '/assets/', '/favicon', '/manifest.json'];
  
  return staticExtensions.some(ext => pathname.endsWith(ext)) ||
         staticPaths.some(path => pathname.startsWith(path)) ||
         pathname === '/' || pathname === '/index.html';
}

// Create offline response with security headers
function createOfflineResponse() {
  const offlineHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - Best Free Wallpapers</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; margin-bottom: 20px; }
        p { color: #666; line-height: 1.6; }
        .retry-btn { background: #7c3aed; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>You're Offline</h1>
        <p>It looks like you're not connected to the internet. Please check your connection and try again.</p>
        <button class="retry-btn" onclick="window.location.reload()">Retry</button>
      </div>
    </body>
    </html>
  `;
  
  return new Response(offlineHTML, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
      ...SECURITY_HEADERS
    }
  });
}

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SECURITY_STATUS') {
    // Send back security status
    event.ports[0].postMessage({
      securityHeadersActive: true,
      headersCount: Object.keys(SECURITY_HEADERS).length,
      cacheStatus: 'active',
      version: '1.0.0'
    });
  }
});

console.log('[SW] Security-Enhanced Service Worker loaded successfully');
console.log('[SW] Security headers configured:', Object.keys(SECURITY_HEADERS).length);