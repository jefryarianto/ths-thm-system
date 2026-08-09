'use client';

import { useEffect, useState } from 'react';
import { useConfirm } from '@/components/ui/confirm-modal';
import apiClient, { unwrap } from '@/lib/api-client';
import Link from 'next/link';
import { Plus, Edit3, Trash2, RefreshCw, Save, Building2, ArrowRight, Calendar, Shield, PenLine, Layers, Upload, ImagePlus } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import Modal from '@/components/ui/modal';
import Card from '@/components/cards/card';
import InfoRow from '@/components/ui/info-row';
import FormField from '@/components/ui/form-field';

import Breadcrumbs from '@/components/ui/breadcrumbs';
import { useToast } from '@/components/ui/toast';

interface OrgSettings {
  nama: string;
  alamat?: string;
  noTelp?: string;
  email?: string;
  website?: string;
}

interface Period {
  id: string;
  nama?: string;
  periode?: string;
  isActive: boolean;
}

interface Signature {
  id: string;
  nama?: string;
  namaLengkap?: string;
  jabatan: string;
  isActive: boolean;
  imagePath?: string | null;
}

interface Stamp {
  id?: string;
  nama?: string;
  label?: string;
  url?: string;
  imagePath?: string | null;
}

export default function SettingsPage() {
  const { confirm, confirmModal } = useConfirm();
  const toast = useToast();
  const [org, setOrg] = useState<OrgSettings | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [stamp, setStamp] = useState<Stamp | null>(null);
  const [loading, setLoading] = useState(true);

  // Org edit modal
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [orgForm, setOrgForm] = useState<OrgSettings>({ nama: '' });
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgError, setOrgError] = useState('');

  // Period modal
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  const [periodForm, setPeriodForm] = useState({ nama: '', periode: '', isActive: false });
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [periodError, setPeriodError] = useState('');

  // Upload Stempel modal
  const [showStampModal, setShowStampModal] = useState(false);
  const [stampForm, setStampForm] = useState({ nama: '', file: null as File | null });
  const [savingStamp, setSavingStamp] = useState(false);
  const [stampError, setStampError] = useState('');

  // Upload Tanda Tangan modal
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureForm, setSignatureForm] = useState({
    nama: '',
    jabatan: '',
    file: null as File | null,
  });
  const [savingSignature, setSavingSignature] = useState(false);
  const [signatureError, setSignatureError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [orgRes, periodsRes, sigRes, stampRes] = await Promise.all([
        apiClient.get('/settings'),
        apiClient.get('/settings/periods'),
        apiClient.get('/settings/signatures'),
        apiClient.get('/settings/stamp'),
      ]);
      setOrg(unwrap(orgRes));
      setPeriods(unwrap(periodsRes) || []);
      setSignatures(unwrap(sigRes) || []);
      setStamp(unwrap(stampRes));
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ─── Org Edit ───
  const openOrgEdit = () => {
    setOrgForm({ ...org! });
    setOrgError('');
    setShowOrgModal(true);
  };

  const saveOrg = async () => {
    if (!orgForm.nama.trim()) {
      setOrgError('Nama organisasi harus diisi');
      return;
    }
    setSavingOrg(true);
    setOrgError('');
    try {
      await apiClient.patch('/settings', orgForm);
      // Re-fetch org data after saving since the PATCH returns void
      const orgRes = await apiClient.get('/settings');
      setOrg(unwrap(orgRes));
      setShowOrgModal(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setOrgError(msg || 'Gagal menyimpan pengaturan');
    }
    setSavingOrg(false);
  };

  // ─── Period CRUD ───
  const openPeriodCreate = () => {
    setEditingPeriod(null);
    setPeriodForm({ nama: '', periode: '', isActive: false });
    setPeriodError('');
    setShowPeriodModal(true);
  };

  const openPeriodEdit = (p: Period) => {
    setEditingPeriod(p);
    setPeriodForm({ nama: p.nama || '', periode: p.periode || '', isActive: p.isActive });
    setPeriodError('');
    setShowPeriodModal(true);
  };

  const savePeriod = async () => {
    if (!periodForm.nama.trim() && !periodForm.periode.trim()) {
      setPeriodError('Nama/periode harus diisi');
      return;
    }
    setSavingPeriod(true);
    setPeriodError('');
    try {
      const payload = {
        nama: periodForm.nama || periodForm.periode,
        isActive: periodForm.isActive,
      };
      if (editingPeriod) {
        await apiClient.patch(`/settings/periods/${editingPeriod.id}`, payload);
      } else {
        await apiClient.post('/settings/periods', payload);
      }
      setShowPeriodModal(false);
      const { data: res } = await apiClient.get('/settings/periods');
      setPeriods(res.data || []);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPeriodError(msg || 'Gagal menyimpan periode');
    }
    setSavingPeriod(false);
  };

  const deletePeriod = async (id: string) => {
    if (!(await confirm('Yakin ingin menghapus periode ini?'))) return;
    try {
      await apiClient.delete(`/settings/periods/${id}`);
      setPeriods((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast('error', 'Gagal menghapus periode');
    }
  };

  // ─── Signature Delete ───
  const deleteSignature = async (id: string) => {
    if (!(await confirm('Yakin ingin menghapus tanda tangan ini?'))) return;
    try {
      await apiClient.delete(`/settings/signatures/${id}`);
      setSignatures((prev) => prev.filter((s) => s.id !== id));
    } catch {
      toast('error', 'Gagal menghapus tanda tangan');
    }
  };

  // ─── Upload Stempel ───
  const openStampModal = () => {
    setStampForm({ nama: stamp?.nama || '', file: null });
    setStampError('');
    setShowStampModal(true);
  };

  const saveStamp = async () => {
    if (!stampForm.file) {
      setStampError('Pilih file gambar stempel terlebih dahulu');
      return;
    }
    setSavingStamp(true);
    setStampError('');
    try {
      // Pakai raw fetch — apiClient memaksa Content-Type: application/json
      // yang akan membuat multer gagal parse multipart (pola sama dgn upload foto).
      const fd = new FormData();
      fd.append('file', stampForm.file);
      fd.append('nama', stampForm.nama.trim());
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/settings/stamp', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setStampError(data?.message || 'Gagal mengupload stempel');
        return;
      }
      setShowStampModal(false);
      toast('success', 'Stempel berhasil diupload');
      const { data: res2 } = await apiClient.get('/settings/stamp');
      setStamp(unwrap(res2));
    } catch {
      setStampError('Gagal mengupload stempel. Silakan coba lagi.');
    }
    setSavingStamp(false);
  };

  // ─── Upload Tanda Tangan ───
  const openSignatureModal = () => {
    setSignatureForm({ nama: '', jabatan: '', file: null });
    setSignatureError('');
    setShowSignatureModal(true);
  };

  const saveSignature = async () => {
    if (!signatureForm.file) {
      setSignatureError('Pilih file gambar tanda tangan terlebih dahulu');
      return;
    }
    setSavingSignature(true);
    setSignatureError('');
    try {
      // Pakai raw fetch — apiClient memaksa Content-Type: application/json
      // yang akan membuat multer gagal parse multipart (pola sama dgn upload foto).
      const fd = new FormData();
      fd.append('file', signatureForm.file);
      fd.append('nama', signatureForm.nama.trim());
      fd.append('jabatan', signatureForm.jabatan.trim());
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/settings/signatures', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setSignatureError(data?.message || 'Gagal mengupload tanda tangan');
        return;
      }
      setShowSignatureModal(false);
      toast('success', 'Tanda tangan berhasil diupload');
      const { data: res2 } = await apiClient.get('/settings/signatures');
      setSignatures(unwrap(res2) || []);
    } catch {
      setSignatureError('Gagal mengupload tanda tangan. Silakan coba lagi.');
    }
    setSavingSignature(false);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw size={24} className="animate-spin text-blue-500" />
      </div>
    );

  return (
    <PermissionGuard module="settings" action="view">
    <div className="space-y-6">
      <Breadcrumbs />
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Pengaturan Sistem</h1>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Navigasi Cepat */}
      <Link
        href="/settings/org-structure"
        className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
            <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
              Struktur Organisasi
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Kelola Distrik, Wilayah, dan Ranting
            </p>
          </div>
        </div>
        <ArrowRight size={18} className="text-gray-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition" />
      </Link>

      <Link
        href="/settings/periods"
        className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-green-300 dark:hover:border-green-700 transition group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950">
            <Calendar size={20} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition">
              Periode Iuran
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Kelola periode dan tahun iuran anggota
            </p>
          </div>
        </div>
        <ArrowRight size={18} className="text-gray-400 group-hover:text-green-500 group-hover:translate-x-0.5 transition" />
      </Link>

      <Link
        href="/settings/penandatangan"
        className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950">
            <PenLine size={20} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
              Penandatangan
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Kelola penandatangan untuk kartu anggota digital
            </p>
          </div>
        </div>
        <ArrowRight size={18} className="text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition" />
      </Link>

      <Link
        href="/settings/tingkatan"
        className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950">
            <Layers size={20} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
              Tingkatan
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Kelola strip/balok tingkatan pada kartu anggota
            </p>
          </div>
        </div>
        <ArrowRight size={18} className="text-gray-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition" />
      </Link>

      <Link
        href="/audit-logs"
        className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950">
            <Shield size={20} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
              Audit Log
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Lacak aktivitas, akses data, dan pelanggaran scope
            </p>
          </div>
        </div>
        <ArrowRight size={18} className="text-gray-400 group-hover:text-purple-500 group-hover:translate-x-0.5 transition" />
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informasi Organisasi */}
        <Card
          title="Informasi Organisasi"
          action={
            org ? (
              <button
                onClick={openOrgEdit}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition-colors"
                title="Edit"
              >
                <Edit3 size={14} />
              </button>
            ) : undefined
          }
        >
          {org ? (
            <div className="space-y-2 text-sm">
              <InfoRow label="Nama" value={org.nama} />
              <InfoRow label="Alamat" value={org.alamat} />
              <InfoRow label="No. Telepon" value={org.noTelp} />
              <InfoRow label="Email" value={org.email} />
              <InfoRow label="Website" value={org.website} />
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada data</p>
          )}
        </Card>

        {/* Stempel */}
        <Card
          title="Stempel"
          action={
            <button
              onClick={openStampModal}
              className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded transition-colors"
              title="Upload stempel"
            >
              <Upload size={14} />
            </button>
          }
        >
          {stamp ? (
            <div className="space-y-2 text-sm">
              <InfoRow label="Nama" value={stamp.nama || stamp.label} />
              {stamp.imagePath && (
                <div className="mt-2 flex items-center gap-4">
                  <img
                    src={`/api/uploads/${encodeURIComponent(stamp.imagePath)}`}
                    alt="Stempel"
                    className="h-24 border rounded dark:border-gray-600 object-contain"
                  />
                </div>
              )}
              <div className="pt-1">
                <button
                  onClick={openStampModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950 rounded-lg hover:bg-green-100 dark:hover:bg-green-900 transition"
                >
                  <Upload size={12} />
                  Ganti Stempel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={openStampModal}
              className="w-full flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:border-green-400 hover:text-green-600 dark:hover:border-green-700 transition"
            >
              <Upload size={16} />
              Upload Stempel Distrik
            </button>
          )}
        </Card>

        {/* Daftar Periode */}
        <Card
          title="Daftar Periode"
          action={
            <button
              onClick={openPeriodCreate}
              className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded transition-colors"
              title="Tambah"
            >
              <Plus size={14} />
            </button>
          }
        >
          {periods.length > 0 ? (
            <div className="space-y-2">
              {periods.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {p.nama || p.periode}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.isActive
                          ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {p.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openPeriodEdit(p)}
                      className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition-colors"
                      title="Edit"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => deletePeriod(p.id)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
                      title="Hapus"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada periode</p>
          )}
        </Card>

        {/* Daftar Tanda Tangan */}
        <Card
          title="Daftar Tanda Tangan"
          action={
            <button
              onClick={openSignatureModal}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition-colors"
              title="Tambah tanda tangan"
            >
              <Plus size={14} />
            </button>
          }
        >
          {signatures.length > 0 ? (
            <div className="space-y-2">
              {signatures.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    {s.imagePath ? (
                      <img
                        src={`/api/uploads/${encodeURIComponent(s.imagePath)}`}
                        alt={s.nama || s.namaLengkap || 'Tanda tangan'}
                        className="w-10 h-8 object-contain bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                      />
                    ) : (
                      <div className="w-10 h-8 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                        <PenLine size={12} className="text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white font-medium">
                        {s.nama || s.namaLengkap}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{s.jabatan}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.isActive
                          ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {s.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <button
                      onClick={() => deleteSignature(s.id)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
                      title="Hapus"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={openSignatureModal}
                className="w-full mt-2 flex items-center justify-center gap-1.5 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-xs text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-700 transition"
              >
                <Plus size={12} />
                Tambah Tanda Tangan
              </button>
            </div>
          ) : (
            <button
              onClick={openSignatureModal}
              className="w-full flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-700 transition"
            >
              <Upload size={16} />
              Upload Tanda Tangan
            </button>
          )}
        </Card>
      </div>

      {/* ─── Edit Org Modal ─── */}
      <Modal
        open={showOrgModal}
        onClose={() => setShowOrgModal(false)}
        title="Edit Informasi Organisasi"
      >
        <div className="space-y-4">
          <FormField label="Nama Organisasi" required>
            <input
              type="text"
              value={orgForm.nama}
              onChange={(e) => setOrgForm((p) => ({ ...p, nama: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </FormField>
          <FormField label="Alamat">
            <textarea
              value={orgForm.alamat || ''}
              onChange={(e) => setOrgForm((p) => ({ ...p, alamat: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="No. Telepon">
              <input
                type="text"
                value={orgForm.noTelp || ''}
                onChange={(e) => setOrgForm((p) => ({ ...p, noTelp: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </FormField>
            <FormField label="Email">
              <input
                type="email"
                value={orgForm.email || ''}
                onChange={(e) => setOrgForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </FormField>
          </div>
          <FormField label="Website">
            <input
              type="text"
              value={orgForm.website || ''}
              onChange={(e) => setOrgForm((p) => ({ ...p, website: e.target.value }))}
              placeholder="https://"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </FormField>
          {orgError && <p className="text-sm text-red-600 dark:text-red-400">{orgError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowOrgModal(false)}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Batal
            </button>
            <button
              onClick={saveOrg}
              disabled={savingOrg}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={14} /> {savingOrg ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Period Modal ─── */}
      <Modal
        open={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        title={editingPeriod ? 'Edit Periode' : 'Tambah Periode'}
      >
        <div className="space-y-4">
          <FormField label="Nama Periode" required>
            <input
              type="text"
              value={periodForm.nama}
              onChange={(e) => setPeriodForm((p) => ({ ...p, nama: e.target.value }))}
              placeholder="Contoh: 2026/2027"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </FormField>
          <FormField label="Status">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={periodForm.isActive}
                onChange={(e) => setPeriodForm((p) => ({ ...p, isActive: e.target.checked }))}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-gray-700 dark:text-gray-300">Aktif</span>
            </label>
          </FormField>
          {periodError && <p className="text-sm text-red-600 dark:text-red-400">{periodError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowPeriodModal(false)}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Batal
            </button>
            <button
              onClick={savePeriod}
              disabled={savingPeriod}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={14} />{' '}
              {savingPeriod ? 'Menyimpan...' : editingPeriod ? 'Simpan' : 'Tambah'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Upload Stempel Modal ─── */}
      <Modal
        open={showStampModal}
        onClose={() => setShowStampModal(false)}
        title="Upload Stempel Distrik"
      >
        <div className="space-y-4">
          <FormField label="Nama Stempel">
            <input
              type="text"
              value={stampForm.nama}
              onChange={(e) => setStampForm((p) => ({ ...p, nama: e.target.value }))}
              placeholder="Contoh: Stempel Distrik Larantuka"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </FormField>
          <FormField label="File Gambar (PNG/JPEG/WebP, maks 5MB)" required>
            <label className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-green-400 hover:bg-green-50/50 dark:hover:bg-green-950/30 transition">
              {stampForm.file ? (
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                  {stampForm.file.name}
                </span>
              ) : (
                <span className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <ImagePlus size={18} />
                  Klik untuk memilih file stempel
                </span>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) =>
                  setStampForm((p) => ({ ...p, file: e.target.files?.[0] || null }))
                }
              />
            </label>
          </FormField>
          {stampForm.file && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <img
                src={URL.createObjectURL(stampForm.file)}
                alt="Preview"
                className="h-16 object-contain rounded border border-gray-200 dark:border-gray-600"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">Preview stempel</span>
            </div>
          )}
          {stampError && <p className="text-sm text-red-600 dark:text-red-400">{stampError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowStampModal(false)}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Batal
            </button>
            <button
              onClick={saveStamp}
              disabled={savingStamp}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Upload size={14} /> {savingStamp ? 'Mengupload...' : 'Upload Stempel'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Upload Tanda Tangan Modal ─── */}
      <Modal
        open={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        title="Upload Tanda Tangan"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Nama Penandatangan">
              <input
                type="text"
                value={signatureForm.nama}
                onChange={(e) => setSignatureForm((p) => ({ ...p, nama: e.target.value }))}
                placeholder="Contoh: Yoseph Pehan Betan"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </FormField>
            <FormField label="Jabatan">
              <input
                type="text"
                value={signatureForm.jabatan}
                onChange={(e) => setSignatureForm((p) => ({ ...p, jabatan: e.target.value }))}
                placeholder="Contoh: Koordinator Distrik"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </FormField>
          </div>
          <FormField label="File Gambar (PNG/JPEG/WebP, maks 5MB)" required>
            <label className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition">
              {signatureForm.file ? (
                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  {signatureForm.file.name}
                </span>
              ) : (
                <span className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <ImagePlus size={18} />
                  Klik untuk memilih file tanda tangan
                </span>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) =>
                  setSignatureForm((p) => ({ ...p, file: e.target.files?.[0] || null }))
                }
              />
            </label>
          </FormField>
          {signatureForm.file && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <img
                src={URL.createObjectURL(signatureForm.file)}
                alt="Preview"
                className="h-16 object-contain rounded border border-gray-200 dark:border-gray-600"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">Preview tanda tangan</span>
            </div>
          )}
          {signatureError && <p className="text-sm text-red-600 dark:text-red-400">{signatureError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowSignatureModal(false)}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Batal
            </button>
            <button
              onClick={saveSignature}
              disabled={savingSignature}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Upload size={14} /> {savingSignature ? 'Mengupload...' : 'Upload Tanda Tangan'}
            </button>
          </div>
        </div>
      </Modal>
      {confirmModal}
    </div>
    </PermissionGuard>
  );
}
