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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Icon size={18} className="text-blue-500" />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {label}: <strong className="text-gray-900 dark:text-white">{total}</strong>
        </span>
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      )}
    </div>
  );
}
