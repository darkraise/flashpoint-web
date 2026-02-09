import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'placeholder'> {
  src: string;
  alt: string;
  /** Placeholder image (data URI or small image) */
  placeholder?: string;
  /** Show blur effect while loading */
  blurPlaceholder?: boolean;
  /** IntersectionObserver root margin */
  rootMargin?: string;
  /** Threshold for visibility (0-1) */
  threshold?: number;
  /** Callback when image loads */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
  /** Custom fallback element */
  fallback?: React.ReactNode;
}

/**
 * Lazy-loading image component with IntersectionObserver
 *
 * Features:
 * - Loads images only when visible (or near viewport)
 * - Blur-up placeholder effect
 * - Error handling with fallback
 * - Native lazy loading as fallback
 * - Optimized for performance
 *
 * @example
 * <LazyImage
 *   src="/path/to/image.jpg"
 *   alt="Description"
 *   blurPlaceholder
 *   className="w-full h-auto"
 * />
 */
export function LazyImage({
  src,
  alt,
  placeholder,
  blurPlaceholder = false,
  rootMargin = '50px',
  threshold = 0.01,
  onLoad,
  onError,
  fallback,
  className,
  ...props
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string | undefined>(placeholder);
  const [imageError, setImageError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);

  // Keep callback refs up to date
  useEffect(() => {
    onLoadRef.current = onLoad;
    onErrorRef.current = onError;
  }, [onLoad, onError]);

  useEffect(() => {
    // Check if IntersectionObserver is supported
    if (!('IntersectionObserver' in window)) {
      // Fallback: load image immediately
      setIsInView(true);
      return;
    }

    // Create observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            // Stop observing once image is in view
            if (observerRef.current && imgRef.current) {
              observerRef.current.unobserve(imgRef.current);
            }
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    // Start observing
    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [rootMargin, threshold]);

  useEffect(() => {
    if (!isInView || !src) return;

    // Image is in view, start loading
    const img = new Image();
    let cancelled = false;

    img.onload = () => {
      if (!cancelled) {
        setImageSrc(src);
        setIsLoaded(true);
        setImageError(false);
        onLoadRef.current?.();
      }
    };

    img.onerror = () => {
      if (!cancelled) {
        setImageError(true);
        onErrorRef.current?.();
      }
    };

    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [isInView, src]);

  // Error state
  if (imageError && fallback) {
    return <>{fallback}</>;
  }

  if (imageError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted text-muted-foreground text-sm',
          className
        )}
        role="img"
        aria-label={alt}
      >
        <span className="px-4 py-2">Image not available</span>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      loading="lazy" // Native lazy loading as additional optimization
      decoding="async" // Async decode for better performance
      className={cn(
        'transition-opacity duration-300',
        {
          'opacity-0': !isLoaded && blurPlaceholder,
          'opacity-100': isLoaded || !blurPlaceholder,
          'blur-sm': !isLoaded && blurPlaceholder && placeholder,
          'blur-none': isLoaded || !blurPlaceholder,
        },
        className
      )}
      {...props}
    />
  );
}

/**
 * Lazy background image component
 * Applies image as CSS background when in viewport
 */
export function LazyBackgroundImage({
  src,
  children,
  className,
  rootMargin = '50px',
  threshold = 0.01,
  onLoad,
  onError,
}: {
  src: string;
  children?: React.ReactNode;
  className?: string;
  rootMargin?: string;
  threshold?: number;
  onLoad?: () => void;
  onError?: () => void;
}) {
  const [bgImage, setBgImage] = useState<string>('');
  const [isInView, setIsInView] = useState(false);
  const divRef = useRef<HTMLDivElement>(null);
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);

  // Keep callback refs up to date
  useEffect(() => {
    onLoadRef.current = onLoad;
    onErrorRef.current = onError;
  }, [onLoad, onError]);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            if (divRef.current) {
              observer.unobserve(divRef.current);
            }
          }
        });
      },
      { rootMargin, threshold }
    );

    if (divRef.current) {
      observer.observe(divRef.current);
    }

    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  useEffect(() => {
    if (!isInView) return;

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) {
        setBgImage(src);
        onLoadRef.current?.();
      }
    };
    img.onerror = () => {
      if (!cancelled) {
        onErrorRef.current?.();
      }
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [isInView, src]);

  return (
    <div
      ref={divRef}
      className={cn('bg-cover bg-center', className)}
      style={{ backgroundImage: bgImage ? `url(${bgImage})` : undefined }}
    >
      {children}
    </div>
  );
}
