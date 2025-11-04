import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import AccessibilityWrapper from '../common/AccessibilityWrapper';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  width?: number | string;
  height?: number | string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  sizes?: string;
  srcSet?: string;
  blurDataURL?: string;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  placeholder = '/images/placeholder.jpg',
  width,
  height,
  loading = 'lazy',
  priority = false,
  onLoad,
  onError,
  sizes,
  srcSet,
  blurDataURL
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const [shouldLoad, setShouldLoad] = useState(priority || loading === 'eager');

  // Intersection Observer for lazy loading
  const observerCallback = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting) {
      setIsInView(true);
      setShouldLoad(true);
    }
  }, []);

  useEffect(() => {
    if (priority || loading === 'eager') {
      setShouldLoad(true);
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(observerCallback, {
      rootMargin: '50px 0px', // Start loading when image is 50px away from viewport
      threshold: 0.1
    });

    const currentRef = imgRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [observerCallback, priority, loading]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setIsError(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsError(true);
    setIsLoaded(false);
    onError?.();
  }, [onError]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // Trigger any click handlers on the parent container
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      imgRef.current?.dispatchEvent(clickEvent);
    }
  };

  // Generate optimized sizes if not provided
  const optimizedSizes = sizes || `
    (max-width: 640px) 100vw,
    (max-width: 1024px) 50vw,
    33vw
  `.replace(/\s+/g, ' ').trim();

  const imageProps = {
    ref: imgRef,
    alt,
    width,
    height,
    sizes: optimizedSizes,
    srcSet,
    loading,
    onLoad: handleLoad,
    onError: handleError,
    onKeyDown: handleKeyDown,
    tabIndex: 0,
    role: 'img',
    'aria-label': alt,
    className: cn(
      'transition-all duration-300 ease-in-out',
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
      {
        'opacity-0': !isLoaded && !isError,
        'opacity-100': isLoaded,
        'filter blur-sm': !isLoaded && blurDataURL,
      },
      className
    )
  };

  return (
    <AccessibilityWrapper 
      className="relative overflow-hidden bg-gray-100 dark:bg-gray-800"
      role="img"
      ariaLabel={alt}
      tabIndex={0}
    >
      {/* Placeholder/Blur background */}
      {!isLoaded && (
        <div 
          className={cn(
            'absolute inset-0 bg-gray-200 dark:bg-gray-700',
            'animate-pulse',
            blurDataURL && 'bg-cover bg-center',
          )}
          style={blurDataURL ? {
            backgroundImage: `url(${blurDataURL})`,
            filter: 'blur(20px) brightness(0.8)',
          } : {}}
        />
      )}

      {/* Main image */}
      {shouldLoad && (
        <img
          {...imageProps}
          src={isError ? placeholder : src}
        />
      )}

      {/* Loading indicator */}
      {!isLoaded && !isError && shouldLoad && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Failed to load image</p>
          </div>
        </div>
      )}

      {/* SEO-friendly noscript fallback */}
      <noscript>
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={className}
          loading="eager"
        />
      </noscript>
    </AccessibilityWrapper>
  );
};

export default LazyImage;