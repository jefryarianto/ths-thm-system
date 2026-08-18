'use client';

import { useEffect, useState } from 'react';
import { PublicLayout } from '@/components';
import { useI18n } from '@/i18n/context';

interface Organisasi {
  struktur: Array<{
    jabatan: string;
    nama: string;
    deskripsi: string;
  }>;
}

export default function OrganisasiPage() {
  const { t } = useI18n();
  const [data, setData] = useState<Organisasi | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/public/organisasi');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(json.data || null);
      } catch (error) {
        console.error('Error fetching organisasi:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <PublicLayout>
      {loading ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <section className="max-w-4xl mx-auto px-4 py-8 sm:py-16">
          <h1 className="text-2xl sm:text-4xl font-black text-blue-900 mb-6 sm:mb-8 text-center">{t.organisasi.title}</h1>
          <div className="grid gap-4 sm:grid-cols-2">
            {data?.struktur?.map((item, idx) => (
              <div key={idx} className="bg-blue-50 rounded-2xl p-4 sm:p-6 border border-blue-100 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-blue-900 mb-2">{item.jabatan}</h3>
                <p className="text-blue-700 font-medium mb-2">{item.nama}</p>
                <p className="text-gray-600">{item.deskripsi}</p>
              </div>
            )) || (
              <div className="col-span-full text-center text-gray-500 py-12">
                <p>{t.organisasi.empty}</p>
              </div>
            )}
          </div>
        </section>
      )}
    </PublicLayout>
  );
}
