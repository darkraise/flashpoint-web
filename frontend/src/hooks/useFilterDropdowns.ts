import { useState, useCallback } from 'react';

export function useFilterDropdowns() {
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

  const isOpen = useCallback(
    (filterName: string) => {
      return openDropdowns[filterName] || false;
    },
    [openDropdowns]
  );

  const setOpen = useCallback((filterName: string, open: boolean) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [filterName]: open,
    }));
  }, []);

  const closeAll = useCallback(() => {
    setOpenDropdowns({});
  }, []);

  return {
    isOpen,
    setOpen,
    closeAll,
  };
}
