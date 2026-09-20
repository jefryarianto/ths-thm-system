import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * Input canonical — wajib pakai token (bg-surface, border-border, ring-primary).
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-text mb-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        aria-invalid={!!error}
        className={`block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus-visible:ring-2 bg-surface text-text placeholder:text-muted ${
          error
            ? 'border-error focus:ring-error focus:border-error'
            : 'border-border focus:ring-primary focus:border-primary'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  ),
);
Input.displayName = 'Input';

export default Input;
