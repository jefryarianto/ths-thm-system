'use client';

import { useState, useEffect } from 'react';
import apiClient, { unwrap } from '@/lib/api-client';
import Modal from '@/components/ui/modal';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';
import FormField from '@/components/ui/form-field';
import OrgCascadeSelect, {
  EMPTY_ORG_SELECTION,
  type OrgSelection,
} from '@/components/ui/org-cascade-select';
import { ROLE_OPTIONS } from '@/components/users/constants';
import { useToast } from '@/components/ui/toast';
import { useOrgScopeLocks } from '@/hooks/use-org-scope';
import type { User } from '@/types';

interface EditUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string | null;
}

/** `/users/:id` menyertakan relasi ranting → wilayah → distrik untuk prefill cascade. */
interface UserDetail extends User {
  ranting?: {
    id: string;
    nama: string;
    wilayahId?: string | null;
    wilayah?: {
      id: string;
      nama: string;
      distrikId?: string | null;
      distrik?: { id: string; nama: string } | null;
    } | null;
  } | null;
}

export default function EditUserModal({ open, onClose, onSuccess, userId }: EditUserModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [form, setForm] = useState({ email: '', namaLengkap: '', role: '', password: '' });
  const [org, setOrg] = useState<OrgSelection>(EMPTY_ORG_SELECTION);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const scope = useOrgScopeLocks(open);

  // Superadmin tidak butuh ranting (scope nasional); role lain WAJIB punya.
  const isSuperadmin = form.role === 'superadmin';
  const showOrg = form.role !== '' && !isSuperadmin;

  useEffect(() => {
    if (open && userId) {
      setFetching(true);
      apiClient
        .get(`/users/${userId}`)
        .then((r) => {
          const user = unwrap<UserDetail>(r);
          setForm({
            email: user.email,
            namaLengkap: user.namaLengkap,
            role: user.role,
            password: '',
          });
          setOrg({
            distrikId: user.ranting?.wilayah?.distrik?.id ?? '',
            wilayahId: user.ranting?.wilayah?.id ?? '',
            rantingId: user.rantingId ?? '',
          });
        })
        .catch(() => {
          toast('error', 'Gagal memuat data user');
          onClose();
        })
        .finally(() => setFetching(false));
    }
  }, [open, userId, onClose, toast]);

  // Kunci scope aktor diterapkan oleh OrgCascadeSelect (single source of truth)
  // lewat prop lockDistrikId/lockWilayahId; prefill dari server dipertahankan.

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleRoleChange = (role: string) => {
    setForm((prev) => ({ ...prev, role }));
    // Ganti role = ganti kebutuhan organisasi → reset cascade.
    setOrg(EMPTY_ORG_SELECTION);
    setErrors((prev) => ({ ...prev, role: '', ranting: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.email) errs.email = 'Email wajib diisi';
    if (!form.namaLengkap) errs.namaLengkap = 'Nama wajib diisi';
    if (!form.role) errs.role = 'Role wajib dipilih';
    if (form.password && form.password.length < 6) errs.password = 'Password minimal 6 karakter';
    if (showOrg && !org.rantingId) {
      errs.ranting = 'Ranting wajib dipilih untuk role selain superadmin';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !userId) return;
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        email: form.email,
        namaLengkap: form.namaLengkap,
        role: form.role,
      };
      if (form.password) payload.password = form.password;
      if (showOrg) payload.rantingId = org.rantingId;
      await apiClient.patch(`/users/${userId}`, payload);
      toast('success', 'User berhasil diperbarui');
      setForm({ email: '', namaLengkap: '', role: '', password: '' });
      setOrg(EMPTY_ORG_SELECTION);
      setErrors({});
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Gagal memperbarui user';
      toast('error', msg);
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit User" size="md">
      {fetching ? (
        <div className="flex items-center justify-center py-8">
          <span className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Nama Lengkap" required>
            <Input
              value={form.namaLengkap}
              onChange={(e) => handleChange('namaLengkap', e.target.value)}
              placeholder="Masukkan nama lengkap"
              error={errors.namaLengkap}
            />
          </FormField>
          <FormField label="Email" required>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="contoh@email.com"
              error={errors.email}
            />
          </FormField>
          <FormField label="Role" required>
            <Select
              data-testid="user-role"
              value={form.role}
              onChange={(e) => handleRoleChange(e.target.value)}
              options={ROLE_OPTIONS.filter((o) => o.value !== '')}
              placeholder="Pilih Role"
              error={errors.role}
            />
          </FormField>
          {showOrg && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Penempatan organisasi — wajib untuk role selain superadmin.
              </p>
              <OrgCascadeSelect
                value={org}
                onChange={setOrg}
                error={errors.ranting}
                disabled={loading}
                lockDistrikId={scope.lockDistrikId}
                lockWilayahId={scope.lockWilayahId}
              />
            </div>
          )}
          <FormField label="Password Baru (opsional)">
            <Input
              type="password"
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="Kosongkan jika tidak ingin mengubah"
              error={errors.password}
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
            >
              {loading && (
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              )}
              Simpan
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}