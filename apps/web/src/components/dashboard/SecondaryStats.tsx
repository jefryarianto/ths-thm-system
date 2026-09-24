'use client';

import Link from 'next/link';
import { ACCENT_CLASSES, secondaryStats, type DashboardData } from './constants';

/**
 * Secondary statistics — strip kompak 4 item.
 *
 * Metrik yang sudah ditampilkan di "Perlu Tindakan" sengaja TIDAK
 * diulang di sini untuk menghindari duplikasi data (lihat constants.ts).
 */
export default function SecondaryStats({ data }: { data: DashboardData }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {secondaryStats.map(({ key, label, icon: Icon, accent, href }) => {
        const styles = ACCENT_CLASSES[accent];
        const rawNumber = Number(data[key as keyof DashboardData]) || 0;
        return (
          <Link
            key={key}
            href={href}
            className="card-elegant relative overflow-hidden p-3.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span
              aria-hidden="true"
              className={`absolute left-0 top-0 h-full w-1 ${styles.bar}`}
            />
            <div className="flex items-center gap-2.5 pl-1.5">
              <span className={`p-1.5 rounded-lg shrink-0 ${styles.icon}`}>
                <Icon size={15} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-base font-bold text-text leading-5 truncate">
                  {rawNumber.toLocaleString('id-ID')}
                </p>
                <p className="text-[11px] text-muted truncate">{label}</p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
