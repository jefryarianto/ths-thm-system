import { type ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  /** Optional helper text shown below the field */
  hint?: string;
  /** Optional error message — rendered in error color and announced to AT */
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}

/**
 * FormField canonical — label + control + hint/error.
 * Selalu berikan `htmlFor` agar label terhubung ke control (a11y).
 */
export default function FormField({ label, required, hint, error, htmlFor, children }: FormFieldProps) {
  return (
    <div className="w-full">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-text mb-1"
      >
        {label} {required && <span className="text-error" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}

