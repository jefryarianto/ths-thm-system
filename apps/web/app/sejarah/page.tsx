'use client';

import { useEffect, useState } from 'react';
import { PublicLayout } from '@/components';
import { useI18n } from '@/i18n/context';
import { BookOpen, ChevronRight } from 'lucide-react';
import Link from 'next/link';

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
        console.error('Error fetching sejarah:', error);
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
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-100 p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gold-50 flex items-center justify-center">
                    <BookOpen size={20} className="text-navy-800" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">{t.sejarah.title}</h2>
                </div>
                <div
                  className="prose prose-green max-w-none text-gray-700 leading-relaxed
                    prose-headings:text-navy-800 prose-headings:font-serif
                    prose-a:text-navy-800 prose-strong:text-gray-900"
                  dangerouslySetInnerHTML={{ __html: data?.konten || `<p class="text-gray-400">${t.sejarah.empty}</p>` }}
                />
              </div>
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Navigasi */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">Navigasi</h3>
                <ul className="space-y-2">
                  {[
                    { href: '/sejarah', label: t.nav.sejarah, active: true },
                    { href: '/organisasi', label: t.nav.organisasi, active: false },
                    { href: '/kepengurusan', label: t.nav.kepengurusan, active: false },
                  ].map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={`flex items-center gap-2 text-sm py-2 px-3 rounded-lg transition-colors ${
                          link.active
                            ? 'bg-navy-50 text-navy-800 font-semibold'
                            : 'text-gray-600 hover:bg-[#F8F9FA] hover:text-gray-900'
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
              <div className="bg-navy-800 rounded-xl p-5 text-white">
                <h3 className="font-bold mb-3 text-sm uppercase tracking-wider text-gold-400">
                  Tentang THS-THM
                </h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  Tunggal Hati Seminari (THS) dan Tunggal Hati Maria (THM) adalah organisasi yang bergerak dalam bidang pendidikan dan pembinaan generasi muda Katolik.
                </p>
              </div>
            </aside>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
