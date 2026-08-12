import { useCallback, useEffect, useRef, useState } from 'react';
import type { ImgHTMLAttributes, ReactEventHandler, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'placeholder'> {
  src: string;
  alt: string;
  /**
   * Shown until the image loads. `true` renders a pulse fill, `false` renders
   * nothing, and a node replaces the default. The built-in fill is absolutely
   * positioned, so the parent must establish a positioning context.
   */
  skeleton?: boolean | ReactNode;
  /** Replaces the image once it fails to load. Nothing renders when omitted. */
  fallback?: ReactNode;
}

/**
 * An image that stops downloading when it goes away.
 *
 * Removing an <img> from the DOM does not abort its request: the browser
 * finishes the download to fill its cache. Navigating away from a grid
 * therefore left every thumbnail in flight, occupying the six connections and
 * the server I/O the next page needed. Removing the src attribute runs the
 * spec's "update the image data" algorithm, which does abort it.
 */
export function LazyImage({
  src,
  alt,
  skeleton = true,
  fallback,
  className,
  onLoad,
  onError,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [renderedSrc, setRenderedSrc] = useState(src);
  const nodeRef = useRef<HTMLImageElement | null>(null);

  // Reset during render rather than in an effect: an effect would leave the
  // error fallback of the previous src on screen for a frame before the new
  // image mounts.
  if (renderedSrc !== src) {
    setRenderedSrc(src);
    setIsLoaded(false);
    setHasError(false);
  }

  // Never store the null React passes on detach: the abort below needs the
  // element after React has released it.
  const setNode = useCallback((node: HTMLImageElement | null) => {
    if (node) {
      nodeRef.current = node;
    }
  }, []);

  useEffect(() => {
    // A cached image can finish before React attaches the load handler, leaving
    // a permanently invisible image behind the skeleton.
    if (nodeRef.current?.complete) {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    return () => {
      const img = nodeRef.current;
      // React detaches the node in the commit's mutation phase, before this
      // cleanup runs, so a node that is still connected means StrictMode is
      // simulating a remount in development — clearing src there would blank an
      // image that is still on screen, and nothing would put it back.
      if (img && !img.isConnected) {
        img.removeAttribute('src');
      }
    };
  }, []);

  const handleLoad: ReactEventHandler<HTMLImageElement> = (event) => {
    setIsLoaded(true);
    onLoad?.(event);
  };

  const handleError: ReactEventHandler<HTMLImageElement> = (event) => {
    setHasError(true);
    onError?.(event);
  };

  if (hasError) {
    return <>{fallback ?? null}</>;
  }

  return (
    <>
      {!isLoaded && skeleton !== false ? (
        skeleton === true ? (
          <div className="absolute inset-0 bg-muted animate-pulse" aria-hidden="true" />
        ) : (
          skeleton
        )
      ) : null}
      <img
        ref={setNode}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        {...props}
      />
    </>
  );
}
