import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface FavoriteWallpaper {
  id: number;
  title: string;
  slug: string;
  image_url: string;
  thumbnail_url?: string;
  is_premium: boolean;
}

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  // Load user favorites using edge function
  const loadFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      return;
    }

    setLoading(true);
    try {
      // Get user's favorites directly from database for better performance
      const { data, error } = await supabase
        .from('favorites')
        .select('wallpaper_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading favorites:', error);
        toast.error('Failed to load favorites');
        return;
      }

      const favoriteIds = data?.map(item => item.wallpaper_id) || [];
      setFavorites(favoriteIds);
    } catch (error) {
      console.error('Error loading favorites:', error);
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load favorites when user changes
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // Check if wallpaper is favorite
  const isFavorite = useCallback((wallpaperId: number) => {
    return favorites.includes(wallpaperId);
  }, [favorites]);

  // Add to favorites using edge function
  const addFavorite = useCallback(async (wallpaper: FavoriteWallpaper) => {
    if (!user) {
      toast.error('Please sign in to add favorites');
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('manage-favorites', {
        body: {
          action: 'add',
          wallpaper_id: wallpaper.id
        }
      });

      if (error) {
        console.error('Error adding to favorites:', error);
        toast.error('Failed to add to favorites');
        return false;
      }

      // Update local state immediately for better UX
      setFavorites(prev => {
        if (!prev.includes(wallpaper.id)) {
          return [...prev, wallpaper.id];
        }
        return prev;
      });
      
      toast.success('Added to favorites!');
      return true;
    } catch (error) {
      console.error('Error adding to favorites:', error);
      toast.error('Failed to add to favorites');
      return false;
    }
  }, [user]);

  // Remove from favorites using edge function
  const removeFavorite = useCallback(async (wallpaperId: number) => {
    if (!user) {
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('manage-favorites', {
        body: {
          action: 'remove',
          wallpaper_id: wallpaperId
        }
      });

      if (error) {
        console.error('Error removing from favorites:', error);
        toast.error('Failed to remove from favorites');
        return false;
      }

      // Update local state immediately for better UX
      setFavorites(prev => prev.filter(id => id !== wallpaperId));
      toast.success('Removed from favorites');
      return true;
    } catch (error) {
      console.error('Error removing from favorites:', error);
      toast.error('Failed to remove from favorites');
      return false;
    }
  }, [user]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (wallpaper: FavoriteWallpaper) => {
    if (!user) {
      toast.error('Please sign in to manage favorites');
      return false;
    }

    const isCurrentlyFavorite = isFavorite(wallpaper.id);
    
    if (isCurrentlyFavorite) {
      return await removeFavorite(wallpaper.id);
    } else {
      return await addFavorite(wallpaper);
    }
  }, [user, isFavorite, addFavorite, removeFavorite]);

  return {
    favorites,
    loading,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    loadFavorites
  };
}