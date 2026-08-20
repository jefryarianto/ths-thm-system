'use client';

import { useEffect, useState } from 'react';
import { PublicLayout } from '@/components';
import { useI18n } from '@/i18n/context';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface GambarGaleri {
  id: string;
  url: string;
  judul: string;
  deskripsi?: string;
  kategori: string;
}

export default function GaleriPage() {
  const { t } = useI18n();
  const [data, setData] = useState<GambarGaleri[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/public/galeri');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(json.data || []);
      } catch (error) {
        console.error('Error fetching galeri:', error);
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
            <span className="text-gold-400">{t.nav.galeri}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white font-serif">{t.galeri.title}</h1>
          <div className="w-16 h-1 bg-gold-400 mt-4 rounded-full" />
        </div>
      </div>

      {loading ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
        </div>
      ) : (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {data.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.map((item) => (
                <div key={item.id} className="group relative bg-primary-50 rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all aspect-[4/3]">
                  <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                    <span className="text-6xl opacity-30 group-hover:opacity-60 transition-opacity">🖼️</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-primary-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-5 flex flex-col justify-end">
                    <div className="text-white">
                      <p className="text-xs text-gold-300 uppercase tracking-wide mb-1 font-semibold">{item.kategori}</p>
                      <h3 className="font-bold text-lg">{item.judul}</h3>
                      {item.deskripsi && <p className="text-sm opacity-80 mt-1">{item.deskripsi}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <p className="text-xl mb-2">{t.galeri.empty}</p>
              <p>{t.galeri.emptyDesc}</p>
            </div>
          )}
        </section>
      )}
    </PublicLayout>
  );
}
