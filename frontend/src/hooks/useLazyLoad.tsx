import { useEffect, useRef, useState } from 'react';

interface UseLazyLoadOptions {
  rootMargin?: string;
  threshold?: number;
  onIntersect?: () => void;
}

/** @example const { ref, isInView } = useLazyLoad(); */
export function useLazyLoad<T extends HTMLElement = HTMLDivElement>(
  options: UseLazyLoadOptions = {}
) {
  const { rootMargin = '50px', threshold = 0.01, onIntersect } = options;

  const [isInView, setIsInView] = useState(false);
  const ref = useRef<T>(null);
  const onIntersectRef = useRef(onIntersect);
  onIntersectRef.current = onIntersect;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Fallback for browsers without IntersectionObserver
    if (!('IntersectionObserver' in window)) {
      setIsInView(true);
      onIntersectRef.current?.();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            onIntersectRef.current?.();
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
  }, [rootMargin, threshold]);

  return { ref, isInView };
}

/** @example const { ref, isLoaded, hasError } = useLazyImage(); */
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
