'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import {
  Send,
  UserCheck,
  UserX,
  RefreshCw,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
} from 'lucide-react';
import Modal from '@/components/ui/modal';

interface Invitation {
  id: string;
  status: 'dikirim' | 'hadir' | 'tidak_hadir';
  konfirmasiAt: string | null;
  konfirmasiOleh: string | null;
  catatan: string | null;
  anggota: {
    id: string;
    namaLengkap: string;
    nomorAnggota: string | null;
    tingkat: string | null;
    tahunDadar: string | null;
    email: string | null;
    noHp: string | null;
  };
}

const STATUS_STYLES: Record<string, string> = {
  dikirim: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  hadir: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300',
  tidak_hadir: 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300',
};

const STATUS_LABELS: Record<string, string> = {
  dikirim: 'Dikirim',
  hadir: 'Hadir',
  tidak_hadir: 'Tidak Hadir',
};

export default function InvitationTab({
  id,
  isAdminKegiatanLevel,
}: {
  id: string;
  isAdminKegiatanLevel: boolean;
}) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Invitation | null>(null);
  const [confirmHadir, setConfirmHadir] = useState(true);
  const [confirmCatatan, setConfirmCatatan] = useState('');
  const [confirming, setConfirming] = useState(false);

  const fetchInvitations = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/graduations/${id}/invitations`);
      setInvitations(res.data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleGenerate = async () => {
    if (!id) return;
    setGenerating(true);
    setMsg(null);
    try {
      const res = await apiClient.post(`/graduations/${id}/invitations/generate`, {});
      const d = res.data.data || { generated: 0, skipped: 0, total: 0 };
      setMsg({
        ok: true,
        text: `${d.generated} undangan dibuat (${d.skipped} dilewati dari ${d.total} anggota memenuhi kriteria)`,
      });
      await fetchInvitations();
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMsg({ ok: false, text: m || 'Gagal membuat undangan' });
    }
    setGenerating(false);
  };

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    setConfirming(true);
    try {
      await apiClient.post(`/graduations/${id}/invitations/${confirmTarget.id}/confirm`, {
        hadir: confirmHadir,
        catatan: confirmCatatan || undefined,
      });
      setConfirmTarget(null);
      setConfirmCatatan('');
      setMsg({ ok: true, text: 'Konfirmasi kehadiran berhasil dicatat' });
      await fetchInvitations();
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMsg({ ok: false, text: m || 'Gagal mencatat konfirmasi' });
    }
    setConfirming(false);
  };

  const counts = {
    dikirim: invitations.filter((i) => i.status === 'dikirim').length,
    hadir: invitations.filter((i) => i.status === 'hadir').length,
    tidak_hadir: invitations.filter((i) => i.status === 'tidak_hadir').length,
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Mail size={18} className="text-emerald-500" />
            Undangan Pendadaran
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Otomatis dikirim H-7 (masa anggota &gt;2 tahun dari tahun dadar atau tingkat Pratama). Anggota
            mengonfirmasi via aplikasi, atau dicatat manual di sini.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchInvitations}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          {isAdminKegiatanLevel && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition disabled:opacity-50"
            >
              <Send size={14} />
              {generating ? 'Membuat...' : 'Generate Undangan'}
            </button>
          )}
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { key: 'dikirim', label: 'Dikirim', icon: Clock, cls: 'text-gray-500 bg-gray-50 dark:bg-gray-800/50' },
          { key: 'hadir', label: 'Hadir', icon: UserCheck, cls: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
          { key: 'tidak_hadir', label: 'Tidak Hadir', icon: UserX, cls: 'text-red-600 bg-red-50 dark:bg-red-950/40' },
        ] as const).map(({ key, label, icon: Icon, cls }) => (
          <div key={key} className={`rounded-xl border border-gray-200 dark:border-gray-700 p-4 ${cls}`}>
            <div className="flex items-center gap-2">
              <Icon size={16} />
              <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{counts[key]}</p>
          </div>
        ))}
      </div>

      {/* Message */}
      {msg && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${
          msg.ok
            ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
            : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
        }`}>
          {msg.text}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-8 text-sm text-gray-400">Memuat undangan...</div>
      ) : invitations.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <Mail size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Belum ada undangan</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Undangan dibuat otomatis saat H-7, atau tekan &quot;Generate Undangan&quot; untuk membuat manual
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Anggota</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Tingkat</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Tahun Dadar</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Dikonfirmasi</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          {inv.anggota.namaLengkap.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{inv.anggota.namaLengkap}</p>
                          <p className="text-xs text-gray-400">{inv.anggota.nomorAnggota || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{inv.anggota.tingkat || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{inv.anggota.tahunDadar || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[inv.status] || ''}`}>
                        {STATUS_LABELS[inv.status] || inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {inv.konfirmasiAt
                        ? `${new Date(inv.konfirmasiAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long' })}${inv.konfirmasiOleh ? ` · ${inv.konfirmasiOleh}` : ''}`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isAdminKegiatanLevel && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => { setConfirmTarget(inv); setConfirmHadir(true); setConfirmCatatan(''); }}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 transition"
                            title="Catat Hadir"
                          >
                            <CheckCircle2 size={12} /> Hadir
                          </button>
                          <button
                            onClick={() => { setConfirmTarget(inv); setConfirmHadir(false); setConfirmCatatan(''); }}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 transition"
                            title="Catat Tidak Hadir"
                          >
                            <XCircle size={12} /> Tidak
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      <Modal
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        title={confirmHadir ? 'Catat Hadir' : 'Catat Tidak Hadir'}
        size="sm"
      >
        {confirmTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Konfirmasi kehadiran untuk{' '}
              <span className="font-medium text-gray-900 dark:text-white">{confirmTarget.anggota.namaLengkap}</span>
              {' '}sebagai <span className="font-medium">{confirmHadir ? 'HADIR' : 'TIDAK HADIR'}</span>?
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catatan</label>
              <textarea
                value={confirmCatatan}
                onChange={(e) => setConfirmCatatan(e.target.value)}
                rows={2}
                placeholder="Catatan opsional (mis. konfirmasi via telepon)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmTarget(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Batal
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50"
              >
                <Plus size={14} /> {confirming ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
