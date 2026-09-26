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

interface Stats {
  totalDistrik: number;
  totalWilayah: number;
  totalRanting: number;
  totalAnggota: number;
}

export function LandingPageContent() {
  const { t } = useI18n();
  const [news, setNews] = useState<Berita[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Parallel fetch for news carousel and beranda statistics
        const [newsRes, berandaRes] = await Promise.all([
          fetch('/api/public/berita'),
          fetch('/api/public/beranda'),
        ]);
        if (newsRes.ok) {
          const json = await newsRes.json();
          setNews(json.data?.slice(0, 6) || []);
        }
        if (berandaRes.ok) {
          const json = await berandaRes.json();
          setStats(json.stats || null);
        }
      } catch (e) {
        console.error('Failed to fetch landing data', e);
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
      <section className="relative bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 text-white overflow-hidden py-14 sm:py-20">
        {/* Decorative Watermark & Light Orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold-400/5 rounded-full blur-3xl" />
          <div className="absolute top-0 right-0 w-80 h-80 bg-navy-600/30 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-70 h-70 bg-gold-500/10 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left">
          <div className="max-w-4xl mx-auto sm:mx-0">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-400/10 border border-gold-400/30 text-gold-300 text-xs sm:text-sm font-semibold tracking-wider uppercase mb-4 shadow-sm">
              <Shield size={14} className="text-gold-400" />
              <span>{t.home.tagline || 'Pro Patria et Ecclesia'}</span>
            </div>

            <h1 className="mb-4 text-3xl sm:text-5xl font-serif font-bold leading-tight tracking-tight text-white drop-shadow-md">
              TUNGGAL HATI SEMINARI &mdash; TUNGGAL HATI MARIA
            </h1>

            <p className="mb-4 text-base sm:text-lg text-white/80 leading-relaxed font-light max-w-2xl">
              {t.home.description || 'Organisasi Seni Bela Diri Pencak Silat & Pembinaan Rohani Katolik'}
            </p>

            {/* Motto */}
            <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-gold-400/20 mb-8 shadow-sm">
              <span className="text-gold-400 text-xl leading-none">“</span>
              <div>
                <p className="text-gold-300 font-serif font-semibold text-sm sm:text-base italic">
                  {t.home.motto || 'Fortiter in Re, Suaviter in Modo'}
                </p>
                <p className="text-white/60 text-xs sm:text-sm">
                  {t.home.mottoMeaning || 'Kokoh kuat dalam prinsip, luwes dan lembut cara mencapainya'}
                </p>
              </div>
              <span className="text-gold-400 text-xl leading-none">”</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/daftar"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gold-400 text-navy-950 px-6 py-3.5 rounded-xl text-base font-bold hover:bg-gold-300 shadow-lg hover:shadow-gold-400/20 transition-all duration-200"
              >
                Daftar Anggota Baru
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/30 text-white px-6 py-3.5 rounded-xl text-base font-semibold hover:bg-white/10 transition-all duration-200"
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
            {/* Distrik */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gold-400/20 flex items-center justify-center text-gold-400">
                <Building2 size={24} />
              </div>
              <div className="text-3xl sm:text-4xl font-bold font-serif text-gold-400">
                {stats?.totalDistrik ?? '—'}
              </div>
              <div className="text-xs sm:text-sm text-white/70 mt-1 uppercase tracking-wider font-medium">
                {t.home.stats?.distrik || 'Distrik'}
              </div>
            </div>

            {/* Anggota */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gold-400/20 flex items-center justify-center text-gold-400">
                <Heart size={24} />
              </div>
              <div className="text-3xl sm:text-4xl font-bold font-serif text-gold-400">
                {stats?.totalAnggota ?? '—'}
              </div>
              <div className="text-xs sm:text-sm text-white/70 mt-1 uppercase tracking-wider font-medium">
                {t.home.stats?.anggota || 'Anggota'}
              </div>
            </div>

            {/* Ranting */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gold-400/20 flex items-center justify-center text-gold-400">
                <Users size={24} />
              </div>
              <div className="text-3xl sm:text-4xl font-bold font-serif text-gold-400">
                {stats?.totalRanting ?? '—'}
              </div>
              <div className="text-xs sm:text-sm text-white/70 mt-1 uppercase tracking-wider font-medium">
                {t.home.stats?.ranting || 'Ranting'}
              </div>
            </div>

            {/* Tahun Berdiri */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gold-400/20 flex items-center justify-center text-gold-400">
                <Award size={24} />
              </div>
              <div className="text-3xl sm:text-4xl font-bold font-serif text-gold-400">1985</div>
              <div className="text-xs sm:text-sm text-white/70 mt-1 uppercase tracking-wider font-medium">
                {t.home.stats?.tahunBerdiri || 'Tahun Berdiri'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 1 Landasan 3 Pilar Pembinaan THS-THM ── */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-gold-500 text-sm font-semibold uppercase tracking-widest">
              Prinsip Organisasi
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-navy-800 dark:text-white mt-2">
              {t.home.pilarsTitle || '1 Landasan 3 Pilar Pembinaan THS-THM'}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mt-3 text-base">
              {t.home.pilarsSub || 'Seluruh pembinaan berlandaskan Iman Katolik dalam Kasih Yesus Kristus, dijabarkan melalui tiga pilar pengembangan karakter.'}
            </p>
          </div>

          {/* Landasan — highlighted foundation card */}
          <div className="max-w-3xl mx-auto mb-12">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-800 to-navy-900 text-white p-8 md:p-10 shadow-lg border border-gold-400/30">
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-gold-400/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-gold-400/5 rounded-full blur-2xl pointer-events-none" />
              <div className="relative flex items-start gap-4">
                <div className="w-14 h-14 flex-shrink-0 rounded-2xl bg-gold-400/20 flex items-center justify-center text-gold-400 border border-gold-400/30">
                  <BookOpen size={28} />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-400/10 border border-gold-400/30 text-gold-300 text-xs font-semibold uppercase tracking-wider mb-3">
                    <Heart size={12} className="text-gold-400" />
                    Landasan / Foundation
                  </div>
                  <h3 className="text-2xl font-bold font-serif mb-2">
                    {t.home.landasanTitle || 'Landasan — Iman Katolik'}
                  </h3>
                  <p className="text-white/80 text-sm leading-relaxed">
                    {t.home.landasanDesc || 'Iman Katolik yang berlandaskan Kasih Yesus Kristus menjadi pusat dan sumber inspirasi utama dalam seluruh kegiatan THS-THM.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Pilar I: Spiritual */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-navy-50 dark:bg-navy-900/50 flex items-center justify-center text-navy-800 dark:text-gold-400 mb-4 group-hover:bg-navy-800 group-hover:text-gold-400 transition-colors">
                <BookOpen size={28} />
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gold-400/10 text-gold-600 dark:text-gold-400 text-xs font-semibold uppercase tracking-wider mb-3">
                Pilar I
              </span>
              <h3 className="text-xl font-bold text-navy-800 dark:text-white mb-3">
                {t.home.pilars?.rohaniTitle || 'Segi Spiritual'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                {t.home.pilars?.rohaniDesc || 'Pendalaman iman Katolik, sakramen, dan doa sebagai fondasi kehidupan beriman.'}
              </p>
            </div>

            {/* Pilar II: Beladiri & Fisik */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-navy-50 dark:bg-navy-900/50 flex items-center justify-center text-navy-800 dark:text-gold-400 mb-4 group-hover:bg-navy-800 group-hover:text-gold-400 transition-colors">
                <Shield size={28} />
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gold-400/10 text-gold-600 dark:text-gold-400 text-xs font-semibold uppercase tracking-wider mb-3">
                Pilar II
              </span>
              <h3 className="text-xl font-bold text-navy-800 dark:text-white mb-3">
                {t.home.pilars?.beladiriTitle || 'Segi Beladiri & Fisik'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                {t.home.pilars?.beladiriDesc || 'Pelatihan fisik dan teknik pencak silat khas THS-THM untuk ketangkasan dan keberanian.'}
              </p>
            </div>

            {/* Pilar III: Organisasi & Persaudaraan */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-navy-50 dark:bg-navy-900/50 flex items-center justify-center text-navy-800 dark:text-gold-400 mb-4 group-hover:bg-navy-800 group-hover:text-gold-400 transition-colors">
                <Users size={28} />
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gold-400/10 text-gold-600 dark:text-gold-400 text-xs font-semibold uppercase tracking-wider mb-3">
                Pilar III
              </span>
              <h3 className="text-xl font-bold text-navy-800 dark:text-white mb-3">
                {t.home.pilars?.organisasiTitle || 'Segi Organisasi & Persaudaraan'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                {t.home.pilars?.organisasiDesc || 'Membentuk kepemimpinan, disiplin, tanggung jawab, dan persaudaraan sejati.'}
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