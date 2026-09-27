'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components';
import { useI18n } from '@/i18n/context';
import {
  BookOpen, ChevronRight, Shield, Heart, Award, Calendar, Users,
  Cross, Sparkles, MapPin, Flame, CheckCircle2, ArrowRight,
  Landmark, Building2, Share2, Check,
} from 'lucide-react';
import { logError } from '@/lib/error-logger';
import { TIMELINE_EVENTS } from './sejarah-data';

type ActiveTab = 'timeline' | 'story' | 'symbols' | 'pillars' | 'cms';

export default function SejarahPage() {
  const { t } = useI18n();
  const [data, setData] = useState<{ konten: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('timeline');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/public/sejarah');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(json.data || null);
      } catch (error) {
        logError(error, { module: 'Sejarah', action: 'fetch' });
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

  return (
    <PublicLayout>
      {/* ── 1. Hero Section ── */}
      <section className="relative bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 text-white overflow-hidden py-14 sm:py-20 border-b border-navy-800">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gold-400/10 rounded-full blur-3xl" />
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
            <span className="text-gold-400 font-semibold">{t.sejarah.shortTitle}</span>
          </div>

          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold-400/10 border border-gold-400/30 text-gold-300 text-xs sm:text-sm font-semibold tracking-wider uppercase mb-4 shadow-sm">
              <Shield size={14} className="text-gold-400" />
              <span>{t.sejarah.tagline} &bull; 10 November 1985 &amp; 1986</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-white tracking-tight leading-tight mb-4 drop-shadow-md">
              {t.sejarah.title}
            </h1>

            <p className="text-base sm:text-lg text-white/80 leading-relaxed font-light mb-6 max-w-3xl">
              {t.sejarah.subtitle}. Mengembangkan watak kesatria, kedisiplinan jasmani, dan kemurnian batin berlandaskan Kasih Kristus dan teladan Bunda Maria.
            </p>

            <div className="inline-flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-white/5 border border-gold-400/25 backdrop-blur-md mb-8 shadow-sm">
              <span className="text-gold-400 text-2xl font-serif leading-none">“</span>
              <div>
                <p className="text-gold-300 font-serif font-semibold text-sm sm:text-base italic">
                  {t.sejarah.motto}
                </p>
                <p className="text-white/70 text-xs sm:text-sm font-light">
                  {t.sejarah.mottoMeaning}
                </p>
              </div>
              <span className="text-gold-400 text-2xl font-serif leading-none">”</span>
            </div>
          </div>

          {/* Quick Stat Highlight Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-2 text-gold-400 mb-1">
                <Calendar size={18} />
                <span className="text-xs uppercase tracking-wider text-white/70 font-medium">
                  {t.sejarah.stats.thsFoundedLabel}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-serif text-white">
                {t.sejarah.stats.thsFounded}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-2 text-gold-400 mb-1">
                <Heart size={18} />
                <span className="text-xs uppercase tracking-wider text-white/70 font-medium">
                  {t.sejarah.stats.thmFoundedLabel}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-serif text-white">
                {t.sejarah.stats.thmFounded}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-2 text-gold-400 mb-1">
                <Award size={18} />
                <span className="text-xs uppercase tracking-wider text-white/70 font-medium">
                  {t.sejarah.stats.momentumLabel}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-serif text-white">
                {t.sejarah.stats.momentum}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-2 text-gold-400 mb-1">
                <MapPin size={18} />
                <span className="text-xs uppercase tracking-wider text-white/70 font-medium">
                  {t.sejarah.stats.coverageLabel}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-serif text-white">
                {t.sejarah.stats.coverage}
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
                onClick={() => setActiveTab('timeline')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'timeline'
                    ? 'bg-navy-800 text-white dark:bg-gold-400 dark:text-navy-950 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Calendar size={16} />
                {t.sejarah.tabs.timeline}
              </button>

              <button
                onClick={() => setActiveTab('story')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'story'
                    ? 'bg-navy-800 text-white dark:bg-gold-400 dark:text-navy-950 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Users size={16} />
                {t.sejarah.tabs.story}
              </button>

              <button
                onClick={() => setActiveTab('symbols')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'symbols'
                    ? 'bg-navy-800 text-white dark:bg-gold-400 dark:text-navy-950 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Shield size={16} />
                {t.sejarah.tabs.symbols}
              </button>

              <button
                onClick={() => setActiveTab('pillars')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'pillars'
                    ? 'bg-navy-800 text-white dark:bg-gold-400 dark:text-navy-950 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Cross size={16} />
                {t.sejarah.tabs.pillars}
              </button>

              <button
                onClick={() => setActiveTab('cms')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'cms'
                    ? 'bg-navy-800 text-white dark:bg-gold-400 dark:text-navy-950 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <BookOpen size={16} />
                {t.sejarah.tabs.cms}
              </button>
            </div>

            <button
              onClick={handleCopyLink}
              aria-label="Bagikan tautan halaman sejarah"
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
            {loading ? (
              <div className="min-h-[45vh] flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-navy-800 dark:border-gold-400 border-t-transparent mb-4" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Memuat catatan sejarah...</p>
              </div>
            ) : (
              <>
                {/* ── TAB 1: LINIMASA SEJARAH (TIMELINE) ── */}
                {activeTab === 'timeline' && (
                  <section className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 sm:p-10 shadow-sm">
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="w-10 h-10 rounded-2xl bg-gold-50 dark:bg-gold-950/40 border border-gold-400/30 flex items-center justify-center text-navy-800 dark:text-gold-400">
                          <Calendar size={20} />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold font-serif text-navy-900 dark:text-white">
                            Linimasa Tonggak Bersejarah
                          </h2>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            Kronologi perjalanan dari awal mula benih perintisan hingga era transformasi modern.
                          </p>
                        </div>
                      </div>

                      <div className="relative pl-6 sm:pl-8 border-l-2 border-gold-400/40 dark:border-gold-400/30 space-y-10 my-6">
                        {TIMELINE_EVENTS.map((event, idx) => (
                          <div key={idx} className="relative group">
                            <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border-4 border-navy-800 dark:border-gold-400 group-hover:scale-125 transition-transform shadow-md" />

                            <div className="bg-gray-50 dark:bg-gray-900/60 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-800 hover:border-gold-400/50 transition-all hover:shadow-md">
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-navy-800 text-white dark:bg-gold-400 dark:text-navy-950">
                                  {event.year}
                                </span>
                                <span className="text-xs font-semibold text-gold-600 dark:text-gold-400 bg-gold-50 dark:bg-gold-950/40 px-2.5 py-0.5 rounded-md border border-gold-400/20">
                                  {event.badge}
                                </span>
                              </div>

                              <h3 className="text-lg sm:text-xl font-bold font-serif text-navy-900 dark:text-white mb-1">
                                {event.title}
                              </h3>

                              {event.location && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-3">
                                  <MapPin size={13} className="text-gold-500 shrink-0" />
                                  <span>{event.location}</span>
                                </div>
                              )}

                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                                {event.description}
                              </p>

                              <div className="space-y-1.5 pt-3 border-t border-gray-200/60 dark:border-gray-700/60">
                                {event.highlights.map((item, hIdx) => (
                                  <div key={hIdx} className="flex items-start gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                                    <span>{item}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}


                {/* ── TAB 2: KISAH PENDIRIAN & TOKOH ── */}
                {activeTab === 'story' && (
                  <section className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 sm:p-10 shadow-sm">
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="w-10 h-10 rounded-2xl bg-gold-50 dark:bg-gold-950/40 border border-gold-400/30 flex items-center justify-center text-navy-800 dark:text-gold-400">
                          <Users size={20} />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold font-serif text-navy-900 dark:text-white">
                            Tokoh Perintis &amp; Gagasan Awal
                          </h2>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            Visi mendalam menyatukan seni bela diri pencak silat dengan spiritualitas Katolik.
                          </p>
                        </div>
                      </div>

                      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 text-white p-6 sm:p-8 border border-gold-400/30 mb-8 shadow-md">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                          <div className="w-20 h-20 rounded-2xl bg-gold-400/20 border-2 border-gold-400 flex items-center justify-center text-gold-300 shrink-0 shadow-lg">
                            <Cross size={36} />
                          </div>
                          <div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gold-400/20 text-gold-300 text-xs font-semibold tracking-wider uppercase mb-1.5">
                              <Sparkles size={12} /> Pendiri Utama THS-THM
                            </div>
                            <h3 className="text-2xl font-bold font-serif text-white mb-1">
                              Romo Martinus Hadisiswoyo, SJ
                            </h3>
                            <p className="text-white/80 text-xs sm:text-sm font-light leading-relaxed">
                              Imam Serikat Yesus (Yesuit) yang merintis latihan pencak silat rohani di Seminari Mertoyudan dan Paroki Tanjung Priok.
                            </p>
                          </div>
                        </div>
                      </div>

                      <h3 className="text-xl font-bold font-serif text-navy-900 dark:text-white mb-4">
                        Mengapa THS-THM Didirikan?
                      </h3>

                      <div className="grid sm:grid-cols-3 gap-4 mb-8">
                        <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                          <div className="w-9 h-9 rounded-xl bg-navy-800 dark:bg-gold-400 flex items-center justify-center text-white dark:text-navy-950 mb-3 font-bold text-sm">1</div>
                          <h4 className="font-bold text-navy-900 dark:text-white mb-2 text-base">Pembinaan Karakter Muda</h4>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            Mewadahi energi positif generasi muda Katolik agar terlatih disiplin jasmani, mental kesatria, dan terjaga dari pengaruh negatif.
                          </p>
                        </div>
                        <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                          <div className="w-9 h-9 rounded-xl bg-navy-800 dark:bg-gold-400 flex items-center justify-center text-white dark:text-navy-950 mb-3 font-bold text-sm">2</div>
                          <h4 className="font-bold text-navy-900 dark:text-white mb-2 text-base">Spiritualitas &amp; Doa</h4>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            Menjadikan olah bela diri sebagai sarana doa, perenungan batin, serta mendekatkan diri pada Hati Kudus Yesus.
                          </p>
                        </div>
                        <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                          <div className="w-9 h-9 rounded-xl bg-navy-800 dark:bg-gold-400 flex items-center justify-center text-white dark:text-navy-950 mb-3 font-bold text-sm">3</div>
                          <h4 className="font-bold text-navy-900 dark:text-white mb-2 text-base">Tanah Air &amp; Gereja</h4>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            Melestarikan pencak silat warisan luhur nusantara demi kemuliaan Allah dan kebaikan NKRI.
                          </p>
                        </div>
                      </div>

                      <div className="p-6 rounded-2xl bg-gold-50/70 dark:bg-gold-950/20 border border-gold-400/30">
                        <h4 className="font-serif font-bold text-navy-900 dark:text-gold-400 mb-2 text-base">
                          Semangat Persaudaraan Awal
                        </h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-light">
                          Para perintis berlatih dalam keterbatasan sarana, namun ikatan batin yang kokoh lahir justru dari kesederhanaan itu. Semangat &quot;Satu Hati, Satu Tekad, Satu Jiwa&quot; terus menyala di seluruh pelosok Indonesia.
                        </p>
                      </div>
                    </div>
                  </section>
                )}


                {/* ── TAB 3: MAKNA LAMBANG & SESANTI ── */}
                {activeTab === 'symbols' && (
                  <section className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 sm:p-10 shadow-sm">
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="w-10 h-10 rounded-2xl bg-gold-50 dark:bg-gold-950/40 border border-gold-400/30 flex items-center justify-center text-navy-800 dark:text-gold-400">
                          <Shield size={20} />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold font-serif text-navy-900 dark:text-white">
                            Makna Lambang, Atribut &amp; Sesanti
                          </h2>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            Setiap simbol, warna, dan lambang memiliki filosofi rohani serta kebangsaan yang mendalam.
                          </p>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-5 mb-8">
                        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 hover:border-gold-400/40 transition-all">
                          <div className="w-10 h-10 rounded-xl bg-gold-400/20 text-gold-600 dark:text-gold-400 flex items-center justify-center mb-3"><Cross size={22} /></div>
                          <h3 className="text-lg font-bold font-serif text-navy-900 dark:text-white mb-2">Salib Kristus</h3>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            Pusat iman Katolik dan lambang kemenangan sejati melalui pengorbanan serta kasih tanpa batas. Segala gerak pendekar THS-THM berakar pada salib Kristus.
                          </p>
                        </div>
                        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 hover:border-gold-400/40 transition-all">
                          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mb-3"><Flame size={22} /></div>
                          <h3 className="text-lg font-bold font-serif text-navy-900 dark:text-white mb-2">Hati Kudus Yesus (THS)</h3>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            Melambangkan cinta ilahi yang berkobar-kobar, belas kasih, kerendahan hati, dan pengampunan bagi seluruh anggota Tunggal Hati Seminari.
                          </p>
                        </div>
                        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 hover:border-gold-400/40 transition-all">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3"><Heart size={22} /></div>
                          <h3 className="text-lg font-bold font-serif text-navy-900 dark:text-white mb-2">Hati Tak Bernoda Maria (THM)</h3>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            Melambangkan kemurnian batin, ketaatan total pada kehendak Allah, dan kelembutan Bunda Maria sebagai teladan Tunggal Hati Maria.
                          </p>
                        </div>


                        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 hover:border-gold-400/40 transition-all">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3"><Sparkles size={22} /></div>
                          <h3 className="text-lg font-bold font-serif text-navy-900 dark:text-white mb-2">Segilima &amp; Melati</h3>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            Bentuk segilima melambangkan kesetiaan pada Pancasila; bunga melati menggambarkan keharuman budi pekerti dan kesucian moral.
                          </p>
                        </div>
                        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 hover:border-gold-400/40 transition-all">
                          <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-500 flex items-center justify-center mb-3"><Award size={22} /></div>
                          <h3 className="text-lg font-bold font-serif text-navy-900 dark:text-white mb-2">Warna Kuning Emas</h3>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            Melambangkan kemuliaan Ilahi, keagungan martabat manusia sebagai citra Allah, dan kesetiaan pada kebenaran.
                          </p>
                        </div>
                        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 hover:border-gold-400/40 transition-all">
                          <div className="w-10 h-10 rounded-xl bg-navy-900/20 text-navy-800 dark:text-white flex items-center justify-center mb-3"><Shield size={22} /></div>
                          <h3 className="text-lg font-bold font-serif text-navy-900 dark:text-white mb-2">Warna Hitam / Navy</h3>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            Melambangkan keteguhan iman, keheningan batin, kerendahan hati, dan ketenangan sikap menghadapi tantangan hidup.
                          </p>
                        </div>
                      </div>

                      <div className="p-6 rounded-2xl bg-gradient-to-r from-navy-900 to-navy-950 text-white border border-gold-400/30">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div>
                            <span className="text-xs text-gold-400 font-semibold uppercase tracking-widest block mb-1">Sesanti Utama</span>
                            <h3 className="text-xl font-bold font-serif text-white">Pro Patria et Ecclesia</h3>
                            <p className="text-sm text-white/80 font-light">Untuk Tanah Air dan Gereja &mdash; membela kebenaran demi kemuliaan Allah.</p>
                          </div>
                          <div className="shrink-0 px-4 py-2 rounded-xl bg-gold-400 text-navy-950 font-bold text-xs">Sumpah Pendekar</div>
                        </div>
                      </div>
                    </div>
                  </section>
                )}


                {/* ── TAB 4: 1 LANDASAN & 3 PILAR ── */}
                {activeTab === 'pillars' && (
                  <section className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 sm:p-10 shadow-sm">
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="w-10 h-10 rounded-2xl bg-gold-50 dark:bg-gold-950/40 border border-gold-400/30 flex items-center justify-center text-navy-800 dark:text-gold-400">
                          <Cross size={20} />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold font-serif text-navy-900 dark:text-white">
                            1 Landasan &amp; 3 Pilar Pembinaan
                          </h2>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            Pondasi spiritualitas dan tiga pilar pembentukan karakter seluruh anggota THS-THM.
                          </p>
                        </div>
                      </div>

                      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 text-white p-6 sm:p-8 border border-gold-400/30 mb-8 shadow-md">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gold-400/20 text-gold-300 border border-gold-400/40 flex items-center justify-center shrink-0">
                            <BookOpen size={24} />
                          </div>
                          <div>
                            <span className="inline-block px-3 py-0.5 rounded-full bg-gold-400/20 text-gold-300 text-xs font-semibold uppercase tracking-wider mb-2">
                              Landasan Tunggal
                            </span>
                            <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mb-2">
                              Iman Katolik dalam Kasih Yesus Kristus
                            </h3>
                            <p className="text-white/80 text-xs sm:text-sm font-light leading-relaxed">
                              Seluruh kegiatan dan pengabdian anggota THS-THM senantiasa berlandaskan pada ajaran Gereja Katolik serta Kasih Kristus.
                            </p>
                          </div>
                        </div>
                      </div>


                      <div className="grid sm:grid-cols-3 gap-5">
                        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
                          <div>
                            <div className="w-10 h-10 rounded-xl bg-gold-400/20 text-gold-600 dark:text-gold-400 flex items-center justify-center mb-3">
                              <Heart size={20} />
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gold-600 dark:text-gold-400 block mb-1">Pilar I</span>
                            <h4 className="text-lg font-bold font-serif text-navy-900 dark:text-white mb-2">
                              Segi Olah Rohani
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                              Pendalaman iman, doa pribadi dan bersama, sakramen Ekaristi, rekonsiliasi, devosi Rosario, dan retret pendadaran.
                            </p>
                          </div>
                          <div className="text-xs text-navy-800 dark:text-gold-400 font-semibold pt-3 border-t border-gray-200 dark:border-gray-700">
                            &bull; Spiritualitas &amp; Doa
                          </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
                          <div>
                            <div className="w-10 h-10 rounded-xl bg-navy-800/10 dark:bg-navy-800 text-navy-800 dark:text-white flex items-center justify-center mb-3">
                              <Shield size={20} />
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-navy-800 dark:text-gold-400 block mb-1">Pilar II</span>
                            <h4 className="text-lg font-bold font-serif text-navy-900 dark:text-white mb-2">
                              Segi Bela Diri &amp; Fisik
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                              Penguasaan teknik pencak silat khas THS-THM, ketahanan jasmani (Sanitas), dan disiplin raga tanpa kekerasan liar.
                            </p>
                          </div>
                          <div className="text-xs text-navy-800 dark:text-gold-400 font-semibold pt-3 border-t border-gray-200 dark:border-gray-700">
                            &bull; Ketangkasan &amp; Disiplin Raga
                          </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
                          <div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                              <Users size={20} />
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">Pilar III</span>
                            <h4 className="text-lg font-bold font-serif text-navy-900 dark:text-white mb-2">
                              Organisasi &amp; Persaudaraan
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                              Membentuk kepemimpinan kesatria, ketaatan hirarki, serta persaudaraan sejati lintas ranting dan keuskupan.
                            </p>
                          </div>
                          <div className="text-xs text-navy-800 dark:text-gold-400 font-semibold pt-3 border-t border-gray-200 dark:border-gray-700">
                            &bull; Kepemimpinan &amp; Persaudaraan
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                )}


                {/* ── TAB 5: NASKAH LENGKAP / CMS CONTENT ── */}
                {activeTab === 'cms' && (
                  <section className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 sm:p-10 shadow-sm">
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="w-10 h-10 rounded-2xl bg-gold-50 dark:bg-gold-950/40 border border-gold-400/30 flex items-center justify-center text-navy-800 dark:text-gold-400">
                          <BookOpen size={20} />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold font-serif text-navy-900 dark:text-white">
                            Naskah Resmi Dokumen Sejarah
                          </h2>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            Arsip narasi resmi yang tercatat di basis data organisasi.
                          </p>
                        </div>
                      </div>

                      {data?.konten && data.konten.trim().length > 0 ? (
                        <article
                          className="prose prose-navy dark:prose-invert prose-lg max-w-none text-gray-700 dark:text-gray-300 leading-relaxed
                            prose-headings:text-navy-900 dark:prose-headings:text-white prose-headings:font-serif
                            prose-a:text-gold-600 dark:prose-a:text-gold-400 prose-strong:text-gray-900 dark:prose-strong:text-white"
                          dangerouslySetInnerHTML={{ __html: data.konten }}
                        />
                      ) : (
                        <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
                          <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 text-xs sm:text-sm text-blue-800 dark:text-blue-300">
                            <strong>Catatan:</strong> Naskah resmi ini bersumber dari ringkasan Konstitusi dan Sejarah Pendirian THS-THM.
                          </div>

                          <h3 className="text-xl font-serif font-bold text-navy-900 dark:text-white">
                            Kilas Balik Kelahiran Gerakan THS-THM
                          </h3>
                          <p>
                            Organisasi Tunggal Hati Seminari &ndash; Tunggal Hati Maria (THS-THM) lahir dari kerinduan mendalam untuk membina kaum muda Katolik melalui perpaduan harmonis antara kekayaan budaya bela diri pencak silat dan kedalaman rohani Katolik.
                          </p>
                          <p>
                            Bermula pada tahun 1983 di Seminari Menengah St. Petrus Canisius Mertoyudan, Jawa Tengah, Romo Martinus Hadisiswoyo, SJ memperkenalkan latihan pencak silat bagi para siswa seminaris.
                          </p>

                          <h3 className="text-xl font-serif font-bold text-navy-900 dark:text-white">
                            Momentum Hari Pahlawan 1985 &amp; 1986
                          </h3>
                          <p>
                            Pada tanggal <strong>10 November 1985</strong>, bertepatan dengan Hari Pahlawan Nasional, organisasi dideklarasikan dengan nama <strong>Tunggal Hati Seminari (THS)</strong>. Setahun kemudian, pada tanggal <strong>10 November 1986</strong>, berdiri pula wadah saudari <strong>Tunggal Hati Maria (THM)</strong> bagi kaum puteri.
                          </p>

                          <h3 className="text-xl font-serif font-bold text-navy-900 dark:text-white">
                            Kiprah dan Pengabdian Bagi Bangsa dan Gereja
                          </h3>
                          <p>
                            Hingga kini, ribuan anggota THS-THM tersebar di puluhan keuskupan di Indonesia dan mancanegara. Seluruh anggota dipanggil menjadi saksi kasih Kristus yang membawa damai dan menjaga keutuhan NKRI.
                          </p>
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </>
            )}
          </main>


          {/* ── Sidebar ── */}
          <aside className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
              <h3 className="font-bold text-navy-900 dark:text-white mb-4 text-xs uppercase tracking-wider font-serif flex items-center gap-2">
                <Sparkles size={16} className="text-gold-500" />
                {t.sejarah.quickFacts.title}
              </h3>

              <div className="space-y-3.5 text-xs sm:text-sm">
                <div className="pb-3 border-b border-gray-100 dark:border-gray-700/60">
                  <span className="text-gray-500 dark:text-gray-400 block text-[11px] mb-0.5">
                    {t.sejarah.quickFacts.founder}
                  </span>
                  <span className="font-semibold text-navy-900 dark:text-white">
                    {t.sejarah.quickFacts.founderVal}
                  </span>
                </div>
                <div className="pb-3 border-b border-gray-100 dark:border-gray-700/60">
                  <span className="text-gray-500 dark:text-gray-400 block text-[11px] mb-0.5">
                    {t.sejarah.quickFacts.firstPlace}
                  </span>
                  <span className="font-semibold text-navy-900 dark:text-white">
                    {t.sejarah.quickFacts.firstPlaceVal}
                  </span>
                </div>
                <div className="pb-3 border-b border-gray-100 dark:border-gray-700/60">
                  <span className="text-gray-500 dark:text-gray-400 block text-[11px] mb-0.5">
                    {t.sejarah.quickFacts.spiritualPatron}
                  </span>
                  <span className="font-semibold text-navy-900 dark:text-white">
                    {t.sejarah.quickFacts.spiritualPatronVal}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block text-[11px] mb-0.5">
                    {t.sejarah.quickFacts.officialColor}
                  </span>
                  <span className="font-semibold text-navy-900 dark:text-white">
                    {t.sejarah.quickFacts.officialColorVal}
                  </span>
                </div>
              </div>
            </div>


            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
              <h3 className="font-bold text-navy-900 dark:text-white mb-4 text-xs uppercase tracking-wider font-serif flex items-center gap-2">
                <Building2 size={16} className="text-gold-500" />
                Jelajahi Profil Organisasi
              </h3>

              <ul className="space-y-2">
                {[
                  { href: '/sejarah', label: t.nav.sejarah, desc: 'Kilas balik berdirinya THS-THM', active: true, icon: BookOpen },
                  { href: '/organisasi', label: t.nav.organisasi || 'Visi & AD/ART', desc: 'Prinsip organisasi & dasar konstitusi', active: false, icon: Landmark },
                  { href: '/struktur-organisasi', label: t.nav.strukturOrganisasi || 'Struktur Organisasi', desc: 'Bagan tata kelola Nasional hingga Ranting', active: false, icon: Building2 },
                  { href: '/kepengurusan', label: t.nav.kepengurusan, desc: 'Jajaran dewan pengurus aktif', active: false, icon: Users },
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
                        <div className="text-xs sm:text-sm font-semibold leading-tight">{link.label}</div>
                        <div className={`text-[11px] leading-tight mt-0.5 ${link.active ? 'text-white/80 dark:text-navy-950/80' : 'text-gray-400 dark:text-gray-400'}`}>
                          {link.desc}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 to-navy-950 text-white p-6 shadow-sm border border-navy-800">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold-400/10 rounded-full blur-xl pointer-events-none" />
              <h3 className="font-bold mb-2 text-xs uppercase tracking-widest text-gold-400 font-serif">
                Bergabung Bersama Kami
              </h3>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-light mb-4">
                Jadilah bagian dari generasi pendekar Katolik yang tangguh, beriman, dan mengabdi bagi Gereja serta Tanah Air.
              </p>
              <Link
                href="/daftar"
                className="w-full inline-flex items-center justify-center gap-2 bg-gold-400 text-navy-950 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-gold-300 transition-all shadow-md"
              >
                Daftar Anggota Baru
                <ArrowRight size={14} />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </PublicLayout>
  );
}

