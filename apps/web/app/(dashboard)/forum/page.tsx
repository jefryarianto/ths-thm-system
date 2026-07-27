'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, FolderOpen, Plus, Settings } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { CanAdmin } from '@/components/auth/can';
import apiClient from '@/lib/api-client';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import Link from 'next/link';


interface Category {
  id: string;
  nama: string;
  deskripsi: string | null;
  _count: { threads: number };
}

export default function ForumPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/forum/categories');
        if (res.data.success) setCategories(res.data.data);
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, []);

  return (
    <PermissionGuard module="forum" action="view">
    <PageContainer>
      <PageHeader title="Forum Komunitas">
        <Link
          href="/forum/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} /> Buat Thread
        </Link>
        <CanAdmin module="forum">
          <Link
            href="/forum/admin/categories"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <Settings size={16} /> Kelola Kategori
          </Link>
        </CanAdmin>
      </PageHeader>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Memuat...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/forum/c/${cat.id}`}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-950 rounded-lg">
                  <FolderOpen size={22} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    {cat.nama}
                  </h3>
                  {cat.deskripsi && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {cat.deskripsi}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
                    <MessageSquare size={12} />
                    <span>{cat._count.threads} thread</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {categories.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
              <p>Belum ada kategori forum</p>
            </div>
          )}
        </div>
      )}
    </PageContainer>
    </PermissionGuard>
  );
}
