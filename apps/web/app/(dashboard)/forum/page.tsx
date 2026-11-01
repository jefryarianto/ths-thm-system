'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, ArrowUpRight, Plus, Settings, FolderOpen, Sparkles } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { CanAdmin } from '@/components/auth/can';
import apiClient, { unwrap } from '@/lib/api-client';
import { useForumRealtime } from '@/lib/hooks/use-forum-realtime';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import Link from 'next/link';

interface Category {
  id: string;
  nama: string;
  deskripsi: string | null;
  _count: { threads: number };
}

/** Gradient ikon kategori (palet token — konsisten dengan StatCard dashboard). */
const CATEGORY_GRADIENTS = [
  'from-primary-500 to-primary-700',
  'from-info-500 to-primary-600',
  'from-secondary-500 to-secondary-700',
  'from-primary-400 to-info-500',
  'from-info-600 to-secondary-600',
] as const;

export default function ForumPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/forum/categories');
        const data = unwrap<Category[]>(res);
        if (data) setCategories(data);
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, []);

  // Update realtime: jumlah thread per kategori ikut berubah saat thread dibuat/dihapus.
  useForumRealtime({
    threadCreated: (data) => {
      const d = (data as { thread?: { categoryId?: string } }).thread ?? data;
      const categoryId = (d as { categoryId?: string } | undefined)?.categoryId;
      if (categoryId) {
        setCategories((prev) =>
          prev.map((c) =>
            c.id === categoryId ? { ...c, _count: { threads: c._count.threads + 1 } } : c,
          ),
        );
      }
    },
    threadDeleted: (data) => {
      const d = data as { categoryId?: string };
      if (d?.categoryId) {
        setCategories((prev) =>
          prev.map((c) =>
            c.id === d.categoryId
              ? { ...c, _count: { threads: Math.max(0, c._count.threads - 1) } }
              : c,
          ),
        );
      }
    },
  });

  const totalThreads = categories.reduce((sum, c) => sum + c._count.threads, 0);

  return (
    <PermissionGuard module="forum" action="view">
      <div className="space-y-5">
        <Breadcrumbs />

        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-600 to-secondary dark:from-primary-900 dark:via-primary-800 dark:to-secondary-800 shadow-elegant-lg">
          {/* dekorasi: bola cahaya lembut */}
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -left-12 -bottom-24 h-56 w-56 rounded-full bg-white/[0.07] blur-3xl" aria-hidden />

          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
                  <Sparkles size={12} className="text-white" />
                  Forum Komunitas THS-THM
                </span>
                <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Forum Komunitas
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">
                  Diskusi, berbagi, dan berkembang bersama
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/85">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 backdrop-blur">
                    <FolderOpen size={12} /> {categories.length} kategori
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 backdrop-blur">
                    <MessageSquare size={12} /> {totalThreads} thread
                  </span>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    href="/forum/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-elegant-md transition-all hover:shadow-elegant-lg hover:-translate-y-0.5"
                  >
                    <Plus size={16} /> Buat Thread
                  </Link>
                  <CanAdmin module="forum">
                    <Link
                      href="/forum/admin/categories"
                      className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
                    >
                      <Settings size={16} /> Kelola Kategori
                    </Link>
                  </CanAdmin>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Kategori ─────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text">Kategori Forum</h2>
            {!loading && categories.length > 0 && (
              <span className="text-xs text-muted">{categories.length} tersedia</span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-surface rounded-xl border border-border p-6 animate-pulse"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-surface-variant" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/2 bg-surface-variant rounded" />
                      <div className="h-3 w-full bg-surface-variant rounded" />
                      <div className="h-3 w-24 bg-surface-variant rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {categories.map((cat, i) => (
                <Link
                  key={cat.id}
                  href={`/forum/c/${cat.id}`}
                  className="group block bg-surface rounded-xl border border-border p-5 shadow-elegant transition-all duration-200 hover:shadow-elegant-md hover:border-primary/30 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2.5 rounded-xl bg-gradient-to-br ${CATEGORY_GRADIENTS[i % CATEGORY_GRADIENTS.length]} shadow-elegant transition-transform duration-200 group-hover:scale-105`}
                    >
                      <FolderOpen size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-semibold text-text group-hover:text-primary transition-colors">
                          {cat.nama}
                        </h3>
                        <ArrowUpRight
                          size={16}
                          className="text-muted group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-0.5"
                        />
                      </div>
                      {cat.deskripsi && (
                        <p className="text-sm text-muted mt-1 line-clamp-2 leading-relaxed">
                          {cat.deskripsi}
                        </p>
                      )}
                      <span className="inline-flex items-center gap-1.5 mt-3 rounded-full bg-surface-variant px-2.5 py-1 text-xs font-medium text-muted">
                        <MessageSquare size={12} />
                        {cat._count.threads} thread
                      </span>
                    </div>
                  </div>
                </Link>
              ))}

              {categories.length === 0 && (
                <div className="col-span-full text-center py-16 bg-surface rounded-xl border border-border">
                  <div className="mx-auto w-14 h-14 rounded-full bg-primary-container flex items-center justify-center mb-4">
                    <FolderOpen size={26} className="text-primary-on-container" />
                  </div>
                  <p className="font-medium text-text">Belum ada kategori forum</p>
                  <p className="text-sm text-muted mt-1">
                    Kategori akan muncul setelah dibuat oleh pengelola.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </PermissionGuard>
  );
}
