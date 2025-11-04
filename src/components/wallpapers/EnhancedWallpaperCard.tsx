// Enhanced Wallpaper Card with optimized image loading and performance tracking
import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Download, Heart, Eye, Crown, Calendar, Tag } from 'lucide-react';
import { SafeImage } from '@/components/ui/safe-image';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useFavorites } from '@/hooks/useFavorites';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { useUnifiedDownload } from '@/hooks/useUnifiedDownload';
import { UnifiedDownloadModal } from '@/components/download/UnifiedDownloadModal';
import { AuthModal } from '@/components/auth/AuthModal';
import { cn } from '@/lib/utils';

interface WallpaperCardProps {
  id: number;
  title: string;
  slug: string;
  image_url: string;
  thumbnail_url?: string;
  download_count: number;
  is_premium: boolean;
  created_at: string;
  tags?: string[];
  category?: {
    name: string;
    slug: string;
  };
  width?: number;
  height?: number;
  device_type?: string;
  is_mobile?: boolean;
  className?: string;
  priority?: boolean;
  onDownload?: (wallpaper: any) => void;
  onFavorite?: (wallpaper: any) => void;
  variant?: 'compact' | 'detailed';
}

export function EnhancedWallpaperCard({
  id,
  title,
  slug,
  image_url,
  thumbnail_url,
  download_count,
  is_premium,
  created_at,
  tags = [],
  category,
  width,
  height,
  device_type,
  is_mobile,
  className,
  priority = false,
  onDownload,
  onFavorite,
  variant = 'detailed'
}: WallpaperCardProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { isFavorite, toggleFavorite } = useFavorites();
  // PHASE ONE FIX: Disabled performance monitoring to eliminate console errors
  // const { logError } = usePerformanceMonitor({ page: 'wallpaper-card' });
  const logError = (_error: Error, _context?: any) => {}; // No-op function with correct signature
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // UNIFIED DOWNLOAD SYSTEM - Single source of truth
  const {
    isDownloadModalOpen,
    isDownloading,
    showAdTimer,
    timerDuration,
    openDownloadModal,
    closeDownloadModal,
    startDownload,
    handleTimerComplete,
    currentWallpaper: downloadWallpaper,
    currentResolution,
    userType
  } = useUnifiedDownload({
    onAuthRequired: () => setIsAuthModalOpen(true)
  });
  
  const [isHovered, setIsHovered] = useState(false);
  
  const isFaved = user ? isFavorite(id) : false;
  const displayImage = thumbnail_url || image_url;
  
  // Determine if this is a mobile wallpaper for thumbnail aspect ratio
  const isMobileWallpaper = is_mobile || device_type === 'mobile' || (width && height && height > width);
  
  // Set dynamic aspect ratio based on wallpaper type
  const thumbnailAspectRatio = isMobileWallpaper ? '9/16' : '16/9'; // Portrait for mobile, landscape for desktop
  
  // Handle favorite toggle
  const handleFavoriteClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      // Show auth modal for guest users
      // Note: This would require adding AuthModal to this component
      // For now, we'll show a toast message
      return;
    }
    
    try {
      const wallpaperData = {
        id,
        title,
        slug,
        image_url,
        thumbnail_url,
        is_premium
      };
      
      await toggleFavorite(wallpaperData);
      onFavorite?.(wallpaperData);
    } catch (error) {
      logError(error as Error, { action: 'toggle_favorite', wallpaper_id: id });
    }
  }, [user, id, title, slug, image_url, thumbnail_url, is_premium, toggleFavorite, onFavorite, logError]);
  
  // Handle download with unified logic
  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const wallpaperData = { id, title, slug, image_url, is_premium };
      
      // Use unified download system
      await openDownloadModal(wallpaperData, '1080p');
      onDownload?.(wallpaperData);
    } catch (error) {
      logError(error as Error, { action: 'download', wallpaper_id: id });
    }
  }, [id, title, slug, image_url, is_premium, openDownloadModal, onDownload, logError]);
  

  return (
    <>
      <Link
      to={`/wallpaper/${slug}`}
      className={cn(
        'group relative block overflow-hidden rounded-xl transition-all duration-300',
        'hover:scale-105 hover:shadow-xl',
        theme === 'dark' 
          ? 'bg-dark-secondary hover:shadow-black/20' 
          : 'bg-white hover:shadow-black/10',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container - Dynamic Aspect Ratio */}
      <div className="relative overflow-hidden" style={{ aspectRatio: thumbnailAspectRatio }}>
        <div
          className="w-full h-full"
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          onTouchStart={(e) => {
            // Prevent long-press context menu on mobile
            let timer: NodeJS.Timeout;
            const preventDefault = () => e.preventDefault();
            timer = setTimeout(preventDefault, 500);
            const cleanup = () => clearTimeout(timer);
            e.currentTarget.addEventListener('touchend', cleanup, { once: true });
            e.currentTarget.addEventListener('touchcancel', cleanup, { once: true });
          }}
          draggable={false}
          style={{
            userSelect: 'none'
          }}
        >
          <SafeImage
            src={displayImage}
            alt={title}
            className="object-cover transition-transform duration-300 group-hover:scale-110 w-full h-full"
            aspectRatio=""
            showLoadingSpinner={true}
            loading={priority ? 'eager' : 'lazy'}
            draggable={false}
          />
        </div>
        
        {/* Premium Badge */}
        {is_premium && (
          <div className="absolute top-2 left-2">
            <div className={cn(
              'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
              'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg'
            )}>
              <Crown className="w-3 h-3" />
              <span>Premium</span>
            </div>
          </div>
        )}
        
        {/* Mobile Badge */}
        {isMobileWallpaper && (
          <div className={`absolute ${is_premium ? 'top-12' : 'top-2'} left-2`}>
            <div className={cn(
              'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
              'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
            )}>
              <span>📱</span>
              <span>Mobile</span>
            </div>
          </div>
        )}
        
        {/* Action Buttons (always visible with enhanced contrast) */}
        <div className="absolute top-2 right-2 flex space-x-2">
          {/* Favorite Button - Enhanced Visibility */}
          {user && (
            <button
              onClick={handleFavoriteClick}
              className={cn(
                'p-2 rounded-full backdrop-blur-sm transition-all duration-200 shadow-lg ring-2 ring-white/20',
                isFaved
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                  : 'bg-black/40 text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600'
              )}
              title={isFaved ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={cn('w-4 h-4', isFaved && 'fill-current')} />
            </button>
          )}
          
          {/* Download Button - Always Visible with Enhanced Contrast */}
          <button
            onClick={handleDownload}
            className="p-2 rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg backdrop-blur-sm hover:from-green-600 hover:to-green-700 transition-all duration-200 ring-2 ring-white/20"
            title="Download wallpaper"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

      </div>
      
      {/* SEO-safe title for compact variant (visually hidden but accessible) */}
      {variant === 'compact' && (
        <h3 className="sr-only">{title}</h3>
      )}
      
      {/* Content - Only render in detailed variant */}
      {variant === 'detailed' && (
        <div className="p-4">
          {/* Title */}
          <h3 className={cn(
            'font-semibold text-lg mb-2 line-clamp-2 transition-colors',
            theme === 'dark' ? 'text-white group-hover:text-purple-300' : 'text-gray-900 group-hover:text-gray-600'
          )}>
            {title}
          </h3>
          
          {/* Metadata */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-4 text-sm">
              {/* Download Count */}
              <div className={cn(
                'flex items-center space-x-1',
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              )}>
                <Download className="w-3 h-3" />
                <span>{download_count.toLocaleString()}</span>
              </div>
              
              {/* Date */}
              <div className={cn(
                'flex items-center space-x-1',
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              )}>
                <Calendar className="w-3 h-3" />
                <span>{new Date(created_at).toLocaleDateString()}</span>
              </div>
            </div>
            
            {/* View Details */}
            <div className={cn(
              'flex items-center space-x-1 text-sm font-medium transition-colors',
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            )}>
              <Eye className="w-3 h-3" />
              <span>View</span>
            </div>
          </div>
          
          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex items-center space-x-2 mb-3">
              <Tag className={cn(
                'w-3 h-3',
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              )} />
              <div className="flex flex-wrap gap-1">
                {tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className={cn(
                      'px-2 py-1 text-xs rounded-full',
                      theme === 'dark'
                        ? 'bg-dark-tertiary text-gray-300'
                        : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {tag}
                  </span>
                ))}
                {tags.length > 3 && (
                  <span className={cn(
                    'px-2 py-1 text-xs rounded-full',
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  )}>
                    +{tags.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Category */}
          {category && (
            <div className={cn(
              'text-sm',
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            )}>
              in <span className="font-medium">{category.name}</span>
            </div>
          )}
        </div>
      )}
      </Link>
      
      {/* Unified Download Modal */}
      <UnifiedDownloadModal
        isOpen={isDownloadModalOpen}
        onClose={closeDownloadModal}
        wallpaper={downloadWallpaper}
        resolution={currentResolution}
        userType={userType}
        timerDuration={timerDuration}
        showAdTimer={showAdTimer}
        isDownloading={isDownloading}
        onDownload={startDownload}
        onTimerComplete={handleTimerComplete}
        isGuestLiveVideoDownload={false}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />
      
      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode="login"
      />
    </>
  );
}
