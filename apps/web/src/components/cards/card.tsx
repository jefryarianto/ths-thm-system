import { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

const Card = ({ title, subtitle, children, className = '', action }: CardProps) => (
  <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
    {(title || action) && (
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          {title && <h3 className="text-base font-semibold text-gray-900">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    )}
    <div className="px-6 py-4">{children}</div>
  </div>
);

export default Card;