'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components';
import { useI18n } from '@/i18n/context';
import { Calendar, ArrowRight, TrendingUp, Clock } from 'lucide-react';
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

  return (
    <PublicLayout>
      {/* Page Header */}
      <div className="bg-gradient-to-r from-navy-700 to-navy-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white font-serif">{t.berita.title}</h1>
          <div className="w-16 h-1 bg-gold-400 mx-auto mt-4 rounded-full" />
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
              {data.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-xl">{t.berita.empty}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Featured Article (first) */}
                  {data[0] && (
                    <Link
                      href={`/berita/${data[0].slug}`}
                      className="block bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all group"
                    >
                      <div className="bg-navy-50 h-64 flex items-center justify-center">
                        <span className="text-7xl opacity-20">📰</span>
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            <time>{formatTanggal(data[0].tanggal)}</time>
                          </span>
                          <span className="bg-navy-50 text-navy-800 px-2 py-0.5 rounded-full font-semibold">
                            Headline
                          </span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 group-hover:text-navy-800 transition-colors mb-3">
                          {data[0].judul}
                        </h2>
                        <p className="text-gray-600 leading-relaxed">{data[0].ringkasan}</p>
                      </div>
                    </Link>
                  )}

                  {/* Remaining articles in grid */}
                  <div className="grid sm:grid-cols-2 gap-6">
                    {data.slice(1).map((berita) => (
                      <Link
                        key={berita.id}
                        href={`/berita/${berita.slug}`}
                        className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all group"
                      >
                        <div className="bg-navy-50 h-40 flex items-center justify-center">
                          <span className="text-5xl opacity-20">📰</span>
                        </div>
                        <div className="p-5">
                          <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                            <Calendar size={12} />
                            <time>{formatTanggal(berita.tanggal)}</time>
                          </div>
                          <h3 className="font-bold text-gray-900 group-hover:text-navy-800 transition-colors line-clamp-2 mb-2">
                            {berita.judul}
                          </h3>
                          <p className="text-sm text-gray-500 line-clamp-2">{berita.ringkasan}</p>
                          <div className="mt-3 text-sm text-navy-800 font-semibold flex items-center gap-1">
                            Baca selengkapnya <ArrowRight size={14} />
                          </div>
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
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider">Cari Berita</h3>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ketik kata kunci..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-200 focus:border-navy-400 outline-none"
                  />
                </div>
              </div>

              {/* Berita Terbaru */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp size={16} className="text-navy-800" />
                  Berita Terbaru
                </h3>
                <div className="space-y-4">
                  {data.slice(0, 5).map((berita) => (
                    <Link
                      key={berita.id}
                      href={`/berita/${berita.slug}`}
                      className="block group"
                    >
                      <h4 className="text-sm font-semibold text-gray-800 group-hover:text-navy-800 transition-colors line-clamp-2">
                        {berita.judul}
                      </h4>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                        <Clock size={11} />
                        <time>{formatTanggal(berita.tanggal)}</time>
                      </div>
                    </Link>
                  ))}
                  {data.length === 0 && (
                    <p className="text-sm text-gray-400">Belum ada berita</p>
                  )}
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-navy-800 rounded-xl p-5 text-white">
                <h3 className="font-bold mb-3 text-sm uppercase tracking-wider text-gold-400">
                  Akses Cepat
                </h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/sejarah" className="text-sm text-white/80 hover:text-white flex items-center gap-1">
                      <ArrowRight size={12} />
                      Sejarah THS-THM
                    </Link>
                  </li>
                  <li>
                    <Link href="/kepengurusan" className="text-sm text-white/80 hover:text-white flex items-center gap-1">
                      <ArrowRight size={12} />
                      Kepengurusan
                    </Link>
                  </li>
                  <li>
                    <Link href="/organisasi" className="text-sm text-white/80 hover:text-white flex items-center gap-1">
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
