'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { RefreshCw, Save, Lock, RotateCcw } from 'lucide-react';
import apiClient, { extractErrorMessage } from '@/lib/api-client';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import EmptyState from '@/components/ui/empty-state';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { ROLE_LABELS } from '@/components/users/constants';
import { ROLE_VALUES } from '@ths-thm/shared-types';
import type { Role } from '@/types';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-modal';

/** Bentuk respons GET /role-menu-permissions (lihat role-menu-permissions.controller). */
interface PermissionMatrixResponse {
  permissions: Record<string, Record<string, boolean>>;
  menuKeys: string[];
}

const CELL_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  activities: 'Kegiatan',
  calendar: 'Kalender',
  forum: 'Forum',
  notifications: 'Notifikasi',
  orgChart: 'Struktur Organisasi',
  documents: 'Dokumen',
  dues: 'Iuran',
  reports: 'Laporan',
  members: 'Anggota',
  candidates: 'Calon Anggota',
  registrations: 'Pendaftaran',
  claims: 'Klaim',
  letters: 'Surat',
  trainings: 'Latihan',
  graduations: 'Pendadaran',
  examiners: 'Penguji',
  assessments: 'Penilaian',
  approvals: 'Persetujuan',
  orgDocuments: 'Dokumen Organisasi',
  payments: 'Pembayaran',
  users: 'Pengguna',
  monitoring: 'Monitoring',
  queues: 'Antrean',
  settings: 'Pengaturan',
  backup: 'Cadangan',
  gamification: 'Gamifikasi',
};

/** Label ramah tampilan untuk sebuah menuKey. */
function menuKeyLabel(menuKey: string): string {
  return CELL_LABELS[menuKey] ?? menuKey;
}

/**
 * Role yang barisnya bisa diatur di matriks. Superadmin selalu melihat
 * seluruh menu (diatur via kode, bukan tabel ini) sehingga dikunci.
 */
const EDITABLE_ROLES = ROLE_VALUES.filter((r) => r !== 'superadmin');

export default function MenuPermissionsPage() {
  const toast = useToast();
  const { confirm, confirmModal } = useConfirm();

  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [menuKeys, setMenuKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  /** menuKey dengan perubahan belum disimpan, per role. */
  const [dirty, setDirty] = useState<Record<string, Set<string>>>({});

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<PermissionMatrixResponse>('/role-menu-permissions');
      setMatrix(data.permissions ?? {});
      setMenuKeys(data.menuKeys ?? []);
    } catch (err: unknown) {
      toast('error', extractErrorMessage(err, 'Gagal memuat matriks hak akses menu'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  const sortedMenuKeys = useMemo(
    () => [...new Set(menuKeys)].sort((a, b) => menuKeyLabel(a).localeCompare(menuKeyLabel(b))),
    [menuKeys],
  );

  const dirtyRoles = useMemo(() => EDITABLE_ROLES.filter((r) => (dirty[r]?.size ?? 0) > 0), [dirty]);

  const isChecked = (role: string, menuKey: string) => Boolean(matrix[role]?.[menuKey] ?? false);

  const toggle = (role: Role, menuKey: string) => {
    setMatrix((prev) => {
      const rolePerms = { ...(prev[role] ?? {}) };
      rolePerms[menuKey] = !rolePerms[menuKey];
      return { ...prev, [role]: rolePerms };
    });
    setDirty((prev) => {
      const next = { ...prev };
      const set = new Set(next[role] ?? []);
      set.has(menuKey) ? set.delete(menuKey) : set.add(menuKey);
      next[role] = set;
      return next;
    });
  };

  const saveRole = async (role: string) => {
    const changed = dirty[role];
    if (!changed || changed.size === 0) return;

    const permissions: Record<string, boolean> = {};
    for (const menuKey of changed) {
      permissions[menuKey] = isChecked(role, menuKey);
    }

    setSavingRole(role);
    try {
      await apiClient.put(`/role-menu-permissions/bulk/${role}`, { permissions });
      toast('success', `Hak akses menu ${ROLE_LABELS[role] ?? role} berhasil disimpan`);
      setDirty((prev) => {
        const next = { ...prev };
        delete next[role];
        return next;
      });
      fetchMatrix();
    } catch (err: unknown) {
      toast('error', extractErrorMessage(err, 'Gagal menyimpan hak akses'));
    } finally {
      setSavingRole(null);
    }
  };

  const saveAll = async () => {
    if (dirtyRoles.length === 0) return;
    setSavingRole('saveAll');
    try {
      for (const role of dirtyRoles) {
        const changed = dirty[role]!;
        const permissions: Record<string, boolean> = {};
        for (const menuKey of changed) permissions[menuKey] = isChecked(role, menuKey);
        await apiClient.put(`/role-menu-permissions/bulk/${role}`, { permissions });
      }
      toast('success', `Hak akses menu untuk ${dirtyRoles.length} role berhasil disimpan`);
      setDirty({});
      fetchMatrix();
    } catch (err: unknown) {
      toast('error', extractErrorMessage(err, 'Gagal menyimpan sebagian hak akses'));
      fetchMatrix();
    } finally {
      setSavingRole(null);
    }
  };

  const resetAll = async () => {
    const ok = await confirm({
      title: 'Buang semua perubahan?',
      message: 'Checkbox yang belum disimpan akan dikembalikan ke kondisi server.',
    });
    if (!ok) return;
    setDirty({});
    fetchMatrix();
  };

  return (
    <PermissionGuard module="menuPermissions" action="view">
      <PageContainer>
        <PageHeader
          title="Hak Akses Menu per Role"
          subtitle="Atur menu mana saja yang tampil untuk tiap role di sidebar dashboard."
          onRefresh={fetchMatrix}
          backHref="/settings"
          backLabel="Pengaturan"
          className="mb-6"
        />

        {dirtyRoles.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-4 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40 p-3">
            <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {dirtyRoles.length} role memiliki perubahan belum disimpan.
            </span>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={resetAll}
                disabled={savingRole !== null}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                <RotateCcw size={14} />
                Buang Perubahan
              </button>
              <button
                type="button"
                onClick={saveAll}
                disabled={savingRole !== null}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Save size={14} />
                {savingRole === 'saveAll' ? 'Menyimpan…' : 'Simpan Semua'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="animate-spin text-gray-400" size={24} />
          </div>
        ) : sortedMenuKeys.length === 0 ? (
          <EmptyState icon={Lock} title="Belum ada konfigurasi menu"
            message="Data role-menu-permissions masih kosong. Matriks akan terisi setelah ada entri menuKey di server."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50">
                  <th
                    scope="col"
                    className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900/50 px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap"
                  >
                    Menu
                  </th>
                  {EDITABLE_ROLES.map((role) => (
                    <th
                      key={role}
                      scope="col"
                      className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap"
                    >
                      {ROLE_LABELS[role] ?? role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {sortedMenuKeys.map((menuKey) => (
                  <tr key={menuKey} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-4 py-2.5 text-left font-medium text-gray-800 dark:text-gray-100 whitespace-nowrap"
                    >
                      {menuKeyLabel(menuKey)}
                      <span className="block text-xs font-normal text-gray-400 dark:text-gray-500">
                        {menuKey}
                      </span>
                    </th>
                    {EDITABLE_ROLES.map((role) => (
                      <td key={role} className="px-4 py-2.5 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${menuKeyLabel(menuKey)} untuk ${ROLE_LABELS[role] ?? role}`}
                          checked={isChecked(role, menuKey)}
                          onChange={() => toggle(role as Role, menuKey)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && sortedMenuKeys.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {EDITABLE_ROLES.map((role) => {
              const count = dirty[role]?.size ?? 0;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => saveRole(role)}
                  disabled={count === 0 || savingRole !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Save size={14} />
                  {ROLE_LABELS[role] ?? role}
                  {count > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-semibold text-white">
                      {count}
                    </span>
                  )}
                  {savingRole === role && <RefreshCw size={12} className="animate-spin" />}
                </button>
              );
            })}
          </div>
        )}
      </PageContainer>
      {confirmModal}
    </PermissionGuard>
  );
}
