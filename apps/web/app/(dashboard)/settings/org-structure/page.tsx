'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Plus, Edit3, Trash2, RefreshCw, Save, AlertCircle, Building2, Map as MapIcon, Home } from 'lucide-react';
import Modal from '@/components/ui/modal';

// ─── Types ───

interface Distrik {
  id: string;
  kodeDistrik: string;
  nama: string;
  alamat?: string;
  _count: { wilayahs: number };
}

interface Wilayah {
  id: string;
  kodeWilayah: string;
  nama: string;
  distrikId: string;
  distrik?: { id: string; nama: string };
  _count: { rantings: number };
}

interface Ranting {
  id: string;
  kodeRanting: string;
  nama: string;
  lokasiLatihan?: string;
  wilayahId: string;
  wilayah?: { id: string; nama: string; distrik?: { id: string; nama: string } };
  _count: { anggota: number };
}

type OrgLevel = 'distrik' | 'wilayah' | 'ranting';

// ─── Form Modal Component ───

function OrgFormModal({
  open,
  onClose,
  level,
  data,
  distrikList,
  wilayahList,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  level: OrgLevel;
  data: Record<string, string> | null;
  distrikList?: Distrik[];
  wilayahList?: Wilayah[];
  onSave: (form: Record<string, string>) => Promise<void>;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(data || {});
      setError('');
    }
  }, [open, data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Gagal menyimpan');
    }
    setSaving(false);
  };

  const label = level === 'distrik' ? 'Distrik' : level === 'wilayah' ? 'Wilayah' : 'Ranting';
  const isEdit = data && data.id;

  return (
    <Modal open={open} onClose={onClose} title={`${isEdit ? 'Edit' : 'Tambah'} ${label}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Kode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kode {label}</label>
          <input
            type="text"
            value={form.kode || ''}
            onChange={(e) => setForm({ ...form, kode: e.target.value })}
            required
            placeholder={`Kode ${label.toLowerCase()}`}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Nama */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama {label}</label>
          <input
            type="text"
            value={form.nama || ''}
            onChange={(e) => setForm({ ...form, nama: e.target.value })}
            required
            placeholder={`Nama ${label.toLowerCase()}`}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Parent selector for Wilayah/Ranting */}
        {level === 'wilayah' && distrikList && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Distrik</label>
            <select
              value={form.distrikId || ''}
              onChange={(e) => setForm({ ...form, distrikId: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Pilih Distrik</option>
              {distrikList.map((d) => (
                <option key={d.id} value={d.id}>{d.nama} ({d.kodeDistrik})</option>
              ))}
            </select>
          </div>
        )}

        {level === 'ranting' && wilayahList && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Wilayah</label>
            <select
              value={form.wilayahId || ''}
              onChange={(e) => setForm({ ...form, wilayahId: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Pilih Wilayah</option>
              {wilayahList.map((w) => (
                <option key={w.id} value={w.id}>{w.nama} ({w.kodeWilayah})</option>
              ))}
            </select>
          </div>
        )}

        {/* Alamat / Lokasi */}
        {level === 'distrik' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alamat</label>
            <textarea
              value={form.alamat || ''}
              onChange={(e) => setForm({ ...form, alamat: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {level === 'ranting' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lokasi Latihan</label>
            <input
              type="text"
              value={form.lokasiLatihan || ''}
              onChange={(e) => setForm({ ...form, lokasiLatihan: e.target.value })}
              placeholder="Alamat tempat latihan"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            Batal
          </button>
          <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <Save size={14} /> {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ───

export default function OrgStructureSettingsPage() {
  const [distriks, setDistriks] = useState<Distrik[]>([]);
  const [wilayahs, setWilayahs] = useState<Wilayah[]>([]);
  const [rantings, setRantings] = useState<Ranting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OrgLevel>('distrik');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState<Record<string, string> | null>(null);
  const [selectedDistrik, setSelectedDistrik] = useState<string>('');
  const [selectedWilayah, setSelectedWilayah] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dRes, wRes, rRes] = await Promise.all([
        apiClient.get('/org-structure/distrik'),
        selectedDistrik ? apiClient.get(`/org-structure/wilayah?distrikId=${selectedDistrik}`) : apiClient.get('/org-structure/wilayah'),
        selectedWilayah ? apiClient.get(`/org-structure/ranting?wilayahId=${selectedWilayah}`) : apiClient.get('/org-structure/ranting'),
      ]);
      setDistriks(dRes.data.data);
      setWilayahs(wRes.data.data);
      setRantings(rRes.data.data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDistrik, selectedWilayah]);

  const openCreate = () => {
    setEditData(null);
    setShowModal(true);
  };

  const openEdit = (item: Record<string, unknown>, _level: OrgLevel) => {
    const form: Record<string, string> = {
      id: item.id as string,
      kode: item.kodeDistrik as string || item.kodeWilayah as string || item.kodeRanting as string || '',
      nama: item.nama as string,
      alamat: (item.alamat as string) || '',
      lokasiLatihan: (item.lokasiLatihan as string) || '',
      distrikId: (item.distrikId as string) || (item.wilayah as Wilayah)?.distrikId || selectedDistrik || '',
      wilayahId: (item.wilayahId as string) || '',
    };
    setEditData(form);
    setShowModal(true);
  };

  const handleSave = async (form: Record<string, string>) => {
    const isEdit = !!editData?.id;
    if (activeTab === 'distrik') {
      const payload = { kodeDistrik: form.kode, nama: form.nama, alamat: form.alamat };
      if (isEdit) {
        await apiClient.patch(`/org-structure/distrik/${editData!.id}`, payload);
      } else {
        await apiClient.post('/org-structure/distrik', payload);
      }
    } else if (activeTab === 'wilayah') {
      const payload = { kodeWilayah: form.kode, nama: form.nama, distrikId: form.distrikId };
      if (isEdit) {
        const { distrikId: _d, ...updatePayload } = payload;
        await apiClient.patch(`/org-structure/wilayah/${editData!.id}`, updatePayload);
      } else {
        await apiClient.post('/org-structure/wilayah', payload);
      }
    } else if (activeTab === 'ranting') {
      const payload = { kodeRanting: form.kode, nama: form.nama, lokasiLatihan: form.lokasiLatihan, wilayahId: form.wilayahId };
      if (isEdit) {
        const { wilayahId: _w, ...updatePayload } = payload;
        await apiClient.patch(`/org-structure/ranting/${editData!.id}`, updatePayload);
      } else {
        await apiClient.post('/org-structure/ranting', payload);
      }
    }
    await fetchData();
  };

  const handleDelete = async (id: string, level: OrgLevel) => {
    if (!confirm(`Yakin ingin menghapus ${level} ini? Data terkait akan ikut terhapus.`)) return;
    try {
      await apiClient.delete(`/org-structure/${level}/${id}`);
      await fetchData();
    } catch {
      alert('Gagal menghapus');
    }
  };

  const tabs: { key: OrgLevel; label: string; icon: typeof Building2 }[] = [
    { key: 'distrik', label: 'Distrik', icon: Building2 },
    { key: 'wilayah', label: 'Wilayah', icon: MapIcon },
    { key: 'ranting', label: 'Ranting', icon: Home },
  ];

  const currentList = activeTab === 'distrik' ? distriks : activeTab === 'wilayah' ? wilayahs : rantings;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Struktur Organisasi</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Kelola Distrik, Wilayah, dan Ranting</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
            <Plus size={14} /> Tambah {tabs.find(t => t.key === activeTab)?.label}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-6">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters for Wilayah / Ranting */}
      {(activeTab === 'wilayah' || activeTab === 'ranting') && (
        <div className="flex items-center gap-3">
          {activeTab === 'wilayah' && distriks.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Filter Distrik:</label>
              <select
                value={selectedDistrik}
                onChange={(e) => { setSelectedDistrik(e.target.value); setSelectedWilayah(''); }}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Semua Distrik</option>
                {distriks.map((d) => (
                  <option key={d.id} value={d.id}>{d.nama}</option>
                ))}
              </select>
            </div>
          )}
          {activeTab === 'ranting' && wilayahs.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Filter Wilayah:</label>
              <select
                value={selectedWilayah}
                onChange={(e) => setSelectedWilayah(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Semua Wilayah</option>
                {wilayahs.map((w) => (
                  <option key={w.id} value={w.id}>{w.nama}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-10">
          <RefreshCw size={24} className="animate-spin text-blue-500" />
        </div>
      )}

      {/* List */}
      {!loading && (
        <div className="space-y-3">
          {currentList.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <Building2 size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada data</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Klik "Tambah" untuk menambahkan</p>
            </div>
          ) : (
            currentList.map((item) => {
              const wil = item as unknown as Wilayah;
              const ran = item as unknown as Ranting;
              const distrik = item as unknown as Distrik;
              const orgPath = activeTab === 'ranting'
                ? [ran.wilayah?.distrik?.nama, ran.wilayah?.nama].filter(Boolean).join(' › ')
                : activeTab === 'wilayah'
                  ? wil.distrik?.nama || ''
                  : '';
              const kode = distrik.kodeDistrik || wil.kodeWilayah || ran.kodeRanting;
              const childCount = distrik._count?.wilayahs ?? wil._count?.rantings ?? ran._count?.anggota;
              const childLabel = activeTab === 'distrik' ? 'Wilayah' : activeTab === 'wilayah' ? 'Ranting' : 'Anggota';

              return (
                <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex items-center justify-between hover:shadow-md transition">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      activeTab === 'distrik' ? 'bg-blue-50 dark:bg-blue-950' :
                      activeTab === 'wilayah' ? 'bg-green-50 dark:bg-green-950' :
                      'bg-purple-50 dark:bg-purple-950'
                    }`}>
                      {activeTab === 'distrik' ? <Building2 size={18} className="text-blue-600 dark:text-blue-400" /> :
                       activeTab === 'wilayah' ? <MapIcon size={18} className="text-green-600 dark:text-green-400" /> :
                       <Home size={18} className="text-purple-600 dark:text-purple-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">{item.nama}</span>
                        <span className="font-mono text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{kode}</span>
                      </div>
                      {orgPath && (
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                          <span>{orgPath}</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">{childCount} {childLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(item as unknown as Record<string, unknown>, activeTab)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition" title="Edit">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleDelete(item.id, activeTab)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded transition" title="Hapus">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal */}
      <OrgFormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        level={activeTab}
        data={editData}
        distrikList={distriks}
        wilayahList={wilayahs}
        onSave={handleSave}
      />
    </div>
  );
}
