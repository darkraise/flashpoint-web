import { useEffect, useRef, EffectCallback } from 'react';

/**
 * Hook that runs an effect only once on component mount
 * Similar to componentDidMount in class components
 *
 * @param effect - The effect callback to run on mount
 *
 * @example
 * useMountEffect(() => {
 *   console.log('Component mounted');
 *   fetchInitialData();
 * });
 */
export function useMountEffect(effect: EffectCallback) {
  const isMountedRef = useRef(false);

  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return effect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Hook that returns whether this is the initial mount
 * Useful for conditional logic that differs between mount and updates
 *
 * @returns true on initial mount, false on subsequent renders
 *
 * @example
 * const isInitialMount = useIsInitialMount();
 *
 * useEffect(() => {
 *   if (isInitialMount) {
 *     // Do something only on mount
 *   } else {
 *     // Do something only on updates
 *   }
 * }, [dependency]);
 */
export function useIsInitialMount(): boolean {
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    isInitialMountRef.current = false;
  }, []);

  return isInitialMountRef.current;
}
