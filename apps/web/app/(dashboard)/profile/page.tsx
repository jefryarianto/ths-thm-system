'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Save,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  Upload,
} from 'lucide-react';

interface MeProfile {
  id: string;
  namaLengkap: string;
  email: string;
  role: string;
  fotoPath?: string | null;
  noHp?: string | null;
  alamat?: string | null;
  tempatLahir?: string | null;
  tanggalLahir?: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Super Admin',
  admin_distrik: 'Admin Distrik',
  admin_wilayah: 'Admin Wilayah',
  admin_ranting: 'Admin Ranting',
  admin_kegiatan: 'Admin Kegiatan',
  penguji: 'Penguji',
  anggota: 'Anggota',
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit profile form
  const [form, setForm] = useState({ namaLengkap: '', noHp: '', alamat: '', tempatLahir: '', tanggalLahir: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Change password form
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get('/auth/me');
      if (res.success && res.data) {
        setProfile(res.data);
        setForm({
          namaLengkap: res.data.namaLengkap || '',
          noHp: res.data.noHp || '',
          alamat: res.data.alamat || '',
          tempatLahir: res.data.tempatLahir || '',
          tanggalLahir: res.data.tanggalLahir ? String(res.data.tanggalLahir).slice(0, 10) : '',
          email: res.data.email || '',
        });
        setError(null);
      } else {
        setError(res.message || 'Gagal memuat profil');
      }
    } catch {
      setError('Gagal memuat data profil. Silakan muat ulang halaman.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload: Record<string, string> = {};
      if (form.namaLengkap !== (profile?.namaLengkap || '')) payload.namaLengkap = form.namaLengkap;
      if (form.noHp !== (profile?.noHp || '')) payload.noHp = form.noHp;
      if (form.alamat !== (profile?.alamat || '')) payload.alamat = form.alamat;
      if (form.tempatLahir !== (profile?.tempatLahir || '')) payload.tempatLahir = form.tempatLahir;
      if (form.tanggalLahir !== (profile?.tanggalLahir ? String(profile.tanggalLahir).slice(0, 10) : '')) {
        payload.tanggalLahir = form.tanggalLahir;
      }

      if (Object.keys(payload).length === 0) {
        setSaveMsg({ ok: false, text: 'Tidak ada perubahan untuk disimpan' });
        return;
      }

      await apiClient.patch('/auth/me', payload);
      setSaveMsg({ ok: true, text: 'Profil berhasil diperbarui' });
      await fetchProfile();
      setTimeout(() => setSaveMsg(null), 4000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSaveMsg({ ok: false, text: msg || 'Gagal menyimpan perubahan' });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/auth/me/photo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setSaveMsg({ ok: true, text: 'Foto profil berhasil diperbarui' });
        await fetchProfile();
        setTimeout(() => setSaveMsg(null), 4000);
      } else {
        setSaveMsg({ ok: false, text: data.message || 'Gagal upload foto' });
      }
    } catch {
      setSaveMsg({ ok: false, text: 'Gagal upload foto' });
    }
  };

  const handleChangePassword = async () => {
    setPwMsg(null);
    if (pw.newPassword.length < 6) {
      setPwMsg({ ok: false, text: 'Password baru minimal 6 karakter' });
      return;
    }
    if (pw.newPassword !== pw.confirmPassword) {
      setPwMsg({ ok: false, text: 'Konfirmasi password tidak cocok' });
      return;
    }
    setPwSaving(true);
    try {
      await apiClient.patch('/auth/change-password', {
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword,
      });
      setPwMsg({ ok: true, text: 'Password berhasil diubah' });
      setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPwMsg(null), 4000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPwMsg({ ok: false, text: msg || 'Gagal mengubah password. Periksa password lama Anda.' });
    } finally {
      setPwSaving(false);
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

  if (error || !profile) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Profil Tidak Dimuat</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error || 'Data profil tidak tersedia'}</p>
        <button
          onClick={fetchProfile}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const fieldCls =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Breadcrumbs suffix={{ href: '#', label: 'Pengaturan Profil' }} />

      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Pengaturan Profil</h1>
        <button onClick={fetchProfile} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400" title="Muat ulang">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Profile header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 flex items-center gap-4">
        <div className="relative group shrink-0">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
            {profile.fotoPath ? (
              <img src={`/api/uploads/${profile.fotoPath}`} alt="" className="w-full h-full object-cover" />
            ) : (
              profile.namaLengkap?.charAt(0)?.toUpperCase() || 'U'
            )}
          </div>
          <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition" title="Ganti foto profil">
            <Upload size={16} className="text-white" />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePhotoUpload(f);
              }}
            />
          </label>
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">{profile.namaLengkap}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{profile.email}</p>
          <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
            {ROLE_LABEL[profile.role] || profile.role}
          </span>
        </div>
      </div>

      {saveMsg && (
        <div
          className={`flex items-center gap-2 p-3 rounded-xl text-sm border ${
            saveMsg.ok
              ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
          }`}
        >
          {saveMsg.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {saveMsg.text}
        </div>
      )}

      {/* Edit profile */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <User size={18} className="text-blue-500" />
          Data Diri
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
            <input className={fieldCls} value={form.namaLengkap} onChange={(e) => setForm({ ...form, namaLengkap: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Mail size={12} className="inline mr-1 text-gray-400" />
              Email
            </label>
            <input type="email" className={`${fieldCls} opacity-60`} value={form.email} disabled title="Email digunakan untuk login" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Phone size={12} className="inline mr-1 text-gray-400" />
              No. HP
            </label>
            <input className={fieldCls} value={form.noHp} onChange={(e) => setForm({ ...form, noHp: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tempat Lahir</label>
            <input className={fieldCls} value={form.tempatLahir} onChange={(e) => setForm({ ...form, tempatLahir: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal Lahir</label>
            <input type="date" className={fieldCls} value={form.tanggalLahir} onChange={(e) => setForm({ ...form, tanggalLahir: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <MapPin size={12} className="inline mr-1 text-gray-400" />
              Alamat
            </label>
            <textarea className={`${fieldCls} min-h-[70px]`} value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <Save size={14} />
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
          <KeyRound size={18} className="text-blue-500" />
          Ubah Password
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Gunakan minimal 6 karakter. Setelah diubah, gunakan password baru saat login berikutnya.
        </p>

        {pwMsg && (
          <div
            className={`flex items-center gap-2 p-3 rounded-xl text-sm border mb-4 ${
              pwMsg.ok
                ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
            }`}
          >
            {pwMsg.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {pwMsg.text}
          </div>
        )}

        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Lock size={12} className="inline mr-1 text-gray-400" />
              Password Lama
            </label>
            <input
              type="password"
              className={fieldCls}
              value={pw.currentPassword}
              onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
              placeholder="Password saat ini"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password Baru</label>
            <input
              type="password"
              className={fieldCls}
              value={pw.newPassword}
              onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
              placeholder="Minimal 6 karakter"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Konfirmasi Password Baru</label>
            <input
              type="password"
              className={fieldCls}
              value={pw.confirmPassword}
              onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })}
              placeholder="Ulangi password baru"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleChangePassword}
              disabled={pwSaving}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition"
            >
              <KeyRound size={14} />
              {pwSaving ? 'Mengubah...' : 'Ubah Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
