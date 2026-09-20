'use client';

import { type LucideIcon } from 'lucide-react';
import { RefreshCw } from 'lucide-react';

interface SummaryBarProps {
  icon: LucideIcon;
  label: string;
  total: number;
  onRefresh?: () => void;
}

export default function SummaryBar({ icon: Icon, label, total, onRefresh }: SummaryBarProps) {
  return (
    <div className="bg-surface rounded-lg border border-border px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Icon size={18} className="text-primary" />
        <span className="text-sm text-muted">
          {label}: <strong className="text-text">{total}</strong>
        </span>
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border rounded-md text-xs text-muted hover:bg-surface-variant transition-colors"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      )}
    </div>
  );
}
