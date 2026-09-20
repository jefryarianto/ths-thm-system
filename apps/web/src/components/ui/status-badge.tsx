import { ReactNode } from 'react';

type BadgeVariant = 'success' | 'pending' | 'error' | 'info' | 'warning' | 'neutral';

/**
 * StatusBadge — badge status domain (Aktif, Pending, Ditolak, dst).
 * Token-based + auto dark via CSS var (tanpa variant dark:).
 * Mapping semantic: success/pending/warning/error/info/neutral.
 */
const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-success-50 text-success-800 ring-success-600/20',
  pending: 'bg-warning-50 text-warning-800 ring-warning-600/20',
  error: 'bg-error-50 text-error-800 ring-error-600/20',
  info: 'bg-info-50 text-info-800 ring-info-600/20',
  warning: 'bg-warning-50 text-warning-800 ring-warning-600/20',
  neutral: 'bg-surface-variant text-muted ring-border',
};

const DOT_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-success-500',
  pending: 'bg-warning-500',
  error: 'bg-error-500',
  info: 'bg-info-500',
  warning: 'bg-warning-500',
  neutral: 'bg-muted',
};

interface StatusBadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  /** Optional dot indicator before text */
  dot?: boolean;
}

export function StatusBadge({ variant, children, dot = true }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset border-0 ${VARIANT_CLASSES[variant]}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[variant]}`} aria-hidden="true" />}
      {children}
    </span>
  );
}

/**
 * Mobile card-view wrapper for table rows.
 * On mobile (md:), renders as a card. On desktop, renders as a normal row.
 */
export function ResponsiveTable({ children }: { children: ReactNode }) {
  return (
    <div className="w-full">
      {/* Desktop: horizontal scroll table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          {children}
        </table>
      </div>
      {/* Mobile: card view - children should include MobileCard items */}
    </div>
  );
}

/**
 * Card view for mobile - wraps each row's data into a vertical card.
 */
export function MobileCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`md:hidden card-elegant p-4 space-y-3 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Card field - label + value pair for mobile cards.
 */
export function CardField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted uppercase tracking-wider">{label}</span>
      <span className="text-sm font-medium text-text">{children}</span>
    </div>
  );
}

