// Unified Download Hook - Single Source of Truth for Download Logic
// Eliminates download logic duplication between components

import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { timerService } from '@/services/timerService'
import toast from 'react-hot-toast'

interface WallpaperData {
  id: number
  title: string
  slug?: string
  image_url: string
  is_premium?: boolean
  resolution_1080p?: string | null
  resolution_4k?: string | null
  resolution_8k?: string | null
  asset_4k_url?: string | null
  asset_8k_url?: string | null
  show_4k?: boolean
  show_8k?: boolean
  live_video_url?: string | null
  live_poster_url?: string | null
  live_enabled?: boolean
}

interface UseUnifiedDownloadParams {
  onAuthRequired?: () => void
}

interface UseUnifiedDownloadReturn {
  isDownloadModalOpen: boolean
  isDownloading: boolean
  showAdTimer: boolean
  timerDuration: number
  openDownloadModal: (wallpaper: WallpaperData, resolution?: string) => Promise<void>
  closeDownloadModal: () => void
  startDownload: () => Promise<void>
  handleTimerComplete: () => void
  currentWallpaper: WallpaperData | null
  currentResolution: string
  userType: 'guest' | 'free' | 'premium'
  isGuestLiveVideoDownload: boolean
}

export function useUnifiedDownload(params: UseUnifiedDownloadParams = {}): UseUnifiedDownloadReturn {
  const { onAuthRequired } = params
  const { user, profile } = useAuth()
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showAdTimer, setShowAdTimer] = useState(false)
  const [timerDuration, setTimerDuration] = useState(0)
  const [currentWallpaper, setCurrentWallpaper] = useState<WallpaperData | null>(null)
  const [currentResolution, setCurrentResolution] = useState('1080p')
  const [downloadToken, setDownloadToken] = useState<string | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)

  // Determine user type using unified service
  const userType = timerService.getUserType(user, profile)

  // Open download modal with unified logic
  const openDownloadModal = useCallback(async (wallpaper: WallpaperData, resolution = '1080p') => {
    setCurrentWallpaper(wallpaper)
    setCurrentResolution(resolution)
    setIsDownloadModalOpen(true)
    setIsDownloading(false)
    setShowAdTimer(false)
    setDownloadToken(null)
    setAuthToken(null)

    // CRITICAL UX FIX: Premium wallpapers require authentication
    // Skip timer and token generation - prompt login immediately
    if (wallpaper.is_premium && userType === 'guest') {
      console.log('🔒 Premium wallpaper requires authentication', {
        wallpaperId: wallpaper.id,
        title: wallpaper.title,
        userType
      })
      
      toast.error('Please sign in to download premium wallpapers.')
      setIsDownloadModalOpen(false) // Close the modal
      
      if (onAuthRequired) {
        onAuthRequired() // Open auth modal
      }
      
      return // Exit early - no timer, no token generation
    }

    // SPECIAL CASE: Guest + Live Video Download → Registration Prompt
    const isLiveVideoDownload = resolution === 'video' && (wallpaper.live_video_url || wallpaper.live_enabled)
    const shouldShowRegistrationPrompt = userType === 'guest' && isLiveVideoDownload
    
    if (shouldShowRegistrationPrompt) {
      console.log('Guest Live Video Download: Showing registration prompt instead of timer')
      // Don't show timer, don't prepare download - just open modal in registration mode
      return
    }

    try {
      // Get timer duration based on user type
      const duration = await timerService.getTimerDuration(userType)
      setTimerDuration(duration)

      // Premium users skip timer
      if (userType === 'premium') {
        await initiatePremiumDownload(wallpaper, resolution)
      } else {
        // Guest and Free users need timer + download preparation
        setShowAdTimer(true)
        await prepareDownload(wallpaper, resolution)
      }
    } catch (error) {
      console.error('Failed to prepare download:', error)
      toast.error('Failed to prepare download. Please try again.')
    }
  }, [userType, onAuthRequired]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close download modal
  const closeDownloadModal = useCallback(() => {
    setIsDownloadModalOpen(false)
    setShowAdTimer(false)
    setCurrentWallpaper(null)
    setDownloadToken(null)
    setAuthToken(null)
  }, [])

  // Handle timer completion for guest/free users
  const handleTimerComplete = useCallback(() => {
    setShowAdTimer(false)
    console.log('Timer completed for user type:', userType)
  }, [userType])

  // Prepare download session (for guest/free users)
  const prepareDownload = useCallback(async (wallpaper: WallpaperData, resolution: string) => {
    try {
      if (userType === 'guest') {
        // Generate anonymous token with retry logic
        let attempts = 0
        const maxAttempts = 3
        let lastError: any = null
        
        while (attempts < maxAttempts) {
          attempts++
          
          try {
            console.log(`🔄 Attempting to generate download token (attempt ${attempts}/${maxAttempts})`, {
              wallpaperId: wallpaper.id,
              is_premium: wallpaper.is_premium,
              title: wallpaper.title
            })
            
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-anonymous-token`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ wallpaperId: wallpaper.id })
              }
            )

            if (response.ok) {
              const result = await response.json()
              if (result.data?.token) {
                setDownloadToken(result.data.token)
                console.log('✅ Download token generated successfully', {
                  wallpaperId: wallpaper.id,
                  is_premium: wallpaper.is_premium,
                  attempt: attempts,
                  tokenLength: result.data.token.length
                })
                return // Success! Exit the function
              } else {
                console.warn('⚠️ Token generation returned OK but no token in response', {
                  wallpaperId: wallpaper.id,
                  response: result
                })
                lastError = new Error('No token returned in response')
              }
            } else {
              // Log the error response
              const errorData = await response.json().catch(() => ({}))
              console.error('❌ Token generation failed:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData,
                wallpaperId: wallpaper.id,
                is_premium: wallpaper.is_premium,
                attempt: attempts
              })
              
              // If it's an auth error (401, 403), trigger auth modal
              if (response.status === 401 || response.status === 403) {
                const isPremiumAuthError = errorData.error?.code === 'ERR_PREMIUM_AUTH_REQUIRED' || 
                                          errorData.error?.message?.toLowerCase().includes('premium') ||
                                          errorData.error?.message?.toLowerCase().includes('authentication required')
                
                if (isPremiumAuthError) {
                  console.log('🔒 Premium authentication required - opening auth modal')
                  toast.error('Please sign in to download premium wallpapers.')
                  setIsDownloadModalOpen(false)
                  if (onAuthRequired) {
                    onAuthRequired()
                  }
                  return // Exit without retrying
                }
                
                // For other 403 errors, show message and don't retry
                const errorMessage = errorData.error?.message || 'This wallpaper is not available for download'
                throw new Error(errorMessage)
              }
              
              // For 404, don't retry
              if (response.status === 404) {
                const errorMessage = errorData.error?.message || 'Wallpaper not found'
                throw new Error(errorMessage)
              }
              
              lastError = new Error(errorData.error?.message || `Server error: ${response.status}`)
            }
          } catch (fetchError: any) {
            console.error(`❌ Token generation attempt ${attempts} failed:`, fetchError)
            lastError = fetchError
            
            // If it's a permanent error, don't retry
            if (fetchError.message?.includes('not available') || fetchError.message?.includes('403') || fetchError.message?.includes('404')) {
              throw fetchError
            }
            
            if (attempts >= maxAttempts) {
              throw new Error(`Failed to generate download token after ${maxAttempts} attempts: ${fetchError.message}`)
            }
            
            // Wait before retry (exponential backoff: 1s, 2s, 3s)
            const waitTime = attempts * 1000
            console.log(`⏳ Waiting ${waitTime}ms before retry...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
          }
        }
        
        // If we get here, all retries failed
        throw lastError || new Error('Failed to generate download token after multiple attempts')
        
      } else {
        // Get auth token for free users
        const { data: { session } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession())
        if (session?.access_token) {
          setAuthToken(session.access_token)

          // Create download session via download-wallpaper function
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-wallpaper`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                wallpaper_id: wallpaper.id,
                resolution: resolution
              })
            }
          )

          if (response.ok) {
            const result = await response.json()
            setDownloadToken(result.data.download_token)
            console.log('✅ Free user download token generated')
          } else {
            const errorData = await response.json().catch(() => ({}))
            console.error('❌ Free user token generation failed:', errorData)
            throw new Error(errorData.error?.message || 'Failed to generate download token')
          }
        } else {
          throw new Error('Authentication required. Please sign in.')
        }
      }
    } catch (error: any) {
      console.error('❌ Failed to prepare download:', error)
      toast.error(error.message || 'Failed to prepare download. Please try again.')
      setIsDownloadModalOpen(false) // Close modal on error
      throw error
    }
  }, [userType, onAuthRequired])

  // Initiate premium download (instant)
  const initiatePremiumDownload = useCallback(async (wallpaper: WallpaperData, resolution: string) => {
    setIsDownloading(true)
    try {
      const { data: { session } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession())
      if (!session?.access_token) {
        throw new Error('Authentication required')
      }

      // Get download token
      const tokenResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-wallpaper`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            wallpaper_id: wallpaper.id,
            resolution: resolution
          })
        }
      )

      if (!tokenResponse.ok) {
        const errorResult = await tokenResponse.json()
        throw new Error(errorResult.error?.message || 'Failed to prepare download')
      }

      const tokenResult = await tokenResponse.json()
      const token = tokenResult.data.download_token
      
      // Get download URL
      const downloadResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-file?token=${token}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          }
        }
      )
      
      if (!downloadResponse.ok) {
        const errorResult = await downloadResponse.json()
        throw new Error(errorResult.error?.message || 'Failed to get download URL')
      }
      
      // Check if response is JSON or direct file content
      const contentType = downloadResponse.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        // JSON response with download URL (fallback mode)
        const downloadResult = await downloadResponse.json()
        const { download_url, filename } = downloadResult.data
        
        // Trigger file download
        const link = document.createElement('a')
        link.href = download_url
        link.download = filename
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        toast.success(`Download started! File: ${filename}`)
      } else {
        // Direct file content with Content-Disposition header (standard mode)
        const blob = await downloadResponse.blob()
        const filename = wallpaper.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_') + `-${resolution}.jpg`
        
        // Create blob URL and trigger download
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Clean up blob URL
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
        
        toast.success(`Download started! File: ${filename}`)
        console.log('✅ Premium download completed via direct file response')
      }
      
      // Close modal after successful download
      setTimeout(() => {
        closeDownloadModal()
      }, 1500)
      
    } catch (error: any) {
      console.error('Premium download error:', error)
      toast.error(error.message || 'Download failed. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }, [])

  // CRITICAL FIX: Enhanced download with external URL support
  const startDownload = useCallback(async () => {
    if (!currentWallpaper) return

    setIsDownloading(true)
    
    try {
      // UNIFIED DOWNLOAD PATH FIX: All users (guest + authenticated) use download-file endpoint
      // This ensures ALL downloads are logged in the database and trigger analytics updates
      if (!downloadToken) {
        throw new Error('Download token not available')
      }

      console.log('🔄 Starting unified download via download-file endpoint:', {
        userType,
        wallpaperId: currentWallpaper.id,
        resolution: currentResolution
      })

      const downloadResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-file?token=${downloadToken}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          }
        }
      )
      
      if (!downloadResponse.ok) {
        const errorResult = await downloadResponse.json()
        throw new Error(errorResult.error?.message || 'Failed to get download URL')
      }
      
      // Check if response is JSON or file content
      const contentType = downloadResponse.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        // JSON response with download URL (fallback mode)
        const downloadResult = await downloadResponse.json()
        const { download_url, filename } = downloadResult.data
        
        // Trigger file download
        const link = document.createElement('a')
        link.href = download_url
        link.download = filename
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        toast.success(`Download started! File: ${filename}`)
        console.log('✅ Unified download completed (JSON fallback mode):', { userType })
      } else {
        // Direct file content with Content-Disposition header (standard mode)
        const blob = await downloadResponse.blob()
        const filename = currentWallpaper.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_') + `-${currentResolution}.jpg`
        
        // Create blob URL and trigger download
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Clean up blob URL
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
        
        toast.success(`Download started! File: ${filename}`)
        console.log('✅ Unified download completed (direct file mode):', { userType })
      }
      
      setTimeout(() => closeDownloadModal(), 1500)
    } catch (error: any) {
      console.error('Download error:', error)
      toast.error(error.message || 'Download failed. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }, [userType, currentWallpaper, downloadToken, currentResolution, closeDownloadModal])

  // Check if this is a guest live video download scenario
  const isGuestLiveVideoDownload = Boolean(
    userType === 'guest' && 
    currentResolution === 'video' && 
    currentWallpaper && 
    (currentWallpaper.live_video_url || currentWallpaper.live_enabled)
  )

  return {
    isDownloadModalOpen,
    isDownloading,
    showAdTimer,
    timerDuration,
    openDownloadModal,
    closeDownloadModal,
    startDownload,
    handleTimerComplete,
    currentWallpaper,
    currentResolution,
    userType,
    isGuestLiveVideoDownload
  }
}
