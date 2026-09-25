'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components';
import { useI18n } from '@/i18n/context';
import {
  Calendar,
  ArrowRight,
  TrendingUp,
  Clock,
  Newspaper,
  ChevronRight,
  Search,
  X,
  BookOpen,
} from 'lucide-react';
import { logError } from '@/lib/error-logger';

interface Berita {
  id: string;
  judul: string;
  ringkasan: string;
  gambar?: string;
  tanggal: string;
  slug: string;
  kategori?: string;
}

export default function BeritaPage() {
  const { t } = useI18n();
  const [data, setData] = useState<Berita[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/public/berita');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(json.data || []);
      } catch (error) {
        logError(error, { module: 'Berita', action: 'fetch' });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatTanggal = (tanggal: string) =>
    new Date(tanggal).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  const estimateReadTime = (text: string) => {
    const words = text ? text.trim().split(/\s+/).length : 0;
    const minutes = Math.max(1, Math.ceil((words + 150) / 180));
    return `${minutes} ${t.berita.readTime || 'mnt baca'}`;
  };

  const categories = useMemo(() => {
    const setCat = new Set<string>();
    data.forEach((item) => {
      if (item.kategori) setCat.add(item.kategori);
    });
    return Array.from(setCat);
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchCategory = selectedCategory === 'ALL' || item.kategori === selectedCategory;
      const matchSearch =
        searchQuery === '' ||
        item.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ringkasan.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [data, selectedCategory, searchQuery]);

  const headlineBerita = filteredData[0];
  const gridBerita = filteredData.slice(1);

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
            <span className="text-gold-400">{t.nav.berita}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold">{t.berita.title}</h1>
          <p className="text-white/70 text-sm sm:text-base mt-2 max-w-xl">
            Kabar terbaru seputar kegiatan, pengumuman resmi, dan karya pengabdian THS-THM.
          </p>
          <div className="w-16 h-1 bg-gold-400 mt-4 rounded-full" />
        </div>
      </div>

      {loading ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-navy-800 border-t-transparent" />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  selectedCategory === 'ALL'
                    ? 'bg-navy-800 text-white shadow-md'
                    : 'bg-white dark:bg-gray-800 text-navy-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-navy-50'
                }`}
              >
                {t.berita.allCategories || 'Semua Berita'} ({data.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    selectedCategory === cat
                      ? 'bg-navy-800 text-white shadow-md'
                      : 'bg-white dark:bg-gray-800 text-navy-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-navy-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80 shrink-0">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.berita.searchPlaceholder || 'Cari judul berita...'}
                className="w-full pl-9 pr-9 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm text-navy-900 dark:text-white focus:ring-2 focus:ring-navy-500 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-2">
              {filteredData.length === 0 ? (
                <div className="text-center py-20 text-gray-400 bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <Newspaper size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                    {t.berita.empty}
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Headline Article (Redesigned 2-Column Card) */}
                  {headlineBerita && (
                    <Link
                      href={`/berita/${headlineBerita.slug}`}
                      className="block bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 group shadow-sm"
                    >
                      <div className="grid md:grid-cols-12 items-stretch">
                        <div className="md:col-span-7 bg-navy-950 h-64 md:h-auto min-h-[260px] relative overflow-hidden">
                          {headlineBerita.gambar ? (
                            <img
                              src={`/api/uploads/${headlineBerita.gambar}`}
                              alt={headlineBerita.judul}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 flex flex-col items-center justify-center text-white/40 p-6">
                              <Newspaper size={56} className="mb-2 text-gold-400/50" />
                              <span className="text-xs font-bold tracking-widest uppercase text-gold-400">
                                HEADLINE BERITA
                              </span>
                            </div>
                          )}
                          <div className="absolute top-4 left-4">
                            <span className="bg-gold-400 text-navy-950 px-3.5 py-1 rounded-full text-xs font-bold shadow-md uppercase tracking-wider">
                              Headline
                            </span>
                          </div>
                        </div>

                        <div className="md:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                              <span className="flex items-center gap-1">
                                <Calendar size={13} className="text-gold-500" />
                                <time>{formatTanggal(headlineBerita.tanggal)}</time>
                              </span>
                              <span>&bull;</span>
                              <span className="flex items-center gap-1">
                                <Clock size={13} className="text-gold-500" />
                                <span>{estimateReadTime(headlineBerita.ringkasan)}</span>
                              </span>
                            </div>

                            <h2 className="text-xl sm:text-2xl font-bold font-serif text-navy-900 dark:text-white group-hover:text-gold-500 transition-colors mb-3 leading-snug">
                              {headlineBerita.judul}
                            </h2>

                            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed line-clamp-3 mb-4">
                              {headlineBerita.ringkasan}
                            </p>
                          </div>

                          <div className="inline-flex items-center gap-2 text-xs font-bold text-navy-800 dark:text-gold-400 group-hover:translate-x-1 transition-transform pt-2">
                            Baca Selengkapnya
                            <ArrowRight size={14} />
                          </div>
                        </div>
                      </div>
                    </Link>
                  )}

                  {/* Grid Articles */}
                  {gridBerita.length > 0 && (
                    <div className="grid sm:grid-cols-2 gap-6">
                      {gridBerita.map((berita) => (
                        <Link
                          key={berita.id}
                          href={`/berita/${berita.slug}`}
                          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between shadow-sm"
                        >
                          <div>
                            <div className="bg-navy-950 h-48 flex items-center justify-center overflow-hidden relative">
                              {berita.gambar ? (
                                <img
                                  src={`/api/uploads/${berita.gambar}`}
                                  alt={berita.judul}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-navy-800 to-navy-900 flex flex-col items-center justify-center text-white/30">
                                  <BookOpen size={40} className="mb-1 text-gold-400/40" />
                                  <span className="text-[10px] font-semibold tracking-widest text-gold-400">
                                    THS-THM
                                  </span>
                                </div>
                              )}
                              {berita.kategori && (
                                <div className="absolute top-3 left-3">
                                  <span className="bg-navy-900/90 text-white text-[10px] px-2.5 py-1 rounded-full font-semibold border border-white/10">
                                    {berita.kategori}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="p-6">
                              <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                                <span className="flex items-center gap-1">
                                  <Calendar size={12} />
                                  <time>{formatTanggal(berita.tanggal)}</time>
                                </span>
                                <span>&bull;</span>
                                <span className="flex items-center gap-1">
                                  <Clock size={12} />
                                  <span>{estimateReadTime(berita.ringkasan)}</span>
                                </span>
                              </div>

                              <h3 className="font-bold text-lg font-serif text-navy-900 dark:text-white group-hover:text-gold-500 transition-colors line-clamp-2 mb-2 leading-snug">
                                {berita.judul}
                              </h3>

                              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                                {berita.ringkasan}
                              </p>
                            </div>
                          </div>

                          <div className="px-6 pb-6 pt-0 text-xs font-bold text-navy-800 dark:text-gold-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            {t.berita.readMore || 'Baca selengkapnya'}
                            <ArrowRight size={14} />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Berita Terbaru Widget */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                <h3 className="font-bold text-navy-900 dark:text-white mb-4 text-xs uppercase tracking-wider flex items-center gap-2 font-serif">
                  <TrendingUp size={16} className="text-gold-500" />
                  Berita Terbaru
                </h3>
                <div className="space-y-4">
                  {data.slice(0, 5).map((berita) => (
                    <Link key={berita.id} href={`/berita/${berita.slug}`} className="block group">
                      <h4 className="text-sm font-semibold text-navy-800 dark:text-gray-200 group-hover:text-gold-500 transition-colors line-clamp-2 leading-snug">
                        {berita.judul}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                        <Clock size={11} />
                        <time>{formatTanggal(berita.tanggal)}</time>
                      </div>
                    </Link>
                  ))}
                  {data.length === 0 && <p className="text-sm text-gray-400">Belum ada berita</p>}
                </div>
              </div>

              {/* Informational Callout */}
              <div className="bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 rounded-2xl p-6 text-white shadow-md border border-white/10">
                <h3 className="font-bold mb-2 text-sm text-gold-400 font-serif">
                  Punya Berita Kegiatan?
                </h3>
                <p className="text-xs text-white/70 leading-relaxed mb-4">
                  Kirimkan berita kegiatan distrik, wilayah, atau ranting Anda untuk dipublikasikan di portal resmi THS-THM.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gold-400 text-navy-950 text-xs font-bold hover:bg-gold-300 transition-colors"
                >
                  Kelola Konten via Dashboard
                </Link>
              </div>
            </aside>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
