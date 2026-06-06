interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  label: string;
}

const variantClasses = {
  default: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  success: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
  warning: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400',
  danger: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
  info: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
};

const Badge = ({ variant = 'default', label }: BadgeProps) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]}`}>
    {label}
  </span>
);

export default Badge;