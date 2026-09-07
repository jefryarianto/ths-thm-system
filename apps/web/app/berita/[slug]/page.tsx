import Link from 'next/link';
import { PublicLayout } from '@/components';
import { Calendar, ArrowLeft } from 'lucide-react';
import { Metadata } from 'next';
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

// In production NEXT_PUBLIC_API_URL = "https://ths-thm.cloud/api"
// In dev, fall back to localhost with /api prefix (matching NestJS global prefix)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function fetchBerita(slug: string): Promise<Berita | null> {
  try {
    const res = await fetch(`${API_BASE}/public/berita/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? json;
  } catch (error) {
    logError(error, { module: 'Berita', action: 'fetchDetail', slug });
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const berita = await fetchBerita(slug);

  if (!berita) {
    return {
      title: 'Berita Tidak Ditemukan | THS-THM',
      description: 'Berita yang Anda cari tidak ditemukan.',
    };
  }

  return {
    title: `${berita.judul} | THS-THM Berita`,
    description: berita.ringkasan,
    openGraph: {
      title: berita.judul,
      description: berita.ringkasan,
      type: 'article',
      publishedTime: berita.tanggal,
      ...(berita.gambar && {
        images: [`${API_BASE}/uploads/${berita.gambar}`],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: berita.judul,
      description: berita.ringkasan,
    },
  };
}

export default async function BeritaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const berita = await fetchBerita(slug);

  const formatTanggal = (tanggal: string) =>
    new Date(tanggal).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  if (!berita) {
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
      <article className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back link */}
        <Link
          href="/berita"
          className="inline-flex items-center gap-2 text-navy-800 font-semibold hover:text-gold-600 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Kembali ke Berita
        </Link>

        {/* Meta */}
        <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
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
          className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-headings:font-serif prose-p:text-gray-700 prose-a:text-navy-800 prose-a:underline prose-li:text-gray-700 prose-blockquote:text-gray-700 prose-blockquote:border-navy-800"
          dangerouslySetInnerHTML={{ __html: berita.konten }}
        />
      </article>
    </PublicLayout>
  );
}