'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { NOTIF_TYPES } from './constants';

interface SendNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SendNotificationModal({ isOpen, onClose }: SendNotificationModalProps) {
  const [sendTarget, setSendTarget] = useState('broadcast');
  const [sendTargetRole, setSendTargetRole] = useState('admin_distrik');
  const [sendTargetUserId, setSendTargetUserId] = useState('');
  const [sendForm, setSendForm] = useState({ judul: '', isi: '', tipe: 'umum' });
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSendTarget('broadcast');
      setSendTargetRole('admin_distrik');
      setSendTargetUserId('');
      setSendForm({ judul: '', isi: '', tipe: 'umum' });
      setSending(false);
      setSendResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!sendForm.judul || !sendForm.isi) return;
    setSending(true);
    setSendResult(null);
    try {
      const apiClient = (await import('@/lib/api-client')).default;
      let res;
      if (sendTarget === 'broadcast') {
        res = await apiClient.post('/notifications/broadcast', sendForm);
      } else if (sendTarget === 'role') {
        res = await apiClient.post('/notifications/role', { ...sendForm, role: sendTargetRole });
      } else if (sendTarget === 'user') {
        res = await apiClient.post('/notifications/send', {
          ...sendForm,
          userId: sendTargetUserId,
        });
      }
      setSendResult(
        `Berhasil! ${(res as { data?: { data?: { sentTo?: number } } })?.data?.data?.sentTo || 1} notifikasi terkirim.`,
      );
      setSendForm({ judul: '', isi: '', tipe: 'umum' });
      setTimeout(() => {
        setSendResult(null);
        onClose();
      }, 2000);
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      setSendResult(apiErr || 'Gagal mengirim notifikasi');
    }
    setSending(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Kirim Notifikasi</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Target */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Kirim Ke
          </label>
          <select
            value={sendTarget}
            onChange={(e) => setSendTarget(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="broadcast">Semua Anggota</option>
            <option value="role">Berdasarkan Role</option>
            <option value="user">User Tertentu</option>
          </select>
        </div>

        {sendTarget === 'role' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role
            </label>
            <select
              value={sendTargetRole}
              onChange={(e) => setSendTargetRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="superadmin">Superadmin</option>
              <option value="admin_distrik">Admin Distrik</option>
              <option value="admin_wilayah">Admin Wilayah</option>
              <option value="admin_ranting">Admin Ranting</option>
              <option value="anggota">Anggota</option>
            </select>
          </div>
        )}

        {sendTarget === 'user' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              User ID
            </label>
            <input
              type="text"
              value={sendTargetUserId}
              onChange={(e) => setSendTargetUserId(e.target.value)}
              placeholder="Masukkan User ID"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Form fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Judul
          </label>
          <input
            type="text"
            value={sendForm.judul}
            onChange={(e) => setSendForm((p) => ({ ...p, judul: e.target.value }))}
            placeholder="Judul notifikasi"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Pesan
          </label>
          <textarea
            value={sendForm.isi}
            onChange={(e) => setSendForm((p) => ({ ...p, isi: e.target.value }))}
            placeholder="Isi notifikasi"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tipe
          </label>
          <select
            value={sendForm.tipe}
            onChange={(e) => setSendForm((p) => ({ ...p, tipe: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            {NOTIF_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Result */}
        {sendResult && (
          <div
            className={`text-sm px-3 py-2 rounded-lg ${sendResult.includes('Berhasil') ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400'}`}
          >
            {sendResult}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Batal
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !sendForm.judul || !sendForm.isi}
            className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            {sending ? 'Mengirim...' : 'Kirim'}
          </button>
        </div>
      </div>
    </div>
  );
}
