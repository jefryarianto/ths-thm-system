'use client';

import { cn } from '@/lib/utils';

interface LogoSpinnerProps {
  /** Diameter area spinner (px). Default 48. */
  size?: number;
  /** Teks di bawah spinner (mis. "Memverifikasi kredensial..."). */
  message?: string;
  /** Warna teks pesan; default mengikuti token `text-secondary`. */
  messageClassName?: string;
  className?: string;
}

/**
 * Loading indicator "logo spinner": dua busur lingkaran berputar berlawanan
 * arah (1s searah & 0.5s berlawanan) mengelilingi logo THS-THM di tengah.
 *
 * Sumber kebenaran gaya: kelas `.logo-spinner` + keyframes `logo-spinner-rotation`
 * di globals.css.
 */
export function LogoSpinner({
  size = 48,
  message,
  messageClassName,
  className,
}: LogoSpinnerProps) {
  return (
    <div
      role="status"
      className={cn('flex flex-col items-center justify-center gap-5', className)}
      aria-live="polite"
    >
      <span
        className="logo-spinner animate-logo-spinner"
        style={{ ['--spinner-size' as string]: `${size}px` }}
      >
        <img src="/logo.svg" alt="THS-THM Logo" className="relative object-contain" />
      </span>
      {message ? (
        <p
          className={cn(
            'text-sm font-medium text-secondary animate-pulse text-center',
            messageClassName,
          )}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
