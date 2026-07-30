'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

import Breadcrumbs from '@/components/ui/breadcrumbs';
import { TINGKAT_OPTIONS } from '@/components/members/constants';

export default function NewMemberPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    namaLengkap: '',
    jenisKelamin: 'L' as 'L' | 'P',
    tempatLahir: '',
    tanggalLahir: '',
    tempatDadar: '',
    tahunDadar: '',
    alamat: '',
    noHp: '',
    email: '',
    tingkat: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Org structure cascading dropdowns
  const [distriks, setDistriks] = useState<{ id: string; nama: string }[]>([]);
  const [wilayahs, setWilayahs] = useState<{ id: string; nama: string }[]>([]);
  const [rantings, setRantings] = useState<{ id: string; nama: string }[]>([]);
  const [orgLoading, setOrgLoading] = useState({ distrik: false, wilayah: false, ranting: false });
  const [selectedDistrik, setSelectedDistrik] = useState('');
  const [selectedWilayah, setSelectedWilayah] = useState('');
  const [selectedRanting, setSelectedRanting] = useState('');

  useEffect(() => {
    setOrgLoading(prev => ({ ...prev, distrik: true }));
    apiClient.get('/org-structure/distrik')
      .then((r) => setDistriks(r.data.data || []))
      .catch(() => {/* ignore */})
      .finally(() => setOrgLoading(prev => ({ ...prev, distrik: false })));
  }, []);

  const handleDistrikChange = async (distrikId: string) => {
    setSelectedDistrik(distrikId);
    setSelectedWilayah('');
    setSelectedRanting('');
    setWilayahs([]);
    setRantings([]);
    if (!distrikId) return;
    setOrgLoading(prev => ({ ...prev, wilayah: true }));
    try {
      const r = await apiClient.get(`/org-structure/wilayah?distrikId=${distrikId}`);
      setWilayahs(r.data.data || []);
    } catch { /* ignore */ }
    setOrgLoading(prev => ({ ...prev, wilayah: false }));
  };

  const handleWilayahChange = async (wilayahId: string) => {
    setSelectedWilayah(wilayahId);
    setSelectedRanting('');
    setRantings([]);
    if (!wilayahId) return;
    setOrgLoading(prev => ({ ...prev, ranting: true }));
    try {
      const r = await apiClient.get(`/org-structure/ranting?wilayahId=${wilayahId}`);
      setRantings(r.data.data || []);
    } catch { /* ignore */ }
    setOrgLoading(prev => ({ ...prev, ranting: false }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.namaLengkap) {
      setError('Nama lengkap harus diisi');
      return;
    }
    if (!selectedRanting) {
      setError('Pilih ranting terlebih dahulu');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, rantingId: selectedRanting };
      const { data: res } = await apiClient.post('/members', payload);
      router.push(`/members/${res.data.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Gagal menambah anggota');
    }
    setSaving(false);
  };

  return (
      <PermissionGuard module="members" action="create">
        <Breadcrumbs />
        <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex items-center gap-2">
                <button onClick={() => router.push('/members')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                  <ArrowLeft size={18} className="text-gray-500" />
                </button>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Tambah Anggota Baru</h1>
              </div>
        
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-400">
                NRA akan digenerate otomatis dengan format: <strong>[kode_distrik]-[kode_wilayah][kode_ranting]-[urut]-[tahun_dadar]</strong>
              </div>
        
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
        
              <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap *</label>
                    <input type="text" value={form.namaLengkap} onChange={(e) => setForm({ ...form, namaLengkap: e.target.value })} required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jenis Kelamin</label>
                    <select value={form.jenisKelamin} onChange={(e) => setForm({ ...form, jenisKelamin: e.target.value as 'L' | 'P' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500">
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tingkat</label>
                    <select value={form.tingkat} onChange={(e) => setForm({ ...form, tingkat: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500">
                      <option value="">Pilih Tingkat</option>
                      {TINGKAT_OPTIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tempat Lahir</label>
                    <input type="text" value={form.tempatLahir} onChange={(e) => setForm({ ...form, tempatLahir: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal Lahir</label>
                    <input type="date" value={form.tanggalLahir} onChange={(e) => setForm({ ...form, tanggalLahir: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tempat Dadar</label>
                    <input type="text" value={form.tempatDadar} onChange={(e) => setForm({ ...form, tempatDadar: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tahun Dadar</label>
                    <input type="text" value={form.tahunDadar} onChange={(e) => setForm({ ...form, tahunDadar: e.target.value })} placeholder="2024"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alamat</label>
                    <textarea value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No. HP</label>
                    <input type="text" value={form.noHp} onChange={(e) => setForm({ ...form, noHp: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
        
                  {/* Organisasi - Cascading dropdowns */}
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      Organisasi <span className="text-red-500">*</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Distrik</label>
                        <select
                          value={selectedDistrik}
                          onChange={(e) => handleDistrikChange(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Pilih Distrik</option>
                          {orgLoading.distrik ? (
                            <option disabled>Memuat...</option>
                          ) : (
                            distriks.map((d) => (
                              <option key={d.id} value={d.id}>{d.nama}</option>
                            ))
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Wilayah</label>
                        <select
                          value={selectedWilayah}
                          onChange={(e) => handleWilayahChange(e.target.value)}
                          disabled={!selectedDistrik}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          <option value="">Pilih Wilayah</option>
                          {orgLoading.wilayah ? (
                            <option disabled>Memuat...</option>
                          ) : (
                            wilayahs.map((w) => (
                              <option key={w.id} value={w.id}>{w.nama}</option>
                            ))
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ranting <span className="text-red-500">*</span></label>
                        <select
                          value={selectedRanting}
                          onChange={(e) => setSelectedRanting(e.target.value)}
                          disabled={!selectedWilayah}
                          required
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          <option value="">Pilih Ranting</option>
                          {orgLoading.ranting ? (
                            <option disabled>Memuat...</option>
                          ) : (
                            rantings.map((r) => (
                              <option key={r.id} value={r.id}>{r.nama}</option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
        
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => router.push('/members')}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Batal</button>
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
                    <Save size={14} /> {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
      </PermissionGuard>
    );
}
