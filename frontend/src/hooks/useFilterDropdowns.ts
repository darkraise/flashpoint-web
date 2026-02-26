import { useState, useCallback, useMemo, useRef } from 'react';

export function useFilterDropdowns() {
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

  // Store current state in ref for stable callback
  const openDropdownsRef = useRef(openDropdowns);

  // Stable callback - reads from ref instead of closure
  const isOpen = useCallback((filterName: string) => {
    return openDropdownsRef.current[filterName] || false;
  }, []);

  const setOpen = useCallback((filterName: string, open: boolean) => {
    // Update ref synchronously before state update
    openDropdownsRef.current = { ...openDropdownsRef.current, [filterName]: open };
    setOpenDropdowns((prev) => ({
      ...prev,
      [filterName]: open,
    }));
  }, []);

  const closeAll = useCallback(() => {
    openDropdownsRef.current = {};
    setOpenDropdowns({});
  }, []);

  // Return stable object reference - callbacks are all stable now
  return useMemo(
    () => ({
      isOpen,
      setOpen,
      closeAll,
    }),
    [isOpen, setOpen, closeAll]
  );
}
