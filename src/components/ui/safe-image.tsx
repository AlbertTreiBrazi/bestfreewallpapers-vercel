import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: React.ReactNode;
  className?: string;
  aspectRatio?: string;
  showLoadingSpinner?: boolean;
}

export interface SafeImageRef {
  reload: () => void;
}

export const SafeImage = forwardRef<SafeImageRef, SafeImageProps>((
  { 
    src, 
    alt, 
    fallback, 
    className, 
    aspectRatio = 'aspect-video', 
    showLoadingSpinner = true, 
    loading = 'lazy',
    ...props 
  }, 
  ref
) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [currentSrc, setCurrentSrc] = useState(src);

  useImperativeHandle(ref, () => ({
    reload: () => {
      setImageState('loading');
      setCurrentSrc(src);
    }
  }));

  const handleLoad = () => {
    setImageState('loaded');
  };

  const handleError = () => {
    console.warn(`Failed to load image: ${currentSrc}`);
    setImageState('error');
  };

  const defaultFallback = (
    <div className={cn(
      'flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 text-gray-400 dark:text-gray-500',
      aspectRatio,
      className
    )}>
      <svg 
        className="w-12 h-12" 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path 
          fillRule="evenodd" 
          d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" 
          clipRule="evenodd" 
        />
      </svg>
    </div>
  );

  if (imageState === 'error') {
    return fallback || defaultFallback;
  }

  return (
    <div className={cn('relative', aspectRatio, className)}>
      {imageState === 'loading' && showLoadingSpinner && (
        <div className={cn(
          'absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800',
          aspectRatio
        )}>
          <div className="w-8 h-8 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      <img
        {...props}
        src={currentSrc}
        alt={alt}
        loading={loading}
        className={cn(
          'object-cover w-full h-full',
          imageState === 'loading' && showLoadingSpinner ? 'opacity-0' : 'opacity-100',
          'transition-opacity duration-300'
        )}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
});

SafeImage.displayName = 'SafeImage';