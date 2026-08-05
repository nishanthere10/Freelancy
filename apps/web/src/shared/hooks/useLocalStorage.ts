/**
 * Local storage hook
 * Syncs state with localStorage
 * Safe for SSR/hydration
 */

import { useEffect, useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  // Read from localStorage on mount (client-side only)
  useEffect(() => {
    try {
      // Check if window is defined (SSR safety)
      if (typeof window === 'undefined') {
        setIsLoaded(true);
        return;
      }

      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item) as T);
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    }
    setIsLoaded(true);
  }, [key]);

  // Write to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Check if window is defined (SSR safety)
      if (typeof window === 'undefined') {
        return;
      }

      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue, isLoaded] as const;
}
