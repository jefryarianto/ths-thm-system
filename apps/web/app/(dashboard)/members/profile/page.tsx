'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import {

  User,
  AlertCircle,
  Save,
  Upload,
  RefreshCw,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { toProperCase } from '@/components/members/constants';

interface MemberProfile {
  id: string;
  namaLengkap: string;
  nomorAnggota: string;
  email?: string;
  fotoPath?: string;
  statusData: string;
  missingFields?: string[];
  tingkat?: string;
  statusKeanggotaan: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  tempatDadar?: string;
  tahunDadar?: string;
  alamat?: string;
  noHp?: string;
  ranting?: {
    id: string;
    nama: string;
    kodeRanting?: string;
    wilayah?: {
      id: string;
      nama: string;
      kodeWilayah?: string;
      distrik?: {
        id: string;
        nama: string;
        kodeDistrik?: string;
      };
    };
  };
}

export default function ProfilePage() {
  const toast = useToast();
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [form, setForm] = useState({
    tempatLahir: '',
    tanggalLahir: '',
    tempatDadar: '',
    tahunDadar: '',
    alamat: '',
    noHp: '',
    email: '',
    tingkat: '',
  });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get('/members/me');
      if (res.success) {
        setMember(res.data);
        setForm({
          tempatLahir: res.data.tempatLahir || '',
          tanggalLahir: res.data.tanggalLahir || '',
          tempatDadar: res.data.tempatDadar || '',
          tahunDadar: res.data.tahunDadar || '',
          alamat: res.data.alamat || '',
          noHp: res.data.noHp || '',
          email: res.data.email || '',
          tingkat: res.data.tingkat || '',
        });
      } else {
        setError(res.message || 'Gagal memuat profil');
      }
    } catch {
      setError('Gagal memuat data profil. Pastikan Anda login sebagai anggota.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!member) return;
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const payload: Record<string, string> = {};
      if (form.tempatLahir !== (member.tempatLahir || '')) payload.tempatLahir = form.tempatLahir;
      if (form.tanggalLahir !== (member.tanggalLahir || '')) payload.tanggalLahir = form.tanggalLahir;
      if (form.tempatDadar !== (member.tempatDadar || '')) payload.tempatDadar = form.tempatDadar;
      if (form.tahunDadar !== (member.tahunDadar || '')) payload.tahunDadar = form.tahunDadar;
      if (form.alamat !== (member.alamat || '')) payload.alamat = form.alamat;
      if (form.noHp !== (member.noHp || '')) payload.noHp = form.noHp;
      if (form.email !== (member.email || '')) payload.email = form.email;

      if (Object.keys(payload).length === 0) {
        setSaveError('Tidak ada perubahan');
        setSaving(false);
        return;
      }

      await apiClient.patch(`/members/${member.id}`, payload);
      setSaveSuccess(true);
      await fetchProfile();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSaveError(msg || 'Gagal menyimpan perubahan');
    }
    setSaving(false);
  };

  const handlePhotoUpload = async (file: File) => {
    if (!member) return;
    const formData = new FormData();
    formData.append('photo', file);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/upload/member-photo/${member.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        await fetchProfile();
      } else {
        toast('error', data.message || 'Gagal upload foto');
      }
    } catch {
       toast('error', 'Gagal upload foto');
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Profil Tidak Ditemukan</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
        <button onClick={fetchProfile} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition">
          Coba Lagi
        </button>
      </div>
    );
  }

  if (!member) return null;

  const isIncomplete = member.statusData === 'incomplete';
  const missingFields = (member.missingFields as string[]) || [];

  return (
      <PermissionGuard module="members" action="view">
        <Breadcrumbs />
        <div className="max-w-3xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Profil Saya</h1>
                <button onClick={fetchProfile} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400">
                  <RefreshCw size={14} />
                </button>
              </div>
        
              {/* Incomplete Banner */}
              {isIncomplete && (
                <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                  <AlertCircle size={20} className="text-yellow-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Data Anda belum lengkap</p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                      Harap lengkapi data berikut: {missingFields.map(f => f.replace(/_/g, ' ')).join(', ')}
                    </p>
                  </div>
                </div>
              )}
        
              {/* Save Status */}
              {saveSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 size={16} />
                  Data berhasil disimpan!
                </div>
              )}
              {saveError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                  <AlertCircle size={16} />
                  {saveError}
                </div>
              )}
        
              {/* Profile Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="px-6 pt-6 pb-6">
                  <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
                    {/* Avatar */}
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-gray-800 overflow-hidden">
                        {member.fotoPath ? (
                          <img src={`/api/uploads/${member.fotoPath}`} alt="" className="w-full h-full object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                        ) : null}
                        <img src="/logo.svg" alt="" className={`w-full h-full object-cover ${member.fotoPath ? 'hidden' : ''}`} />
                      </div>
                      <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 cursor-pointer transition">
                        <Upload size={24} className="text-white" />
                        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }} />
                      </label>
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{toProperCase(member.namaLengkap)}</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{member.nomorAnggota}</p>
                    </div>
                  </div>
                </div>
              </div>
        
              {/* Edit Form */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <User size={18} className="text-blue-500" />
                  Data Pribadi
                </h3>
        
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tempat Lahir</label>
                      <input type="text" value={form.tempatLahir}
                        onChange={(e) => setForm({ ...form, tempatLahir: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal Lahir</label>
                      <input type="date" value={form.tanggalLahir ? form.tanggalLahir.split('T')[0] : ''}
                        onChange={(e) => setForm({ ...form, tanggalLahir: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tempat Dadar</label>
                      <input type="text" value={form.tempatDadar}
                        onChange={(e) => setForm({ ...form, tempatDadar: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tahun Dadar</label>
                      <input type="text" value={form.tahunDadar}
                        onChange={(e) => setForm({ ...form, tahunDadar: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alamat</label>
                      <textarea value={form.alamat} rows={2}
                        onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No. HP</label>
                      <input type="text" value={form.noHp}
                        onChange={(e) => setForm({ ...form, noHp: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                      <input type="email" value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
        
                  <div className="flex justify-end pt-2">
                    <button type="submit" disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
                      <Save size={14} />
                      {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                  </div>
                </form>
              </div>
        
              {/* Info Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <Users size={18} className="text-blue-500" />
                  Informasi Keanggotaan
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">NRA</span>
                    <p className="font-medium text-gray-900 dark:text-white font-mono">{member.nomorAnggota}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Tingkat</span>
                    <p className="font-medium text-gray-900 dark:text-white">{member.tingkat || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Status</span>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">{member.statusKeanggotaan}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Data</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {member.statusData === 'complete' ? 'Lengkap' : 'Belum Lengkap'}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-500 dark:text-gray-400">Organisasi</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {[member.ranting?.wilayah?.distrik?.nama, member.ranting?.wilayah?.nama, member.ranting?.nama].filter(Boolean).join(' › ') || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
      </PermissionGuard>
    );
}
