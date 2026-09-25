'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { PublicLayout } from '@/components';
import { useI18n } from '@/i18n/context';
import {
  ChevronRight,
  Image as ImageIcon,
  X,
  Maximize2,
  ChevronLeft as ArrowLeftIcon,
  ChevronRight as ArrowRightIcon,
  Search,
} from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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
    return data.filter((item) => {
      const matchCat = selectedCategory === 'ALL' || item.kategori === selectedCategory;
      const matchSearch =
        searchQuery === '' ||
        item.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.deskripsi && item.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [data, selectedCategory, searchQuery]);

  const openLightbox = (id: string) => {
    const index = filteredData.findIndex((item) => item.id === id);
    if (index !== -1) setLightboxIndex(index);
  };

  const closeLightbox = () => setLightboxIndex(null);

  const prevLightboxPhoto = useCallback(() => {
    if (lightboxIndex === null || filteredData.length === 0) return;
    setLightboxIndex((prev) => (prev! - 1 + filteredData.length) % filteredData.length);
  }, [lightboxIndex, filteredData.length]);

  const nextLightboxPhoto = useCallback(() => {
    if (lightboxIndex === null || filteredData.length === 0) return;
    setLightboxIndex((prev) => (prev! + 1) % filteredData.length);
  }, [lightboxIndex, filteredData.length]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevLightboxPhoto();
      else if (e.key === 'ArrowRight') nextLightboxPhoto();
      else if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, prevLightboxPhoto, nextLightboxPhoto]);

  const currentLightboxPhoto = lightboxIndex !== null ? filteredData[lightboxIndex] : null;

  return (
    <PublicLayout>
      {/* Page Header */}
      <div className="bg-gradient-to-r from-navy-700 to-navy-900 py-12 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
            <Link href="/" className="hover:text-white transition-colors">
              Beranda
            </Link>
            <ChevronRight size={14} />
            <span className="text-gold-400">{t.nav.galeri}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold">{t.galeri.title}</h1>
          <p className="text-white/70 text-sm sm:text-base mt-2 max-w-xl">
            Dokumentasi momen, kejuaraan, pendadaran, dan kegiatan rohani THS-THM di seluruh wilayah.
          </p>
          <div className="w-16 h-1 bg-gold-400 mt-4 rounded-full" />
        </div>
      </div>

      {loading ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-navy-800 border-t-transparent" />
        </div>
      ) : (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Controls: Search + Categories */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  selectedCategory === 'ALL'
                    ? 'bg-navy-800 text-white shadow-md'
                    : 'bg-white dark:bg-gray-800 text-navy-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-navy-50'
                }`}
              >
                {t.galeri.allCategories || 'Semua Foto'} ({data.length})
              </button>
              {categories.map((cat) => {
                const count = data.filter((item) => item.kategori === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                      selectedCategory === cat
                        ? 'bg-navy-800 text-white shadow-md'
                        : 'bg-white dark:bg-gray-800 text-navy-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-navy-50'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72 shrink-0">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari foto..."
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm text-navy-900 dark:text-white focus:ring-2 focus:ring-navy-500 outline-none"
              />
            </div>
          </div>

          {/* Photo Grid */}
          {filteredData.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredData.map((item) => (
                <div
                  key={item.id}
                  onClick={() => openLightbox(item.id)}
                  className="group relative bg-navy-950 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all cursor-pointer aspect-[4/3]"
                >
                  {item.url ? (
                    <img
                      src={item.url.startsWith('/') ? item.url : `/api/uploads/${item.url}`}
                      alt={item.judul}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-navy-800 to-navy-950 flex flex-col items-center justify-center text-white/40">
                      <ImageIcon size={48} className="mb-2 text-gold-400/50" />
                      <span className="text-[11px] font-bold tracking-widest uppercase text-gold-400">
                        THS-THM GALERI
                      </span>
                    </div>
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-[11px] text-navy-950 bg-gold-400 px-3 py-1 rounded-full uppercase tracking-wider font-bold shadow-sm">
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
              <p className="text-xl mb-1 font-semibold text-gray-700 dark:text-gray-300">
                {t.galeri.empty}
              </p>
              <p className="text-sm">{t.galeri.emptyDesc}</p>
            </div>
          )}
        </section>
      )}

      {/* Enhanced Lightbox Carousel Modal */}
      {currentLightboxPhoto && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-20 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            title="Tutup (Esc)"
          >
            <X size={22} />
          </button>

          {/* Nav Left Button */}
          {filteredData.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevLightboxPhoto();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shadow-lg"
              title="Foto Sebelumnya (Panah Kiri)"
            >
              <ArrowLeftIcon size={24} />
            </button>
          )}

          {/* Nav Right Button */}
          {filteredData.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextLightboxPhoto();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shadow-lg"
              title="Foto Berikutnya (Panah Kanan)"
            >
              <ArrowRightIcon size={24} />
            </button>
          )}

          {/* Modal Content */}
          <div
            className="relative max-w-4xl w-full bg-navy-950 rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Counter Header */}
            <div className="px-6 py-3 bg-navy-900 border-b border-white/10 flex items-center justify-between text-xs text-white/70">
              <span className="font-semibold text-gold-400">
                {currentLightboxPhoto.kategori}
              </span>
              <span>
                {t.galeri.photoCount || 'Foto'} {lightboxIndex + 1} {t.galeri.of || 'dari'}{' '}
                {filteredData.length}
              </span>
            </div>

            {/* Media Canvas */}
            <div className="relative max-h-[70vh] bg-black flex items-center justify-center overflow-hidden">
              {currentLightboxPhoto.url ? (
                <img
                  src={
                    currentLightboxPhoto.url.startsWith('/')
                      ? currentLightboxPhoto.url
                      : `/api/uploads/${currentLightboxPhoto.url}`
                  }
                  alt={currentLightboxPhoto.judul}
                  className="max-h-[70vh] w-auto max-w-full object-contain"
                />
              ) : (
                <div className="h-80 w-full flex flex-col items-center justify-center text-white/40">
                  <ImageIcon size={64} className="mb-2 text-gold-400" />
                  <span>Foto tidak tersedia</span>
                </div>
              )}
            </div>

            {/* Caption Footer */}
            <div className="p-6 text-white bg-navy-950">
              <h3 className="text-xl font-bold font-serif text-white mb-2">
                {currentLightboxPhoto.judul}
              </h3>
              {currentLightboxPhoto.deskripsi && (
                <p className="text-sm text-gray-300 leading-relaxed">
                  {currentLightboxPhoto.deskripsi}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
