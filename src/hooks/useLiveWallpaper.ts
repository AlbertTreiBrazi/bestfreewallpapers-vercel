import { useState, useCallback } from 'react'

interface LiveWallpaper {
  id: number
  title: string
  live_video_url: string
  live_poster_url: string
  is_premium: boolean
  description?: string
}

export function useLiveWallpaper() {
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false)
  const [currentLiveWallpaper, setCurrentLiveWallpaper] = useState<LiveWallpaper | null>(null)

  const openLiveModal = useCallback((wallpaper: LiveWallpaper) => {
    setCurrentLiveWallpaper(wallpaper)
    setIsLiveModalOpen(true)
  }, [])

  const closeLiveModal = useCallback(() => {
    setIsLiveModalOpen(false)
    // Delay clearing wallpaper to allow for smooth close animation
    setTimeout(() => {
      setCurrentLiveWallpaper(null)
    }, 300)
  }, [])

  return {
    isLiveModalOpen,
    currentLiveWallpaper,
    openLiveModal,
    closeLiveModal
  }
}
