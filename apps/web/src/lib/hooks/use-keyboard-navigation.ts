'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface UseKeyboardNavigationOptions {
  itemCount: number;
  onActivate: (index: number) => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  enabled?: boolean;
}

export function useKeyboardNavigation({
  itemCount,
  onActivate,
  onArrowUp,
  onArrowDown,
  enabled = true,
}: UseKeyboardNavigationOptions) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (activeIndex < itemCount - 1) {
          setActiveIndex((prev: number) => prev + 1);
          onArrowDown?.();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (activeIndex > 0) {
          setActiveIndex((prev: number) => prev - 1);
          onArrowUp?.();
        }
        break;
      case 'Enter':
        e.preventDefault();
        onActivate(activeIndex);
        break;
      case 'Escape':
        e.preventDefault();
        setActiveIndex(0);
        break;
    }
  }, [activeIndex, enabled, itemCount, onActivate, onArrowUp, onArrowDown]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleContainerKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement === container || container.contains(document.activeElement)) {
        handleKeyDown(e);
      }
    };

    container.addEventListener('keydown', handleContainerKeyDown);

    return () => {
      container.removeEventListener('keydown', handleContainerKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    if (activeIndex > 0) {
      const element = containerRef.current?.querySelector(`[data-index="${activeIndex}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeIndex]);

  const resetSelection = useCallback(() => {
    setActiveIndex(0);
  }, []);

  return {
    activeIndex,
    setActiveIndex,
    resetSelection,
    containerRef,
  };
}
