'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import DataTable from '@/components/tables/data-table';
import { Plus } from 'lucide-react';

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  disetujui: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
  ditolak: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
  diproses: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
};

const columns = [
  { key: 'tipe', label: 'Tipe' },
  {
    key: 'status',
    label: 'Status',
    render: (c: any) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status] || 'bg-gray-100 text-gray-700'}`}>
        {c.status}
      </span>
    ),
  },
  { key: 'anggota', label: 'Anggota', render: (c: any) => c.anggota?.namaLengkap || '-' },
  { key: 'createdAt', label: 'Tanggal', render: (c: any) => new Date(c.createdAt).toLocaleDateString('id-ID') },
];

export default function ClaimsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: res } = await apiClient.get('/claims', { params: { page, limit: 10 } });
      setData(res.data);
      setMeta(res.meta);
      setLoading(false);
    })();
  }, [page]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Manajemen Klaim</h1>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
          <Plus size={14} /> Tambah
        </button>
      </div>
      <DataTable
        data={data}
        loading={loading}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={setPage}
        columns={columns}
      />
    </div>
  );
}