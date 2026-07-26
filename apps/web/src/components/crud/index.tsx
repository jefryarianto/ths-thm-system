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
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        {backLabel}
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
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
        <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Gagal Memuat Data</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{message}</p>
        <div className="flex items-center justify-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              ← {backLabel}
            </Link>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
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
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-36" />
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-64" />
      <div className="bg-white dark:bg-gray-800 rounded-2xl border p-6 space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48" />
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
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-500" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 p-3.5 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-5">
          {children}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Batal
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
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
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 ${className}`}>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
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
    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
      {icon && <div className={`mt-0.5 ${color || 'text-gray-400'}`}>{icon}</div>}
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">{label}</p>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {value ?? <span className="text-gray-400 italic">-</span>}
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
  blue: { bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-600 dark:text-blue-400' },
  green: { bg: 'bg-green-50 dark:bg-green-950', text: 'text-green-600 dark:text-green-400' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950', text: 'text-purple-600 dark:text-purple-400' },
  red: { bg: 'bg-red-50 dark:bg-red-950', text: 'text-red-600 dark:text-red-400' },
  yellow: { bg: 'bg-yellow-50 dark:bg-yellow-950', text: 'text-yellow-600 dark:text-yellow-400' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-950', text: 'text-orange-600 dark:text-orange-400' },
};

export function MiniStatCard({ label, value, icon, color }: MiniStatCardProps) {
  const c = STAT_COLORS[color];
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${c.bg}`}>
          <span className={c.text}>{icon}</span>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-base font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
