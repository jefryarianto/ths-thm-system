'use client';

import { useState } from 'react';
import apiClient from '@/lib/api-client';
import Modal from '@/components/ui/modal';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';
import FormField from '@/components/ui/form-field';
import { ROLE_OPTIONS } from '@/components/users/constants';
import { useToast } from '@/components/ui/toast';

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateUserModal({ open, onClose, onSuccess }: CreateUserModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', namaLengkap: '', role: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.email) errs.email = 'Email wajib diisi';
    if (!form.namaLengkap) errs.namaLengkap = 'Nama wajib diisi';
    if (!form.role) errs.role = 'Role wajib dipilih';
    if (form.password && form.password.length < 6) errs.password = 'Password minimal 6 karakter';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: Record<string, string> = {
        email: form.email,
        namaLengkap: form.namaLengkap,
        role: form.role,
      };
      if (form.password) payload.password = form.password;
      await apiClient.post('/users', payload);
      toast('success', 'User berhasil dibuat');
      setForm({ email: '', namaLengkap: '', role: '', password: '' });
      setErrors({});
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Gagal membuat user';
      toast('error', msg);
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Tambah User Baru" size="md">
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
            value={form.role}
            onChange={(e) => handleChange('role', e.target.value)}
            options={ROLE_OPTIONS.filter((o) => o.value !== '')}
            placeholder="Pilih Role"
            error={errors.role}
          />
        </FormField>
        <FormField label="Password (opsional)">
          <Input
            type="password"
            value={form.password}
            onChange={(e) => handleChange('password', e.target.value)}
            placeholder="Kosongkan untuk password default"
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
    </Modal>
  );
}