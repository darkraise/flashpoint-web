import { useEffect, useRef, EffectCallback } from 'react';

/** Runs an effect only once on mount, surviving React StrictMode double-mount. */
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

/** Returns true on initial mount, false on subsequent renders. */
export function useIsInitialMount(): boolean {
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    isInitialMountRef.current = false;
  }, []);

  return isInitialMountRef.current;
}
