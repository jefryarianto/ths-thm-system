'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import DataTable from '@/components/tables/data-table';
import { Plus } from 'lucide-react';

export default function GraduationsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: res } = await apiClient.get('/graduations', { params: { page, limit: 10 } });
      setData(res.data); setMeta(res.meta); setLoading(false);
    })();
  }, [page]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Manajemen Pendadaran</h1>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"><Plus size={14} /> Jadwal Pendadaran</button>
      </div>
      <DataTable
        data={data} loading={loading} page={page} totalPages={meta.totalPages} total={meta.total}
        onPageChange={setPage}
        columns={[
          { key: 'nama', label: 'Nama Kegiatan', render: (g) => <span className="font-medium">{g.nama}</span> },
          { key: 'tanggalMulai', label: 'Mulai', render: (g) => new Date(g.tanggalMulai).toLocaleDateString('id-ID') },
          { key: 'tanggalSelesai', label: 'Selesai', render: (g) => new Date(g.tanggalSelesai).toLocaleDateString('id-ID') },
          { key: 'lokasi', label: 'Lokasi', render: (g) => g.lokasi || '-' },
          { key: 'status', label: 'Status', render: (g) => {
            const colors: Record<string, string> = { draft: 'bg-gray-100 text-gray-700', published: 'bg-blue-100 text-blue-700', closed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' };
            return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[g.status] || ''}`}>{g.status}</span>;
          }},
        ]}
      />
    </div>
  );
}