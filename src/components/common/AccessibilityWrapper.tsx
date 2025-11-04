import React, { useEffect, useRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AccessibilityWrapperProps {
  children: ReactNode;
  className?: string;
  role?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  tabIndex?: number;
  focusOnMount?: boolean;
  trapFocus?: boolean;
  onEscape?: () => void;
}

const AccessibilityWrapper: React.FC<AccessibilityWrapperProps> = ({
  children,
  className,
  role,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  tabIndex,
  focusOnMount = false,
  trapFocus = false,
  onEscape,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLElement | null>(null);
  const lastFocusableRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (focusOnMount && wrapperRef.current) {
      wrapperRef.current.focus();
    }
  }, [focusOnMount]);

  useEffect(() => {
    if (!trapFocus) return;

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // Get all focusable elements
    const focusableElements = wrapper.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    firstFocusableRef.current = focusableElements[0] as HTMLElement;
    lastFocusableRef.current = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusableRef.current) {
          lastFocusableRef.current?.focus();
          e.preventDefault();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusableRef.current) {
          firstFocusableRef.current?.focus();
          e.preventDefault();
        }
      }
    };

    wrapper.addEventListener('keydown', handleTabKey);
    return () => wrapper.removeEventListener('keydown', handleTabKey);
  }, [trapFocus]);

  useEffect(() => {
    if (!onEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscape();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onEscape]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enhanced keyboard navigation
    switch (e.key) {
      case 'Enter':
      case ' ':
        if (e.currentTarget === e.target && role === 'button') {
          e.preventDefault();
          (e.currentTarget as HTMLElement).click();
        }
        break;
      case 'ArrowDown':
      case 'ArrowUp':
      case 'ArrowLeft':
      case 'ArrowRight':
        // Allow arrow key navigation for grid/list items
        if (role === 'grid' || role === 'listbox' || role === 'menu') {
          e.preventDefault();
          handleArrowNavigation(e.key);
        }
        break;
    }
  };

  const handleArrowNavigation = (key: string) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const focusableElements = Array.from(
      wrapper.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];

    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    if (currentIndex === -1) return;

    let nextIndex: number;
    switch (key) {
      case 'ArrowDown':
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % focusableElements.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        nextIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
        break;
      default:
        return;
    }

    focusableElements[nextIndex]?.focus();
  };

  return (
    <div
      ref={wrapperRef}
      className={cn(
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'transition-all duration-200 ease-in-out',
        className
      )}
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      tabIndex={tabIndex}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
};

export default AccessibilityWrapper;