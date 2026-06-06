'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import DataTable from '@/components/tables/data-table';
import { Plus } from 'lucide-react';

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  approved: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
  rejected: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
};

const columns = [
  { key: 'namaLengkap', label: 'Nama', render: (r: any) => <span className="font-medium">{r.namaLengkap}</span> },
  { key: 'jenisKelamin', label: 'JK' },
  { key: 'noHp', label: 'No. HP / Email', render: (r: any) => r.noHp || r.email || '-' },
  { key: 'sumberInfo', label: 'Sumber Info' },
  {
    key: 'status',
    label: 'Status',
    render: (r: any) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status] || 'bg-gray-100 text-gray-700'}`}>
        {r.status}
      </span>
    ),
  },
];

export default function RegistrationsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: res } = await apiClient.get('/registrations', { params: { page, limit: 10 } });
      setData(res.data);
      setMeta(res.meta);
      setLoading(false);
    })();
  }, [page]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Pendaftaran Baru</h1>
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