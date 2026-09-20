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
      className={`flex items-center gap-3 px-4 py-3 bg-surface-variant rounded-xl ${
        hoverable ? 'hover:bg-surface-variant transition group' : ''
      }`}
    >
      <div className="p-2 rounded-lg bg-surface shadow-sm">
        <Icon size={16} className="text-primary" />
      </div>
      <div className={`flex-1 ${hoverable ? 'min-w-0' : ''}`}>
        <p className="text-xs font-medium text-muted uppercase tracking-wide">
          {label}
        </p>
        <p
          className={`text-sm font-medium text-text mt-0.5 ${
            hoverable ? 'truncate' : ''
          }`}
        >
          {value || <span className="text-muted italic">Tidak ada data</span>}
        </p>
      </div>
      {href && (
        <ExternalLink
          size={14}
          className="text-muted group-hover:text-primary transition"
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
