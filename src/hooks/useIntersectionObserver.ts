// Intersection Observer hook for lazy loading and viewport detection
import { useEffect, useState, RefObject } from 'react';

interface UseIntersectionObserverOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  skip?: boolean;
}

export function useIntersectionObserver(
  elementRef: RefObject<Element>,
  options: UseIntersectionObserverOptions = {}
): boolean {
  const {
    root = null,
    rootMargin = '0px',
    threshold = 0.1,
    skip = false
  } = options;
  
  const [isIntersecting, setIsIntersecting] = useState(false);
  
  useEffect(() => {
    if (skip || !elementRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        root,
        rootMargin,
        threshold
      }
    );
    
    const element = elementRef.current;
    observer.observe(element);
    
    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, root, rootMargin, threshold, skip]);
  
  return isIntersecting;
}
