'use client';

import { useCallback, useEffect, useState } from 'react';

export interface SavedView {
  id: string;
  name: string;
  filters: Record<string, string>;
  sort?: { key: string; direction: 'asc' | 'desc' };
  createdAt: number;
}

interface SavedViewsProps {
  storageKey?: string;
  onApply: (view: SavedView) => void;
  onReset?: () => void;
}

export default function SavedViews({ storageKey = 'membersSavedViews', onApply, onReset }: SavedViewsProps) {
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [viewName, setViewName] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setSavedViews(JSON.parse(saved));
      } catch {
        // Ignore errors
      }
    }
  }, [storageKey]);

  const saveView = useCallback(() => {
    if (!viewName.trim()) return;

    const newView: SavedView = {
      id: crypto.randomUUID(),
      name: viewName.trim(),
      filters: {}, // TODO: Capture current filters
      createdAt: Date.now(),
    };

    const updated = [...savedViews, newView];
    setSavedViews(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setViewName('');
    setIsCreating(false);
  }, [savedViews, storageKey, viewName]);

  const deleteView = useCallback((id: string) => {
    const updated = savedViews.filter(v => v.id !== id);
    setSavedViews(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  }, [savedViews, storageKey]);

  const applyView = useCallback((view: SavedView) => {
    onApply(view);
    setIsOpen(false);
  }, [onApply]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 hover:bg-surface-variant rounded-lg transition-colors"
        title="Saved views"
        aria-label="Saved views"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-muted"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 bg-surface border border-border rounded-xl shadow-elegant-lg z-50 min-w-[250px] max-h-[300px] overflow-y-auto"
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        >
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted">Saved Views</p>
              <button
                onClick={() => setIsCreating(true)}
                className="text-2xs text-primary hover:underline"
              >
                + New
              </button>
            </div>

            {isCreating ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  placeholder="View name..."
                  className="w-full px-2 py-1 text-xs border border-border rounded-md"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveView}
                    className="flex-1 px-2 py-1 text-xs bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setViewName('');
                    }}
                    className="flex-1 px-2 py-1 text-xs bg-surface-variant text-muted rounded-md"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : savedViews.length === 0 ? (
              <p className="text-xs text-muted text-center py-4">No saved views</p>
            ) : (
              <div className="space-y-1.5">
                {savedViews.map(view => (
                  <div key={view.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-surface-variant rounded-md group">
                    <button
                      onClick={() => applyView(view)}
                      className="flex-1 text-left text-xs text-text hover:underline"
                    >
                      {view.name}
                    </button>
                    <button
                      onClick={() => deleteView(view.id)}
                      className="p-0.5 hover:bg-surface rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete view"
                      aria-label="Delete view"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
