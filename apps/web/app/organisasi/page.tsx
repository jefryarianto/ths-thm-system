'use client';

import { useEffect, useState } from 'react';
import { PublicLayout } from '@/components';
import { useI18n } from '@/i18n/context';
import { ChevronRight, Building2 } from 'lucide-react';
import Link from 'next/link';

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
      {/* Page Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-700 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
            <Link href="/" className="hover:text-white transition-colors">Beranda</Link>
            <ChevronRight size={14} />
            <span className="text-gold-400">{t.nav.organisasi}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white font-serif">{t.organisasi.title}</h1>
          <div className="w-16 h-1 bg-gold-400 mt-4 rounded-full" />
        </div>
      </div>

      {loading ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
        </div>
      ) : (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {data?.struktur?.length ? (
            <div className="grid sm:grid-cols-2 gap-6">
              {data.struktur.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 group-hover:bg-primary-500 transition-colors">
                      <Building2 size={18} className="text-primary-500 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-primary-500 mb-1">{item.jabatan}</h3>
                      <p className="font-semibold text-gray-900 mb-2">{item.nama}</p>
                      <p className="text-sm text-gray-600">{item.deskripsi}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <p className="text-xl">{t.organisasi.empty}</p>
            </div>
          )}
        </section>
      )}
    </PublicLayout>
  );
}
