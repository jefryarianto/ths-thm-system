'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import DataTable from '@/components/tables/data-table';
import { Plus, Upload } from 'lucide-react';
import type { Candidate } from '@/types';

export default function CandidatesPage() {
  const [data, setData] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });

  const fetch = async (search?: string) => {
    setLoading(true);
    const { data: res } = await apiClient.get('/candidates', { params: { page, limit: 10, search } });
    setData(res.data); setMeta(res.meta); setLoading(false);
  };

  useEffect(() => { fetch(); }, [page]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Manajemen Calon Anggota</h1>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 border rounded-md text-sm text-gray-700 hover:bg-gray-50"><Upload size={14} /> Import</button>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"><Plus size={14} /> Tambah</button>
        </div>
      </div>
      <DataTable
        data={data} loading={loading} page={page} totalPages={meta.totalPages} total={meta.total}
        onPageChange={setPage} onSearch={(q) => fetch(q)}
        columns={[
          { key: 'namaLengkap', label: 'Nama', render: (c) => <span className="font-medium">{c.namaLengkap}</span> },
          { key: 'jenisKelamin', label: 'JK' },
          { key: 'noHp', label: 'No. HP', render: (c) => c.noHp || '-' },
          { key: 'email', label: 'Email', render: (c) => c.email || '-' },
          { key: 'status', label: 'Status', render: (c) => {
            const colors: Record<string, string> = { diusulkan: 'bg-gray-100 text-gray-700', mengikuti_pendadaran: 'bg-blue-100 text-blue-700', lulus: 'bg-green-100 text-green-700', gagal: 'bg-red-100 text-red-700', dibatalkan: 'bg-orange-100 text-orange-700' };
            return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[c.status] || ''}`}>{c.status}</span>;
          }},
        ]}
      />
    </div>
  );
}