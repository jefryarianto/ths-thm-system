'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient, { unwrap } from '@/lib/api-client';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { useToast } from '@/components/ui/toast';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import {
  Save,
  Eye,
  EyeOff,
  ArrowLeft,
  Plus,
  Trash2,
  DownloadCloud,
  ArrowUp,
  ArrowDown,
  Loader2,
  Users,
  AlertCircle,
} from 'lucide-react';

interface OrganisasiItem {
  jabatan: string;
  nama: string;
  deskripsi: string;
}

interface Organisasi {
  id: string;
  struktur: OrganisasiItem[];
  isVisible: boolean;
}

export default function OrganisasiPage() {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<Organisasi | null>(null);
  const [struktur, setStruktur] = useState<OrganisasiItem[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncPreview, setSyncPreview] = useState<OrganisasiItem[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await apiClient.get('/settings/organisasi');
      const org = unwrap<Organisasi>(res);
      setData(org);
      setStruktur(org.struktur || []);
      setIsVisible(org.isVisible);
    } catch {
      toast('error', 'Gagal memuat data organisasi');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/settings/organisasi', { struktur, isVisible });
      toast('success', 'Struktur organisasi berhasil disimpan');
    } catch {
      toast('error', 'Gagal menyimpan struktur organisasi');
    } finally {
      setSaving(false);
    }
  };

  const handleFetchKepengurusan = async () => {
    setSyncing(true);
    try {
      // Use the dedicated backend endpoint that properly filters active national kepengurusan
      const res = await apiClient.get('/settings/organisasi/kepengurusan-preview');
      const list = unwrap<OrganisasiItem[]>(res) || [];

      if (!list || list.length === 0) {
        toast('warning', 'Tidak ada data pengurus nasional aktif yang ditemukan');
        return;
      }

      setSyncPreview(list);
      setShowSyncModal(true);
    } catch {
      toast('error', 'Gagal mengambil data dari modul Kepengurusan');
    } finally {
      setSyncing(false);
    }
  };

  const applySync = async (mode: 'replace' | 'append') => {
    setSyncing(true);
    try {
      const res = await apiClient.post('/settings/organisasi/sync', { mode });
      const result = unwrap<{ success: boolean; message: string; count: number; struktur: OrganisasiItem[] }>(res);

      if (result?.success === false) {
        toast('warning', result.message || 'Sinkronisasi gagal');
        return;
      }

      // Refresh the organisasi data from server after sync
      await fetchData();
      toast('success', result?.message || 'Sinkronisasi berhasil');
    } catch {
      toast('error', 'Gagal melakukan sinkronisasi kepengurusan');
    } finally {
      setSyncing(false);
      setShowSyncModal(false);
    }
  };

  const addItem = () => {
    setStruktur([...struktur, { jabatan: '', nama: '', deskripsi: '' }]);
  };

  const removeItem = (index: number) => {
    setStruktur(struktur.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= struktur.length) return;
    const newItems = [...struktur];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);
    setStruktur(newItems);
  };

  const updateItem = (index: number, field: keyof OrganisasiItem, value: string) => {
    const updated = [...struktur];
    updated[index] = { ...updated[index], [field]: value };
    setStruktur(updated);
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PermissionGuard module="settings" action="edit">
      <PageContainer>
        <PageHeader title="Edit Struktur Organisasi" onRefresh={fetchData}>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={16} />
            Kembali
          </button>
        </PageHeader>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {/* Status Toggle */}
          <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {isVisible ? (
                <Eye size={20} className="text-green-600" />
              ) : (
                <EyeOff size={20} className="text-gray-400" />
              )}
              <div>
                <p className="font-medium text-gray-900">Status Tampil</p>
                <p className="text-sm text-gray-500">
                  {isVisible ? 'Data ditampilkan di halaman public (/organisasi)' : 'Data tersembunyi dari halaman public'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsVisible(!isVisible)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isVisible ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isVisible ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Struktur Items Header & Actions */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <label className="block text-base font-semibold text-gray-900">
                  Daftar Pengurus / Struktur
                </label>
                <p className="text-xs text-gray-500">
                  Kelola tingkatan pimpinan organisasi atau sinkronkan langsung dari data kepengurusan nasional.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFetchKepengurusan}
                  disabled={syncing}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-navy-800 text-white rounded-lg hover:bg-navy-900 transition-colors disabled:opacity-50"
                  title="Ambil data pengurus nasional aktif"
                >
                  {syncing ? <Loader2 size={14} className="animate-spin" /> : <DownloadCloud size={14} />}
                  Tarik dari Kepengurusan
                </button>
                <button
                  onClick={addItem}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={14} />
                  Tambah Manual
                </button>
              </div>
            </div>

            {struktur.length === 0 ? (
              <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                <Users size={36} className="mx-auto text-gray-400 mb-2" />
                <p className="font-medium text-gray-700">Belum ada data struktur organisasi</p>
                <p className="text-sm text-gray-500 mt-1">
                  Klik <strong>"Tarik dari Kepengurusan"</strong> untuk mengimpor dari data pengurus nasional atau <strong>"Tambah Manual"</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {struktur.map((item, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100/60 transition-colors">
                    <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                          #{index + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {item.jabatan || '(Jabatan Belum Diisi)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveItem(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-500 hover:text-gray-800 disabled:opacity-30"
                          title="Pindah ke atas"
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          onClick={() => moveItem(index, 'down')}
                          disabled={index === struktur.length - 1}
                          className="p-1 text-gray-500 hover:text-gray-800 disabled:opacity-30"
                          title="Pindah ke bawah"
                        >
                          <ArrowDown size={15} />
                        </button>
                        <button
                          onClick={() => removeItem(index)}
                          className="p-1 text-red-500 hover:text-red-700 ml-2"
                          title="Hapus baris"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Jabatan / Posisi *</label>
                        <input
                          type="text"
                          value={item.jabatan}
                          onChange={(e) => updateItem(index, 'jabatan', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="e.g. Ketua Umum, Penasihat Rohani"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Nama Pejabat / Tokoh *</label>
                        <input
                          type="text"
                          value={item.nama}
                          onChange={(e) => updateItem(index, 'nama', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="e.g. Romo ..., Dr. ..."
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi / Peran Singkat</label>
                        <textarea
                          value={item.deskripsi}
                          onChange={(e) => updateItem(index, 'deskripsi', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          rows={2}
                          placeholder="Keterangan singkat peran atau periode kepengurusan..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Save size={16} />
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>

        {/* Sync Preview Confirmation Modal */}
        {showSyncModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 text-navy-800 mb-4">
                <div className="p-2.5 rounded-full bg-blue-50 text-blue-600">
                  <DownloadCloud size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Impor Kepengurusan Nasional</h3>
                  <p className="text-xs text-gray-500">Ditemukan {syncPreview.length} data pengurus nasional aktif</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 max-h-52 overflow-y-auto mb-4 border border-gray-200 text-sm">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Pratinjau Data:</p>
                <div className="space-y-1.5">
                  {syncPreview.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-gray-100">
                      <span className="font-semibold text-gray-800">{item.jabatan}</span>
                      <span className="text-gray-600">{item.nama}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg flex items-start gap-2 mb-5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>
                  Pilih metode impor: <strong>Timpa Semua</strong> akan menggantikan struktur saat ini, atau <strong>Tambahkan</strong> untuk menyisipkan ke daftar yang sudah ada.
                </span>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  onClick={() => setShowSyncModal(false)}
                  disabled={syncing}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={() => applySync('append')}
                  disabled={syncing}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-200 text-gray-800 hover:bg-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {syncing && <Loader2 size={14} className="animate-spin" />}
                  Tambahkan ke Daftar
                </button>
                <button
                  onClick={() => applySync('replace')}
                  disabled={syncing}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {syncing && <Loader2 size={14} className="animate-spin" />}
                  Timpa Semua
                </button>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </PermissionGuard>
  );
}
