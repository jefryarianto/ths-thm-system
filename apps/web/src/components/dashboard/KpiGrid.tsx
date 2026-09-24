'use client';

import Link from 'next/link';
import { formatRupiah, statConfigs, colorMap } from './constants';
import type { DashboardData } from './constants';

/**
 * KPI Grid — 4 indikator utama (hero).
 *
 * Peningkatan vs implementasi lama:
 *  - Label sudah akurat ("Total Kegiatan", bukan "Kegiatan Aktif").
 *  - CTA spesifik per KPI (bukan generik "Lihat detail →").
 *  - `lg:grid-cols-4` (bukan xl) agar 1024–1280px terisi penuh.
 *  - Jumlah kartu selalu 4 (mengikuti statConfigs) — tidak ada kemungkinan
 *    baris yatim.
 */
export default function KpiGrid({ data }: { data: DashboardData }) {
  return (
    <section aria-label="Indikator utama">
      <h2 className="sr-only">Indikator Utama</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statConfigs.map(({ key, label, icon: Icon, color, isCurrency, href, cta }) => {
          const styles = colorMap[color];
          const rawValue = data[key as keyof DashboardData];
          const rawNumber = Number(rawValue) || 0;
          const displayValue = isCurrency
            ? formatRupiah(rawNumber)
            : rawNumber.toLocaleString('id-ID');
          return (
            <Link
              key={key}
              href={href}
              className="card-elegant p-5 group hover:border-primary-300 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    {label}
                  </p>
                  <p className="text-[28px] leading-8 font-bold text-text mt-1.5 truncate">
                    {displayValue}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-xl ring-1 shrink-0 ${styles.ring} ${styles.bg} group-hover:scale-105 transition-transform`}
                >
                  <Icon size={22} className={styles.icon} aria-hidden="true" />
                </div>
              </div>
              <p className="mt-2 text-xs font-medium text-primary group-hover:underline">
                {cta} →
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
