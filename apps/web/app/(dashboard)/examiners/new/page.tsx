'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { ArrowLeft, Save } from 'lucide-react';

import Breadcrumbs from '@/components/ui/breadcrumbs';
import MemberSearchPicker from '@/components/members/MemberSearchPicker';
import { useToast } from '@/components/ui/toast';

interface MemberResult {
  id: string;
  namaLengkap: string;
  nomorAnggota: string;
  email?: string;
}

export default function NewExaminerPage() {
  const router = useRouter();
  const toast = useToast();
  const [selectedMember, setSelectedMember] = useState<MemberResult | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      toast('error', 'Pilih anggota terlebih dahulu');
      return;
    }
    if (!selectedMember.email) {
      toast('error', 'Anggota yang dipilih belum punya email. Lengkapi email anggota terlebih dahulu di manajemen anggota.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/examiners', {
        email: selectedMember.email,
        namaLengkap: selectedMember.namaLengkap,
      });
      toast('success', 'Penguji berhasil ditambahkan — akun dibuat/dipromosikan sebagai penguji');
      router.push('/examiners');
    } catch (err: any) {
      toast('error', err?.response?.data?.message || 'Gagal menyimpan penguji');
    }
    setSaving(false);
  };

  return (
    <PermissionGuard module="examiners" action="create">
      <Breadcrumbs />
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/examiners')}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Tambah Penguji
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5 shadow-sm">
          {/* Pilih Anggota */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Pilih Anggota <span className="text-red-500">*</span>
            </label>
            <MemberSearchPicker
              value={selectedMember?.id}
              onChange={(member) => setSelectedMember(member)}
              placeholder="Cari anggota berdasarkan nama, no anggota, atau email..."
            />
            {!selectedMember && (
              <p className="text-xs text-gray-400 mt-1">
                Cari dan pilih anggota yang akan ditugaskan sebagai penguji
              </p>
            )}
          </div>

          {/* Info */}
          <div className="px-3 py-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg text-xs text-blue-800 dark:text-blue-300">
            Anggota yang sudah punya akun akan <strong>dipromosikan</strong> menjadi penguji (password tetap); yang belum akan dibuatkan akun dengan email set-password. Peran (ketua penguji/anggota) dan catatan ditentukan saat penugasan pada masing-masing pendadaran.
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => router.push('/examiners')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || !selectedMember}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Simpan
            </button>
          </div>
        </form>
      </div>
    </PermissionGuard>
  );
}
