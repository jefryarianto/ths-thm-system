'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  variant?: 'text' | 'card' | 'table-row' | 'avatar' | 'chart' | 'button' | 'input';
  className?: string;
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function Skeleton({
  variant = 'text',
  className,
  width,
  height,
  lines = 1,
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded';

  const variantClasses = {
    text: 'h-4',
    card: 'rounded-xl border border-gray-200 dark:border-gray-700 p-5',
    'table-row': '',
    avatar: 'rounded-full',
    chart: 'rounded-xl',
    button: 'rounded-lg',
    input: 'rounded-lg h-10',
  };

  const styles: React.CSSProperties = {};
  if (width) styles.width = typeof width === 'number' ? `${width}px` : width;
  if (height) styles.height = typeof height === 'number' ? `${height}px` : height;

  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn(baseClasses, variantClasses[variant], className)} style={styles}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-4 w-full',
              i === lines - 1 && 'w-3/4',
              i > 0 && 'mt-2'
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={styles}
    />
  );
}

export function TextSkeleton({ lines = 3, className, ...props }: Omit<SkeletonProps, 'variant'>) {
  return <Skeleton variant="text" lines={lines} className={className} {...props} />;
}

export function CardSkeleton({ className, ...props }: Omit<SkeletonProps, 'variant'>) {
  return <Skeleton variant="card" className={className} {...props} />;
}

export function AvatarSkeleton({ size = 40, className, ...props }: Omit<SkeletonProps, 'variant' | 'width' | 'height'> & { size?: number }) {
  return <Skeleton variant="avatar" width={size} height={size} className={className} {...props} />;
}

export function ButtonSkeleton({ className, ...props }: Omit<SkeletonProps, 'variant'>) {
  return <Skeleton variant="button" className={className} {...props} />;
}

export function InputSkeleton({ className, ...props }: Omit<SkeletonProps, 'variant'>) {
  return <Skeleton variant="input" className={className} {...props} />;
}

export function ChartSkeleton({ height = 280, className, ...props }: { height?: number; className?: string } & Omit<SkeletonProps, 'variant' | 'height'>) {
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 animate-pulse', className)}>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2" />
      <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-64 mb-6" />
      <div
        className="bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center"
        style={{ height }}
      >
        <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-600" />
      </div>
    </div>
  );
}