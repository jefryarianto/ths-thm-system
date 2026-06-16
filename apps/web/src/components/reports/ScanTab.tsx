'use client';

import { Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ScanStats {
  totalAbsensi: number;
  totalDokumen: number;
  activeKegiatan: number;
  absensiHarian: Array<{ tanggal: string; count: number }>;
  recentAbsensi: Array<{
    namaAnggota: string;
    nomorAnggota: string;
    kegiatan: string;
    hadir: boolean;
    catatan: string;
    tanggal: string;
  }>;
}

interface ScanTabProps {
  scanStats: ScanStats | null;
  loading: boolean;
}

export default function ScanTab({ scanStats, loading }: ScanTabProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl border p-6 animate-pulse h-24"
          />
        ))}
      </div>
    );
  }

  if (!scanStats) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Activity size={40} className="mx-auto mb-3 opacity-40" />
        <p>Gagal memuat data absensi</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <p className="text-xs text-gray-500">Total Absensi</p>
          <p className="text-2xl font-bold text-blue-600">
            {scanStats.totalAbsensi.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <p className="text-xs text-gray-500">Dokumen Tersedia</p>
          <p className="text-2xl font-bold text-purple-600">
            {scanStats.totalDokumen.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <p className="text-xs text-gray-500">Kegiatan Aktif</p>
          <p className="text-2xl font-bold text-green-600">
            {scanStats.activeKegiatan.toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      {/* Absensi Harian Chart */}
      {scanStats.absensiHarian && scanStats.absensiHarian.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Absensi 30 Hari Terakhir
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={scanStats.absensiHarian}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="tanggal"
                tick={{ fontSize: 9, fill: '#6b7280' }}
                tickLine={false}
                tickFormatter={(v) => {
                  const d = new Date(v + 'T00:00:00');
                  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                }}
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                labelFormatter={(l) =>
                  new Date(l + 'T00:00:00').toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                }
              />
              <Bar dataKey="count" fill="#6366f1" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Absensi */}
      {scanStats.recentAbsensi && scanStats.recentAbsensi.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Absensi Terbaru</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {scanStats.recentAbsensi.slice(0, 10).map((a, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {a.namaAnggota}
                  </p>
                  <p className="text-xs text-gray-500">
                    {a.kegiatan} · {a.nomorAnggota}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.hadir ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'}`}
                  >
                    {a.hadir ? 'Hadir' : 'Tidak'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(a.tanggal).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
