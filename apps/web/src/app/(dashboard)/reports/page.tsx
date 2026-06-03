'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import DataTable from '@/components/tables/data-table';

const memberColumns = [
  { key: 'namaLengkap', label: 'Nama', render: (m: any) => <span className="font-medium">{m.namaLengkap}</span> },
  { key: 'nomorAnggota', label: 'No. Anggota' },
  { key: 'statusKeanggotaan', label: 'Status' },
  { key: 'createdAt', label: 'Terdaftar', render: (m: any) => new Date(m.createdAt).toLocaleDateString('id-ID') },
];

export default function ReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });

  useEffect(() => {
    (async () => {
      const { data: res } = await apiClient.get('/reports/dashboard');
      setStats(res.data);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: res } = await apiClient.get('/reports/members', { params: { page, limit: 10 } });
      setData(res.data);
      setMeta(res.meta);
      setLoading(false);
    })();
  }, [page]);

  const statCards = stats ? [
    { label: 'Total Anggota', value: stats.totalMembers, color: 'text-blue-600' },
    { label: 'Total Calon', value: stats.totalCandidates, color: 'text-orange-600' },
    { label: 'Lulus Pendadaran', value: stats.totalGraduated, color: 'text-green-600' },
    { label: 'Pending Validasi', value: stats.pendingValidasi, color: 'text-yellow-600' },
  ] : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Laporan & Statistik</h1>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {statCards.map((s) => (
            <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-2">
        <h2 className="text-lg font-medium text-gray-700">Data Anggota</h2>
      </div>

      <DataTable
        data={data}
        loading={loading}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={setPage}
        columns={memberColumns}
      />
    </div>
  );
}