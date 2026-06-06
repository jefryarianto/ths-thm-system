'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook that debounces a value by the specified delay.
 * Returns the debounced value that updates after the delay has passed
 * since the last change to the input value.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
