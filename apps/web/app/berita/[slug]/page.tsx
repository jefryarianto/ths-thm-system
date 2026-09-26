import Link from 'next/link';
import { PublicLayout } from '@/components';
import { Calendar, ArrowLeft, ChevronRight, Clock, Share2 } from 'lucide-react';
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
  kategori?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

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

/**
 * Clean & sanitize raw HTML content.
 * Prevents full HTML documents (with <!DOCTYPE>, <html>, <head>, <style>, <body>)
 * from breaking page styling or duplicating titles/body elements.
 */
function cleanHtmlContent(rawHtml: string): string {
  if (!rawHtml) return '';
  let html = rawHtml;

  // If full HTML document, extract inner content of <body>...</body>
  if (html.includes('<body') && html.includes('</body>')) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch && bodyMatch[1]) {
      html = bodyMatch[1];
    }
  }

  // Remove embedded <style>, <head>, <!DOCTYPE>, <html>, <body> tags
  html = html
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?(html|body|head)[^>]*>/gi, '');

  // Remove redundant leading <h1> heading if it duplicates article title
  html = html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>/i, '');

  return html.trim();
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

  const estimateReadTime = (text: string) => {
    const words = text ? text.trim().split(/\s+/).length : 0;
    const minutes = Math.max(1, Math.ceil((words + 200) / 180));
    return `${minutes} mnt baca`;
  };

  if (!berita) {
    return (
      <PublicLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-gray-900 py-16">
          <p className="text-xl font-semibold text-gray-600 dark:text-gray-300">
            Berita tidak ditemukan
          </p>
          <Link
            href="/berita"
            className="inline-flex items-center gap-2 px-6 py-3 bg-navy-800 text-white rounded-xl font-semibold hover:bg-navy-700 transition-colors shadow-md"
          >
            <ArrowLeft size={16} />
            Kembali ke Berita
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const cleanedContent = cleanHtmlContent(berita.konten);

  return (
    <PublicLayout>
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-navy-800 to-navy-950 py-10 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-white/60 text-xs sm:text-sm mb-4">
            <Link href="/" className="hover:text-white transition-colors">
              Beranda
            </Link>
            <ChevronRight size={12} />
            <Link href="/berita" className="hover:text-white transition-colors">
              Berita
            </Link>
            <ChevronRight size={12} />
            <span className="text-gold-400 truncate max-w-[200px] sm:max-w-xs">
              {berita.judul}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-gold-300 mb-3">
            {berita.kategori && (
              <span className="bg-gold-400 text-navy-950 font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
                {berita.kategori}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar size={13} />
              <time>{formatTanggal(berita.tanggal)}</time>
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <Clock size={13} />
              <span>{estimateReadTime(berita.konten || berita.ringkasan)}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-serif font-bold leading-snug">
            {berita.judul}
          </h1>
        </div>
      </div>

      {/* Main Body */}
      <section className="py-12 sm:py-16 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back link & Share */}
          <div className="flex justify-between items-center mb-8 border-b border-gray-100 dark:border-gray-800 pb-4">
            <Link
              href="/berita"
              className="inline-flex items-center gap-2 text-navy-800 dark:text-gold-400 text-sm font-semibold hover:underline transition-all"
            >
              <ArrowLeft size={16} />
              Kembali ke Daftar Berita
            </Link>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${berita.judul} - https://ths-thm.cloud/berita/${berita.slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors"
              title="Bagikan ke WhatsApp"
            >
              <Share2 size={13} />
              Bagikan
            </a>
          </div>

          {/* Hero image */}
          {berita.gambar && (
            <div className="rounded-2xl overflow-hidden mb-8 border border-gray-100 dark:border-gray-800 shadow-md">
              <img
                src={`/api/uploads/${berita.gambar}`}
                alt={berita.judul}
                className="w-full h-auto max-h-[500px] object-cover"
              />
            </div>
          )}

          {/* Ringkasan Excerpt */}
          {berita.ringkasan && (
            <div className="p-6 rounded-2xl bg-navy-50/70 dark:bg-gray-800 border-l-4 border-gold-400 mb-8">
              <p className="text-base sm:text-lg text-navy-900 dark:text-gray-200 leading-relaxed font-medium italic">
                {berita.ringkasan}
              </p>
            </div>
          )}

          {/* HTML Content Body */}
          <div
            className="prose prose-navy dark:prose-invert prose-lg max-w-none w-full
              prose-headings:font-serif prose-headings:text-navy-900 dark:prose-headings:text-white
              prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed
              prose-a:text-gold-600 dark:prose-a:text-gold-400 prose-a:font-semibold
              prose-img:rounded-2xl prose-img:shadow-md"
            dangerouslySetInnerHTML={{ __html: cleanedContent }}
          />

          {/* Article Footer & Action */}
          <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/berita"
              className="inline-flex items-center gap-2 text-navy-800 dark:text-gold-400 font-bold text-sm hover:underline"
            >
              <ArrowLeft size={16} />
              Lihat Berita Lainnya
            </Link>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${berita.judul} - https://ths-thm.cloud/berita/${berita.slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 transition-colors shadow-sm"
            >
              <Share2 size={14} />
              Bagikan Berita ini ke WhatsApp
            </a>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}