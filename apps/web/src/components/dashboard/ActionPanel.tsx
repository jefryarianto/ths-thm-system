'use client';

import Link from 'next/link';
import { CheckCircle2, ChevronRight, TriangleAlert } from 'lucide-react';
import {
  actionItems,
  type ActionItemConfig,
  type ActionItemKey,
} from './constants';

/**
 * Kelas visual per severity — item paling mendesak paling tegas.
 * Header section NETRAL (bukan warning) agar sinyal error di dalamnya tetap
 * mencolok.
 */
const SEVERITY_BORDER: Record<number, string> = {
  1: 'border-l-error-500',
  2: 'border-l-warning-500',
  3: 'border-l-warning-400',
  4: 'border-l-info-400',
};

const ACCENT_SOFT: Record<string, { icon: string; bg: string; cta: string }> = {
  error: {
    icon: 'text-error-600 dark:text-error-400',
    bg: 'bg-error-50 dark:bg-error-950',
    cta: 'text-error-700 dark:text-error-300',
  },
  warning: {
    icon: 'text-warning-600 dark:text-warning-400',
    bg: 'bg-warning-50 dark:bg-warning-950',
    cta: 'text-warning-700 dark:text-warning-300',
  },
  pending: {
    icon: 'text-warning-600 dark:text-warning-400',
    bg: 'bg-warning-50 dark:bg-warning-950',
    cta: 'text-warning-700 dark:text-warning-300',
  },
  info: {
    icon: 'text-info-600 dark:text-info-400',
    bg: 'bg-info-50 dark:bg-info-950',
    cta: 'text-info-700 dark:text-info-300',
  },
  success: {
    icon: 'text-success-600 dark:text-success-400',
    bg: 'bg-success-50 dark:bg-success-950',
    cta: 'text-success-700 dark:text-success-300',
  },
};

interface ActionPanelProps {
  /** Nilai dari DashboardData per ActionItemKey */
  values: Partial<Record<ActionItemKey, number>>;
}

/**
 * "Perlu Tindakan" — section prioritas tertinggi dashboard.
 *
 * Peningkatan vs implementasi lama:
 *  - Diurutkan by severity (bukan urutan array) → item kritis pertama.
 *  - Item bernilai 0 menjadi baris mini ringkas (bukan kartu penuh) →
 *    section tetap "penuh" tanpa noise saat semua clear.
 *  - Header netral; severity ada di item.
 *  - CTA spesifik per item (bukan generik "Lihat detail").
 */
export default function ActionPanel({ values }: ActionPanelProps) {
  const sorted = [...actionItems].sort((a, b) => a.severity - b.severity);
  const active = sorted.filter((item) => (values[item.key] ?? 0) > 0);
  const cleared = sorted.filter((item) => (values[item.key] ?? 0) === 0);

  const totalPending = active.reduce((sum, i) => sum + (values[i.key] ?? 0), 0);

  return (
    <section
      aria-labelledby="perlu-tindakan-title"
      className="card-elegant p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-lg bg-surface-variant text-muted shrink-0">
            <TriangleAlert size={17} aria-hidden="true" />
          </span>
          <div>
            <h2
              id="perlu-tindakan-title"
              className="text-base font-semibold text-text"
            >
              Perlu Tindakan
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {totalPending > 0
                ? `${totalPending.toLocaleString('id-ID')} item menunggu ditindaklanjuti`
                : 'Tidak ada item tertunda'}
            </p>
          </div>
        </div>
      </div>

      {active.length > 0 ? (
        <ul className="space-y-2.5">
          {active.map((item) => (
            <li key={item.key}>
              <ActionRow item={item} value={values[item.key] ?? 0} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-success-200 dark:border-success-800 bg-success-50 dark:bg-success-950 p-4">
          <CheckCircle2
            size={18}
            className="text-success-600 dark:text-success-400 shrink-0"
            aria-hidden="true"
          />
          <p className="text-sm text-success-700 dark:text-success-300">
            Semua data sudah ditindaklanjuti. Kerja bagus!
          </p>
        </div>
      )}

      {cleared.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-2xs text-muted mb-1.5">Sudah ditindaklanjuti</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {cleared.map((item) => (
              <li
                key={item.key}
                className="flex items-center gap-1.5 text-xs text-muted"
              >
                <CheckCircle2 size={12} className="text-success-500" aria-hidden="true" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ActionRow({ item, value }: { item: ActionItemConfig; value: number }) {
  const Icon = item.icon;
  const styles = ACCENT_SOFT[item.accent] ?? ACCENT_SOFT.info;

  return (
    <Link
      href={item.href}
      className={`group flex items-center gap-3 rounded-lg border border-border border-l-4 ${
        SEVERITY_BORDER[item.severity] ?? 'border-l-border'
      } ${styles.bg} p-3 transition hover:shadow-elegant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
    >
      <span className={`p-1.5 rounded-md bg-surface/70 ${styles.icon} shrink-0`}>
        <Icon size={15} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-text">{item.label}</span>
          <span className="text-base font-bold text-text tabular-nums">
            {value.toLocaleString('id-ID')}
          </span>
        </span>
        <span className="block text-xs text-muted mt-0.5">{item.detail}</span>
      </span>
      <span
        className={`text-xs font-medium ${styles.cta} flex items-center gap-0.5 shrink-0 group-hover:gap-1 transition-all`}
      >
        {item.cta}
        <ChevronRight size={12} aria-hidden="true" />
      </span>
    </Link>
  );
}
