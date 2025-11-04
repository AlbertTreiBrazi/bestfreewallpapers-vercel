// Adapter component to maintain backward compatibility for EnhancedWallpaperCard
import React from 'react';
import { EnhancedWallpaperCard } from './EnhancedWallpaperCard';

interface WallpaperData {
  id: number;
  title: string;
  slug?: string;
  thumbnail_url?: string | null;
  image_url: string;
  download_url?: string;
  resolution_1080p?: string | null;
  resolution_4k?: string | null;
  resolution_8k?: string | null;
  download_count: number;
  is_premium: boolean;
  width?: number;
  height?: number;
  device_type?: string;
  is_mobile?: boolean;
  created_at?: string;
  tags?: string[];
  category?: {
    name: string;
    slug: string;
  };
}

interface EnhancedWallpaperCardAdapterProps {
  wallpaper: WallpaperData;
  onImageClick?: () => void;
  className?: string;
  priority?: boolean;
  onDownload?: (wallpaper: WallpaperData) => void;
  onFavorite?: (wallpaper: WallpaperData) => void;
  variant?: 'compact' | 'detailed';
}

export function EnhancedWallpaperCardAdapter({ 
  wallpaper, 
  onImageClick,
  className,
  priority = false,
  onDownload,
  onFavorite,
  variant = 'detailed'
}: EnhancedWallpaperCardAdapterProps) {
  // Generate slug if not provided - with null safety
  const slug = wallpaper.slug || (wallpaper.title || 'untitled').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  // Handle the image click by wrapping it in a div since EnhancedWallpaperCard is a Link
  if (onImageClick) {
    return (
      <div onClick={onImageClick} className="cursor-pointer">
        <EnhancedWallpaperCard
          id={wallpaper.id}
          title={wallpaper.title}
          slug={slug}
          image_url={wallpaper.image_url}
          thumbnail_url={wallpaper.thumbnail_url || undefined}
          download_count={wallpaper.download_count}
          is_premium={wallpaper.is_premium}
          created_at={wallpaper.created_at || new Date().toISOString()}
          tags={wallpaper.tags || []}
          category={wallpaper.category}
          width={wallpaper.width}
          height={wallpaper.height}
          device_type={wallpaper.device_type}
          is_mobile={wallpaper.is_mobile}
          className={className}
          priority={priority}
          onDownload={onDownload ? () => onDownload(wallpaper) : undefined}
          onFavorite={onFavorite ? () => onFavorite(wallpaper) : undefined}
          variant={variant}
        />
      </div>
    );
  }

  return (
    <EnhancedWallpaperCard
      id={wallpaper.id}
      title={wallpaper.title}
      slug={slug}
      image_url={wallpaper.image_url}
      thumbnail_url={wallpaper.thumbnail_url || undefined}
      download_count={wallpaper.download_count}
      is_premium={wallpaper.is_premium}
      created_at={wallpaper.created_at || new Date().toISOString()}
      tags={wallpaper.tags || []}
      category={wallpaper.category}
      width={wallpaper.width}
      height={wallpaper.height}
      device_type={wallpaper.device_type}
      is_mobile={wallpaper.is_mobile}
      className={className}
      priority={priority}
      onDownload={onDownload ? () => onDownload(wallpaper) : undefined}
      onFavorite={onFavorite ? () => onFavorite(wallpaper) : undefined}
      variant={variant}
    />
  );
}