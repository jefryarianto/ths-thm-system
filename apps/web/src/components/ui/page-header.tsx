'use client';

import { RefreshCw } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  onRefresh?: () => void;
  children?: React.ReactNode;
}

export default function PageHeader({ title, onRefresh, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>
      <div className="flex gap-2">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
