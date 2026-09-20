import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  color?:
    | 'blue'
    | 'green'
    | 'yellow'
    | 'red'
    | 'purple'
    | 'orange'
    | 'indigo'
    | 'teal'
    | 'pink'
    | 'cyan'
    | 'amber'
    | 'slate';
  /** 'large' (default) or 'mini' - mini has smaller text/padding for compact layouts */
  variant?: 'large' | 'mini';
  /** Optional subtitle shown below value */
  sub?: string;
}

const colorMap: Record<string, { icon: string; bg: string; ring: string }> = {
  blue: {
    icon: 'text-primary dark:text-primary-300',
    bg: 'bg-primary-50 dark:bg-primary-950',
    ring: 'ring-primary-100 dark:ring-primary-800',
  },
  green: {
    icon: 'text-success-600 dark:text-success-400',
    bg: 'bg-success-50 dark:bg-success-950',
    ring: 'ring-success-100 dark:ring-success-800',
  },
  yellow: {
    icon: 'text-warning-600 dark:text-warning-400',
    bg: 'bg-warning-50 dark:bg-warning-950',
    ring: 'ring-warning-100 dark:ring-warning-800',
  },
  red: {
    icon: 'text-error-600 dark:text-error-400',
    bg: 'bg-error-50 dark:bg-error-950',
    ring: 'ring-error-100 dark:ring-error-800',
  },
  purple: {
    icon: 'text-secondary-600 dark:text-secondary-400',
    bg: 'bg-secondary-50 dark:bg-secondary-950',
    ring: 'ring-secondary-100 dark:ring-secondary-800',
  },
  orange: {
    icon: 'text-warning dark:text-warning-300',
    bg: 'bg-warning-50 dark:bg-warning-950',
    ring: 'ring-warning-100 dark:ring-warning-800',
  },
  indigo: {
    icon: 'text-primary dark:text-primary-300',
    bg: 'bg-primary-50 dark:bg-primary-950',
    ring: 'ring-primary-100 dark:ring-primary-800',
  },
  teal: {
    icon: 'text-success-600 dark:text-success-400',
    bg: 'bg-success-50 dark:bg-success-950',
    ring: 'ring-success-100 dark:ring-success-800',
  },
  pink: {
    icon: 'text-gold-600 dark:text-gold-400',
    bg: 'bg-gold-50 dark:bg-gold-950',
    ring: 'ring-gold-100 dark:ring-gold-800',
  },
  cyan: {
    icon: 'text-primary dark:text-primary-300',
    bg: 'bg-primary-50 dark:bg-primary-950',
    ring: 'ring-primary-100 dark:ring-primary-800',
  },
  amber: {
    icon: 'text-warning dark:text-warning-300',
    bg: 'bg-warning-50 dark:bg-warning-950',
    ring: 'ring-warning-100 dark:ring-warning-800',
  },
  slate: {
    icon: 'text-muted',
    bg: 'bg-surface-variant',
    ring: 'ring-border',
  },
};

const StatCard = ({
  label,
  value,
  icon,
  color = 'blue',
  variant = 'large',
  sub,
}: StatCardProps) => {
  const styles = colorMap[color] || colorMap.blue;

  if (variant === 'mini') {
    return (
      <div className="bg-surface rounded-xl border border-border shadow-sm p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${styles.bg} ${styles.ring} ring-1`}>
          <span className={styles.icon}>{icon}</span>
        </div>
        <div>
          <p className="text-xs text-muted">{label}</p>
          <p className="text-lg font-bold text-text">{value}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="text-2xl font-bold text-text mt-1">{value}</p>
          {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ring-1 ${styles.ring} ${styles.bg}`}>
          <span className={styles.icon}>{icon}</span>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
