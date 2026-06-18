'use client';

import { ExternalLink } from 'lucide-react';
import type { ComponentType } from 'react';

interface DetailRowProps {
  icon: ComponentType<{ size?: string | number; className?: string }>;
  label: string;
  value: string | null;
  href?: string;
  /** Enable hover effect and interactive styling (default: true) */
  hoverable?: boolean;
}

export default function DetailRow({
  icon: Icon,
  label,
  value,
  href,
  hoverable = true,
}: DetailRowProps) {
  const content = (
    <div
      className={`flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl ${
        hoverable ? 'hover:bg-gray-100 dark:hover:bg-gray-800 transition group' : ''
      }`}
    >
      <div className="p-2 rounded-lg bg-white dark:bg-gray-700 shadow-sm">
        <Icon size={16} className="text-blue-600 dark:text-blue-400" />
      </div>
      <div className={`flex-1 ${hoverable ? 'min-w-0' : ''}`}>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </p>
        <p
          className={`text-sm font-medium text-gray-900 dark:text-white mt-0.5 ${
            hoverable ? 'truncate' : ''
          }`}
        >
          {value || <span className="text-gray-400 italic">Tidak ada data</span>}
        </p>
      </div>
      {href && (
        <ExternalLink
          size={14}
          className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition"
        />
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return content;
}
