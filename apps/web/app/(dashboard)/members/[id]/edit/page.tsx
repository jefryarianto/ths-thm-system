'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { ArrowLeft, Save, AlertCircle, RefreshCw } from 'lucide-react';
import FormField from '@/components/ui/form-field';

import Breadcrumbs from '@/components/ui/breadcrumbs';
import { toProperCase } from '@/components/members/constants';

interface TingkatanOption {
  id: string;
  nama: string;
}

interface MemberDetail {
  id: string;
  nomorAnggota: string;
  namaLengkap: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir: string | null;
  tanggalLahir: string | null;
  tempatDadar: string | null;
  tahunDadar: string | null;
  alamat: string | null;
  noHp: string | null;
  email: string | null;
  tingkat: string | null;
  rantingId: string;
  ranting?: { id: string; nama: string; wilayah?: { id: string; nama: string; distrik?: { id: string; nama: string } } };
}

export default function EditMemberPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState('');

  // Form state — same as new member form, plus org fields
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
    rantingId: '',
  });

  const [tingkatanList, setTingkatanList] = useState<TingkatanOption[]>([]);

  // Org cascade state
  const [distriks, setDistriks] = useState<Array<{ id: string; nama: string }>>([]);
  const [selectedDistrikId, setSelectedDistrikId] = useState('');
  const [wilayahs, setWilayahs] = useState<Array<{ id: string; nama: string }>>([]);
  const [selectedWilayahId, setSelectedWilayahId] = useState('');
  const [rantings, setRantings] = useState<Array<{ id: string; nama: string; kodeRanting: string }>>([]);
  const [orgLoading, setOrgLoading] = useState(false);
  // Guards against stale async responses when the user re-picks a parent quickly
  const orgReqSeq = useRef(0);

  useEffect(() => {
    apiClient.get('/tingkatan').then((r) => setTingkatanList(r.data.data || [])).catch(() => {/* ignore */});
  }, []);

  // ── Load member data ──────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const { data: res } = await apiClient.get(`/members/${id}`);
        const m: MemberDetail = res.data;

        setForm({
          namaLengkap: m.namaLengkap,
          jenisKelamin: m.jenisKelamin,
          tempatLahir: m.tempatLahir || '',
          tanggalLahir: m.tanggalLahir || '',
          tempatDadar: m.tempatDadar || '',
          tahunDadar: m.tahunDadar || '',
          alamat: m.alamat || '',
          noHp: m.noHp || '',
          email: m.email || '',
          tingkat: m.tingkat || '',
          rantingId: m.rantingId || '',
        });

        // Load cascading org data
        await loadOrgData(m);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) setFetchError('Anggota tidak ditemukan');
        else if (status === 403) setFetchError('Akses ditolak');
        else setFetchError('Gagal memuat data anggota');
      }
      setLoading(false);
    })();
  }, [id]);

  const loadOrgData = async (m: MemberDetail) => {
    setOrgLoading(true);
    try {
      // Load distrik
      const dRes = await apiClient.get('/org-structure/distrik');
      const dList = dRes.data.data || [];
      setDistriks(dList);

      // Pre-select distrik
      const distrikId = m.ranting?.wilayah?.distrik?.id || '';
      if (distrikId) {
        setSelectedDistrikId(distrikId);
        // Load wilayah
        const wRes = await apiClient.get(`/org-structure/wilayah?distrikId=${distrikId}`);
        const wList = wRes.data.data || [];
        setWilayahs(wList);

        const wilayahId = m.ranting?.wilayah?.id || '';
        if (wilayahId) {
          setSelectedWilayahId(wilayahId);
          // Load ranting
          const rRes = await apiClient.get(`/org-structure/ranting?wilayahId=${wilayahId}`);
          setRantings(rRes.data.data || []);
        }
      }
    } catch {
      // Non-critical
    }
    setOrgLoading(false);
  };

  const handleDistrikChange = async (distrikId: string) => {
    const seq = ++orgReqSeq.current;
    setSelectedDistrikId(distrikId);
    setSelectedWilayahId('');
    setRantings([]);
    setForm((f) => ({ ...f, rantingId: '' }));
    if (!distrikId) return;
    try {
      const { data: res } = await apiClient.get(`/org-structure/wilayah?distrikId=${distrikId}`);
      if (seq !== orgReqSeq.current) return; // stale response — user moved on
      setWilayahs(res.data || []);
    } catch { /* ignore */ }
  };

  const handleWilayahChange = async (wilayahId: string) => {
    const seq = ++orgReqSeq.current;
    setSelectedWilayahId(wilayahId);
    setForm((f) => ({ ...f, rantingId: '' }));
    if (!wilayahId) return;
    try {
      const { data: res } = await apiClient.get(`/org-structure/ranting?wilayahId=${wilayahId}`);
      if (seq !== orgReqSeq.current) return; // stale response — user moved on
      setRantings(res.data || []);
    } catch { /* ignore */ }
  };

  // ── Submit ────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.namaLengkap) {
      setError('Nama lengkap harus diisi');
      return;
    }
    setSaving(true);
    setError('');
    try {
      // Only send changed fields
      const { data: orig } = await apiClient.get(`/members/${id}`);
      const original = orig.data;
      const payload: Record<string, unknown> = {};

      if (form.namaLengkap !== original.namaLengkap) payload.namaLengkap = form.namaLengkap;
      if (form.jenisKelamin !== original.jenisKelamin) payload.jenisKelamin = form.jenisKelamin;
      if (form.tempatLahir !== (original.tempatLahir || '')) payload.tempatLahir = form.tempatLahir;
      if (form.tanggalLahir !== (original.tanggalLahir || '')) payload.tanggalLahir = form.tanggalLahir;
      if (form.tempatDadar !== (original.tempatDadar || '')) payload.tempatDadar = form.tempatDadar;
      if (form.tahunDadar !== (original.tahunDadar || '')) payload.tahunDadar = form.tahunDadar;
      if (form.alamat !== (original.alamat || '')) payload.alamat = form.alamat;
      if (form.noHp !== (original.noHp || '')) payload.noHp = form.noHp;
      if (form.email !== (original.email || '')) payload.email = form.email;
      if (form.tingkat !== (original.tingkat || '')) payload.tingkat = form.tingkat;
      if (form.rantingId !== (original.rantingId || '')) payload.rantingId = form.rantingId;

      if (Object.keys(payload).length === 0) {
        setError('Tidak ada perubahan yang dilakukan');
        setSaving(false);
        return;
      }

      await apiClient.patch(`/members/${id}`, payload);
      router.push(`/members/${id}`);
    } catch (err: unknown) {
      // apiClient normalizes errors to { status, message, data } — the real
      // server message (e.g. 'Email sudah terdaftar') lives on `err.message`.
      const raw = (err as { message?: string | string[] })?.message;
      const msg = Array.isArray(raw) ? raw.join(', ') : raw;
      setError(msg || 'Gagal menyimpan perubahan');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-36" />
        <div className="bg-white dark:bg-gray-800 rounded-2xl border p-6 space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md">
          <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Gagal Memuat Data</h2>
          <p className="text-sm text-gray-500 mb-4">{fetchError}</p>
          <button onClick={() => router.push('/members')} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            ← Kembali ke Anggota
          </button>
        </div>
      </div>
    );
  }

  return (
      <PermissionGuard module="members" action="edit">
        <Breadcrumbs />
        <div className="max-w-2xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push(`/members/${id}`)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <ArrowLeft size={20} className="text-gray-500" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Edit Anggota
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {toProperCase(form.namaLengkap) || 'Memuat...'}
                  </p>
                </div>
                <button
                  onClick={() => router.refresh()}
                  className="ml-auto p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400"
                  title="Refresh"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
        
              {/* Error */}
              {error && (
                <div className="flex items-center gap-2.5 p-3.5 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}
        
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-5">
                  {/* Personal Data */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      Data Pribadi
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <FormField label="Nama Lengkap" required>
                          <input type="text" value={form.namaLengkap} onChange={(e) => setForm({ ...form, namaLengkap: e.target.value })} required
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                        </FormField>
                      </div>
                      <FormField label="Jenis Kelamin">
                        <select value={form.jenisKelamin} onChange={(e) => setForm({ ...form, jenisKelamin: e.target.value as 'L' | 'P' })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition">
                          <option value="L">Laki-laki</option>
                          <option value="P">Perempuan</option>
                        </select>
                      </FormField>
                       <FormField label="Tingkat">
                         <select value={form.tingkat} onChange={(e) => setForm({ ...form, tingkat: e.target.value })}
                           className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition">
                            <option value="">Pilih Tingkat</option>
                            {tingkatanList.map((t) => (
                              <option key={t.id} value={t.nama}>{t.nama}</option>
                            ))}
                         </select>
                       </FormField>
                      <FormField label="Tempat Lahir">
                        <input type="text" value={form.tempatLahir} onChange={(e) => setForm({ ...form, tempatLahir: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                      </FormField>
                      <FormField label="Tanggal Lahir">
                        <input type="date" value={form.tanggalLahir ? form.tanggalLahir.split('T')[0] : ''} onChange={(e) => setForm({ ...form, tanggalLahir: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                      </FormField>
                      <FormField label="Tempat Dadar">
                        <input type="text" value={form.tempatDadar} onChange={(e) => setForm({ ...form, tempatDadar: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                      </FormField>
                      <FormField label="Tahun Dadar">
                        <input type="text" value={form.tahunDadar} onChange={(e) => setForm({ ...form, tahunDadar: e.target.value })} placeholder="2024"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                      </FormField>
                    </div>
                  </div>
        
                  {/* Contact */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      Kontak
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField label="No. HP">
                        <input type="text" value={form.noHp} onChange={(e) => setForm({ ...form, noHp: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                      </FormField>
                      <FormField label="Email">
                        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                      </FormField>
                      <div className="sm:col-span-2">
                        <FormField label="Alamat">
                          <textarea value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} rows={2}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                        </FormField>
                      </div>
                    </div>
                  </div>
        
                  {/* Organization */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      Organisasi
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField label="Distrik">
                        <select
                          value={selectedDistrikId}
                          onChange={(e) => handleDistrikChange(e.target.value)}
                          disabled={orgLoading}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
                        >
                          <option value="">Pilih Distrik...</option>
                          {distriks.map((d) => (
                            <option key={d.id} value={d.id}>{d.nama}</option>
                          ))}
                        </select>
                      </FormField>
                      <FormField label="Wilayah">
                        <select
                          value={selectedWilayahId}
                          onChange={(e) => handleWilayahChange(e.target.value)}
                          disabled={!selectedDistrikId || orgLoading}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
                        >
                          <option value="">Pilih Wilayah...</option>
                          {wilayahs.map((w) => (
                            <option key={w.id} value={w.id}>{w.nama}</option>
                          ))}
                        </select>
                      </FormField>
                      <FormField label="Ranting">
                        <select
                          value={form.rantingId}
                          onChange={(e) => setForm({ ...form, rantingId: e.target.value })}
                          disabled={!selectedWilayahId || orgLoading}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
                        >
                          <option value="">Pilih Ranting...</option>
                          {rantings.map((r) => (
                            <option key={r.id} value={r.id}>{r.nama}</option>
                          ))}
                        </select>
                      </FormField>
                    </div>
                  </div>
                </div>
        
                {/* Actions */}
                <div className="flex justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => router.push(`/members/${id}`)}
                    className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    <Save size={16} />
                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
      </PermissionGuard>
    );
}
