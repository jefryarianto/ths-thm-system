'use client';

import { useCallback, useEffect, useState } from 'react';
import { Columns } from 'lucide-react';

interface ColumnVisibilityProps {
  columns: Array<{ key: string; label: string }>;
  storageKey?: string;
  visibleColumns?: string[];
  onVisibleColumnsChange?: (visible: string[]) => void;
}

export default function ColumnVisibility({
  columns,
  storageKey = 'membersTableColumns',
  visibleColumns,
  onVisibleColumnsChange,
}: ColumnVisibilityProps) {
  const [isOpen, setIsOpen] = useState(false);

  const [visibleColumnsFromStorage, setVisibleColumnsFromStorage] = useState<string[]>(() => {
    if (typeof window === 'undefined') return columns.map(c => c.key);
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return columns.map(c => c.key);
      }
    }
    return columns.map(c => c.key);
  });

  const displayColumns = visibleColumns ?? visibleColumnsFromStorage;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved && !visibleColumns) {
      try {
        setVisibleColumnsFromStorage(JSON.parse(saved));
      } catch {
        // Ignore errors
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const handleToggle = useCallback((key: string) => {
    const exists = displayColumns.includes(key);
    const newVisible = exists 
      ? displayColumns.filter(k => k !== key) 
      : [...displayColumns, key];
    localStorage.setItem(storageKey, JSON.stringify(newVisible));
    onVisibleColumnsChange?.(newVisible);
  }, [displayColumns, storageKey, onVisibleColumnsChange]);

  const handleReset = useCallback(() => {
    const defaultKeys = columns.map(c => c.key);
    localStorage.setItem(storageKey, JSON.stringify(defaultKeys));
    setVisibleColumnsFromStorage(defaultKeys);
    onVisibleColumnsChange?.(defaultKeys);
  }, [columns, storageKey, onVisibleColumnsChange]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 hover:bg-surface-variant rounded-lg transition-colors"
        title="Toggle kolom"
        aria-label="Toggle kolom"
      >
        <Columns size={16} className="text-muted" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 bg-surface border border-border rounded-xl shadow-elegant-lg z-50 min-w-[180px]"
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        >
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted">Kolom</p>
              <button
                onClick={handleReset}
                className="text-2xs text-primary hover:underline"
              >
                Reset
              </button>
            </div>
            <div className="space-y-2">
              {columns.filter(c => c.key).map(col => (
                <label
                  key={col.key}
                  className="flex items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={displayColumns.includes(col.key)}
                    onChange={() => handleToggle(col.key)}
                    className="w-4 h-4 accent-primary rounded"
                  />
                  <span className="text-sm text-text">{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
