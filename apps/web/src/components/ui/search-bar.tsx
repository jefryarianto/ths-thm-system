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

export default function SearchBar({ search, onSearchChange, onReset, placeholder = 'Cari...', children, debounceMs, onDebouncedSearch }: SearchBarProps) {
  const debouncedSearch = useDebounce(search, debounceMs ?? 0);

  useEffect(() => {
    if (debounceMs && debounceMs > 0 && onDebouncedSearch) {
      onDebouncedSearch(debouncedSearch);
    }
  }, [debouncedSearch, debounceMs, onDebouncedSearch]);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {children}
        <button
          onClick={onReset}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
