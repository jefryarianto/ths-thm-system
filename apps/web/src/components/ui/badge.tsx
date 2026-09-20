import { ReactNode } from 'react';

/**
 * Badge semantic THS-THM (token-based, auto dark).
 * Untuk status domain (aktif/pending/ditolak) gunakan `status-badge.tsx`.
 */
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-variant text-muted border-border',
  primary: 'bg-primary-container text-primary-on-container border-primary-300/40',
  success: 'bg-success-50 text-success-800 border-success-200',
  warning: 'bg-warning-50 text-warning-800 border-warning-200',
  danger: 'bg-error-50 text-error-800 border-error-200',
  info: 'bg-info-50 text-info-800 border-info-200',
};

interface BadgeProps {
  variant?: BadgeVariant;
  label: string;
}

const Badge = ({ variant = 'default', label }: BadgeProps) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantClasses[variant]}`}
  >
    {label}
  </span>
);

export default Badge;

