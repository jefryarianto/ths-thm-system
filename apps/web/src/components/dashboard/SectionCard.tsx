'use client';

import { type ReactNode, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface SectionCardProps {
  /** Judul section (h3) */
  title: string;
  /** Ikon di kiri judul */
  icon?: ReactNode;
  /** Aksi di kanan header (link, badge, tombol) */
  action?: ReactNode;
  /** Konten section */
  children: ReactNode;
  /** Class tambahan untuk elemen section */
  className?: string;
  /** Class tambahan untuk area konten */
  bodyClassName?: string;
  /** Jika true → section bisa diciutkan (default collapsed sesuai `defaultCollapsed`) */
  collapsible?: boolean;
  /** Kondisi awal collapsible (default: terbuka) */
  defaultCollapsed?: boolean;
  /** Accessible label untuk tombol ciutkan */
  collapseLabel?: string;
}

/**
 * SectionCard — satu-satunya "cangkang" section dashboard.
 *
 * Standarisasi: header (ikon + judul + aksi) dengan tinggi & padding konsisten,
 * border & token warna memakai `.card-elegant`. Tidak lagi mengandalkan
 * markup ad-hoc per section.
 */
export default function SectionCard({
  title,
  icon,
  action,
  children,
  className = '',
  bodyClassName = '',
  collapsible = false,
  defaultCollapsed = false,
  collapseLabel,
}: SectionCardProps) {
  const [open, setOpen] = useState(!defaultCollapsed);
  const isInteractive = collapsible;

  const header = (
    <div
      className={`flex items-center justify-between gap-3 px-5 py-4 border-b border-border ${
        isInteractive ? 'cursor-pointer select-none' : ''
      }`}
      {...(isInteractive
        ? {
            role: 'button',
            tabIndex: 0,
            'aria-expanded': open,
            onClick: () => setOpen((p) => !p),
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpen((p) => !p);
              }
            },
          }
        : {})}
    >
      <h3 className="text-sm font-semibold text-text flex items-center gap-2 min-w-0">
        {icon && <span className="shrink-0 text-primary">{icon}</span>}
        <span className="truncate">{title}</span>
        {collapsible && (
          <ChevronDown
            size={14}
            className={`shrink-0 text-muted transition-transform duration-200 ${
              open ? '' : '-rotate-90'
            }`}
            aria-hidden="true"
          />
        )}
      </h3>
      {action && <div className="shrink-0 text-xs">{action}</div>}
    </div>
  );

  return (
    <section
      className={`card-elegant overflow-hidden ${className}`}
      aria-label={collapsible ? collapseLabel || title : undefined}
    >
      {header}
      {open && <div className={bodyClassName}>{children}</div>}
    </section>
  );
}
