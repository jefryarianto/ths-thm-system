'use client';

import { useEffect, useState, useMemo } from 'react';
import { PublicLayout } from '@/components';
import { useI18n } from '@/i18n/context';
import { ChevronRight, Image as ImageIcon, X, Maximize2 } from 'lucide-react';
import Link from 'next/link';
import { logError } from '@/lib/error-logger';

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
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [lightboxPhoto, setLightboxPhoto] = useState<GambarGaleri | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/public/galeri');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(json.data || []);
      } catch (error) {
        logError(error, { module: 'Galeri', action: 'fetch' });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const categories = useMemo(() => {
    const setCat = new Set<string>();
    data.forEach((item) => {
      if (item.kategori) setCat.add(item.kategori);
    });
    return Array.from(setCat);
  }, [data]);

  const filteredData = useMemo(() => {
    if (selectedCategory === 'ALL') return data;
    return data.filter((item) => item.kategori === selectedCategory);
  }, [data, selectedCategory]);

  return (
    <PublicLayout>
      {/* Page Header */}
      <div className="bg-gradient-to-r from-navy-700 to-navy-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
            <Link href="/" className="hover:text-white transition-colors">
              Beranda
            </Link>
            <ChevronRight size={14} />
            <span className="text-gold-400">{t.nav.galeri}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">{t.galeri.title}</h1>
          <div className="w-16 h-1 bg-gold-400 mt-4 rounded-full" />
        </div>
      </div>

      {loading ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-navy-800 border-t-transparent" />
        </div>
      ) : (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Category Filter Tabs */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-10 justify-center sm:justify-start">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  selectedCategory === 'ALL'
                    ? 'bg-navy-800 text-white shadow-md'
                    : 'bg-white dark:bg-gray-800 text-navy-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-navy-50'
                }`}
              >
                {t.galeri.allCategories || 'Semua Kategori'}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    selectedCategory === cat
                      ? 'bg-navy-800 text-white shadow-md'
                      : 'bg-white dark:bg-gray-800 text-navy-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-navy-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Photo Grid */}
          {filteredData.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredData.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setLightboxPhoto(item)}
                  className="group relative bg-navy-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all cursor-pointer aspect-[4/3]"
                >
                  {item.url ? (
                    <img
                      src={item.url.startsWith('/') ? item.url : `/api/uploads/${item.url}`}
                      alt={item.judul}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-navy-800 to-navy-900 flex flex-col items-center justify-center text-white/30">
                      <ImageIcon size={48} className="mb-2 text-gold-400/40" />
                      <span className="text-xs font-semibold tracking-widest uppercase">THS-THM GALLERY</span>
                    </div>
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-[11px] text-navy-900 bg-gold-400 px-3 py-1 rounded-full uppercase tracking-wider font-bold">
                        {item.kategori}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <Maximize2 size={14} />
                      </div>
                    </div>

                    <div className="text-white">
                      <h3 className="font-bold text-lg leading-tight mb-1 font-serif group-hover:text-gold-300 transition-colors">
                        {item.judul}
                      </h3>
                      {item.deskripsi && (
                        <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed">
                          {item.deskripsi}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400 bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
              <ImageIcon size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-xl mb-1 font-semibold text-gray-700 dark:text-gray-300">{t.galeri.empty}</p>
              <p className="text-sm">{t.galeri.emptyDesc}</p>
            </div>
          )}
        </section>
      )}

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-navy-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxPhoto(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors"
            >
              <X size={20} />
            </button>

            <div className="relative max-h-[70vh] bg-black flex items-center justify-center overflow-hidden">
              {lightboxPhoto.url ? (
                <img
                  src={lightboxPhoto.url.startsWith('/') ? lightboxPhoto.url : `/api/uploads/${lightboxPhoto.url}`}
                  alt={lightboxPhoto.judul}
                  className="max-h-[70vh] w-auto max-w-full object-contain"
                />
              ) : (
                <div className="h-80 w-full flex flex-col items-center justify-center text-white/30">
                  <ImageIcon size={64} className="mb-2 text-gold-400" />
                  <span>Foto tidak tersedia</span>
                </div>
              )}
            </div>

            <div className="p-6 text-white bg-navy-950">
              <span className="text-xs font-bold uppercase tracking-widest text-gold-400 px-2.5 py-1 bg-gold-400/10 rounded-full border border-gold-400/20 inline-block mb-2">
                {lightboxPhoto.kategori}
              </span>
              <h3 className="text-xl font-bold font-serif text-white mb-2">
                {lightboxPhoto.judul}
              </h3>
              {lightboxPhoto.deskripsi && (
                <p className="text-sm text-gray-300 leading-relaxed">
                  {lightboxPhoto.deskripsi}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
