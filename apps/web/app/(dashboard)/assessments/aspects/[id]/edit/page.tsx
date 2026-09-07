'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import FormField from '@/components/ui/form-field';
import { DetailSkeleton, ErrorPage, FormLayout } from '@/components/crud';
import { useConfirm } from '@/components/ui/confirm-modal';
import { useToast } from '@/components/ui/toast';
import { Edit3, Trash2, Eye, RotateCcw, Plus } from 'lucide-react';

interface AspectDetail {
  id: string;
  kodeAspek: string;
  namaAspek: string;
  deskripsi: string | null;
  bobot: number;
  isActive: boolean;
}

interface AspectItem {
  id: string;
  kodeItem: string;
  namaItem: string;
  skorMaksimal: number;
  bobot: number;
  urutan: number;
  isActive: boolean;
}

export default function EditAspectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { confirm, confirmModal } = useConfirm();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState('');

  const [form, setForm] = useState({
    namaAspek: '',
    deskripsi: '',
    bobot: 0,
    isActive: true,
  });

  const [aspectTitle, setAspectTitle] = useState('');

  // ── Items aspek ini (menentukan item-itemnya aspek) ──
  const [items, setItems] = useState<AspectItem[]>([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [itemError, setItemError] = useState('');
  const [itemSaving, setItemSaving] = useState(false);
  const [itemForm, setItemForm] = useState({
    kodeItem: '',
    namaItem: '',
    skorMaksimal: 100,
    bobot: 1,
  });

  const loadItems = useCallback(async () => {
    if (!id) return;
    try {
      // includeInactive=true supaya admin bisa restore item yang disembunyikan.
      const { data: res } = await apiClient.get('/assessments/items', {
        params: { aspekId: id, limit: 100, includeInactive: 'true' },
      });
      const list: AspectItem[] = ((res.data || []) as AspectItem[]).sort(
        (a, b) => (a.urutan || 0) - (b.urutan || 0),
      );
      setItems(list);
      setItemError('');
    } catch {
      setItemError('Gagal memuat item penilaian');
    }
    setItemsLoaded(true);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const { data: res } = await apiClient.get(`/assessments/aspects/${id}`);
        const a: AspectDetail = res.data;
        setForm({
          namaAspek: a.namaAspek,
          deskripsi: a.deskripsi || '',
          bobot: a.bobot,
          isActive: a.isActive,
        });
        setAspectTitle(`${a.kodeAspek} - ${a.namaAspek}`);
      } catch {
        setFetchError('Gagal memuat data aspek');
      }
      setLoading(false);
      await loadItems();
    })();
  }, [id, loadItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.namaAspek) { setError('Nama aspek harus diisi'); return; }
    if (form.bobot <= 0) { setError('Bobot harus lebih dari 0'); return; }
    setSaving(true); setError('');
    try {
      await apiClient.patch(`/assessments/aspects/${id}`, {
        namaAspek: form.namaAspek,
        deskripsi: form.deskripsi || undefined,
        bobot: form.bobot,
        isActive: form.isActive,
      });
      toast('success', 'Aspek diperbarui');
      router.push('/assessments');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Gagal menyimpan perubahan');
    }
    setSaving(false);
  };

  const handleAddItem = async () => {
    if (!itemForm.kodeItem.trim()) { setItemError('Kode item harus diisi'); return; }
    if (!itemForm.namaItem.trim()) { setItemError('Nama item harus diisi'); return; }
    if (itemForm.skorMaksimal <= 0) { setItemError('Skor maksimal harus lebih dari 0'); return; }
    if (itemForm.bobot <= 0) { setItemError('Bobot harus lebih dari 0'); return; }

    setItemSaving(true);
    setItemError('');
    try {
      // urutan tidak dikirim → server compute otomatis max+1.
      await apiClient.post('/assessments/items', {
        aspekId: id,
        kodeItem: itemForm.kodeItem.trim(),
        namaItem: itemForm.namaItem.trim(),
        skorMaksimal: itemForm.skorMaksimal,
        bobot: itemForm.bobot,
      });
      setItemForm({ kodeItem: '', namaItem: '', skorMaksimal: 100, bobot: 1 });
      toast('success', 'Item ditambahkan');
      await loadItems();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setItemError(msg || 'Gagal menambahkan item');
    }
    setItemSaving(false);
  };

  const handleToggleItem = async (item: AspectItem) => {
    try {
      await apiClient.patch(`/assessments/items/${item.id}`, { isActive: !item.isActive });
      toast('success', item.isActive ? 'Item disembunyikan' : 'Item diaktifkan');
      await loadItems();
    } catch {
      toast('error', 'Gagal mengubah status item');
    }
  };

  const handleRestoreItem = async (item: AspectItem) => {
    try {
      await apiClient.post(`/assessments/items/${item.id}/restore`);
      toast('success', 'Item diaktifkan kembali');
      await loadItems();
    } catch {
      toast('error', 'Gagal mengaktifkan item');
    }
  };

  const handleRemoveItem = async (item: AspectItem) => {
    if (!(await confirm(`Hapus item "${item.namaItem}"? Item akan disembunyikan.`))) return;
    try {
      await apiClient.delete(`/assessments/items/${item.id}`);
      toast('success', 'Item disembunyikan');
      await loadItems();
    } catch {
      toast('error', 'Gagal menghapus item');
    }
  };

  if (loading) return <DetailSkeleton />;
  if (fetchError) return <ErrorPage message={fetchError} backHref="/assessments" backLabel="Kembali ke Penilaian" />;

  return (
      <PermissionGuard module="assessments" action="edit">
        <FormLayout
              backHref="/assessments"
              title="Edit Aspek Penilaian"
              subtitle={aspectTitle}
              error={error}
              saving={saving}
              onCancel={() => router.push('/assessments')}
              onSubmit={handleSubmit}
              submitLabel="Simpan Perubahan"
            >
              <FormField label="Nama Aspek" required>
                <input type="text" value={form.namaAspek} onChange={(e) => setForm({ ...form, namaAspek: e.target.value })} required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
              </FormField>
        
              <FormField label="Deskripsi">
                <textarea value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
              </FormField>
        
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Bobot" required>
                  <input type="number" value={form.bobot} onChange={(e) => setForm({ ...form, bobot: parseFloat(e.target.value) || 0 })}
                    min="0" max="100" step="0.1" required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                </FormField>
                <FormField label="Status">
                  <select value={form.isActive ? 'true' : 'false'} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition">
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </FormField>
              </div>
            </FormLayout>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Item Penilaian ({items.length})
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
              Items yang masukan aspek ini. Urutan tombol otomatis (max+1). Item yang disembunyikan tetap di list dan bisa di-restore.
            </p>

            {itemsLoaded && items.length === 0 && (
              <p className="text-sm text-gray-400 mb-3">Belum ada item untuk aspek ini. Tambah item di bawah.</p>
            )}

            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-lg border p-3 ${item.isActive
                    ? 'border-gray-200 dark:border-gray-700'
                    : 'border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                        {item.namaItem}
                        {!item.isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 rounded-md shrink-0">
                            Nonaktif
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {item.kodeItem} · Skor max {item.skorMaksimal} · Bobot {Number(item.bobot) * 100}% · Urutan {item.urutan}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!item.isActive && (
                        <button
                          onClick={async () => handleRestoreItem(item)}
                          className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded-md transition-colors"
                          title="Aktifkan kembali"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                      <Link
                        href={`/assessments/items/${item.id}/edit`}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-md transition-colors inline-flex"
                        title="Edit item"
                      >
                        <Edit3 size={14} />
                      </Link>
                      <button
                        onClick={async () => handleToggleItem(item)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-md transition-colors"
                        title={item.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={async () => handleRemoveItem(item)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors"
                        title="Hapus (nonaktif)"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                <Plus size={14} className="inline-block mr-1" /> Tambah Item
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Kode Item</label>
                  <input type="text" value={itemForm.kodeItem} onChange={(e) => setItemForm({ ...itemForm, kodeItem: e.target.value })} required placeholder="Contoh: TKJ-01" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nama Item</label>
                  <input type="text" value={itemForm.namaItem} onChange={(e) => setItemForm({ ...itemForm, namaItem: e.target.value })} required placeholder="Nama item penilaian" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Skor Maksimal</label>
                  <input type="number" value={itemForm.skorMaksimal} onChange={(e) => setItemForm({ ...itemForm, skorMaksimal: parseFloat(e.target.value) || 0 })} min="0.5" max="1000" step="0.5" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Bobot (%)</label>
                  <input type="number" value={itemForm.bobot} onChange={(e) => setItemForm({ ...itemForm, bobot: parseFloat(e.target.value) || 0 })} min="0.01" max="100" step="0.01" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                </div>
              </div>
              {itemError && (
                <div className="mt-2 flex items-center gap-2.5 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                  {itemError}
                </div>
              )}
              <div className="flex justify-end mt-3">
                <button
                  onClick={async () => handleAddItem()}
                  disabled={itemSaving || saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={14} /> {itemSaving ? 'Menyimpan...' : 'Tambah Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
        {confirmModal}
      </PermissionGuard>
    );
}
