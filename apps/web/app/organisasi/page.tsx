'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components';
import { useI18n } from '@/i18n/context';
import {
  Landmark,
  ChevronRight,
  Shield,
  Heart,
  Award,
  Users,
  Cross,
  Sparkles,
  MapPin,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Building2,
  Share2,
  Check,
  ScrollText,
  UserCheck,
  Layers,
  Compass,
  Star,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { logError } from '@/lib/error-logger';
import { LogoSpinner } from '@/components/ui/logo-spinner';
import {
  STATUTA_INFO,
  VISI_MISI_DATA,
  JANJI_PRASETYA_DATA,
  TIGA_PILAR_DATA,
  STRUKTUR_HIERARKI_DATA,
  DEWAN_PENDIRI_DATA,
  KATEGORI_USIA_DATA,
  JENJANG_SABUK_DATA,
  MAKNA_LAMBANG_DATA,
} from './organisasi-data';

type ActiveTab = 'visi-misi' | 'janji' | 'pilar' | 'struktur' | 'tingkatan' | 'pendiri' | 'cms';

interface DynamicOrganisasi {
  struktur?: Array<{
    jabatan: string;
    nama: string;
    deskripsi: string;
  }>;
}

export default function OrganisasiPage() {
  const { t } = useI18n();
  const [dynamicData, setDynamicData] = useState<DynamicOrganisasi | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('visi-misi');
  const [copied, setCopied] = useState(false);
  const [copiedJanji, setCopiedJanji] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/public/organisasi');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setDynamicData(json.data || null);
      } catch (error) {
        logError(error, { module: 'Organisasi', action: 'fetch' });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCopyJanji = () => {
    if (typeof window !== 'undefined') {
      const fullJanji =
        `${JANJI_PRASETYA_DATA.pengantar}\n\n` +
        JANJI_PRASETYA_DATA.butir
          .map((b) => `${b.number}. ${b.text}\n   ${b.penjelasan}`)
          .join('\n\n') +
        `\n\n${JANJI_PRASETYA_DATA.penutup}`;
      navigator.clipboard.writeText(fullJanji);
      setCopiedJanji(true);
      setTimeout(() => setCopiedJanji(false), 2500);
    }
  };

  return (
    <PublicLayout>
      {/* ── 1. Hero Section ── */}
      <section className="relative bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 text-white overflow-hidden py-14 sm:py-20 border-b border-navy-800">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[650px] h-[650px] bg-gold-400/10 rounded-full blur-3xl" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-navy-700/40 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gold-500/10 rounded-full blur-2xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-white/60 text-xs sm:text-sm mb-4">
            <Link href="/" className="hover:text-white transition-colors">
              {t.nav.beranda}
            </Link>
            <ChevronRight size={14} />
            <span className="text-white/80">{t.nav.tentang}</span>
            <ChevronRight size={14} />
            <span className="text-gold-400 font-semibold">{t.organisasi.shortTitle}</span>
          </div>

          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold-400/10 border border-gold-400/30 text-gold-300 text-xs sm:text-sm font-semibold tracking-wider uppercase mb-4 shadow-sm">
              <Landmark size={14} className="text-gold-400" />
              <span>
                {STATUTA_INFO.nomorTap} &bull; {STATUTA_INFO.sidangNasional}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-white tracking-tight leading-tight mb-4 drop-shadow-md">
              {t.organisasi.title}
            </h1>

            <p className="text-base sm:text-lg text-white/80 leading-relaxed font-light mb-6 max-w-3xl">
              {t.organisasi.subtitle}. Berlandaskan Iman Katolik dan Kasih Kristus, melatih jasmani
              dan budi pekerti untuk menjadi kader militan bagi Gereja dan Bangsa.
            </p>

            <div className="inline-flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-white/5 border border-gold-400/25 backdrop-blur-md mb-8 shadow-sm">
              <span className="text-gold-400 text-2xl font-serif leading-none">“</span>
              <div>
                <p className="text-gold-300 font-serif font-semibold text-sm sm:text-base italic">
                  {STATUTA_INFO.semboyan} &bull; {STATUTA_INFO.motto}
                </p>
                <p className="text-white/70 text-xs sm:text-sm font-light">
                  {STATUTA_INFO.semboyanArti} &bull; {STATUTA_INFO.mottoArti}
                </p>
              </div>
              <span className="text-gold-400 text-2xl font-serif leading-none">”</span>
            </div>
          </div>

          {/* Quick Stat Highlight Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-2 text-gold-400 mb-1">
                <ShieldCheck size={18} />
                <span className="text-xs uppercase tracking-wider text-white/70 font-medium">
                  {t.organisasi.stats.natureLabel}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-serif text-white">
                {t.organisasi.stats.nature}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-2 text-gold-400 mb-1">
                <Cross size={18} />
                <span className="text-xs uppercase tracking-wider text-white/70 font-medium">
                  {t.organisasi.stats.supremeGuruLabel}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-serif text-white">
                {t.organisasi.stats.supremeGuru}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-2 text-gold-400 mb-1">
                <Award size={18} />
                <span className="text-xs uppercase tracking-wider text-white/70 font-medium">
                  {t.organisasi.stats.statutaBasisLabel}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-serif text-white">
                {t.organisasi.stats.statutaBasis}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-2 text-gold-400 mb-1">
                <MapPin size={18} />
                <span className="text-xs uppercase tracking-wider text-white/70 font-medium">
                  {t.organisasi.stats.reachLabel}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-serif text-white">
                {t.organisasi.stats.reach}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Interactive Navigation Tabs ── */}
      <section className="sticky top-16 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between overflow-x-auto py-2.5 gap-2 scrollbar-none">
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                onClick={() => setActiveTab('visi-misi')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'visi-misi'
                    ? 'bg-navy-800 text-white dark:bg-gold-400 dark:text-navy-950 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Compass size={16} />
                {t.organisasi.tabs.visiMisi}
              </button>

              <button
                onClick={() => setActiveTab('janji')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'janji'
                    ? 'bg-navy-800 text-white dark:bg-gold-400 dark:text-navy-950 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <ScrollText size={16} />
                {t.organisasi.tabs.janji}
              </button>

              <button
                onClick={() => setActiveTab('pilar')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'pilar'
                    ? 'bg-navy-800 text-white dark:bg-gold-400 dark:text-navy-950 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Shield size={16} />
                {t.organisasi.tabs.pilar}
              </button>

              <button
                onClick={() => setActiveTab('struktur')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'struktur'
                    ? 'bg-navy-800 text-white dark:bg-gold-400 dark:text-navy-950 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Building2 size={16} />
                {t.organisasi.tabs.struktur}
              </button>

              <button
                onClick={() => setActiveTab('tingkatan')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'tingkatan'
                    ? 'bg-navy-800 text-white dark:bg-gold-400 dark:text-navy-950 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Layers size={16} />
                {t.organisasi.tabs.tingkatan}
              </button>

              <button
                onClick={() => setActiveTab('pendiri')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'pendiri'
                    ? 'bg-navy-800 text-white dark:bg-gold-400 dark:text-navy-950 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Users size={16} />
                {t.organisasi.tabs.pendiri}
              </button>

              <button
                onClick={() => setActiveTab('cms')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'cms'
                    ? 'bg-navy-800 text-white dark:bg-gold-400 dark:text-navy-950 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <BookOpen size={16} />
                {t.organisasi.tabs.cms}
              </button>
            </div>

            <button
              onClick={handleCopyLink}
              aria-label="Bagikan tautan profil organisasi"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium transition-colors"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Tersalin!</span>
                </>
              ) : (
                <>
                  <Share2 size={14} />
                  <span>Bagikan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ── 3. Main Content & Sidebar Layout ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid lg:grid-cols-4 gap-8">
          <main className="lg:col-span-3 space-y-8">
            {/* ── TAB 1: VISI, MISI, TUJUAN & TUGAS POKOK ── */}
            {activeTab === 'visi-misi' && (
              <section className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 sm:p-10 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="w-10 h-10 rounded-2xl bg-gold-50 dark:bg-gold-950/40 border border-gold-400/30 flex items-center justify-center text-navy-800 dark:text-gold-400">
                      <Compass size={20} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold font-serif text-navy-900 dark:text-white">
                        Visi, Misi &amp; Arah Gerak Organisasi
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        Sesuai Ketetapan Sidang Nasional IX THS-THM (Statuta Bab III Pasal 6 &amp;
                        7)
                      </p>
                    </div>
                  </div>

                  {/* Visi Statement Card */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-850 via-navy-900 to-navy-950 text-white p-6 sm:p-8 border border-gold-400/30 mb-8 shadow-md">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-gold-400/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="relative">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-400/20 text-gold-300 text-xs font-semibold uppercase tracking-wider mb-3">
                        <Star size={14} className="text-gold-400" />
                        <span>Visi Luhur THS-THM</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mb-3 leading-snug">
                        “{VISI_MISI_DATA.visi.statement}”
                      </h3>
                      <p className="text-white/80 text-xs sm:text-sm font-light leading-relaxed mb-6">
                        {VISI_MISI_DATA.visi.description}
                      </p>

                      <div className="pt-4 border-t border-white/10">
                        <span className="text-xs text-gold-400 font-semibold uppercase tracking-wider block mb-2">
                          Nilai-Nilai Inti (Core Values):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {VISI_MISI_DATA.visi.values.map((val, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 text-white/90 text-xs font-medium border border-white/10"
                            >
                              <CheckCircle2 size={13} className="text-gold-400" />
                              {val}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* 4 Pilar Misi */}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold font-serif text-navy-900 dark:text-white mb-4 flex items-center gap-2">
                      <Layers size={18} className="text-gold-500" />4 Butir Misi Pembinaan Integral
                      (Pasal 7)
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
                      {VISI_MISI_DATA.misi.map((m) => (
                        <div
                          key={m.id}
                          className="p-5 sm:p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 hover:border-gold-400/40 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-navy-800 text-white dark:bg-gold-400 dark:text-navy-950 font-bold text-xs">
                                {m.id}
                              </span>
                              <span className="text-[11px] font-semibold text-gold-600 dark:text-gold-400 bg-gold-50 dark:bg-gold-950/40 px-2.5 py-0.5 rounded-md border border-gold-400/20">
                                {m.pillar}
                              </span>
                            </div>
                            <h4 className="text-base sm:text-lg font-bold font-serif text-navy-900 dark:text-white mb-1">
                              {m.title}
                            </h4>
                            <div className="text-xs text-gold-600 dark:text-gold-400 italic mb-2">
                              {m.subtitle}
                            </div>
                            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                              {m.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tujuan & Tugas Pokok */}
                  <div className="grid sm:grid-cols-2 gap-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <div className="p-6 rounded-2xl bg-gold-50/50 dark:bg-gold-950/20 border border-gold-200 dark:border-gold-900/40">
                      <h4 className="text-lg font-bold font-serif text-navy-900 dark:text-white mb-3 flex items-center gap-2">
                        <Award size={18} className="text-gold-600 dark:text-gold-400" />
                        Tujuan Organisasi (Pasal 8)
                      </h4>
                      <ul className="space-y-2.5 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                        {VISI_MISI_DATA.tujuan.map((t, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 size={15} className="text-gold-500 shrink-0 mt-0.5" />
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-6 rounded-2xl bg-navy-50/50 dark:bg-navy-950/40 border border-navy-100 dark:border-navy-900/40">
                      <h4 className="text-lg font-bold font-serif text-navy-900 dark:text-white mb-3 flex items-center gap-2">
                        <Scale size={18} className="text-navy-700 dark:text-gold-400" />
                        Fungsi &amp; Tugas Pokok (Pasal 9)
                      </h4>
                      <ul className="space-y-2.5 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                        {VISI_MISI_DATA.tugasPokok.map((tp, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2
                              size={15}
                              className="text-navy-600 dark:text-gold-400 shrink-0 mt-0.5"
                            />
                            <span>{tp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ── TAB 2: JANJI PRASETYA ── */}
            {activeTab === 'janji' && (
              <section className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 sm:p-10 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gold-50 dark:bg-gold-950/40 border border-gold-400/30 flex items-center justify-center text-navy-800 dark:text-gold-400">
                        <ScrollText size={20} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold font-serif text-navy-900 dark:text-white">
                          Janji Prasetya Anggota THS-THM
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          Naskah Resmi Statuta Organisasi (Bab V Pasal 14)
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleCopyJanji}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gold-50 dark:bg-gold-950/50 border border-gold-400/40 text-navy-900 dark:text-gold-300 hover:bg-gold-100 dark:hover:bg-gold-900/50 text-xs font-semibold transition-colors shrink-0"
                    >
                      {copiedJanji ? (
                        <>
                          <Check size={14} className="text-emerald-500" />
                          <span>Naskah Janji Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Share2 size={14} className="text-gold-600 dark:text-gold-400" />
                          <span>Salin Teks Janji</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Pengantar Janji */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-navy-900 to-navy-950 text-white border border-gold-400/30 mb-8 shadow-md">
                    <div className="flex items-start gap-3">
                      <Cross size={20} className="text-gold-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-gold-400 font-bold block mb-1">
                          Naskah Pengantar Ikrar
                        </span>
                        <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-serif italic">
                          “{JANJI_PRASETYA_DATA.pengantar}”
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 5 Butir Janji Cards */}
                  <div className="space-y-4 mb-8">
                    {JANJI_PRASETYA_DATA.butir.map((b) => (
                      <div
                        key={b.number}
                        className="p-5 sm:p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 hover:border-gold-400/40 transition-all group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-9 h-9 rounded-xl bg-navy-800 text-white dark:bg-gold-400 dark:text-navy-950 font-bold text-sm flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                            {b.number}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base sm:text-lg font-bold font-serif text-navy-900 dark:text-white mb-2">
                              {b.text}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                              {b.penjelasan}
                            </p>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gold-50 dark:bg-gold-950/40 border border-gold-400/20 text-gold-700 dark:text-gold-300 text-xs italic font-medium">
                              <Sparkles size={12} className="text-gold-500 shrink-0" />
                              <span>{b.dasarIman}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Penutup Doa & Catatan Wajib */}
                  <div className="p-6 rounded-2xl bg-navy-50 dark:bg-navy-950/40 border border-navy-100 dark:border-navy-900/50">
                    <div className="text-center max-w-xl mx-auto mb-4">
                      <p className="text-sm sm:text-base font-serif font-bold text-navy-900 dark:text-gold-300 italic mb-2">
                        “{JANJI_PRASETYA_DATA.penutup}”
                      </p>
                    </div>
                    <div className="pt-3 border-t border-navy-100 dark:border-navy-900/80 flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <CheckCircle2 size={15} className="text-gold-500 shrink-0 mt-0.5" />
                      <span>{JANJI_PRASETYA_DATA.catatanStatuta}</span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ── TAB 3: LANDASAN & 3 PILAR PEMBINAAN (3S) ── */}
            {activeTab === 'pilar' && (
              <section className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 sm:p-10 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="w-10 h-10 rounded-2xl bg-gold-50 dark:bg-gold-950/40 border border-gold-400/30 flex items-center justify-center text-navy-800 dark:text-gold-400">
                      <Shield size={20} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold font-serif text-navy-900 dark:text-white">
                        1 Landasan &amp; 3 Pilar Pembinaan Karakter
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        Sanctitas (Kesucian), Sanitas (Kesehatan Fisik), dan Scientia (Kecerdasan
                        &amp; Kepemimpinan)
                      </p>
                    </div>
                  </div>

                  {/* Landasan Tunggal Card */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-850 via-navy-900 to-navy-950 text-white p-6 sm:p-8 border border-gold-400/30 mb-8 shadow-md">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gold-400/20 text-gold-300 border border-gold-400/40 flex items-center justify-center shrink-0">
                        <Cross size={24} />
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-gold-400/20 text-gold-300 text-xs font-semibold uppercase tracking-wider mb-2">
                          Landasan Tunggal Spiritualitas
                        </div>
                        <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mb-2">
                          Iman Katolik &amp; Kasih Yesus Kristus
                        </h3>
                        <p className="text-white/80 text-xs sm:text-sm font-light leading-relaxed mb-4">
                          Yesus Kristus diakui sebagai satu-satunya <strong>Guru Besar</strong>{' '}
                          abadi. Seluruh karya, latihan fisik bela diri, dan dinamika keorganisasian
                          THS-THM dipersembahkan seutuhnya bagi Gereja Katolik Roma di bawah naungan
                          Hati Kudus Yesus dan Hati Tak Bernoda Maria.
                        </p>
                        <div className="flex flex-wrap gap-3 text-xs text-gold-300">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 size={13} /> Devosi Rosario
                          </span>
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 size={13} /> Sakramen Ekaristi
                          </span>
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 size={13} /> Retret Pendadaran
                          </span>
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 size={13} /> Kesetiaan Magisterium Gereja
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* 3 Pilar Pembinaan Detail */}
                  <div className="grid sm:grid-cols-3 gap-5 mb-8">
                    {TIGA_PILAR_DATA.map((p) => (
                      <div
                        key={p.id}
                        className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 hover:border-gold-400/40 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="w-10 h-10 rounded-xl bg-gold-400/20 text-gold-600 dark:text-gold-400 flex items-center justify-center mb-3">
                            {p.id === 'spiritualitas' ? (
                              <Heart size={20} />
                            ) : p.id === 'beladiri' ? (
                              <Shield size={20} />
                            ) : (
                              <Users size={20} />
                            )}
                          </div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-gold-600 dark:text-gold-400 block mb-1">
                            {p.latin}
                          </span>
                          <h4 className="text-lg font-bold font-serif text-navy-900 dark:text-white mb-2">
                            {p.title}
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                            {p.description}
                          </p>
                        </div>
                        <div className="space-y-1.5 pt-3 border-t border-gray-200 dark:border-gray-700">
                          {p.poinKunci.map((poin, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-1.5 text-xs text-gray-700 dark:text-gray-300"
                            >
                              <CheckCircle2
                                size={13}
                                className="text-emerald-500 shrink-0 mt-0.5"
                              />
                              <span>{poin}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bottom Banner Semboyan */}
                  <div className="p-6 rounded-2xl bg-gradient-to-r from-navy-900 to-navy-950 text-white border border-gold-400/30">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs text-gold-400 font-semibold uppercase tracking-widest block mb-1">
                          Sesanti Luhur Pendekar
                        </span>
                        <h3 className="text-xl font-bold font-serif text-white">
                          Fortiter in Re, Suaviter in Modo
                        </h3>
                        <p className="text-sm text-white/80 font-light">
                          Kokoh kuat dalam memegang teguh prinsip kebenaran, luwes dan lemah-lembut
                          dalam cara menyampaikannya.
                        </p>
                      </div>
                      <div className="shrink-0 px-4 py-2 rounded-xl bg-gold-400 text-navy-950 font-bold text-xs">
                        Pilar Karakter
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ── TAB 4: HIERARKI TATA KELOLA ORGANISASI ── */}
            {activeTab === 'struktur' && (
              <section className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 sm:p-10 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gold-50 dark:bg-gold-950/40 border border-gold-400/30 flex items-center justify-center text-navy-800 dark:text-gold-400">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold font-serif text-navy-900 dark:text-white">
                          Hierarki &amp; Struktur Tata Kelola
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          Berdasarkan Ketetapan Statuta Bab VII–XI (Nasional, Distrik, Wilayah,
                          Ranting, Unit Latihan)
                        </p>
                      </div>
                    </div>

                    <Link
                      href="/struktur-organisasi"
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-navy-800 text-white dark:bg-gold-400 dark:text-navy-950 text-xs font-semibold hover:opacity-90 transition-opacity shrink-0"
                    >
                      <span>Bagan Interaktif</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>

                  {/* Hierarki Level Cards */}
                  <div className="space-y-6 mb-8">
                    {STRUKTUR_HIERARKI_DATA.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 hover:border-gold-400/40 transition-all"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-navy-800 text-white dark:bg-gold-400 dark:text-navy-950 font-bold text-xs">
                              {item.level}
                            </span>
                            <h3 className="text-lg sm:text-xl font-bold font-serif text-navy-900 dark:text-white">
                              {item.title}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-2.5 py-1 rounded-lg bg-gold-50 dark:bg-gold-950/40 text-gold-700 dark:text-gold-300 font-semibold border border-gold-400/20">
                              {item.wilayahCakupan}
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-navy-100 dark:bg-navy-900/60 text-navy-800 dark:text-white/80 font-medium">
                              Masa Bakti: {item.masaJabatan}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                          {item.deskripsi}
                        </p>

                        {/* BPH & Komisi */}
                        <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs">
                          <div>
                            <span className="font-bold text-navy-900 dark:text-white block mb-1.5 uppercase tracking-wider text-[11px]">
                              Badan Pengurus Harian (BPH):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {item.bph.map((pos, pIdx) => (
                                <span
                                  key={pIdx}
                                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium"
                                >
                                  {pos}
                                </span>
                              ))}
                            </div>
                          </div>

                          {item.komisi && item.komisi.length > 0 && (
                            <div>
                              <span className="font-bold text-navy-900 dark:text-white block mb-1.5 uppercase tracking-wider text-[11px]">
                                Komisi / Bidang Khusus:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {item.komisi.map((kom, kIdx) => (
                                  <span
                                    key={kIdx}
                                    className="px-2.5 py-1 rounded-lg bg-gold-50/60 dark:bg-gold-950/30 border border-gold-300/40 text-gold-800 dark:text-gold-300 font-medium"
                                  >
                                    {kom}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* ── TAB 5: JENJANG SABUK, USIA & LAMBANG ── */}
            {activeTab === 'tingkatan' && (
              <section className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 sm:p-10 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="w-10 h-10 rounded-2xl bg-gold-50 dark:bg-gold-950/40 border border-gold-400/30 flex items-center justify-center text-navy-800 dark:text-gold-400">
                      <Layers size={20} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold font-serif text-navy-900 dark:text-white">
                        Jenjang Tingkatan Sabuk &amp; Golongan Usia
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        Kurikulum tingkatan pesilat dan klasifikasi anggota menurut Statuta Pasal 38
                        &amp; 48
                      </p>
                    </div>
                  </div>

                  {/* Kategori Usia Keanggotaan */}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold font-serif text-navy-900 dark:text-white mb-4 flex items-center gap-2">
                      <UserCheck size={18} className="text-gold-500" />4 Kategori Golongan Usia
                      Anggota (Pasal 38)
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {KATEGORI_USIA_DATA.map((k, idx) => (
                        <div
                          key={idx}
                          className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800"
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <h4 className="font-bold font-serif text-navy-900 dark:text-white text-base">
                              {k.kategori}
                            </h4>
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-navy-800 text-white dark:bg-gold-400 dark:text-navy-950">
                              {k.rentangUsia}
                            </span>
                          </div>
                          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed mb-2 font-medium">
                            {k.fokusPembinaan}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                            {k.keterangan}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Jenjang Sabuk */}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold font-serif text-navy-900 dark:text-white mb-4 flex items-center gap-2">
                      <Award size={18} className="text-gold-500" />
                      Jenjang Sabuk &amp; Tingkatan Pesilat
                    </h3>
                    <div className="space-y-3">
                      {JENJANG_SABUK_DATA.map((s, idx) => (
                        <div
                          key={idx}
                          className="p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 hover:border-gold-400/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start sm:items-center gap-3">
                            <span
                              className={`px-3 py-1 rounded-xl text-xs font-bold border shrink-0 ${s.warnaBadge}`}
                            >
                              {s.sabuk}
                            </span>
                            <div>
                              <h4 className="font-bold text-navy-900 dark:text-white text-sm sm:text-base">
                                {s.tingkat}
                              </h4>
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 font-light">
                                {s.makna}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 shrink-0 self-start sm:self-center">
                            {s.durasi}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Makna Lambang THS & THM */}
                  <div className="grid sm:grid-cols-2 gap-5 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-gray-900 border border-red-200/60 dark:border-red-900/40">
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold font-serif mb-2">
                        <Shield size={18} />
                        <span>{MAKNA_LAMBANG_DATA.ths.nama}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {MAKNA_LAMBANG_DATA.ths.deskripsi}
                      </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-gray-900 border border-blue-200/60 dark:border-blue-900/40">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold font-serif mb-2">
                        <Heart size={18} />
                        <span>{MAKNA_LAMBANG_DATA.thm.nama}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {MAKNA_LAMBANG_DATA.thm.deskripsi}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ── TAB 6: 16 NAMA DEWAN PENDIRI ── */}
            {activeTab === 'pendiri' && (
              <section className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 sm:p-10 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="w-10 h-10 rounded-2xl bg-gold-50 dark:bg-gold-950/40 border border-gold-400/30 flex items-center justify-center text-navy-800 dark:text-gold-400">
                      <Users size={20} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold font-serif text-navy-900 dark:text-white">
                        16 Tokoh Dewan Pendiri THS-THM
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        Tercantum dalam Lampiran 1 Statuta Resmi TAP 02 / THS-THM / 2023
                      </p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {DEWAN_PENDIRI_DATA.map((p) => (
                      <div
                        key={p.no}
                        className="p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 hover:border-gold-400/40 transition-all flex items-start gap-3.5"
                      >
                        <div className="w-8 h-8 rounded-xl bg-navy-800 text-white dark:bg-gold-400 dark:text-navy-950 font-bold text-xs flex items-center justify-center shrink-0">
                          {p.no}
                        </div>
                        <div>
                          <h4 className="font-bold text-navy-900 dark:text-white text-sm sm:text-base leading-snug">
                            {p.nama}
                          </h4>
                          <span className="inline-block text-[11px] font-semibold text-gold-600 dark:text-gold-400 bg-gold-50 dark:bg-gold-950/40 px-2 py-0.5 rounded border border-gold-400/20 my-1">
                            {p.gelarRole}
                          </span>
                          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-light">
                            {p.keterangan}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* ── TAB 7: DATA KEPENGURUSAN CMS (DINAMIS) ── */}
            {activeTab === 'cms' && (
              <section className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 sm:p-10 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="w-10 h-10 rounded-2xl bg-gold-50 dark:bg-gold-950/40 border border-gold-400/30 flex items-center justify-center text-navy-800 dark:text-gold-400">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold font-serif text-navy-900 dark:text-white">
                        Data Kepengurusan dari Sistem (CMS)
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        Data kepengurusan yang dikelola secara langsung melalui Panel Administrator
                      </p>
                    </div>
                  </div>

                  {loading ? (
                    <div className="min-h-[25vh] flex flex-col items-center justify-center">
                      <LogoSpinner size={56} message="Memeriksa database pengurus..." />
                    </div>
                  ) : dynamicData?.struktur && dynamicData.struktur.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {dynamicData.struktur.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-50 dark:bg-gray-900/60 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-gold-100 dark:bg-gold-950/40 flex items-center justify-center shrink-0">
                              <Building2 size={18} className="text-gold-600 dark:text-gold-400" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-navy-900 dark:text-white">
                                {item.jabatan}
                              </h4>
                              <p className="font-semibold text-xs sm:text-sm text-gold-600 dark:text-gold-400 mt-0.5 mb-1">
                                {item.nama}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                {item.deskripsi}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 px-6 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-dashed border-gray-200 dark:border-gray-800">
                      <Landmark size={36} className="mx-auto text-gray-400 mb-3" />
                      <h4 className="text-base font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Belum Ada Data Personil Khusus di CMS
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
                        Tata kelola hierarki organisasi tetap merujuk pada ketentuan konstitusi
                        Statuta TAP 02 / THS-THM / 2023 di tab Hierarki Tata Kelola.
                      </p>
                      <button
                        onClick={() => setActiveTab('struktur')}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-navy-800 text-white dark:bg-gold-400 dark:text-navy-950 text-xs font-semibold"
                      >
                        <span>Lihat Hierarki Tata Kelola</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}
          </main>
          {/* ── 4. Sidebar Profil Organisasi ── */}
          <aside className="space-y-6">
            {/* Quick Facts Card */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
              <h3 className="font-bold text-navy-900 dark:text-white mb-4 text-xs uppercase tracking-wider font-serif flex items-center gap-2">
                <Sparkles size={16} className="text-gold-500" />
                {t.organisasi.quickFacts.title}
              </h3>

              <div className="space-y-3.5 text-xs sm:text-sm">
                <div className="pb-3 border-b border-gray-100 dark:border-gray-700/60">
                  <span className="text-gray-500 dark:text-gray-400 block text-[11px] mb-0.5">
                    {t.organisasi.quickFacts.legalBasis}
                  </span>
                  <span className="font-semibold text-navy-900 dark:text-white">
                    {t.organisasi.quickFacts.legalBasisVal}
                  </span>
                </div>
                <div className="pb-3 border-b border-gray-100 dark:border-gray-700/60">
                  <span className="text-gray-500 dark:text-gray-400 block text-[11px] mb-0.5">
                    {t.organisasi.quickFacts.motto}
                  </span>
                  <span className="font-semibold text-navy-900 dark:text-white">
                    {t.organisasi.quickFacts.mottoVal}
                  </span>
                </div>
                <div className="pb-3 border-b border-gray-100 dark:border-gray-700/60">
                  <span className="text-gray-500 dark:text-gray-400 block text-[11px] mb-0.5">
                    {t.organisasi.quickFacts.headquarters}
                  </span>
                  <span className="font-semibold text-navy-900 dark:text-white">
                    {t.organisasi.quickFacts.headquartersVal}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block text-[11px] mb-0.5">
                    {t.organisasi.quickFacts.formationModel}
                  </span>
                  <span className="font-semibold text-navy-900 dark:text-white">
                    {t.organisasi.quickFacts.formationModelVal}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Cross Links */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
              <h3 className="font-bold text-navy-900 dark:text-white mb-4 text-xs uppercase tracking-wider font-serif flex items-center gap-2">
                <Building2 size={16} className="text-gold-500" />
                Jelajahi Profil Terpadu
              </h3>

              <ul className="space-y-2">
                {[
                  {
                    href: '/sejarah',
                    label: t.nav.sejarah,
                    desc: 'Kilas balik & linimasa berdirinya THS-THM',
                    active: false,
                    icon: BookOpen,
                  },
                  {
                    href: '/organisasi',
                    label: t.nav.organisasi,
                    desc: 'Visi, Misi, Janji Prasetya & AD/ART',
                    active: true,
                    icon: Landmark,
                  },
                  {
                    href: '/struktur-organisasi',
                    label: t.nav.strukturOrganisasi || 'Struktur Organisasi',
                    desc: 'Bagan interaktif Nasional hingga Ranting',
                    active: false,
                    icon: Building2,
                  },
                  {
                    href: '/kepengurusan',
                    label: t.nav.kepengurusan,
                    desc: 'Jajaran dewan pengurus aktif',
                    active: false,
                    icon: Users,
                  },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`flex items-start gap-3 p-3 rounded-2xl transition-all ${
                        link.active
                          ? 'bg-navy-800 text-white font-semibold dark:bg-gold-400 dark:text-navy-950 shadow-sm'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-navy-50 dark:hover:bg-gray-700/60 hover:text-navy-900 dark:hover:text-white'
                      }`}
                    >
                      <link.icon size={18} className="shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs sm:text-sm font-semibold leading-tight">
                          {link.label}
                        </div>
                        <div
                          className={`text-[11px] leading-tight mt-0.5 ${link.active ? 'text-white/80 dark:text-navy-950/80' : 'text-gray-400 dark:text-gray-400'}`}
                        >
                          {link.desc}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Pendaftaran */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 to-navy-950 text-white p-6 shadow-sm border border-navy-800">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold-400/10 rounded-full blur-xl pointer-events-none" />
              <h3 className="font-bold mb-2 text-xs uppercase tracking-widest text-gold-400 font-serif">
                Bergabung Bersama Kami
              </h3>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-light mb-4">
                Jadilah bagian dari generasi pendekar Katolik yang tangguh, beriman, dan berbakti
                bagi Gereja serta Tanah Air.
              </p>
              <Link
                href="/daftar"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-gold-400 hover:bg-gold-500 text-navy-950 font-bold text-xs transition-all shadow-md active:scale-95"
              >
                <span>Daftar Calon Anggota</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </PublicLayout>
  );
}
