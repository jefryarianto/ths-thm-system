'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { RefreshCw, Save, Lock, RotateCcw, Search, X } from 'lucide-react';
import apiClient, { extractErrorMessage, unwrap } from '@/lib/api-client';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import EmptyState from '@/components/ui/empty-state';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { ROLE_LABELS } from '@/components/users/constants';
import { ROLE_VALUES, getMenuLabel } from '@ths-thm/shared-types';
import type { Role } from '@/types';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-modal';

/**
 * Bentuk payload GET /role-menu-permissions (lihat role-menu-permissions.controller).
 * `menuKeys` = registry menu sidebar digabung dengan key lama di DB.
 * Respons dibungkus TransformInterceptor → `{ success, data }`; akses lewat
 * `unwrap()` (lihat api-client.ts), bukan `res.data` langsung.
 */
interface PermissionMatrixResponse {
  permissions: Record<string, Record<string, boolean>>;
  menuKeys: string[];
}

/**
 * Role yang barisnya bisa diatur di matriks. Superadmin selalu melihat
 * seluruh menu (diatur via kode, bukan tabel ini) sehingga dikunci.
 */
const EDITABLE_ROLES = ROLE_VALUES.filter((r) => r !== 'superadmin');

/** Salin per role — `matrix` dan `baseline` tidak boleh berbagi referensi objek. */
function cloneMatrix(
  source: Record<string, Record<string, boolean>>,
): Record<string, Record<string, boolean>> {
  return Object.fromEntries(Object.entries(source).map(([role, perms]) => [role, { ...perms }]));
}

/** Checkbox select-all di header kolom (React tidak merender atribut `indeterminate`). */
function ColumnSelectAll({
  checked,
  indeterminate,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      title={label}
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
    />
  );
}

export default function MenuPermissionsPage() {
  const toast = useToast();
  const { confirm, confirmModal } = useConfirm();

  /** Kondisi TERAKHIR di server (dari fetch, diperbarui per role setelah save sukses). */
  const [baseline, setBaseline] = useState<Record<string, Record<string, boolean>>>({});
  /** Kondisi yang sedang diedit. Selisih terhadap `baseline` = perubahan belum disimpan. */
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [menuKeys, setMenuKeys] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState<string | null>(null);

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/role-menu-permissions');
      const body = unwrap<Partial<PermissionMatrixResponse>>(res) ?? {};
      const permissions = body.permissions ?? {};
      setBaseline(cloneMatrix(permissions));
      setMatrix(cloneMatrix(permissions));
      setMenuKeys(body.menuKeys ?? []);
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
    () => [...new Set(menuKeys)].sort((a, b) => getMenuLabel(a).localeCompare(getMenuLabel(b))),
    [menuKeys],
  );

  /** Filter pencarian: cocok label tampilan atau key mentah, tanpa mengubah dirty. */
  const visibleMenuKeys = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedMenuKeys;
    return sortedMenuKeys.filter(
      (k) => getMenuLabel(k).toLowerCase().includes(q) || k.toLowerCase().includes(q),
    );
  }, [sortedMenuKeys, search]);

  /**
   * Perubahan belum disimpan = selisih `matrix` vs `baseline` (bukan "pernah
   * disentuh"): membalik checkbox ke nilai awal kembali bersih, dan
   * select-all hanya menandai yang benar-benar berubah.
   */
  const dirtyByRole = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const role of EDITABLE_ROLES) {
      const current = matrix[role] ?? {};
      const saved = baseline[role] ?? {};
      const keys = new Set([...Object.keys(current), ...Object.keys(saved)]);
      const changed = [...keys].filter((k) => Boolean(current[k]) !== Boolean(saved[k]));
      if (changed.length > 0) out[role] = changed;
    }
    return out;
  }, [matrix, baseline]);

  const dirtyRoles = useMemo(
    () => EDITABLE_ROLES.filter((r) => dirtyByRole[r] !== undefined),
    [dirtyByRole],
  );

  const isChecked = (role: string, menuKey: string) => Boolean(matrix[role]?.[menuKey] ?? false);

  const toggle = (role: Role, menuKey: string) => {
    setMatrix((prev) => ({
      ...prev,
      [role]: { ...(prev[role] ?? {}), [menuKey]: !isChecked(role, menuKey) },
    }));
  };

  /** Set nilai sekumpulan menuKey (select-all pada kolom yang sedang tampil). */
  const setColumn = (role: Role, keys: string[], value: boolean) => {
    if (keys.length === 0) return;
    setMatrix((prev) => {
      const rolePerms = { ...(prev[role] ?? {}) };
      for (const key of keys) rolePerms[key] = value;
      return { ...prev, [role]: rolePerms };
    });
  };

  /** Tandai nilai terkirim sebagai kondisi server — HANYA untuk role ini. */
  const commitRole = (role: string, permissions: Record<string, boolean>) => {
    setBaseline((prev) => ({ ...prev, [role]: { ...(prev[role] ?? {}), ...permissions } }));
  };

  const payloadFor = (role: string): Record<string, boolean> =>
    Object.fromEntries((dirtyByRole[role] ?? []).map((k) => [k, isChecked(role, k)]));

  const saveRole = async (role: string) => {
    const permissions = payloadFor(role);
    if (Object.keys(permissions).length === 0) return;

    setSavingRole(role);
    try {
      await apiClient.put(`/role-menu-permissions/bulk/${role}`, { permissions });
      // Commit per role saja. Dulu fetchMatrix() me-reset seluruh matriks —
      // edit belum disimpan di role LAIN ikut terhapus tanpa aba-aba.
      commitRole(role, permissions);
      toast('success', `Hak akses menu ${ROLE_LABELS[role] ?? role} berhasil disimpan`);
    } catch (err: unknown) {
      toast('error', extractErrorMessage(err, 'Gagal menyimpan hak akses'));
    } finally {
      setSavingRole(null);
    }
  };

  const saveAll = async () => {
    const roles = EDITABLE_ROLES.filter((r) => dirtyByRole[r] !== undefined);
    if (roles.length === 0) return;

    setSavingRole('saveAll');
    let saved = 0;
    try {
      for (const role of roles) {
        const permissions = payloadFor(role);
        try {
          await apiClient.put(`/role-menu-permissions/bulk/${role}`, { permissions });
        } catch (err: unknown) {
          // Hentikan; role yang belum tersimpan TETAP dirty (tanpa refetch,
          // yang dulu justru me-reset semua progres yang belum terkirim).
          toast(
            'error',
            `${ROLE_LABELS[role] ?? role}: ${extractErrorMessage(err, 'gagal menyimpan')}`,
          );
          return;
        }
        commitRole(role, permissions);
        saved++;
      }
      toast('success', `Hak akses menu untuk ${saved} role berhasil disimpan`);
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
    setMatrix(cloneMatrix(baseline));
  };

  /** Refresh manual: konfirmasi dulu bila ada edit belum disimpan (ikut hilang). */
  const handleRefresh = async () => {
    if (dirtyRoles.length > 0) {
      const ok = await confirm({
        title: 'Muat ulang matriks?',
        message: `${dirtyRoles.length} role memiliki perubahan belum disimpan yang akan hilang.`,
      });
      if (!ok) return;
    }
    fetchMatrix();
  };

  const saveDisabled = savingRole !== null;

  return (
    <PermissionGuard module="menuPermissions" action="view">
      <PageContainer>
        <PageHeader
          title="Hak Akses Menu per Role"
          subtitle="Atur menu mana saja yang tampil untuk tiap role di sidebar dashboard."
          onRefresh={handleRefresh}
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
                disabled={saveDisabled}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                <RotateCcw size={14} />
                Buang Perubahan
              </button>
              <button
                type="button"
                onClick={saveAll}
                disabled={saveDisabled}
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
          <EmptyState
            icon={Lock}
            title="Belum ada konfigurasi menu"
            message="Data role-menu-permissions masih kosong. Matriks akan terisi setelah ada entri menuKey di server."
          />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari menu…"
                  aria-label="Cari menu"
                  className="w-56 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-8 pr-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {visibleMenuKeys.length} dari {sortedMenuKeys.length} menu
              </span>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X size={12} />
                  Bersihkan
                </button>
              )}
            </div>

            {visibleMenuKeys.length === 0 ? (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Tidak ada menu yang cocok dengan “{search}”.
              </div>
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
                      {EDITABLE_ROLES.map((role) => {
                        const checkedCount = visibleMenuKeys.filter((k) =>
                          isChecked(role, k),
                        ).length;
                        const allChecked =
                          visibleMenuKeys.length > 0 && checkedCount === visibleMenuKeys.length;
                        const label = `Pilih semua menu yang tampil untuk ${ROLE_LABELS[role] ?? role}`;
                        return (
                          <th
                            key={role}
                            scope="col"
                            className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <ColumnSelectAll
                                checked={allChecked}
                                indeterminate={checkedCount > 0 && !allChecked}
                                disabled={saveDisabled || visibleMenuKeys.length === 0}
                                onChange={(next) => setColumn(role, visibleMenuKeys, next)}
                                label={label}
                              />
                              <span>{ROLE_LABELS[role] ?? role}</span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {visibleMenuKeys.map((menuKey) => (
                      <tr key={menuKey} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                        <th
                          scope="row"
                          className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-4 py-2.5 text-left font-medium text-gray-800 dark:text-gray-100 whitespace-nowrap"
                        >
                          {getMenuLabel(menuKey)}
                          <span className="block text-xs font-normal text-gray-400 dark:text-gray-500">
                            {menuKey}
                          </span>
                        </th>
                        {EDITABLE_ROLES.map((role) => (
                          <td key={role} className="px-4 py-2.5 text-center">
                            <input
                              type="checkbox"
                              aria-label={`${getMenuLabel(menuKey)} untuk ${ROLE_LABELS[role] ?? role}`}
                              checked={isChecked(role, menuKey)}
                              disabled={saveDisabled}
                              onChange={() => toggle(role, menuKey)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 disabled:opacity-50"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {!loading && sortedMenuKeys.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {EDITABLE_ROLES.map((role) => {
              const count = dirtyByRole[role]?.length ?? 0;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => saveRole(role)}
                  disabled={count === 0 || saveDisabled}
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
