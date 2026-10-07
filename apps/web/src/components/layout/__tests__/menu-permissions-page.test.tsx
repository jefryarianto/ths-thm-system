import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MenuPermissionsPage from '../../../../app/(dashboard)/settings/menu-permissions/page';

// jsdom in this config doesn't define localStorage; `useAuth` reads the stored
// user from it after mount, so install a minimal in-memory polyfill first
// (pola sama dengan can.test.tsx).
beforeAll(() => {
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size;
      },
    } as Storage;
  }
  // `useAuth` also subscribes to sessionManager which touches timers/SSR-only
  // browser APIs during effect setup.
  vi.stubGlobal('window', globalThis.window);
});

/**
 * Uji halaman matriks role × menu:
 *
 * 1. Dirty-state = selisih terhadap baseline, dan save per-role TIDAK me-reset
 *    matriks (dulu fetchMatrix() menghapus edit belum disimpan di role lain).
 * 2. Pencarian memfilter baris; select-all hanya menyangkut baris tampil.
 * 3. Gagal simpan mempertahankan dirty tanpa refetch.
 */

const { getMock, putMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  putMock: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  default: {
    get: (...args: unknown[]) => getMock(...args),
    put: (...args: unknown[]) => putMock(...args),
  },
  extractErrorMessage: (err: unknown, fallback: string) =>
    err instanceof Error && err.message ? err.message : fallback,
  // Bentuk asli: TransformInterceptor membungkus body jadi { success, data }.
  // eslint-disable-next-line no-restricted-syntax
  unwrap: (r: { data: { data: unknown } }) => r.data.data,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const MENU_KEYS = ['forum', 'reports'];

const MATRIX = {
  admin_distrik: { forum: true, reports: true },
  admin_ranting: { forum: false, reports: false },
  anggota: { forum: true, reports: false },
};

/** Render halaman dan tunggu matriks termuat. */
async function renderPage() {
  render(<MenuPermissionsPage />);
  await screen.findByRole('table');
}

const cell = (menuLabel: string, roleLabel: string) =>
  screen.getByLabelText(`${menuLabel} untuk ${roleLabel}`);

const headerAll = (roleLabel: string) =>
  screen.getByLabelText(`Pilih semua menu yang tampil untuk ${roleLabel}`);

const saveButton = (roleLabel: string) =>
  screen.getByRole('button', { name: new RegExp(`^${roleLabel}`) });

describe('MenuPermissionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 'u1',
        role: 'superadmin',
        namaLengkap: 'Superadmin',
        email: 'sa@example.test',
      }),
    );
    getMock.mockResolvedValue({
      data: {
        success: true,
        data: { permissions: MATRIX, menuKeys: MENU_KEYS },
      },
    });
    putMock.mockResolvedValue({ data: { success: true, data: {} } });
  });

  it('memuat matriks tanpa perubahan belum disimpan', async () => {
    await renderPage();

    expect(getMock).toHaveBeenCalledWith('/role-menu-permissions');
    expect(screen.queryByText(/perubahan belum disimpan/)).not.toBeInTheDocument();
    expect(cell('Forum', 'Admin Distrik')).toBeChecked();
    expect(cell('Laporan Umum', 'Admin Ranting')).not.toBeChecked();
    expect(screen.getByText('2 dari 2 menu')).toBeInTheDocument();
    // Superadmin tidak punya kolom (dikunci, diatur via kode).
    expect(screen.queryByLabelText(/untuk Superadmin/)).not.toBeInTheDocument();
  });

  it('save per-role TIDAK menghapus edit belum disimpan di role lain (regresi dirty-state)', async () => {
    await renderPage();

    // Dua role diedit.
    fireEvent.click(cell('Laporan Umum', 'Admin Distrik')); // true → false
    fireEvent.click(cell('Forum', 'Anggota')); // true → false
    expect(
      await screen.findByText('2 role memiliki perubahan belum disimpan.'),
    ).toBeInTheDocument();

    // Simpan hanya Admin Distrik.
    fireEvent.click(saveButton('Admin Distrik'));
    await waitFor(() => expect(putMock).toHaveBeenCalledTimes(1));
    expect(putMock).toHaveBeenCalledWith('/role-menu-permissions/bulk/admin_distrik', {
      permissions: { reports: false },
    });

    // Tidak ada refetch — dulu fetchMatrix() di sini me-reset role lain.
    expect(getMock).toHaveBeenCalledTimes(1);

    // Edit Anggota (belum disimpan) masih utuh di UI.
    expect(cell('Forum', 'Anggota')).not.toBeChecked();
    expect(
      await screen.findByText('1 role memiliki perubahan belum disimpan.'),
    ).toBeInTheDocument();
  });

  it('membalik checkbox ke nilai awal kembali bersih (dirty = selisih, bukan sentuh)', async () => {
    await renderPage();

    const checkbox = cell('Laporan Umum', 'Admin Distrik'); // baseline: true
    fireEvent.click(checkbox); // → false: dirty
    expect(await screen.findByText(/perubahan belum disimpan/)).toBeInTheDocument();

    fireEvent.click(checkbox); // → true: sama dengan baseline lagi
    await waitFor(() =>
      expect(screen.queryByText(/perubahan belum disimpan/)).not.toBeInTheDocument(),
    );
    expect(saveButton('Admin Distrik')).toBeDisabled();
  });

  it('pencarian memfilter baris; select-all hanya menyangkut baris tampil', async () => {
    await renderPage();

    fireEvent.change(screen.getByLabelText('Cari menu'), { target: { value: 'Laporan' } });
    expect(await screen.findByText('1 dari 2 menu')).toBeInTheDocument();
    expect(screen.queryByLabelText('Forum untuk Admin Distrik')).not.toBeInTheDocument();
    expect(cell('Laporan Umum', 'Admin Ranting')).toBeInTheDocument();

    // Select-all saat terfilter: hanya 'reports' yang boleh berubah.
    fireEvent.click(headerAll('Admin Ranting'));
    expect(cell('Laporan Umum', 'Admin Ranting')).toBeChecked();
    expect(await screen.findByText('1 role memiliki perubahan belum disimpan.')).toBeInTheDocument();

    // 'forum' tidak tampil saat terfilter dan memang TIDAK ikut tercentang
    // (baseline false harus tetap false).
    fireEvent.change(screen.getByLabelText('Cari menu'), { target: { value: '' } });
    expect(cell('Forum', 'Admin Ranting')).not.toBeChecked();
    expect(screen.getByText('2 dari 2 menu')).toBeInTheDocument();
  });

  it('select-all memeriksa seluruh baris tampil dan payload save berisi key yang berubah saja', async () => {
    await renderPage();

    // admin_wilayah tidak ada di fixture → baseline kosong (semua false).
    fireEvent.click(headerAll('Admin Wilayah'));
    expect(cell('Forum', 'Admin Wilayah')).toBeChecked();
    expect(cell('Laporan Umum', 'Admin Wilayah')).toBeChecked();
    expect(
      await screen.findByText('1 role memiliki perubahan belum disimpan.'),
    ).toBeInTheDocument();

    fireEvent.click(saveButton('Admin Wilayah'));
    await waitFor(() => expect(putMock).toHaveBeenCalledTimes(1));
    expect(putMock).toHaveBeenCalledWith('/role-menu-permissions/bulk/admin_wilayah', {
      permissions: { forum: true, reports: true },
    });
  });

  it('Simpan Semua mengirim per role lalu mengosongkan seluruh dirty', async () => {
    await renderPage();

    fireEvent.click(cell('Forum', 'Admin Distrik')); // true → false
    fireEvent.click(cell('Laporan Umum', 'Anggota')); // false → true
    expect(
      await screen.findByText('2 role memiliki perubahan belum disimpan.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Simpan Semua' }));

    await waitFor(() => expect(putMock).toHaveBeenCalledTimes(2));
    expect(putMock).toHaveBeenCalledWith('/role-menu-permissions/bulk/admin_distrik', {
      permissions: { forum: false },
    });
    expect(putMock).toHaveBeenCalledWith('/role-menu-permissions/bulk/anggota', {
      permissions: { reports: true },
    });
    await waitFor(() =>
      expect(screen.queryByText(/perubahan belum disimpan/)).not.toBeInTheDocument(),
    );
  });

  it('gagal simpan: dirty dipertahankan dan tidak refetch', async () => {
    putMock.mockRejectedValue(new Error('boom'));
    await renderPage();

    fireEvent.click(cell('Forum', 'Admin Distrik'));
    expect(await screen.findByText(/perubahan belum disimpan/)).toBeInTheDocument();

    fireEvent.click(saveButton('Admin Distrik'));
    await waitFor(() => expect(putMock).toHaveBeenCalledTimes(1));

    // Tanpa refetch (yang dulu me-reset edit), dirty tetap ada.
    expect(getMock).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText('1 role memiliki perubahan belum disimpan.'),
    ).toBeInTheDocument();
    expect(cell('Forum', 'Admin Distrik')).not.toBeChecked();
  });
});
