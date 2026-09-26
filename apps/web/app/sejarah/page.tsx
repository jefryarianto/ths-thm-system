'use client';

import { useEffect, useState } from 'react';
import { PublicLayout } from '@/components';
import { useI18n } from '@/i18n/context';
import { BookOpen, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { logError } from '@/lib/error-logger';

export default function SejarahPage() {
  const { t } = useI18n();
  const [data, setData] = useState<{ konten: string } | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <PublicLayout>
      {/* Page Header */}
      <div className="bg-gradient-to-r from-navy-700 to-navy-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
            <Link href="/" className="hover:text-white transition-colors">Beranda</Link>
            <ChevronRight size={14} />
            <span className="text-gold-400">Sejarah</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white font-serif">{t.sejarah.title}</h1>
          <div className="w-16 h-1 bg-gold-400 mt-4 rounded-full" />
        </div>
      </div>

      {loading ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-navy-800 border-t-transparent" />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Main Content (Wider 3/4 layout) */}
            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 sm:p-10 shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center text-navy-800 dark:text-gold-400">
                    <BookOpen size={22} />
                  </div>
                  <h2 className="text-2xl font-bold font-serif text-navy-900 dark:text-white">{t.sejarah.title}</h2>
                </div>
                <div
                  className="prose prose-navy dark:prose-invert prose-lg max-w-none text-gray-700 dark:text-gray-300 leading-relaxed
                    prose-headings:text-navy-900 dark:prose-headings:text-white prose-headings:font-serif
                    prose-a:text-gold-600 dark:prose-a:text-gold-400 prose-strong:text-gray-900 dark:prose-strong:text-white"
                  dangerouslySetInnerHTML={{ __html: data?.konten || `<p class="text-gray-400">${t.sejarah.empty}</p>` }}
                />
              </div>
            </div>

            {/* Sidebar (1/4 layout) */}
            <aside className="space-y-6">
              {/* Navigasi */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                <h3 className="font-bold text-navy-900 dark:text-white mb-4 text-xs uppercase tracking-wider font-serif">Navigasi</h3>
                <ul className="space-y-1.5">
                  {[
                    { href: '/sejarah', label: t.nav.sejarah, active: true },
                    { href: '/organisasi', label: t.nav.organisasi, active: false },
                    { href: '/kepengurusan', label: t.nav.kepengurusan, active: false },
                  ].map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={`flex items-center gap-2 text-sm py-2 px-3 rounded-xl transition-colors ${
                          link.active
                            ? 'bg-navy-800 text-white font-bold dark:bg-gold-400 dark:text-navy-950'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-navy-50 dark:hover:bg-gray-700 hover:text-navy-900 dark:hover:text-white'
                        }`}
                      >
                        <ChevronRight size={14} />
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tentang THS-THM */}
              <div className="bg-navy-900 rounded-2xl p-6 text-white shadow-sm border border-navy-800">
                <h3 className="font-bold mb-3 text-xs uppercase tracking-widest text-gold-400 font-serif">
                  Tentang THS-THM
                </h3>
                <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-light">
                  Tunggal Hati Seminari (THS) dan Tunggal Hati Maria (THM) adalah organisasi bela diri pencak silat Katolik yang berfokus pada olah rohani, olah raga, keorganisasian, dan persaudaraan.
                </p>
              </div>
            </aside>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
