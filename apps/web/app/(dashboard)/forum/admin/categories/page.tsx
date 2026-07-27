'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Save, GripVertical } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import apiClient from '@/lib/api-client';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import Link from 'next/link';

interface Category {
  id: string;
  nama: string;
  deskripsi: string | null;
  order: number;
  _count?: { threads: number };
}

interface CategoryForm {
  nama: string;
  deskripsi: string;
  order: number;
}

const emptyForm: CategoryForm = { nama: '', deskripsi: '', order: 0 };

export default function ForumAdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get('/forum/categories');
      if (res.success) setCategories(res.data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (cat: Category) => {
    setForm({
      nama: cat.nama,
      deskripsi: cat.deskripsi || '',
      order: cat.order,
    });
    setEditingId(cat.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.nama.trim()) {
      alert('Nama kategori wajib diisi');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        nama: form.nama.trim(),
        deskripsi: form.deskripsi.trim() || undefined,
        order: form.order,
      };

      if (editingId) {
        await apiClient.patch(`/forum/categories/${editingId}`, payload);
      } else {
        await apiClient.post('/forum/categories', payload);
      }
      await fetchCategories();
      resetForm();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Gagal menyimpan');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus kategori ini? Semua thread di dalamnya akan ikut dihapus.')) return;
    try {
      await apiClient.delete(`/forum/categories/${id}`);
      await fetchCategories();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Gagal menghapus');
    }
  };

  return (
    <PermissionGuard module="forum" action="admin">
      <PageContainer>
        <PageHeader
          title="Kelola Kategori Forum"
          onRefresh={fetchCategories}
        >
          <Link
            href="/forum"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            ← Kembali ke Forum
          </Link>
          {!showForm && (
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus size={16} /> Tambah Kategori
            </button>
          )}
        </PageHeader>

        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {editingId ? 'Edit Kategori' : 'Tambah Kategori'}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Kategori</label>
                <input
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  placeholder="Contoh: Diskusi Umum"
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-750 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deskripsi (opsional)</label>
                <textarea
                  value={form.deskripsi}
                  onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                  placeholder="Jelaskan isi kategori..."
                  rows={2}
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-750 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Urutan</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: parseInt(e.target.value || '0', 10) })}
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-750 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Save size={14} /> {submitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-500">Memuat...</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p>Belum ada kategori forum</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 w-10"></th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Nama</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Deskripsi</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Urutan</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Thread</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr
                    key={cat.id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <GripVertical size={14} className="text-gray-300" />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {cat.nama}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell">
                      {cat.deskripsi || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {cat.order}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {cat._count?.threads ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(cat)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageContainer>
    </PermissionGuard>
  );
}
