import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface WallpaperData {
  id: number
  title: string
  slug: string
  image_url: string
  is_premium: boolean
}

interface UseAdModalReturn {
  isAdModalOpen: boolean
  currentWallpaper: WallpaperData | null
  openAdModal: (wallpaper: WallpaperData) => void
  closeAdModal: () => void
  shouldShowAd: (wallpaper: WallpaperData) => boolean
  handleDirectDownload: (wallpaper: WallpaperData) => void
  handleSecureDownload: (wallpaper: WallpaperData, adGateToken?: string) => Promise<void>
  logDownloadEvent: (event: string, wallpaper: WallpaperData, details?: any) => Promise<void>
}

export function useAdModal(): UseAdModalReturn {
  const { user, profile } = useAuth()
  const [isAdModalOpen, setIsAdModalOpen] = useState(false)
  const [currentWallpaper, setCurrentWallpaper] = useState<WallpaperData | null>(null)

  // Determine if user should see ad based on premium status (NOT just authentication)
  const shouldShowAd = useCallback((wallpaper: WallpaperData) => {
    // Check if user is premium first
    const isPremium = profile?.plan_type === 'premium' && 
        (!profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date());
    
    // No ad for premium users only
    if (isPremium) {
      return false;
    }
    
    // Show ad for:
    // - Non-logged users
    // - Logged-in non-premium users
    return true;
  }, [profile]); // Remove 'user' dependency since we only care about premium status

  // Open ad modal
  const openAdModal = useCallback((wallpaper: WallpaperData) => {
    setCurrentWallpaper(wallpaper)
    setIsAdModalOpen(true)
  }, [])

  // Close ad modal
  const closeAdModal = useCallback(() => {
    setIsAdModalOpen(false)
    setCurrentWallpaper(null)
  }, [])

  // Log download events
  const logDownloadEvent = useCallback(async (event: string, wallpaper: WallpaperData, details: any = {}) => {
    try {
      await supabase.from('download_logs').insert({
        wallpaper_id: wallpaper.id,
        user_id: user?.id || null,
        event_type: event,
        details,
        created_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to log download event:', error)
    }
  }, [user])

  // Handle secure download via server endpoint
  const handleSecureDownload = useCallback(async (wallpaper: WallpaperData, adGateToken?: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/secure-download`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            wallpaper_id: wallpaper.id,
            user_id: user?.id || null,
            ad_gate_token: adGateToken
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Download failed')
      }

      const result = await response.json()
      
      // Create download link
      const link = document.createElement('a')
      link.href = result.download_url
      link.download = result.filename
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      console.log('Secure download completed for:', wallpaper.title)
    } catch (error) {
      console.error('Secure download failed:', error)
      // Fallback to direct download for backward compatibility
      handleDirectDownload(wallpaper)
    }
  }, [user])

  // Handle direct download (fallback method)
  const handleDirectDownload = useCallback((wallpaper: WallpaperData) => {
    try {
      // Create download link
      const link = document.createElement('a')
      link.href = wallpaper.image_url
      link.download = `${wallpaper.slug}.jpg`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      console.log('Direct download initiated for:', wallpaper.title)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }, [])

  return {
    isAdModalOpen,
    currentWallpaper,
    openAdModal,
    closeAdModal,
    shouldShowAd,
    handleDirectDownload,
    handleSecureDownload,
    logDownloadEvent
  }
}
