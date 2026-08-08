/**
 * Mounted hook
 * Returns true after component mounts (handles hydration mismatch)
 */

import { useEffect, useState } from 'react';

export function useMounted() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  return isMounted;
}
