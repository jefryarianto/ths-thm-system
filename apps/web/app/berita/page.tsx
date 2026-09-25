'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components';
import { useI18n } from '@/i18n/context';
import { Calendar, ArrowRight, TrendingUp, Clock, Newspaper, ChevronRight } from 'lucide-react';
import { logError } from '@/lib/error-logger';

interface Berita {
  id: string;
  judul: string;
  ringkasan: string;
  gambar?: string;
  tanggal: string;
  slug: string;
}

export default function BeritaPage() {
  const { t } = useI18n();
  const [data, setData] = useState<Berita[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredData = data.filter((item) =>
    item.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.ringkasan.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <span className="text-gold-400">{t.nav.berita}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">{t.berita.title}</h1>
          <div className="w-16 h-1 bg-gold-400 mt-4 rounded-full" />
        </div>
      </div>

      {loading ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-navy-800 border-t-transparent" />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {filteredData.length === 0 ? (
                <div className="text-center py-20 text-gray-400 bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <Newspaper size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">{t.berita.empty}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Featured Article (first) */}
                  {filteredData[0] && (
                    <Link
                      href={`/berita/${filteredData[0].slug}`}
                      className="block bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all group shadow-sm"
                    >
                      <div className="bg-navy-900 h-64 sm:h-80 flex items-center justify-center overflow-hidden relative">
                        {filteredData[0].gambar ? (
                          <img
                            src={`/api/uploads/${filteredData[0].gambar}`}
                            alt={filteredData[0].judul}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-navy-800 to-navy-950 flex flex-col items-center justify-center text-white/30">
                            <Newspaper size={64} className="mb-2 text-gold-400/40" />
                            <span className="text-xs font-semibold tracking-widest uppercase">HEADLINE NEWS</span>
                          </div>
                        )}
                        <div className="absolute top-4 left-4">
                          <span className="bg-gold-400 text-navy-900 px-3 py-1 rounded-full text-xs font-bold shadow-md uppercase tracking-wider">
                            Headline
                          </span>
                        </div>
                      </div>
                      <div className="p-6 sm:p-8">
                        <div className="flex items-center gap-2 text-xs text-gold-600 dark:text-gold-400 font-medium mb-3">
                          <Calendar size={14} />
                          <time>{formatTanggal(filteredData[0].tanggal)}</time>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold font-serif text-navy-900 dark:text-white group-hover:text-gold-500 transition-colors mb-3 leading-tight">
                          {filteredData[0].judul}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base leading-relaxed line-clamp-3">
                          {filteredData[0].ringkasan}
                        </p>
                      </div>
                    </Link>
                  )}

                  {/* Remaining articles in grid */}
                  <div className="grid sm:grid-cols-2 gap-6">
                    {filteredData.slice(1).map((berita) => (
                      <Link
                        key={berita.id}
                        href={`/berita/${berita.slug}`}
                        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all group flex flex-col justify-between shadow-sm"
                      >
                        <div>
                          <div className="bg-navy-900 h-44 flex items-center justify-center overflow-hidden relative">
                            {berita.gambar ? (
                              <img
                                src={`/api/uploads/${berita.gambar}`}
                                alt={berita.judul}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-navy-800 to-navy-900 flex flex-col items-center justify-center text-white/30">
                                <Newspaper size={40} className="mb-1 text-gold-400/40" />
                                <span className="text-[10px] font-semibold tracking-widest">THS-THM</span>
                              </div>
                            )}
                          </div>
                          <div className="p-6">
                            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-400 mb-2">
                              <Calendar size={12} />
                              <time>{formatTanggal(berita.tanggal)}</time>
                            </div>
                            <h3 className="font-bold text-lg font-serif text-navy-800 dark:text-white group-hover:text-gold-500 transition-colors line-clamp-2 mb-2">
                              {berita.judul}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                              {berita.ringkasan}
                            </p>
                          </div>
                        </div>

                        <div className="px-6 pb-6 pt-0 text-xs font-bold text-navy-800 dark:text-gold-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          Baca selengkapnya <ArrowRight size={14} />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Search */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                <h3 className="font-bold text-navy-800 dark:text-white mb-3 text-xs uppercase tracking-wider font-serif">
                  Cari Berita
                </h3>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ketik kata kunci..."
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-navy-900 dark:text-white focus:ring-2 focus:ring-navy-500 outline-none"
                  />
                </div>
              </div>

              {/* Berita Terbaru */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                <h3 className="font-bold text-navy-800 dark:text-white mb-4 text-xs uppercase tracking-wider flex items-center gap-2 font-serif">
                  <TrendingUp size={16} className="text-gold-500" />
                  Berita Terbaru
                </h3>
                <div className="space-y-4">
                  {data.slice(0, 5).map((berita) => (
                    <Link key={berita.id} href={`/berita/${berita.slug}`} className="block group">
                      <h4 className="text-sm font-semibold text-navy-800 dark:text-gray-200 group-hover:text-gold-500 transition-colors line-clamp-2">
                        {berita.judul}
                      </h4>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                        <Clock size={11} />
                        <time>{formatTanggal(berita.tanggal)}</time>
                      </div>
                    </Link>
                  ))}
                  {data.length === 0 && <p className="text-sm text-gray-400">Belum ada berita</p>}
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-gradient-to-br from-navy-800 to-navy-950 rounded-2xl p-6 text-white shadow-md">
                <h3 className="font-bold mb-3 text-xs uppercase tracking-wider text-gold-400 font-serif">
                  Akses Cepat
                </h3>
                <ul className="space-y-2.5">
                  <li>
                    <Link
                      href="/sejarah"
                      className="text-sm text-white/80 hover:text-gold-300 flex items-center gap-2 transition-colors"
                    >
                      <ArrowRight size={12} />
                      Sejarah THS-THM
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/kepengurusan"
                      className="text-sm text-white/80 hover:text-gold-300 flex items-center gap-2 transition-colors"
                    >
                      <ArrowRight size={12} />
                      Kepengurusan
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/struktur-organisasi"
                      className="text-sm text-white/80 hover:text-gold-300 flex items-center gap-2 transition-colors"
                    >
                      <ArrowRight size={12} />
                      Struktur Organisasi
                    </Link>
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
