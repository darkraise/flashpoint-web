import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'placeholder'> {
  src: string;
  alt: string;
  placeholder?: string;
  blurPlaceholder?: boolean;
  rootMargin?: string;
  threshold?: number;
  onLoad?: () => void;
  onError?: () => void;
  fallback?: React.ReactNode;
}

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

  useEffect(() => {
    onLoadRef.current = onLoad;
    onErrorRef.current = onError;
  }, [onLoad, onError]);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
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

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [rootMargin, threshold]);

  useEffect(() => {
    if (!isInView || !src) return;

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
      loading="lazy"
      decoding="async"
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
