import { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

const Card = ({ title, subtitle, children, className = '', action }: CardProps) => (
  <div
    className={`bg-surface rounded-xl border border-border shadow-elegant ${className}`}
  >
    {(title || action) && (
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          {title && (
            <h3 className="text-base font-semibold text-text">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-muted mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
    )}
    <div className="px-6 py-4">{children}</div>
  </div>
);

export default Card;
