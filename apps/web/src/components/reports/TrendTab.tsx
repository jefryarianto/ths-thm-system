'use client';

import { useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useApi } from '@/lib/hooks/use-api';
import EmptyState from '@/components/ui/empty-state';

interface TrendPoint {
  date: string;
  count: number;
}

export default function TrendTab() {
  const { data, loading, error, refetch } = useApi<TrendPoint[]>(
    () =>
      apiClient
        .get('/reports/chart/members-over-time')
        .then((res) => res.data.data as TrendPoint[]),
    [],
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  if (error || !data || data.length === 0) {
    return (
      <EmptyState icon={TrendingUp} title="Belum Ada Data" message="Belum ada data tren anggota." />
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="text-blue-600" size={20} />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Pertumbuhan Anggota (30 Hari Terakhir)
        </h3>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip labelFormatter={(label) => `Tanggal: ${label}`} />
          <Line
            type="monotone"
            dataKey="count"
            name="Anggota Baru"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
