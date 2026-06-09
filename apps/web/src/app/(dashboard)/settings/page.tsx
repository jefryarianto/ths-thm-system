'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import {
  Plus, Edit3, Trash2, X, RefreshCw, Save,
} from 'lucide-react';

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
}

interface Stamp {
  nama?: string;
  label?: string;
  url?: string;
}

export default function SettingsPage() {
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [orgRes, periodsRes, sigRes, stampRes] = await Promise.all([
        apiClient.get('/settings'),
        apiClient.get('/settings/periods'),
        apiClient.get('/settings/signatures'),
        apiClient.get('/settings/stamp'),
      ]);
      setOrg(orgRes.data.data);
      setPeriods(periodsRes.data.data || []);
      setSignatures(sigRes.data.data || []);
      setStamp(stampRes.data.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ─── Org Edit ───
  const openOrgEdit = () => {
    setOrgForm({ ...org! });
    setOrgError('');
    setShowOrgModal(true);
  };

  const saveOrg = async () => {
    if (!orgForm.nama.trim()) { setOrgError('Nama organisasi harus diisi'); return; }
    setSavingOrg(true);
    setOrgError('');
    try {
      const { data: res } = await apiClient.patch('/settings', orgForm);
      setOrg(res.data);
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
      const payload = { nama: periodForm.nama || periodForm.periode, isActive: periodForm.isActive };
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
    if (!confirm('Yakin ingin menghapus periode ini?')) return;
    try {
      await apiClient.delete(`/settings/periods/${id}`);
      setPeriods(prev => prev.filter(p => p.id !== id));
    } catch { alert('Gagal menghapus periode'); }
  };

  // ─── Signature Delete ───
  const deleteSignature = async (id: string) => {
    if (!confirm('Yakin ingin menghapus tanda tangan ini?')) return;
    try {
      await apiClient.delete(`/settings/signatures/${id}`);
      setSignatures(prev => prev.filter(s => s.id !== id));
    } catch { alert('Gagal menghapus tanda tangan'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <RefreshCw size={24} className="animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informasi Organisasi */}
        <SectionCard title="Informasi Organisasi" onEdit={org ? openOrgEdit : undefined}>
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
        </SectionCard>

        {/* Stempel */}
        <SectionCard title="Stempel">
          {stamp ? (
            <div className="space-y-2 text-sm">
              <InfoRow label="Nama" value={stamp.nama || stamp.label} />
              {stamp.url && (
                <div className="mt-2">
                  <img src={stamp.url} alt="Stempel" className="h-24 border rounded dark:border-gray-600" />
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada stempel</p>
          )}
        </SectionCard>

        {/* Daftar Periode */}
        <SectionCard title="Daftar Periode" onAdd={openPeriodCreate}>
          {periods.length > 0 ? (
            <div className="space-y-2">
              {periods.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-900 dark:text-white">{p.nama || p.periode}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.isActive ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
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
        </SectionCard>

        {/* Daftar Tanda Tangan */}
        <SectionCard title="Daftar Tanda Tangan">
          {signatures.length > 0 ? (
            <div className="space-y-2">
              {signatures.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white font-medium">{s.nama || s.namaLengkap}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{s.jabatan}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.isActive ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
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
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada tanda tangan</p>
          )}
        </SectionCard>
      </div>

      {/* ─── Edit Org Modal ─── */}
      {showOrgModal && (
        <Modal onClose={() => setShowOrgModal(false)} title="Edit Informasi Organisasi">
          <Field label="Nama Organisasi" required>
            <input
              type="text" value={orgForm.nama}
              onChange={e => setOrgForm(p => ({ ...p, nama: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </Field>
          <Field label="Alamat">
            <textarea
              value={orgForm.alamat || ''}
              onChange={e => setOrgForm(p => ({ ...p, alamat: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="No. Telepon">
              <input
                type="text" value={orgForm.noTelp || ''}
                onChange={e => setOrgForm(p => ({ ...p, noTelp: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </Field>
            <Field label="Email">
              <input
                type="email" value={orgForm.email || ''}
                onChange={e => setOrgForm(p => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </Field>
          </div>
          <Field label="Website">
            <input
              type="text" value={orgForm.website || ''}
              onChange={e => setOrgForm(p => ({ ...p, website: e.target.value }))}
              placeholder="https://"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </Field>
          {orgError && <p className="text-sm text-red-600 dark:text-red-400">{orgError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowOrgModal(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Batal</button>
            <button onClick={saveOrg} disabled={savingOrg} className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Save size={14} /> {savingOrg ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </Modal>
      )}

      {/* ─── Period Modal ─── */}
      {showPeriodModal && (
        <Modal onClose={() => setShowPeriodModal(false)} title={editingPeriod ? 'Edit Periode' : 'Tambah Periode'}>
          <Field label="Nama Periode" required>
            <input
              type="text" value={periodForm.nama}
              onChange={e => setPeriodForm(p => ({ ...p, nama: e.target.value }))}
              placeholder="Contoh: 2026/2027"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </Field>
          <Field label="Status">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={periodForm.isActive}
                onChange={e => setPeriodForm(p => ({ ...p, isActive: e.target.checked }))}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-gray-700 dark:text-gray-300">Aktif</span>
            </label>
          </Field>
          {periodError && <p className="text-sm text-red-600 dark:text-red-400">{periodError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowPeriodModal(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Batal</button>
            <button onClick={savePeriod} disabled={savingPeriod} className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Save size={14} /> {savingPeriod ? 'Menyimpan...' : editingPeriod ? 'Simpan' : 'Tambah'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Helper Components ───

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SectionCard({ title, children, onAdd, onEdit }: { title: string; children: React.ReactNode; onAdd?: () => void; onEdit?: () => void }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium text-gray-800 dark:text-gray-200">{title}</h2>
        <div className="flex gap-1">
          {onEdit && (
            <button onClick={onEdit} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition-colors" title="Edit">
              <Edit3 size={14} />
            </button>
          )}
          {onAdd && (
            <button onClick={onAdd} className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded transition-colors" title="Tambah">
              <Plus size={14} />
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex">
      <span className="text-gray-500 dark:text-gray-400 w-28 shrink-0">{label}</span>
      <span className="text-gray-800 dark:text-gray-200">{value || '-'}</span>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
