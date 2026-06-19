'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { ArrowLeft, FileText } from 'lucide-react';

interface DocumentDetail {
  id: string;
  tipe: string;
  nomorDokumen: string;
  status: string;
  anggota?: { id: string; namaLengkap: string; nomorAnggota: string };
  createdAt: string;
}

export default function DocumentDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiClient.get(`/documents/${id}`).then(({ data }) => {
      setDoc(data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-sm text-gray-500">Memuat...</div>;
  if (!doc) return <div className="p-8 text-sm text-red-500">Dokumen tidak ditemukan</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/documents" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition">
        <ArrowLeft size={16} /> Kembali
      </Link>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText size={24} className="text-blue-500" />
          <div>
            <h1 className="text-lg font-semibold">{doc.nomorDokumen}</h1>
            <p className="text-sm text-gray-500">{doc.tipe}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Status</span><p className="font-medium">{doc.status}</p></div>
          <div><span className="text-gray-500">Dibuat</span><p className="font-medium">{new Date(doc.createdAt).toLocaleDateString('id-ID')}</p></div>
          {doc.anggota && (
            <div className="col-span-2">
              <span className="text-gray-500">Anggota</span>
              <p className="font-medium">{doc.anggota.namaLengkap} ({doc.anggota.nomorAnggota})</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
