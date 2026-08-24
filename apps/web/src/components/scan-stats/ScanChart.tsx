'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface ChartDataPoint {
  tanggal: string;
  count: number;
}

interface ScanChartProps {
  data: ChartDataPoint[];
}

export default function ScanChart({ data }: ScanChartProps) {
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');

  const filteredChart = data.filter((d) => {
    if (dateRangeStart && d.tanggal < dateRangeStart) return false;
    if (dateRangeEnd && d.tanggal > dateRangeEnd) return false;
    return true;
  });

  const totalScanCount = filteredChart.reduce((s, d) => s + d.count, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Absensi 30 Hari Terakhir
          <span className="ml-2 text-xs font-normal text-gray-400">
            ({totalScanCount.toLocaleString('id-ID')} scan)
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <input
            name="dateRangeStart"
            type="date"
            value={dateRangeStart}
            onChange={(e) => setDateRangeStart(e.target.value)}
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <span className="text-xs text-gray-400">-</span>
          <input
            name="dateRangeEnd"
            type="date"
            value={dateRangeEnd}
            onChange={(e) => setDateRangeEnd(e.target.value)}
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>
      {filteredChart.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={filteredChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="tanggal"
              tickFormatter={(v: string) => {
                const d = new Date(v);
                return `${d.getDate()}/${d.getMonth() + 1}`;
              }}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
            />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
            <Tooltip
              labelFormatter={(v: string) =>
                new Date(v).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              }
              formatter={(value: number) => [`${value} scan`, 'Absensi']}
            />
            <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
          {dateRangeStart || dateRangeEnd
            ? 'Tidak ada data pada rentang tanggal ini'
            : 'Belum ada data absensi'}
        </div>
      )}
    </div>
  );
}
