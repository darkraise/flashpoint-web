import { useEffect, useRef, RefObject } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  minSwipeDistance?: number;
  maxSwipeTime?: number;
}

/**
 * Custom hook for detecting swipe gestures on touch devices
 * @param options Configuration options for swipe detection
 * @returns Ref to attach to the element that should detect swipes
 */
export function useSwipeGesture<T extends HTMLElement>(options: SwipeGestureOptions): RefObject<T> {
  const { onSwipeLeft, onSwipeRight, minSwipeDistance = 50, maxSwipeTime = 300 } = options;

  const elementRef = useRef<T>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const onSwipeLeftRef = useRef(onSwipeLeft);
  const onSwipeRightRef = useRef(onSwipeRight);
  onSwipeLeftRef.current = onSwipeLeft;
  onSwipeRightRef.current = onSwipeRight;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      touchStartTime.current = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const touchEndX = touch.clientX;
      const touchEndY = touch.clientY;
      const touchEndTime = Date.now();

      const deltaX = touchEndX - touchStartX.current;
      const deltaY = touchEndY - touchStartY.current;
      const deltaTime = touchEndTime - touchStartTime.current;

      // Check if this is a horizontal swipe (more horizontal than vertical)
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Check if swipe was fast enough and long enough
        if (Math.abs(deltaX) >= minSwipeDistance && deltaTime <= maxSwipeTime) {
          if (deltaX > 0 && onSwipeRightRef.current) {
            onSwipeRightRef.current();
          } else if (deltaX < 0 && onSwipeLeftRef.current) {
            onSwipeLeftRef.current();
          }
        }
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [minSwipeDistance, maxSwipeTime]);

  return elementRef;
}
