/**
 * Mounted hook
 * Returns true after component mounts (handles hydration mismatch)
 */

import { useEffect, useState } from 'react';

export function useMounted() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
}
