'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { use } from 'react';
import { PublicLayout } from '@/components';
import { Calendar, ArrowLeft } from 'lucide-react';
import { logError } from '@/lib/error-logger';

interface Berita {
  id: string;
  judul: string;
  ringkasan: string;
  konten: string;
  gambar?: string;
  tanggal: string;
  slug: string;
}

export default function BeritaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [berita, setBerita] = useState<Berita | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchBerita() {
      try {
        const res = await fetch(`/api/public/berita/${slug}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setBerita(json.data ?? json);
      } catch (error) {
        logError(error, { module: 'Berita', action: 'fetchDetail', slug });
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchBerita();
  }, [slug]);

  const formatTanggal = (tanggal: string) =>
    new Date(tanggal).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-navy-800 border-t-transparent" />
        </div>
      </PublicLayout>
    );
  }

  if (notFound || !berita) {
    return (
      <PublicLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <p className="text-xl text-gray-500">Berita tidak ditemukan</p>
          <Link
            href="/berita"
            className="inline-flex items-center gap-2 text-navy-800 font-semibold hover:text-gold-600 transition-colors"
          >
            <ArrowLeft size={16} />
            Kembali ke Berita
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back link */}
        <Link
          href="/berita"
          className="inline-flex items-center gap-2 text-navy-800 font-semibold hover:text-gold-600 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Kembali ke Berita
        </Link>

        {/* Meta */}
        <div className="flex items-center gap-3 text-sm text-gray-400 mb-4">
          <span className="flex items-center gap-1">
            <Calendar size={14} />
            <time>{formatTanggal(berita.tanggal)}</time>
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-gray-900 mb-6">
          {berita.judul}
        </h1>

        {/* Hero image */}
        {berita.gambar && (
          <div className="rounded-xl overflow-hidden mb-8 border border-gray-200">
            <img
              src={`/api/uploads/${berita.gambar}`}
              alt={berita.judul}
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Ringkasan */}
        <p className="text-lg text-gray-600 leading-relaxed mb-8 border-l-4 border-gold-400 pl-4 italic">
          {berita.ringkasan}
        </p>

        {/* Konten (HTML) */}
        <div
          className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-navy-800"
          dangerouslySetInnerHTML={{ __html: berita.konten }}
        />
      </article>
    </PublicLayout>
  );
}