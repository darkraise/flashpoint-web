import { useEffect, useRef, useState } from 'react';

interface UseLazyLoadOptions {
  /** IntersectionObserver root margin (default: "50px") */
  rootMargin?: string;
  /** Visibility threshold 0-1 (default: 0.01) */
  threshold?: number;
  /** Callback when element enters viewport */
  onIntersect?: () => void;
}

/**
 * Hook for lazy loading with IntersectionObserver
 *
 * @example
 * const { ref, isInView } = useLazyLoad();
 * return <div ref={ref}>{isInView && <HeavyComponent />}</div>;
 */
export function useLazyLoad<T extends HTMLElement = HTMLDivElement>(
  options: UseLazyLoadOptions = {}
) {
  const { rootMargin = '50px', threshold = 0.01, onIntersect } = options;

  const [isInView, setIsInView] = useState(false);
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Fallback for browsers without IntersectionObserver
    if (!('IntersectionObserver' in window)) {
      setIsInView(true);
      onIntersect?.();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isInView) {
            setIsInView(true);
            onIntersect?.();
            // Stop observing after first intersection
            observer.unobserve(element);
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold, onIntersect]);

  return { ref, isInView };
}

/**
 * Hook for lazy loading images
 * Returns a ref to attach to img element and loading state
 *
 * @example
 * const { ref, isLoaded, hasError } = useLazyImage();
 * return <img ref={ref} src="/image.jpg" alt="..." />;
 */
export function useLazyImage<T extends HTMLImageElement = HTMLImageElement>(
  options: UseLazyLoadOptions = {}
) {
  const { ref, isInView } = useLazyLoad<T>(options);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const img = ref.current;
    if (!img || !isInView) return;

    const handleLoad = () => setIsLoaded(true);
    const handleError = () => setHasError(true);

    // If image is already loaded (cached)
    if (img.complete) {
      setIsLoaded(true);
      return;
    }

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [isInView]);

  return { ref, isInView, isLoaded, hasError };
}
