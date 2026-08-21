'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PublicLayout } from '@/components';
import { Calendar, ArrowRight, Users, CreditCard, Dumbbell, GraduationCap, FileText, Smartphone } from 'lucide-react';

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
              TUNGGAL HATI{' '}
              <span className="text-gold-400">SEMINARI</span>
              <br />
              TUNGGAL HATI{' '}
              <span className="text-gold-400">MARIA</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/80 max-w-2xl mb-10 leading-relaxed">
              Sistem Manajemen Organisasi THS-THM — Kelola anggota, iuran, latihan, pendadaran, dan dokumentasi secara digital.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/daftar"
                className="inline-flex items-center justify-center gap-2 bg-gold-400 text-navy-900 px-8 py-3.5 rounded-xl text-lg font-bold hover:bg-gold-300 shadow-elegant-md transition-all duration-200 transition-all"
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

      {/* ── Stats Bar ── */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
            {[
              { label: 'Anggota Aktif', value: '500+' },
              { label: 'Kegiatan Bulanan', value: '20+' },
              { label: 'Ranting', value: '50+' },
              { label: 'Tahun Berdiri', value: '1980+' },
            ].map((stat) => (
              <div key={stat.label} className="py-6 px-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-navy-800">{stat.value}</div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Fitur Utama ── */}
      <section className="py-16 sm:py-20 bg-[#F8F9FA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-gold-500 text-sm font-semibold uppercase tracking-wider">Layanan Kami</span>
            <h2 className="text-3xl sm:text-4xl font-bold font-serif font-bold text-navy-800 mt-2">Fitur Utama</h2>
            <div className="w-16 h-1 bg-gold-400 mx-auto mt-4 rounded-full" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-lg hover:border-accent-200 transition-all group"
              >
                <div className="w-12 h-12 rounded-lg bg-navy-50 flex items-center justify-center mb-4 group-hover:bg-navy-800 transition-colors duration-200">
                  <f.icon size={24} className="text-navy-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-navy-800 mb-2">{f.title}</h3>
                <p className="text-navy-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Berita Terbaru ── */}
      {news.length > 0 && (
        <section className="py-16 sm:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <span className="text-gold-500 text-sm font-semibold uppercase tracking-wider">Informasi Terkini</span>
                <h2 className="text-3xl sm:text-4xl font-bold font-serif font-bold text-navy-800 mt-2">Berita Terbaru</h2>
              </div>
              <Link
                href="/berita"
                className="hidden sm:inline-flex items-center gap-1 text-gold-500 font-semibold text-sm hover:text-navy-800 transition-colors"
              >
                Lihat Semua
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.map((n, i) => (
                <Link
                  key={n.id}
                  href={`/berita/${n.slug}`}
                  className={`group rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all ${
                    i === 0 ? 'md:col-span-2 lg:col-span-1' : ''
                  }`}
                >
                  <div className="bg-navy-100 h-48 flex items-center justify-center">
                    <span className="text-6xl opacity-30">📰</span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-xs text-navy-400 mb-2">
                      <Calendar size={12} />
                      <time>{formatTanggal(n.tanggal)}</time>
                    </div>
                    <h3 className="font-bold text-gray-900 group-hover:text-navy-800 transition-colors line-clamp-2 mb-2">
                      {n.judul}
                    </h3>
                    <p className="text-sm text-navy-500 line-clamp-2">{n.ringkasan}</p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-10 sm:hidden">
              <Link
                href="/berita"
                className="inline-flex items-center gap-1 text-navy-800 font-semibold text-sm hover:text-accent-700"
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
            Daftarkan diri anda sebagai anggota dan dapatkan akses ke seluruh fitur sistem manajemen kami.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/daftar"
              className="inline-flex items-center justify-center gap-2 bg-gold-400 text-navy-900 px-8 py-3.5 rounded-xl text-lg font-bold hover:bg-gold-300 shadow-elegant-md transition-all duration-200 transition-all"
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

const features = [
  { icon: Users, title: 'Manajemen Anggota', desc: 'Kelola data anggota, calon anggota, dan riwayat keanggotaan secara digital.' },
  { icon: CreditCard, title: 'Iuran Online', desc: 'Pembayaran iuran dengan bukti transfer, verifikasi admin, dan QRIS.' },
  { icon: Dumbbell, title: 'Latihan & Absensi', desc: 'Jadwal latihan, absensi QR, dan evaluasi anggota.' },
  { icon: GraduationCap, title: 'Pendadaran', desc: 'Aspek penilaian, input nilai penguji, dan sertifikat kelulusan.' },
  { icon: FileText, title: 'Dokumen Digital', desc: 'Kartu anggota digital, sertifikat PDF, piagam, dan QR validasi.' },
  { icon: Smartphone, title: 'Aplikasi Mobile', desc: 'Akses data, scan QR, dan notifikasi push dari smartphone.' },
];
