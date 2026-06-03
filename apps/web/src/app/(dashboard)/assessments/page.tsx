'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import DataTable from '@/components/tables/data-table';
import { Plus } from 'lucide-react';

const columns = [
  { key: 'kodeAspek', label: 'Kode' },
  { key: 'namaAspek', label: 'Aspek', render: (a: any) => <span className="font-medium">{a.namaAspek}</span> },
  { key: 'bobot', label: 'Bobot', render: (a: any) => `${Number(a.bobot) * 100}%` },
  { key: 'isActive', label: 'Aktif', render: (a: any) => a.isActive ? <span className="text-green-600">✔</span> : <span className="text-red-600">✘</span> },
];

export default function AssessmentsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: res } = await apiClient.get('/assessments/aspects', { params: { page, limit: 10 } });
      setData(res.data);
      setMeta(res.meta);
      setLoading(false);
    })();
  }, [page]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Aspek & Item Penilaian</h1>
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