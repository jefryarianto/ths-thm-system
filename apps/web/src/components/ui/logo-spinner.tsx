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
        className="logo-spinner"
        style={{ ['--spinner-size' as string]: `${size}px` }}
      >
        {/* next/image tidak dipakai: logo statis di public/, animasi via CSS,
            dan hindari optimasi gambar untuk SVG kecil yang dimuat inline. */}
        <img
          src="/logo.svg"
          alt="THS-THM Logo"
          className="relative object-contain"
          draggable={false}
        />
      </span>
      {message ? (
        <p
          className={cn(
            'text-sm font-medium text-secondary animate-pulse text-center motion-reduce:animate-none',
            messageClassName,
          )}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

interface SmallLogoSpinnerProps {
  /** Sisi kotak indikator (px). Default 16. */
  size?: number;
  /** Warna busur utama; default `currentColor` (mengikuti teks sekitarnya,
   *  mis. teks putih di dalam tombol primary). */
  color?: string;
  /** Warna busur kedua (aksen). Default `currentColor`. */
  accentColor?: string;
  className?: string;
}

/**
 * Varian kecil untuk tombol & ruang sempit — dua cincin berputar berlawanan
 * arah tanpa logo di tengah (cerminan `AppLoadingSpinner.small` di Flutter).
 *
 * Lebih ringan dari `.logo-spinner` (tanpa gambar) namun tetap konsisten
 * dengan identitas loading THS-THM.
 */
export function SmallLogoSpinner({
  size = 16,
  color,
  accentColor,
  className,
}: SmallLogoSpinnerProps) {
  const ring = Math.max(1.5, size / 8);
  const main = color ?? 'currentColor';
  const accent = accentColor ?? 'currentColor';
  return (
    <span
      role="status"
      aria-label="Memuat"
      className={cn('relative inline-grid place-items-center shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inset-0 rounded-full animate-logo-spinner"
        style={{
          borderTop: `${ring}px solid ${main}`,
          borderRight: `${ring}px solid transparent`,
        }}
      />
      <span
        className="absolute inset-0 rounded-full animate-logo-spinner-reverse"
        style={{
          borderLeft: `${ring}px solid ${accent}`,
          borderBottom: `${ring}px solid transparent`,
        }}
      />
    </span>
  );
}
