import { ReactNode } from 'react';

type BadgeVariant = 'success' | 'pending' | 'error' | 'info' | 'warning';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-emerald-100 text-emerald-800 ring-emerald-600/10',
  pending: 'bg-amber-100 text-amber-800 ring-amber-600/10',
  error: 'bg-red-100 text-red-800 ring-red-600/10',
  info: 'bg-navy-100 text-navy-800 ring-navy-600/10',
  warning: 'bg-orange-100 text-orange-800 ring-orange-600/10',
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${VARIANT_CLASSES[variant]}`}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full ${
          variant === 'success' ? 'bg-emerald-500' :
          variant === 'pending' ? 'bg-amber-500' :
          variant === 'error' ? 'bg-red-500' :
          variant === 'info' ? 'bg-navy-500' :
          'bg-orange-500'
        }`} />
      )}
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
      {/* Mobile: card view — children should include MobileCard items */}
    </div>
  );
}

/**
 * Card view for mobile — wraps each row's data into a vertical card.
 */
export function MobileCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`md:hidden card-elegant p-4 space-y-3 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Card field — label + value pair for mobile cards.
 */
export function CardField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-navy-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-medium text-navy-800">{children}</span>
    </div>
  );
}
