'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import DataTable from '@/components/tables/data-table';
import { Plus } from 'lucide-react';

const columns = [
  { key: 'judul', label: 'Judul', render: (d: any) => <span className="font-medium">{d.judul}</span> },
  { key: 'kategori', label: 'Kategori', render: (d: any) => d.kategori?.nama || '-' },
  { key: 'uploader', label: 'Uploader', render: (d: any) => d.uploader?.namaLengkap || '-' },
  { key: 'createdAt', label: 'Tanggal', render: (d: any) => new Date(d.createdAt).toLocaleDateString('id-ID') },
];

export default function OrgDocumentsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: res } = await apiClient.get('/org-documents', { params: { page, limit: 10 } });
      setData(res.data);
      setMeta(res.meta);
      setLoading(false);
    })();
  }, [page]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Dokumen Organisasi</h1>
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