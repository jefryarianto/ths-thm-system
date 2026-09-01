'use client';

import { formatRupiah } from '@/lib/format';

interface DuesStats {
  totalIuran: number;
  totalTransaksi: number;
  totalLunas: number;
  totalMenunggak: number;
  iuranBulanIni: number;
  lunasBulanIni: number;
  belumBayarBulanIni: number;
  anggotaAktif: number;
}

interface MonthlyTrend {
  bulan: string;
  jumlah: number;
  transaksi: number;
}

export default function DuesCharts({
  stats,
  monthlyTrend,
}: {
  stats: DuesStats | null;
  monthlyTrend: MonthlyTrend[];
}) {
  if (!stats) return null;

  const maxTrend = Math.max(...monthlyTrend.map((t) => t.jumlah), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Kepatuhan Bulan Ini */}
      <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Kepatuhan Bulan Ini
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Lunas</span>
              <span className="font-medium text-green-600">
                {stats.lunasBulanIni} / {stats.anggotaAktif} anggota
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{
                  width: `${stats.anggotaAktif > 0 ? (stats.lunasBulanIni / stats.anggotaAktif) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Belum Bayar</span>
              <span className="font-medium text-red-600">{stats.belumBayarBulanIni} anggota</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-400 rounded-full transition-all duration-500"
                style={{
                  width: `${stats.anggotaAktif > 0 ? (stats.belumBayarBulanIni / stats.anggotaAktif) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500">
              Iuran terkumpul bulan ini:{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatRupiah(stats.iuranBulanIni)}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Tren Iuran Bulanan */}
      <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Tren Iuran Bulanan
        </h3>
        {monthlyTrend.length > 0 ? (
          <div className="flex items-end gap-2 h-32">
            {monthlyTrend.map((t, i) => {
              const height = (t.jumlah / maxTrend) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1 group relative"
                >
                  <div
                    className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition cursor-pointer min-h-[4px]"
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${t.bulan}: ${formatRupiah(t.jumlah)}`}
                  />
                  <span className="text-[10px] text-gray-400 truncate w-full text-center">
                    {t.bulan}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-sm text-gray-400">
            Belum ada data tren bulanan
          </div>
        )}
      </div>
    </div>
  );
}
