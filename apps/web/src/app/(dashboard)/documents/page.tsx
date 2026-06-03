'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import DataTable from '@/components/tables/data-table';
import { Plus, FileText } from 'lucide-react';

const columns = [
  { key: 'nomorDokumen', label: 'No. Dokumen' },
  { key: 'tipe', label: 'Tipe' },
  { key: 'anggota', label: 'Anggota', render: (d: any) => d.anggota?.namaLengkap || '-' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Tanggal', render: (d: any) => new Date(d.createdAt).toLocaleDateString('id-ID') },
];

export default function DocumentsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: res } = await apiClient.get('/documents', { params: { page, limit: 10 } });
      setData(res.data);
      setMeta(res.meta);
      setLoading(false);
    })();
  }, [page]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Generate Dokumen</h1>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700">
            <FileText size={14} /> Generate
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
            <Plus size={14} /> Tambah
          </button>
        </div>
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