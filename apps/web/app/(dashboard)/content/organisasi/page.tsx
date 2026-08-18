'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient, { unwrap } from '@/lib/api-client';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { useToast } from '@/components/ui/toast';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import { Save, Eye, EyeOff, ArrowLeft, Plus, Trash2 } from 'lucide-react';

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

  const addItem = () => {
    setStruktur([...struktur, { jabatan: '', nama: '', deskripsi: '' }]);
  };

  const removeItem = (index: number) => {
    setStruktur(struktur.filter((_, i) => i !== index));
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
                  {isVisible ? 'Data ditampilkan di halaman public' : 'Data tersembunyi dari halaman public'}
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

          {/* Struktur Items */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Daftar Jabatan
              </label>
              <button
                onClick={addItem}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={14} />
                Tambah
              </button>
            </div>

            {struktur.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                <p>Belum ada data jabatan</p>
                <p className="text-sm">Klik "Tambah" untuk menambahkan jabatan baru</p>
              </div>
            ) : (
              <div className="space-y-4">
                {struktur.map((item, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      <button
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Jabatan</label>
                        <input
                          type="text"
                          value={item.jabatan}
                          onChange={(e) => updateItem(index, 'jabatan', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Ketua Umum"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Nama</label>
                        <input
                          type="text"
                          value={item.nama}
                          onChange={(e) => updateItem(index, 'nama', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Nama Pejabat"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Deskripsi</label>
                        <textarea
                          value={item.deskripsi}
                          onChange={(e) => updateItem(index, 'deskripsi', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          rows={2}
                          placeholder="Deskripsi singkat..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </PageContainer>
    </PermissionGuard>
  );
}
