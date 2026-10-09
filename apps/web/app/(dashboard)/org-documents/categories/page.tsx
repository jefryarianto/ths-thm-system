'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient, { unwrap } from '@/lib/api-client';
import { ArrowLeft, Plus, Trash2, Pencil, FolderOpen, X } from 'lucide-react';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-modal';

interface CategoryRow {
  id: string;
  nama: string;
  deskripsi: string | null;
  _count?: { dokumen: number };
}

export default function OrgDocumentCategoriesPage() {
  const router = useRouter();
  const toast = useToast();
  const { confirm, confirmModal } = useConfirm();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [form, setForm] = useState({ nama: '', deskripsi: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/org-documents/categories');
      setCategories(unwrap(res) || []);
    } catch {
      toast('error', 'Gagal memuat kategori');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreateForm = () => {
    setEditing(null);
    setForm({ nama: '', deskripsi: '' });
    setShowForm(true);
  };

  const openEditForm = (cat: CategoryRow) => {
    setEditing(cat);
    setForm({ nama: cat.nama, deskripsi: cat.deskripsi || '' });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm({ nama: '', deskripsi: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) {
      toast('error', 'Nama kategori harus diisi');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { nama: form.nama, deskripsi: form.deskripsi || undefined };
      if (editing) {
        await apiClient.patch(`/org-documents/categories/${editing.id}`, payload);
        toast('success', 'Kategori diperbarui');
      } else {
        await apiClient.post('/org-documents/categories', payload);
        toast('success', 'Kategori dibuat');
      }
      closeForm();
      fetchCategories();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Gagal menyimpan kategori';
      toast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cat: CategoryRow) => {
    if (!(await confirm(`Hapus kategori "${cat.nama}"?`))) return;
    try {
      await apiClient.delete(`/org-documents/categories/${cat.id}`);
      toast('success', 'Kategori dihapus');
      fetchCategories();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Gagal menghapus kategori';
      toast('error', msg);
    }
  };

  return (
    <PermissionGuard module="org-documents" action="create">
      <PageContainer>
        <PageHeader title="Kategori Dokumen" onRefresh={fetchCategories}>
          <button
            onClick={() => router.push('/org-documents')}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={14} /> Kembali
          </button>
          <button
            onClick={openCreateForm}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} /> Tambah Kategori
          </button>
        </PageHeader>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-gray-800 rounded-2xl border p-5 space-y-4 mb-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {editing ? 'Edit Kategori' : 'Kategori Baru'}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              >
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nama Kategori</label>
              <input
                type="text"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
                placeholder="mis. Surat Keputusan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Deskripsi</label>
              <input
                type="text"
                value={form.deskripsi}
                onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
                placeholder="Deskripsi singkat (opsional)"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {submitting ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Buat Kategori'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border p-8 text-center text-sm text-gray-500">
            Memuat kategori...
          </div>
        ) : categories.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border p-8 text-center">
            <FolderOpen size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Belum ada kategori. Klik &ldquo;Tambah Kategori&rdquo; untuk membuat.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/30 text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">Deskripsi</th>
                    <th className="px-4 py-3 font-medium">Jumlah Dokumen</th>
                    <th className="px-4 py-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/20"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                        {row.nama}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {row.deskripsi || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {row._count?.dokumen ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditForm(row)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(row)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </PageContainer>
      {confirmModal}
    </PermissionGuard>
  );
}
