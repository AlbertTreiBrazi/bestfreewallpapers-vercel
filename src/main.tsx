import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSecurityServiceWorker, initializeSecurityMonitoring } from './utils/security-headers'
import { initializePerformanceOptimizations } from './utils/core-web-vitals'
import { initializeMobileSEO } from './utils/mobile-seo-optimization'

// Initialize security features
if (typeof window !== 'undefined') {
  // Register security-enhanced service worker
  registerSecurityServiceWorker().then((success) => {
    if (success) {
      console.log('[Security] Security service worker registered successfully');
    } else {
      console.warn('[Security] Failed to register security service worker');
    }
  });

  // Initialize security monitoring
  initializeSecurityMonitoring();
  
  // Initialize Core Web Vitals and performance optimizations
  initializePerformanceOptimizations();
  
  // Initialize mobile SEO optimizations
  initializeMobileSEO();
}

createRoot(document.getElementById('root')!).render(
  <App />
)