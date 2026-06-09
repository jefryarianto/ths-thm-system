'use client';

import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  colSpan?: number;
}

export default function EmptyState({ icon: Icon, title, message, action, colSpan }: EmptyStateProps) {
  return (
    <tr>
      <td colSpan={colSpan || 999} className="px-4 py-12 text-center">
        <Icon size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
        {title && <p className="font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>}
        <p className="text-gray-500 dark:text-gray-400">{message}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            {action.label}
          </button>
        )}
      </td>
    </tr>
  );
}
