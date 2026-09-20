'use client';

import { Search } from 'lucide-react';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useEffect } from 'react';

interface SearchBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onReset: () => void;
  placeholder?: string;
  children?: React.ReactNode;
  /** Debounce delay in ms. Default 0 (no debounce). Set to e.g. 300 for debounced API search. */
  debounceMs?: number;
  /** Called with the debounced search value (only when debounceMs > 0). */
  onDebouncedSearch?: (value: string) => void;
}

export default function SearchBar({
  search,
  onSearchChange,
  onReset,
  placeholder = 'Cari...',
  children,
  debounceMs,
  onDebouncedSearch,
}: SearchBarProps) {
  const debouncedSearch = useDebounce(search, debounceMs ?? 0);

  useEffect(() => {
    if (debounceMs && debounceMs > 0 && onDebouncedSearch) {
      onDebouncedSearch(debouncedSearch);
    }
  }, [debouncedSearch, debounceMs, onDebouncedSearch]);
  return (
    <div className="bg-surface rounded-lg border border-border p-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-9 pr-3 py-2 border border-border rounded-md text-sm bg-surface text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {children}
        <button
          onClick={onReset}
          aria-label="Reset pencarian"
          className="px-3 py-2 border border-border rounded-md text-sm text-muted hover:bg-surface-variant transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
