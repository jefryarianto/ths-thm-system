'use client';

import { useEffect, useState } from 'react';
import { PublicLayout } from '@/components';
import { useI18n } from '@/i18n/context';

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
      {loading ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <section className="max-w-4xl mx-auto px-4 py-8 sm:py-16">
          <h1 className="text-2xl sm:text-4xl font-black text-blue-900 mb-6 sm:mb-8 text-center">{t.sejarah.title}</h1>
          <div className="prose prose-blue max-w-none text-gray-700 text-sm sm:text-base" dangerouslySetInnerHTML={{ __html: data?.konten || `<p>${t.sejarah.empty}</p>` }}>
          </div>
        </section>
      )}
    </PublicLayout>
  );
}
