'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PublicLayout } from '@/components';
import { Calendar, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface Berita {
  id: string;
  judul: string;
  ringkasan: string;
  gambar?: string;
  tanggal: string;
  slug: string;
}

export function LandingPageContent() {
  const [news, setNews] = useState<Berita[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch('/api/public/berita');
        if (res.ok) {
          const json = await res.json();
          setNews(json.data?.slice(0, 6) || []);
        }
      } catch (e) {
        console.error('Failed to fetch news', e);
      }
    }
    fetchNews();
  }, []);

  const formatTanggal = (tanggal: string) =>
    new Date(tanggal).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const goToSlide = (index: number) => {
    if (news.length === 0) return;
    setCurrentSlide((index + news.length) % news.length);
  };

  const prevSlide = () => goToSlide(currentSlide - 1);
  const nextSlide = () => goToSlide(currentSlide + 1);

  // Auto-advance carousel every 5 seconds (only when there are multiple items)
  useEffect(() => {
    if (news.length <= 1) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(timer);
  }, [news, currentSlide]);

  return (
    <PublicLayout>
      {/* ── Hero Section ── */}
      <section className="relative bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 text-white overflow-hidden">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gold-400/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold-400/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-gold-400/10 backdrop-blur-sm text-gold-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-gold-400/20">
              <span className="w-2 h-2 bg-gold-400 rounded-full animate-pulse" />
              Organisasi Berkemajuan
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold leading-[1.1] mb-6">
              TUNGGAL HATI SEMINARI — TUNGGAL HATI MARIA
            </h1>
            <p className="text-lg sm:text-xl text-white/80 max-w-2xl mb-10 leading-relaxed">
              Sistem Manajemen Organisasi THS-THM - Kelola anggota, iuran, latihan, pendadaran, dan dokumentasi secara digital.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/daftar"
                className="inline-flex items-center justify-center gap-2 bg-gold-400 text-navy-900 px-8 py-3.5 rounded-xl text-lg font-bold hover:bg-gold-300 shadow-elegant-md transition-all duration-200"
              >
                Daftar Anggota Baru
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white px-8 py-3.5 rounded-lg text-lg font-bold hover:bg-white/10 transition-all"
              >
                Masuk ke Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Berita Carousel ── */}
      {news.length > 0 && (
        <section className="py-16 sm:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <span className="text-gold-500 text-sm font-semibold uppercase tracking-wider">
                  Informasi Terkini
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold font-serif text-navy-800 mt-2">
                  Berita Terbaru
                </h2>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={prevSlide}
                  disabled={news.length <= 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Sebelumnya"
                >
                  <ChevronLeft size={20} className="text-navy-600" />
                </button>
                <button
                  onClick={nextSlide}
                  disabled={news.length <= 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Berikutnya"
                >
                  <ChevronRight size={20} className="text-navy-600" />
                </button>
              </div>
            </div>

            {/* Carousel */}
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {news.map((n) => (
                  <div
                    key={n.id}
                    className="w-full flex-shrink-0 relative"
                  >
                    <Link href={`/berita/${n.slug}`} className="block">
                      <div className="relative h-96 sm:h-[28rem]">
                        {n.gambar ? (
                          <img
                            src={n.gambar}
                            alt={n.judul}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-navy-100 flex items-center justify-center">
                            <span className="text-6xl opacity-30">📰</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                          <div className="flex items-center gap-2 text-sm text-gray-200 mb-2">
                            <Calendar size={14} />
                            <time>{formatTanggal(n.tanggal)}</time>
                          </div>
                          <h3 className="text-2xl sm:text-3xl font-bold mb-2 line-clamp-2">
                            {n.judul}
                          </h3>
                          {n.ringkasan && (
                            <p className="text-gray-200 text-sm line-clamp-2 max-w-3xl">
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
                    className={`h-2 w-2 rounded-full transition-all ${
                      i === currentSlide
                        ? 'bg-gold-500 w-8'
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    aria-label={`Ke slide ${i + 1}`}
                  />
                ))}
              </div>
            )}

            <div className="text-center mt-8">
              <Link
                href="/berita"
                className="inline-flex items-center gap-1 text-navy-800 font-semibold text-sm hover:text-gold-600 transition-colors"
              >
                Lihat Semua Berita
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA Section ── */}
      <section className="bg-gradient-to-r from-navy-800 to-navy-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-4">
            Bergabunglah dengan THS-THM
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
            Daftarkan diri anda sebagai anggota dan dapatkan akses ke seluruh fitur
            sistem manajemen kami.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/daftar"
              className="inline-flex items-center justify-center gap-2 bg-gold-400 text-navy-900 px-8 py-3.5 rounded-xl text-lg font-bold hover:bg-gold-300 shadow-elegant-md transition-all duration-200"
            >
              Daftar Sekarang
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
