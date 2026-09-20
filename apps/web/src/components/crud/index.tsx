'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';

// ─── Detail Page Layout ─────────────────────────────

interface DetailLayoutProps {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  headerRight?: ReactNode;
}

export function DetailLayout({ backHref, backLabel, title, subtitle, children, headerRight }: DetailLayoutProps) {
  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text transition group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        {backLabel}
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted mt-0.5">{subtitle}</p>
          )}
        </div>
        {headerRight && (
          <div className="flex items-center gap-2">{headerRight}</div>
        )}
      </div>

      {children}
    </div>
  );
}

// ─── Error Page ──────────────────────────────────────

interface ErrorPageProps {
  message: string;
  backHref?: string;
  backLabel?: string;
  onRetry?: () => void;
}

export function ErrorPage({ message, backHref, backLabel = 'Kembali', onRetry }: ErrorPageProps) {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center max-w-md">
        <AlertCircle size={40} className="mx-auto text-error mb-3" />
        <h2 className="text-lg font-semibold text-text mb-2">Gagal Memuat Data</h2>
        <p className="text-sm text-muted mb-4">{message}</p>
        <div className="flex items-center justify-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              className="px-4 py-2 border border-border rounded-lg text-sm text-text hover:bg-surface-variant transition"
            >
              ← {backLabel}
            </Link>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-[var(--primary-hover)] transition"
            >
              Coba Lagi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ──────────────────────────────

interface DetailSkeletonProps {
  rows?: number;
}

export function DetailSkeleton({ rows = 3 }: DetailSkeletonProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
      <div className="h-5 bg-surface-variant rounded w-36" />
      <div className="h-6 bg-surface-variant rounded w-64" />
      <div className="bg-surface rounded-2xl border p-6 space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 bg-surface-variant rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-surface-variant rounded w-20" />
              <div className="h-4 bg-surface-variant rounded w-48" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Form Layout ────────────────────────────────────

interface FormLayoutProps {
  backHref: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  error?: string;
  saving?: boolean;
  onCancel?: () => void;
  onSubmit?: (e: React.FormEvent) => void;
  submitLabel?: string;
  savingLabel?: string;
}

export function FormLayout({
  backHref,
  title,
  subtitle,
  children,
  error,
  saving,
  onCancel,
  onSubmit,
  submitLabel = 'Simpan',
  savingLabel = 'Menyimpan...',
}: FormLayoutProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          className="p-1.5 rounded-lg hover:bg-surface-variant transition-colors"
        >
          <ArrowLeft size={20} className="text-muted" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-text">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 p-3.5 bg-error-50 dark:bg-error-950 border border-error-200 dark:border-error-800 rounded-xl text-sm text-error-700 dark:text-error-300">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="bg-surface rounded-2xl border border-border shadow-sm p-6 space-y-5">
          {children}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 border border-border rounded-lg text-sm text-text hover:bg-surface-variant transition-colors"
            >
              Batal
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {saving ? savingLabel : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Info Card (Detail Page) ─────────────────────────

interface InfoCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function InfoCard({ title, icon, children, className = '' }: InfoCardProps) {
  return (
    <div className={`bg-surface rounded-2xl border border-border shadow-sm p-6 ${className}`}>
      <h3 className="text-base font-semibold text-text flex items-center gap-2 mb-4">
        {icon}
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ─── Info Row (Detail Page) ──────────────────────────

interface InfoRowProps {
  icon?: ReactNode;
  label: string;
  value: string | ReactNode | null | undefined;
  color?: string;
}

export function InfoRow({ icon, label, value, color }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3 p-3 bg-surface-variant/50 rounded-xl">
      {icon && <div className={`mt-0.5 ${color || 'text-muted'}`}>{icon}</div>}
      <div>
        <p className="text-xs text-muted uppercase">{label}</p>
        <p className="text-sm font-medium text-text">
          {value ?? <span className="text-muted italic">-</span>}
        </p>
      </div>
    </div>
  );
}

// ─── Stat Card Mini ───────────────────────────────────

interface MiniStatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  color: 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'orange';
}

const STAT_COLORS: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-primary-50 dark:bg-primary-950', text: 'text-primary dark:text-primary-300' },
  green: { bg: 'bg-success-50 dark:bg-success-950', text: 'text-success-600 dark:text-success-400' },
  purple: { bg: 'bg-secondary-50 dark:bg-secondary-950', text: 'text-secondary-600 dark:text-secondary-400' },
  red: { bg: 'bg-error-50 dark:bg-error-950', text: 'text-error-600 dark:text-error-400' },
  yellow: { bg: 'bg-warning-50 dark:bg-warning-950', text: 'text-warning-600 dark:text-warning-400' },
  orange: { bg: 'bg-warning-50 dark:bg-warning-950', text: 'text-warning dark:text-warning-300' },
};

export function MiniStatCard({ label, value, icon, color }: MiniStatCardProps) {
  const c = STAT_COLORS[color];
  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${c.bg}`}>
          <span className={c.text}>{icon}</span>
        </div>
        <div>
          <p className="text-xs text-muted">{label}</p>
          <p className="text-base font-bold text-text">{value}</p>
        </div>
      </div>
    </div>
  );
}
