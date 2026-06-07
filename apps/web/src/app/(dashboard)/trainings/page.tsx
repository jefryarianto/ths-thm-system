'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import DataTable from '@/components/tables/data-table';
import { Plus } from 'lucide-react';

interface TrainingRow {
  id: string;
  hariTanggal: string;
  ranting?: { nama: string };
  jenisMateri?: string;
  lokasi?: string;
  pelatih?: { namaLengkap: string };
}

const columns = [
  { key: 'hariTanggal', label: 'Tanggal', render: (t: TrainingRow) => new Date(t.hariTanggal).toLocaleDateString('id-ID') },
  { key: 'ranting', label: 'Ranting', render: (t: TrainingRow) => t.ranting?.nama || '-' },
  { key: 'jenisMateri', label: 'Materi', render: (t: TrainingRow) => t.jenisMateri || '-' },
  { key: 'lokasi', label: 'Lokasi', render: (t: TrainingRow) => t.lokasi || '-' },
  { key: 'pelatih', label: 'Pelatih', render: (t: TrainingRow) => t.pelatih?.namaLengkap || '-' },
];

export default function TrainingsPage() {
  const [data, setData] = useState<TrainingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: res } = await apiClient.get('/trainings', { params: { page, limit: 10 } });
      setData(res.data); setMeta(res.meta); setLoading(false);
    })();
  }, [page]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Manajemen Latihan</h1>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"><Plus size={14} /> Jadwal Latihan</button>
      </div>
      <DataTable
        data={data} loading={loading} page={page} totalPages={meta.totalPages} total={meta.total}
        onPageChange={setPage}
        columns={columns}
      />
    </div>
  );
}
