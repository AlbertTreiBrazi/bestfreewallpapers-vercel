import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { EnhancedWallpaperCardAdapter } from '@/components/wallpapers/EnhancedWallpaperCardAdapter'

import { useFavorites } from '@/hooks/useFavorites'
import { Heart, Loader2, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { AuthModal } from '@/components/auth/AuthModal'
import { handleAndLogError, serializeError } from '@/utils/errorFormatting'

export function FavoritesPage() {
  const { user, loading: authLoading } = useAuth()
  const { favorites: favoriteIds, loading: favoritesLoading } = useFavorites()
  const [favoriteWallpapers, setFavoriteWallpapers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)



  // Load favorite wallpapers when favorite IDs change
  useEffect(() => {
    async function loadFavoriteWallpapers() {
      if (!user) {
        setFavoriteWallpapers([])
        setLoading(false)
        return
      }

      if (favoriteIds.length === 0) {
        setFavoriteWallpapers([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        // Fetch wallpaper details for each favorite ID
        const { data: wallpapers, error: wallpapersError } = await supabase
          .from('wallpapers')
          .select(`
            id,
            title,
            slug,
            thumbnail_url,
            image_url,
            download_url,
            resolution_1080p,
            resolution_4k,
            resolution_8k,
            download_count,
            is_premium,
            width,
            height,
            device_type,
            created_at,
            tags
          `)
          .in('id', favoriteIds)
          .eq('is_published', true)
          .order('id', { ascending: false })

        if (wallpapersError) {
          throw wallpapersError
        }

        // Sort wallpapers by the order they appear in favoriteIds (most recent first)
        const sortedWallpapers = favoriteIds
          .map(id => wallpapers?.find(w => w.id === id))
          .filter(Boolean)

        setFavoriteWallpapers(sortedWallpapers)
      } catch (error: any) {
        console.error('Failed to load favorite wallpapers:', error)
        const errorMessage = handleAndLogError(error, 'favorite wallpapers fetch')
        setError(errorMessage)
        toast.error('Failed to load favorites')
      } finally {
        setLoading(false)
      }
    }

    // Only load when auth loading is done and we have user status
    if (!authLoading && !favoritesLoading) {
      loadFavoriteWallpapers()
    }
  }, [user, favoriteIds, authLoading, favoritesLoading])

  // Show auth modal for guest users
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Favorites</h1>
            <p className="text-gray-600 mb-6">Sign in to view and manage your favorite wallpapers</p>
            <div className="space-y-3">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Sign In to View Favorites
              </button>
              <div>
                <button
                  onClick={() => window.location.href = '/free-wallpapers'}
                  className="text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Browse Wallpapers
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Auth Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </div>
    )
  }

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading your favorites...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <Heart className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Favorites</h1>
            <p className="text-red-600 mb-6">{serializeError(error)}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center space-x-3">
            <Heart className="w-8 h-8 text-red-500 fill-current" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
              <p className="text-gray-600">
                {favoriteWallpapers.length} {favoriteWallpapers.length === 1 ? 'wallpaper' : 'wallpapers'} in your collection
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {favoriteWallpapers.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Heart className="w-16 h-16 text-gray-300" />
                <Star className="w-6 h-6 text-yellow-500 absolute -top-1 -right-1" />
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No favorites yet</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Start exploring our amazing wallpaper collection and add your favorites by clicking the heart icon on any wallpaper
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/free-wallpapers'}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium inline-block"
              >
                Browse Wallpapers
              </button>
              <div className="text-sm text-gray-500">
                <a href="/categories" className="hover:text-gray-700 transition-colors">
                  Or explore by category
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {favoriteWallpapers.map((wallpaper, index) => (
              <EnhancedWallpaperCardAdapter
                key={wallpaper.id}
                wallpaper={wallpaper}
                variant="compact"
              />
            ))}
          </div>
        )}
      </div>


    </div>
  )
}

export default FavoritesPage
