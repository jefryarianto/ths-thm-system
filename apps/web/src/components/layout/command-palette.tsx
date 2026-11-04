'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { Search, Command as CommandIcon, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MenuGroup, MenuItem } from './navigation';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: MenuGroup[];
}

interface FlattenedItem extends MenuItem {
  groupLabel: string;
}

export function CommandPalette({ open, onOpenChange, groups }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);

  const items = React.useMemo(() => {
    const all: FlattenedItem[] = [];
    groups.forEach((group) => {
      group.items.forEach((item) => {
        all.push({ ...item, groupLabel: group.label });
      });
    });
    return all;
  }, [groups]);

  const filteredItems = React.useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.groupLabel.toLowerCase().includes(q)
    );
  }, [items, query]);

  // Reset selection on query change
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = React.useCallback(
    (item: FlattenedItem) => {
      onOpenChange(false);
      if (item.external) {
        window.open(item.href, '_blank', 'noopener,noreferrer');
      } else {
        router.push(item.href);
      }
    },
    [onOpenChange, router]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredItems[selectedIndex];
      if (selected) handleSelect(selected);
    }
  };

  // Scroll into view when selectedIndex changes
  React.useEffect(() => {
    const selectedElement = listRef.current?.children[selectedIndex] as HTMLElement;
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content
          className="fixed top-[20vh] left-1/2 -translate-x-1/2 z-[101] w-full max-w-lg bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-scale-in outline-none"
          onKeyDown={handleKeyDown}
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface-variant/30">
            <Search className="w-5 h-5 text-surface-400 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari halaman atau menu..."
              className="flex-1 bg-transparent border-none outline-none text-text placeholder:text-surface-400 text-[15px]"
            />
            <div className="hidden sm:flex items-center gap-1.5 px-1.5 py-0.5 rounded border border-border bg-surface-variant text-[10px] font-bold text-surface-500 uppercase tracking-widest">
              <span>ESC</span>
            </div>
          </div>

          <div
            ref={listRef}
            className="max-h-[320px] overflow-y-auto overflow-x-hidden p-2"
            role="listbox"
          >
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center">
                <Search className="w-8 h-8 text-surface-300 mx-auto mb-3 opacity-20" />
                <p className="text-sm text-surface-500 font-medium">Tidak ada hasil ditemukan.</p>
              </div>
            ) : (
              filteredItems.map((item, index) => {
                const Icon = item.icon;
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={item.href}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-75 group',
                      isSelected
                        ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                        : 'text-surface-600 hover:bg-surface-variant/50'
                    )}
                  >
                    <div
                      className={cn(
                        'flex w-9 h-9 items-center justify-center rounded-lg shrink-0 transition-colors',
                        isSelected ? 'bg-white/20' : 'bg-surface-variant group-hover:bg-white'
                      )}
                    >
                      <Icon size={18} className={isSelected ? 'text-white' : 'text-primary-500'} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[14px] leading-tight truncate">{item.label}</div>
                      <div
                        className={cn(
                          'text-[11px] font-medium uppercase tracking-wider mt-0.5',
                          isSelected ? 'text-white/70' : 'text-surface-400'
                        )}
                      >
                        {item.groupLabel}
                      </div>
                    </div>
                    {isSelected && <ArrowRight size={16} className="shrink-0 text-white/50" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-surface-variant/20 text-[10px] text-surface-500 font-bold uppercase tracking-wider">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="px-1 py-0.5 rounded border border-border bg-white leading-none">↑↓</span>
                <span>Navigasi</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="px-1 py-0.5 rounded border border-border bg-white leading-none">Enter</span>
                <span>Pilih</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <CommandIcon size={12} />
              <span>⌘K</span>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
