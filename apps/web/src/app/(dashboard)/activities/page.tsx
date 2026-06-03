'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import DataTable from '@/components/tables/data-table';
import { Plus } from 'lucide-react';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  published: 'bg-blue-100 text-blue-700',
  closed: 'bg-green-100 text-green-700',
};

const columns = [
  { key: 'nama', label: 'Nama', render: (a: any) => <span className="font-medium">{a.nama}</span> },
  { key: 'tipe', label: 'Tipe' },
  { key: 'tanggalMulai', label: 'Mulai', render: (a: any) => new Date(a.tanggalMulai).toLocaleDateString('id-ID') },
  {
    key: 'status',
    label: 'Status',
    render: (a: any) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[a.status] || ''}`}>
        {a.status}
      </span>
    ),
  },
];

export default function ActivitiesPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: res } = await apiClient.get('/activities', { params: { page, limit: 10 } });
      setData(res.data);
      setMeta(res.meta);
      setLoading(false);
    })();
  }, [page]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Manajemen Kegiatan</h1>
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