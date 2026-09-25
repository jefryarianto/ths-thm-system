'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { PublicLayout } from '@/components';
import {
  Calendar,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Shield,
  Heart,
  Users,
  Award,
  Building2,
  MapPin,
  Newspaper,
  BookOpen,
} from 'lucide-react';
import { useI18n } from '@/i18n/context';

interface Berita {
  id: string;
  judul: string;
  ringkasan: string;
  gambar?: string;
  tanggal: string;
  slug: string;
}

export function LandingPageContent() {
  const { t } = useI18n();
  const [news, setNews] = useState<Berita[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    async function fetchNews() {
      try {
        setLoading(true);
        const res = await fetch('/api/public/berita');
        if (res.ok) {
          const json = await res.json();
          setNews(json.data?.slice(0, 6) || []);
        }
      } catch (e) {
        console.error('Failed to fetch news', e);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);

  const formatTanggal = (tanggal: string) =>
    new Date(tanggal).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  const goToSlide = (index: number) => {
    if (news.length === 0) return;
    setCurrentSlide((index + news.length) % news.length);
  };

  const prevSlide = () => goToSlide(currentSlide - 1);
  const nextSlide = useCallback(() => {
    if (news.length === 0) return;
    setCurrentSlide((prev) => (prev + 1) % news.length);
  }, [news.length]);

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    if (news.length <= 1) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(timer);
  }, [news.length, nextSlide]);

  return (
    <PublicLayout>
      {/* ── Hero Section ── */}
      <section className="relative bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 text-white overflow-hidden py-24 sm:py-32">
        {/* Decorative Watermark & Light Orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold-400/5 rounded-full blur-3xl" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-navy-600/30 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gold-500/10 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left">
          <div className="max-w-4xl mx-auto sm:mx-0">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-400/10 border border-gold-400/30 text-gold-300 text-xs sm:text-sm font-semibold tracking-wider uppercase mb-6 shadow-sm">
              <Shield size={14} className="text-gold-400" />
              <span>{t.home.tagline || 'Pro Patria et Ecclesia'}</span>
            </div>

            <h1 className="mb-6 text-4xl sm:text-6xl font-serif font-bold leading-tight tracking-tight text-white drop-shadow-md">
              TUNGGAL HATI SEMINARI &mdash; TUNGGAL HATI MARIA
            </h1>

            <p className="mb-8 text-lg sm:text-xl text-white/80 leading-relaxed font-light max-w-2xl">
              {t.home.description || 'Organisasi Seni Bela Diri Pencak Silat & Pembinaan Rohani Katolik'}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                href="/daftar"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gold-400 text-navy-900 px-8 py-4 rounded-xl text-base font-bold hover:bg-gold-300 shadow-lg hover:shadow-gold-400/20 transition-all duration-200"
              >
                Daftar Anggota Baru
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/30 text-white px-8 py-4 rounded-xl text-base font-semibold hover:bg-white/10 transition-all duration-200"
              >
                Masuk ke Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Statistics Counter Section ── */}
      <section className="bg-navy-900 border-t border-white/10 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gold-400/20 flex items-center justify-center text-gold-400">
                <Building2 size={24} />
              </div>
              <div className="text-3xl sm:text-4xl font-bold font-serif text-gold-400">30+</div>
              <div className="text-xs sm:text-sm text-white/70 mt-1 uppercase tracking-wider font-medium">Distrik</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gold-400/20 flex items-center justify-center text-gold-400">
                <MapPin size={24} />
              </div>
              <div className="text-3xl sm:text-4xl font-bold font-serif text-gold-400">100+</div>
              <div className="text-xs sm:text-sm text-white/70 mt-1 uppercase tracking-wider font-medium">Wilayah</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gold-400/20 flex items-center justify-center text-gold-400">
                <Users size={24} />
              </div>
              <div className="text-3xl sm:text-4xl font-bold font-serif text-gold-400">300+</div>
              <div className="text-xs sm:text-sm text-white/70 mt-1 uppercase tracking-wider font-medium">Ranting</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gold-400/20 flex items-center justify-center text-gold-400">
                <Award size={24} />
              </div>
              <div className="text-3xl sm:text-4xl font-bold font-serif text-gold-400">1985</div>
              <div className="text-xs sm:text-sm text-white/70 mt-1 uppercase tracking-wider font-medium">Tahun Berdiri</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4 Pilar Pembinaan THS-THM ── */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-gold-500 text-sm font-semibold uppercase tracking-widest">
              Prinsip Organisasi
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-navy-800 dark:text-white mt-2">
              {t.home.pilarsTitle || '4 Pilar Pembinaan THS-THM'}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mt-3 text-base">
              {t.home.pilarsSub || 'Prinsip utama pendampingan anggota untuk membentuk pribadi yang beriman, tangguh, dan berjiwa pelayan.'}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Pilar 1 */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-navy-50 dark:bg-navy-900/50 flex items-center justify-center text-navy-800 dark:text-gold-400 mb-6 group-hover:bg-navy-800 group-hover:text-gold-400 transition-colors">
                <BookOpen size={28} />
              </div>
              <h3 className="text-xl font-bold text-navy-800 dark:text-white mb-3">
                {t.home.pilars?.rohaniTitle || 'Olah Rohani'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                {t.home.pilars?.rohaniDesc || 'Pendalaman iman Katolik, sakramen, dan doa sebagai fondasi kehidupan sehari-hari.'}
              </p>
            </div>

            {/* Pilar 2 */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-navy-50 dark:bg-navy-900/50 flex items-center justify-center text-navy-800 dark:text-gold-400 mb-6 group-hover:bg-navy-800 group-hover:text-gold-400 transition-colors">
                <Shield size={28} />
              </div>
              <h3 className="text-xl font-bold text-navy-800 dark:text-white mb-3">
                {t.home.pilars?.beladiriTitle || 'Olah Raga Beladiri'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                {t.home.pilars?.beladiriDesc || 'Pelatihan fisik dan teknik pencak silat khas THS-THM untuk kesehatan dan ketangkasan.'}
              </p>
            </div>

            {/* Pilar 3 */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-navy-50 dark:bg-navy-900/50 flex items-center justify-center text-navy-800 dark:text-gold-400 mb-6 group-hover:bg-navy-800 group-hover:text-gold-400 transition-colors">
                <Users size={28} />
              </div>
              <h3 className="text-xl font-bold text-navy-800 dark:text-white mb-3">
                {t.home.pilars?.organisasiTitle || 'Keorganisasian'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                {t.home.pilars?.organisasiDesc || 'Membentuk kepemimpinan, disiplin, rasa tanggung jawab, dan kerjasama antar anggota.'}
              </p>
            </div>

            {/* Pilar 4 */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-navy-50 dark:bg-navy-900/50 flex items-center justify-center text-navy-800 dark:text-gold-400 mb-6 group-hover:bg-navy-800 group-hover:text-gold-400 transition-colors">
                <Heart size={28} />
              </div>
              <h3 className="text-xl font-bold text-navy-800 dark:text-white mb-3">
                {t.home.pilars?.persaudaraanTitle || 'Persaudaraan Katolik'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                {t.home.pilars?.persaudaraanDesc || 'Menjalin ikatan kekeluargaan dan persaudaraan sejati dalam semangat kasih Kristus.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Berita Carousel ── */}
      <section className="py-16 sm:py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="text-gold-500 text-sm font-semibold uppercase tracking-wider">
                Informasi Terkini
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold font-serif text-navy-800 dark:text-white mt-2">
                Berita Terbaru
              </h2>
            </div>
            <div className="flex gap-4">
              <button
                onClick={prevSlide}
                disabled={news.length <= 1 || loading}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Sebelumnya"
              >
                <ChevronLeft size={20} className="text-navy-600 dark:text-gray-300" />
              </button>
              <button
                onClick={nextSlide}
                disabled={news.length <= 1 || loading}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Berikutnya"
              >
                <ChevronRight size={20} className="text-navy-600 dark:text-gray-300" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex space-x-4">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="w-full flex-shrink-0 relative">
                  <div className="h-96 sm:h-[28rem] bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse">
                    <div className="absolute bottom-0 left-0 right-0 p-8 bg-black/40">
                      <div className="h-2 w-full bg-white/20 rounded mb-2 animate-pulse"></div>
                      <div className="h-4 w-3/4 bg-white/20 rounded mb-2 animate-pulse"></div>
                      <div className="h-2 w-1/2 bg-white/20 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : news.length > 0 ? (
            <>
              {/* Carousel */}
              <div className="relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 shadow-sm">
                <div
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {news.map((n) => (
                    <div key={n.id} className="w-full flex-shrink-0 relative">
                      <Link href={`/berita/${n.slug}`} className="block group">
                        <div className="relative h-96 sm:h-[28rem]">
                          {n.gambar ? (
                            <img
                              src={`/api/uploads/${n.gambar}`}
                              alt={n.judul}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-navy-800 to-navy-900 flex flex-col items-center justify-center text-white/40">
                              <Newspaper size={64} className="mb-2 text-gold-400/40" />
                              <span className="text-sm font-medium tracking-wider">THS-THM NEWS</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-black/30 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                            <div className="flex items-center gap-2 text-sm text-gold-300 font-medium mb-2">
                              <Calendar size={14} />
                              <time>{formatTanggal(n.tanggal)}</time>
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-bold font-serif mb-2 line-clamp-2 group-hover:text-gold-300 transition-colors">
                              {n.judul}
                            </h3>
                            {n.ringkasan && (
                              <p className="text-gray-300 text-sm line-clamp-2 max-w-3xl">
                                {n.ringkasan}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagination dots */}
              {news.length > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  {news.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToSlide(i)}
                      className={`h-2.5 rounded-full transition-all ${
                        i === currentSlide
                          ? 'bg-gold-400 w-8'
                          : 'bg-gray-300 dark:bg-gray-700 hover:bg-gray-400'
                      }`}
                      aria-label={`Ke slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}

              <div className="text-center mt-8">
                <Link
                  href="/berita"
                  className="inline-flex items-center gap-2 text-navy-800 dark:text-gold-400 font-semibold text-sm hover:underline transition-all"
                >
                  Lihat Semua Berita
                  <ArrowRight size={16} />
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
              <Newspaper size={40} className="mx-auto mb-3 text-gray-400" />
              <p>Belum ada berita terbaru saat ini.</p>
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}