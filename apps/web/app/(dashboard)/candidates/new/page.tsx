'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { ArrowLeft, UserPlus, Save, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export default function NewCandidatePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    namaLengkap: '',
    jenisKelamin: 'L' as 'L' | 'P',
    tempatLahir: '',
    tanggalLahir: '',
    alamat: '',
    noHp: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);
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
    if (!selectedRanting) {
      setError('Pilih ranting terlebih dahulu');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const payload: Record<string, unknown> = {
        namaLengkap: form.namaLengkap,
        jenisKelamin: form.jenisKelamin,
        rantingId: selectedRanting,
      };
      if (form.tempatLahir) payload.tempatLahir = form.tempatLahir;
      if (form.tanggalLahir) payload.tanggalLahir = form.tanggalLahir;
      if (form.alamat) payload.alamat = form.alamat;
      if (form.noHp) payload.noHp = form.noHp;
      if (form.email) payload.email = form.email;

      const { data } = await apiClient.post('/candidates', payload);
      if (data.success) {
        router.push(`/candidates/${data.data.id}`);
      } else {
        setError(data.message || 'Gagal menambah calon anggota');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Gagal menambah calon anggota. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/candidates"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Kembali ke Calon Anggota
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <UserPlus size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Tambah Calon Anggota</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Isi data calon anggota baru untuk diusulkan
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nama Lengkap */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.namaLengkap}
                onChange={(e) => setForm({ ...form, namaLengkap: e.target.value })}
                required
                placeholder="Masukkan nama lengkap"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
              />
            </div>

            {/* Jenis Kelamin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Jenis Kelamin <span className="text-red-500">*</span>
              </label>
              <select
                value={form.jenisKelamin}
                onChange={(e) => setForm({ ...form, jenisKelamin: e.target.value as 'L' | 'P' })}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            {/* No HP */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                No. HP
              </label>
              <input
                type="text"
                value={form.noHp}
                onChange={(e) => setForm({ ...form, noHp: e.target.value })}
                placeholder="08123456789"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
              />
            </div>

            {/* Tempat Lahir */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Tempat Lahir
              </label>
              <input
                type="text"
                value={form.tempatLahir}
                onChange={(e) => setForm({ ...form, tempatLahir: e.target.value })}
                placeholder="Jakarta"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
              />
            </div>

            {/* Tanggal Lahir */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Tanggal Lahir
              </label>
              <input
                type="date"
                value={form.tanggalLahir}
                onChange={(e) => setForm({ ...form, tanggalLahir: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
              />
            </div>

            {/* Alamat */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Alamat
              </label>
              <textarea
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                rows={2}
                placeholder="Masukkan alamat lengkap"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm resize-none"
              />
            </div>
          </div>

          {/* Organisasi - Cascading dropdowns */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              Organisasi <span className="text-red-500">*</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Distrik</label>
                <select
                  value={selectedDistrik}
                  onChange={(e) => handleDistrikChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm"
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
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm disabled:opacity-50"
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
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm disabled:opacity-50"
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

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <Link
              href="/candidates"
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-purple-700 hover:to-indigo-700 transition disabled:opacity-50 shadow-sm"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Menyimpan...</>
              ) : (
                <><Save size={16} /> Simpan <ArrowRight size={14} /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
