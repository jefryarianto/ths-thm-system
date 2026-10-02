'use client';

import { cn } from '@/lib/utils';

interface BreathableLogoProps {
  /** Diameter area logo (px). Default 80. */
  size?: number;
  /** Teks di bawah logo (mis. "Memverifikasi kredensial..."). */
  message?: string;
  /** Warna teks pesan; default mengikuti token `text-secondary`. */
  messageClassName?: string;
  className?: string;
}

/**
 * Loading indicator "breathable": logo THS-THM mengembang & menciut perlahan
 * seperti sedang bernapas, dikelilingi halo lembut yang menyala/redup mengikuti
 * siklus yang sama. Menggantikan spinner cincin-berputar (animate-spin).
 *
 * Sumber kebenaran gaya: keyframes `breathe` / `breathe-halo` di globals.css.
 */
export function BreathableLogo({
  size = 80,
  message,
  messageClassName,
  className,
}: BreathableLogoProps) {
  // Logo fill ~60% dari area agar ada ruang bernapas di dalam bingkai.
  const logoSize = Math.round(size * 0.6);

  return (
    <div
      role="status"
      className={cn('flex flex-col items-center justify-center gap-5', className)}
      aria-live="polite"
    >
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Halo: lingkaran lembut di belakang logo, mengembang saat logo menarik napas */}
        <div
          aria-hidden="true"
          className="animate-breathe-halo pointer-events-none rounded-full bg-primary/10"
          style={{ width: size, height: size }}
        />
        {/* Bingkai tipis sebagai jangkar visual logo saat "bernafas" */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full border border-primary/15"
        />
        <img
          src="/logo.svg"
          alt="THS-THM Logo"
          width={logoSize}
          height={logoSize}
          className="animate-breathe relative object-contain drop-shadow-md"
          style={{ width: logoSize, height: logoSize }}
        />
      </div>

      {message ? (
        <p
          className={cn(
            'animate-breathe text-sm font-semibold tracking-wide text-secondary',
            messageClassName,
          )}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
