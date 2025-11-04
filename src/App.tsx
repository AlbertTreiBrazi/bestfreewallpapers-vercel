import React, { Suspense, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PremiumBanner } from '@/components/premium/PremiumBanner'
import { BackToTopButton } from '@/components/ui/BackToTopButton'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import EnhancedErrorBoundary from '@/components/reliability/ErrorBoundary'
import NetworkStatus from '@/components/reliability/NetworkStatus'

import reliabilityService from '@/services/reliabilityService'
import deploymentManager from '@/utils/deploymentManager'
import { PageLoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { initializePerformanceOptimizations } from '@/utils/performance-optimization'
import { initializeFIDOptimizations } from '@/utils/fid-optimization'
import { initializeCLSOptimizations } from '@/utils/cls-optimization'
import { initializeRUM } from '@/utils/rum-monitoring'
import usePerformanceMonitoring from '@/hooks/usePerformanceMonitoring'
import monitoringService from '@/services/monitoringService'
import './App.css'
import './mobile-optimizations.css'

// Initialize performance optimizations
initializePerformanceOptimizations()

// Initialize FID-specific optimizations
if (typeof window !== 'undefined') {
  // Defer FID and CLS initialization to idle time
  const requestIdleCallback = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 1))
  requestIdleCallback(() => {
    initializeFIDOptimizations()
    // Initialize CLS optimizations after FID
    initializeCLSOptimizations()
    // Initialize Real User Monitoring last
    initializeRUM()
  })
}

// Lazy load all page components for better performance
const HomePage = React.lazy(() => import('@/pages/HomePage'))
const WallpapersPage = React.lazy(() => import('@/pages/WallpapersPage'))
const FreeWallpapersPage = React.lazy(() => import('@/pages/FreeWallpapersPage'))
const MobileWallpapersPage = React.lazy(() => import('@/pages/MobileWallpapersPage'))
const AIWallpapersPage = React.lazy(() => import('@/pages/AIWallpapersPage'))
const DeviceCollectionPage = React.lazy(() => import('@/pages/DeviceCollectionPage'))
const CategoryPage = React.lazy(() => import('@/pages/CategoryPage'))
const ContactPage = React.lazy(() => import('@/pages/ContactPage'))
const PremiumPage = React.lazy(() => import('@/pages/PremiumPage'))
const UpgradePage = React.lazy(() => import('@/pages/UpgradePage'))
// Admin components are already lazy-loaded within AdminPage to reduce initial bundle size
const AnalyticsDashboard = React.lazy(() => import('@/components/admin/AnalyticsDashboard'))
const FavoritesPage = React.lazy(() => import('@/pages/FavoritesPage'))
const AboutPage = React.lazy(() => import('@/pages/AboutPage'))
const CategoriesPage = React.lazy(() => import('@/pages/CategoriesPage'))
const CollectionsPage = React.lazy(() => import('@/pages/CollectionsPage'))
const CollectionDetailPage = React.lazy(() => import('@/pages/CollectionDetailPage'))
const WallpaperDetailPage = React.lazy(() => import('@/pages/WallpaperDetailPage'))
const PrivacyPage = React.lazy(() => import('@/pages/PrivacyPage'))
const TermsPage = React.lazy(() => import('@/pages/TermsPage'))
const CookiePage = React.lazy(() => import('@/pages/CookiePage'))
const DMCAPage = React.lazy(() => import('@/pages/DMCAPage'))
const GuidelinesPage = React.lazy(() => import('@/pages/GuidelinesPage'))
const HelpPage = React.lazy(() => import('@/pages/HelpPage'))
const APIPage = React.lazy(() => import('@/pages/APIPage'))
const ResetPasswordPage = React.lazy(() => import('@/pages/ResetPasswordPage'))
const EnhancedSearchPage = React.lazy(() => import('@/pages/SearchV2Page'))
const ErrorPage = React.lazy(() => import('@/pages/ErrorPage'))
const NotFoundPage = React.lazy(() => import('@/pages/NotFoundPage'))
const MobilePage = React.lazy(() => import('@/pages/MobilePage'))
const SizesPage = React.lazy(() => import('@/pages/SizesPage'))
const LicensePage = React.lazy(() => import('@/pages/LicensePage'))
const AuthPage = React.lazy(() => import('@/pages/AuthPage'))
const LoginPage = React.lazy(() => import('@/pages/LoginPage'))
const AuthCallbackPage = React.lazy(() => import('@/pages/AuthCallbackPage'))
const PremiumSuccessPage = React.lazy(() => import('@/pages/PremiumSuccessPage'))
const PremiumCancelPage = React.lazy(() => import('@/pages/PremiumCancelPage'))
const AdminPage = React.lazy(() => import('@/pages/AdminPage'))

// Create a stable QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

// Global error handler to prevent [object Object] displays
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('Global error caught:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', {
      reason: event.reason,
      promise: event.promise
    })
    // Prevent the default browser error display
    event.preventDefault()
  })
}

// Wrapper component to conditionally show PremiumBanner
function ConditionalPremiumBanner() {
  const location = useLocation()
  const hideBannerOnRoutes = ['/upgrade', '/premium/success', '/premium/canceled']
  const showBanner = !hideBannerOnRoutes.includes(location.pathname)
  
  return showBanner ? <PremiumBanner /> : null
}

// App Content with Performance Monitoring
function AppContent() {
  const { measureCustomMetric } = usePerformanceMonitoring()

  useEffect(() => {
    // Measure app initialization time
    const startTime = performance.now()
    measureCustomMetric('app-initialization', startTime)
    
    // Initialize monitoring service
    monitoringService.trackBusinessEvent({
      event_type: 'app_initialized',
      url: window.location.href,
      metadata: {
        timestamp: Date.now(),
        user_agent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`
      }
    })
    
    // Initialize security service worker if supported
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw-security.js')
        .catch(() => console.log('Security service worker not available'))
    }

    // Track route changes for analytics
    const handleRouteChange = () => {
      monitoringService.trackBusinessEvent({
        event_type: 'page_view',
        url: window.location.href,
        referrer: document.referrer,
        metadata: {
          timestamp: Date.now(),
          path: window.location.pathname
        }
      })
    }

    // Listen for navigation events
    window.addEventListener('popstate', handleRouteChange)
    
    // Network monitoring
    const handleNetworkChange = (isOnline: boolean) => {
      monitoringService.trackBusinessEvent({
        event_type: isOnline ? 'network_restored' : 'network_lost',
        url: window.location.href,
        metadata: {
          timestamp: Date.now(),
          network_status: isOnline ? 'online' : 'offline'
        }
      })
    }
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange)
      // Clean up reliability and deployment services
      deploymentManager.destroy()
      monitoringService.destroy()
    }
  }, [])

  return (
    <Router>
      <EnhancedErrorBoundary level="page" showDetails={false}>
        <div className="min-h-screen bg-background text-foreground">
          <NetworkStatus position="top" />
          <Header />
          <ConditionalPremiumBanner />
          <main className="flex-1">
            <Suspense fallback={<PageLoadingSkeleton />}>
              <EnhancedErrorBoundary level="component" showDetails={false}>
                <Routes>
                  {/* Main Pages */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/wallpapers" element={<WallpapersPage />} />
                  <Route path="/free-wallpapers" element={<FreeWallpapersPage />} />
                  <Route path="/mobile-wallpapers" element={<MobileWallpapersPage />} />
                  <Route path="/ai-wallpapers" element={<AIWallpapersPage />} />
                  <Route path="/wallpaper/:slug" element={<WallpaperDetailPage />} />
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/category/:slug" element={<CategoryPage />} />
                  <Route path="/collections" element={<CollectionsPage />} />
                  <Route path="/collections/iphone-wallpapers" element={<DeviceCollectionPage />} />
                  <Route path="/collections/android-wallpapers" element={<DeviceCollectionPage />} />
                  <Route path="/collections/samsung-galaxy-wallpapers" element={<DeviceCollectionPage />} />
                  <Route path="/collections/ipad-wallpapers" element={<DeviceCollectionPage />} />
                  <Route path="/collections/oneplus-wallpapers" element={<DeviceCollectionPage />} />
                  <Route path="/collections/xiaomi-wallpapers" element={<DeviceCollectionPage />} />
                  <Route path="/collections/:slug" element={<CollectionDetailPage />} />
                  <Route path="/favorites" element={<FavoritesPage />} />
                  <Route path="/search" element={<EnhancedSearchPage />} />
                  
                  {/* User Pages */}
                  <Route path="/premium" element={<PremiumPage />} />
                  <Route path="/upgrade" element={<UpgradePage />} />
                  <Route path="/premium/success" element={<PremiumSuccessPage />} />
                  <Route path="/premium/canceled" element={<PremiumCancelPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/mobile" element={<MobilePage />} />
                  <Route path="/sizes" element={<SizesPage />} />
                  <Route path="/license" element={<LicensePage />} />
                  
                  {/* Legal Pages */}
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/cookie-policy" element={<CookiePage />} />
                  <Route path="/dmca" element={<DMCAPage />} />
                  <Route path="/guidelines" element={<GuidelinesPage />} />
                  <Route path="/help" element={<HelpPage />} />
                  <Route path="/api" element={<APIPage />} />
                  
                  {/* Auth Pages */}
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/auth/callback" element={<AuthCallbackPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  
                  {/* Admin Pages */}
                  <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>} />
                  <Route path="/admin/analytics" element={<ProtectedRoute requireAdmin><AnalyticsDashboard /></ProtectedRoute>} />
                  
                  {/* Error Pages */}
                  <Route path="/404" element={<NotFoundPage />} />
                  <Route path="/error" element={<ErrorPage />} />
                  
                  {/* Catch-all Route - 404 Not Found */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </EnhancedErrorBoundary>
            </Suspense>
          </main>
          <Footer />
          <BackToTopButton />
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--background)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
            },
          }}
        />
      </EnhancedErrorBoundary>
    </Router>
  )
}

function App() {
  return (
    <EnhancedErrorBoundary level="page" showDetails={process.env.NODE_ENV === 'development'}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </EnhancedErrorBoundary>
  )
}

export default App