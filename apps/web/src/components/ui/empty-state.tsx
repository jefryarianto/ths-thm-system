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

export default function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  colSpan,
}: EmptyStateProps) {
  return (
    <tr>
      <td colSpan={colSpan || 999} className="px-4 py-12 text-center">
        <Icon size={36} className="mx-auto text-muted mb-2" />
        {title && <p className="font-medium text-muted mb-1">{title}</p>}
        <p className="text-muted">{message}</p>
        {action && (
          <button onClick={action.onClick} className="mt-2 text-sm text-link hover:underline">
            {action.label}
          </button>
        )}
      </td>
    </tr>
  );
}
