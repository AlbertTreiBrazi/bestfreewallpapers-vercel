// Analytics Hook for React Components
// Provides easy access to GA4 tracking functions

import { useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocation } from 'react-router-dom'
import analyticsService from '@/services/analyticsService'

export function useAnalytics() {
  const { user, profile } = useAuth()
  const location = useLocation()
  const pageStartTime = useRef<number>(Date.now())
  const scrollDepthTracked = useRef<Set<number>>(new Set())

  // Get current user type for analytics
  const getCurrentUserType = useCallback(() => {
    if (!user) return 'anonymous'
    if (profile?.is_admin) return 'admin'
    if (profile?.plan_type === 'premium' && 
        (!profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date())) {
      return 'premium'
    }
    return 'free'
  }, [user, profile])

  // Update user properties when auth state changes
  useEffect(() => {
    const userType = getCurrentUserType()
    analyticsService.setUserProperties({
      user_type: userType
    })
  }, [getCurrentUserType])

  // Track page views on route changes
  useEffect(() => {
    pageStartTime.current = Date.now()
    scrollDepthTracked.current.clear()
    
    const pagePath = location.pathname + location.search
    const pageTitle = document.title
    
    analyticsService.trackPageView(pagePath, pageTitle, {
      user_type: getCurrentUserType()
    })
  }, [location, getCurrentUserType])

  // Track time on page when component unmounts or route changes
  useEffect(() => {
    return () => {
      const timeSpent = Date.now() - pageStartTime.current
      if (timeSpent > 5000) { // Only track if spent more than 5 seconds
        analyticsService.trackEngagement('time_on_page', timeSpent)
      }
    }
  }, [location])

  // Track scroll depth
  const trackScrollDepth = useCallback(() => {
    const scrollPercentage = Math.round(
      (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100
    )
    
    // Track at 25%, 50%, 75%, and 100% milestones
    const milestones = [25, 50, 75, 100]
    milestones.forEach(milestone => {
      if (scrollPercentage >= milestone && !scrollDepthTracked.current.has(milestone)) {
        scrollDepthTracked.current.add(milestone)
        analyticsService.trackEngagement('scroll_depth', milestone)
      }
    })
  }, [])

  // Set up scroll tracking
  useEffect(() => {
    const handleScroll = () => {
      trackScrollDepth()
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [trackScrollDepth])

  // Track wallpaper downloads
  const trackWallpaperDownload = useCallback((wallpaper: any, resolution: string, source: string) => {
    analyticsService.trackWallpaperDownload({
      wallpaper_id: wallpaper.id,
      wallpaper_title: wallpaper.title,
      category: wallpaper.category || 'uncategorized',
      resolution,
      is_premium: wallpaper.is_premium || false,
      download_source: source as any,
      user_type: getCurrentUserType()
    })
  }, [getCurrentUserType])

  // Track wallpaper views
  const trackWallpaperView = useCallback((wallpaper: any, source: string) => {
    analyticsService.trackWallpaperView({
      wallpaper_id: wallpaper.id,
      wallpaper_title: wallpaper.title,
      category: wallpaper.category || 'uncategorized',
      is_premium: wallpaper.is_premium || false,
      view_source: source as any
    })
  }, [])

  // Track premium conversion events
  const trackPremiumConversion = useCallback((eventType: string, data: any = {}) => {
    analyticsService.trackPremiumConversion({
      event_type: eventType as any,
      ...data
    })
  }, [])

  // Track user authentication events
  const trackUserEvent = useCallback((eventType: string, method?: string) => {
    analyticsService.trackUserEvent({
      event_type: eventType as any,
      method: method as any,
      user_type: getCurrentUserType()
    })
  }, [getCurrentUserType])

  // Track search events
  const trackSearch = useCallback((searchTerm: string, resultsCount: number, filters: string[] = [], source: string = 'header') => {
    analyticsService.trackSearch({
      search_term: searchTerm,
      results_count: resultsCount,
      filters_applied: filters,
      search_source: source as any
    })
  }, [])

  // Track category views
  const trackCategoryView = useCallback((categoryName: string, categoryId: string, wallpapersCount: number, viewType: string = 'grid') => {
    analyticsService.trackCategoryView({
      category_name: categoryName,
      category_id: categoryId,
      view_type: viewType as any,
      wallpapers_count: wallpapersCount
    })
  }, [])

  // Track download blocks
  const trackDownloadBlocked = useCallback((wallpaperId: number, reason: string) => {
    analyticsService.trackDownloadBlocked(wallpaperId, reason as any)
  }, [])

  // Track download success
  const trackDownloadSuccess = useCallback((wallpaperId: number, resolution: string, downloadTime: number) => {
    analyticsService.trackDownloadSuccess(wallpaperId, resolution, downloadTime)
  }, [])

  // Track custom events
  const trackCustomEvent = useCallback((eventName: string, parameters: any = {}) => {
    analyticsService.trackCustomEvent(eventName, {
      ...parameters,
      user_type: getCurrentUserType()
    })
  }, [getCurrentUserType])

  return {
    trackWallpaperDownload,
    trackWallpaperView,
    trackPremiumConversion,
    trackUserEvent,
    trackSearch,
    trackCategoryView,
    trackDownloadBlocked,
    trackDownloadSuccess,
    trackCustomEvent,
    getCurrentUserType
  }
}

export default useAnalytics
