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
  /** 'large' (default) or 'mini' — mini has smaller text/padding for compact layouts */
  variant?: 'large' | 'mini';
  /** Optional subtitle shown below value */
  sub?: string;
}

const colorMap: Record<string, { icon: string; bg: string; ring: string }> = {
  blue: {
    icon: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950',
    ring: 'ring-blue-100 dark:ring-blue-800',
  },
  green: {
    icon: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950',
    ring: 'ring-green-100 dark:ring-green-800',
  },
  yellow: {
    icon: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-950',
    ring: 'ring-yellow-100 dark:ring-yellow-800',
  },
  red: {
    icon: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950',
    ring: 'ring-red-100 dark:ring-red-800',
  },
  purple: {
    icon: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950',
    ring: 'ring-purple-100 dark:ring-purple-800',
  },
  orange: {
    icon: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950',
    ring: 'ring-orange-100 dark:ring-orange-800',
  },
  indigo: {
    icon: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950',
    ring: 'ring-indigo-100 dark:ring-indigo-800',
  },
  teal: {
    icon: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950',
    ring: 'ring-teal-100 dark:ring-teal-800',
  },
  pink: {
    icon: 'text-pink-600 dark:text-pink-400',
    bg: 'bg-pink-50 dark:bg-pink-950',
    ring: 'ring-pink-100 dark:ring-pink-800',
  },
  cyan: {
    icon: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-950',
    ring: 'ring-cyan-100 dark:ring-cyan-800',
  },
  amber: {
    icon: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950',
    ring: 'ring-amber-100 dark:ring-amber-800',
  },
  slate: {
    icon: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-800',
    ring: 'ring-gray-100 dark:ring-gray-700',
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
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${styles.bg} ${styles.ring} ring-1`}>
          <span className={styles.icon}>{icon}</span>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ring-1 ${styles.ring} ${styles.bg}`}>
          <span className={styles.icon}>{icon}</span>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
