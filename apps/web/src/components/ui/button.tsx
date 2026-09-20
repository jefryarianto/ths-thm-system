'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Button canonical THS-THM.
 * WAJIB dipakai untuk semua tombol — larang styling <button> ad-hoc.
 * Radius: sm → rounded-md · md → rounded-lg · lg → rounded-xl.
 */
const buttonVariants = cva(
  // Base: focus ring, motion, disabled, ukuran radius mengikuti size
  'inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-white shadow-elegant hover:bg-[var(--primary-hover)] hover:shadow-elegant-md focus-visible:ring-primary',
        secondary:
          'bg-secondary text-white shadow-elegant hover:bg-secondary-800 hover:shadow-elegant-md focus-visible:ring-secondary',
        outline:
          'border border-border bg-surface text-text hover:bg-surface-variant focus-visible:ring-primary',
        danger:
          'bg-error text-white shadow-elegant hover:bg-error-700 hover:shadow-elegant-md focus-visible:ring-error',
        success:
          'bg-success text-white shadow-elegant hover:bg-success-700 hover:shadow-elegant-md focus-visible:ring-success',
        ghost:
          'bg-transparent text-muted hover:bg-surface-variant hover:text-text focus-visible:ring-primary',
        link: 'text-link underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'px-2.5 py-1.5 text-xs rounded-md',
        md: 'px-4 py-2 text-sm rounded-lg',
        lg: 'px-6 py-3 text-base rounded-xl',
        icon: 'h-9 w-9 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, loading, className = '', children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={buttonVariants({ variant, size, className })}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

export default Button;
export { buttonVariants };

