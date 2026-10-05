import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MODULE_PERMISSIONS, Can } from '../can';
import type { Role } from '@/types';

// jsdom in this config doesn't define localStorage; `useAuth` reads the stored
// user from it after mount, so install a minimal in-memory polyfill first.
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
 * `useAuth` reads the stored user from localStorage after mount, so seeding
 * `localStorage.user` before rendering is enough to drive <Can />.
 */
function setRole(role: Role) {
  localStorage.setItem(
    'user',
    JSON.stringify({ id: 'u1', role, namaLengkap: 'Test User' }),
  );
}

function renderCan(
  module: string,
  action: 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve' | 'admin',
) {
  render(
    <Can module={module} action={action}>
      <span data-testid="protected">visible</span>
    </Can>,
  );
}

async function expectVisible() {
  await waitFor(() => expect(screen.getByTestId('protected')).toBeInTheDocument());
}

async function expectHidden() {
  await waitFor(() =>
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument(),
  );
}

describe('MODULE_PERMISSIONS: settings modules', () => {
  it('memetakan modul settings inti (jabatan/kepengurusan/periode/org-documents)', () => {
    expect(MODULE_PERMISSIONS).toHaveProperty('jabatan');
    expect(MODULE_PERMISSIONS).toHaveProperty('kepengurusan');
    expect(MODULE_PERMISSIONS).toHaveProperty('periode');
    expect(MODULE_PERMISSIONS).toHaveProperty('org-documents');
  });

  it('jabatan: create/edit/delete butuh admin_distrik', () => {
    expect(MODULE_PERMISSIONS.jabatan).toMatchObject({
      view: 'anggota',
      create: 'admin_distrik',
      edit: 'admin_distrik',
      delete: 'admin_distrik',
    });
  });

  it('kepengurusan: approve & export ditambahkan untuk admin_ranting', () => {
    expect(MODULE_PERMISSIONS.kepengurusan).toMatchObject({
      view: 'admin_ranting',
      create: 'admin_ranting',
      edit: 'admin_ranting',
      delete: 'admin_ranting',
      approve: 'admin_ranting',
      export: 'admin_ranting',
    });
  });

  it('periode: semua aksi butuh superadmin', () => {
    expect(MODULE_PERMISSIONS.periode).toMatchObject({
      view: 'superadmin',
      create: 'superadmin',
      edit: 'superadmin',
      delete: 'superadmin',
    });
  });

  it('org-documents: delete butuh admin_distrik, export admin_kegiatan', () => {
    expect(MODULE_PERMISSIONS['org-documents']).toMatchObject({
      view: 'anggota',
      create: 'admin_ranting',
      edit: 'admin_ranting',
      delete: 'admin_distrik',
      export: 'admin_kegiatan',
    });
  });

  it('org-chart: hanya didefinisikan satu kali (tidak duplikat)', () => {
    // Regresi TS1117: dua key 'org-chart' di map menyebabkan salah satunya
    // di-drop secara diam-diam.
    expect(MODULE_PERMISSIONS['org-chart']).toMatchObject({
      view: 'anggota',
      edit: 'admin_ranting',
      admin: 'admin_ranting',
    });
  });
});

describe('<Can /> dengan action approve', () => {
  beforeEach(() => localStorage.clear());

  it('menyembunyikan tombol approve dari admin_kegiatan ke bawah', async () => {
    setRole('admin_kegiatan');
    renderCan('kepengurusan', 'approve');
    await expectHidden();
  });

  it('menampilkan tombol approve untuk admin_ranting ke atas', async () => {
    setRole('admin_ranting');
    renderCan('kepengurusan', 'approve');
    await expectVisible();
  });

  it('menampilkan tombol approve untuk superadmin', async () => {
    setRole('superadmin');
    renderCan('kepengurusan', 'approve');
    await expectVisible();
  });
});

describe('<Can /> untuk settings', () => {
  beforeEach(() => localStorage.clear());

  it('menyembunyikan tombol create periode dari admin_distrik', async () => {
    setRole('admin_distrik');
    renderCan('periode', 'create');
    await expectHidden();
  });

  it('menampilkan tombol create periode untuk superadmin', async () => {
    setRole('superadmin');
    renderCan('periode', 'create');
    await expectVisible();
  });

  it('menyembunyikan tombol delete org-documents dari admin_ranting', async () => {
    setRole('admin_ranting');
    renderCan('org-documents', 'delete');
    await expectHidden();
  });

  it('menampilkan tombol delete org-documents untuk admin_distrik', async () => {
    setRole('admin_distrik');
    renderCan('org-documents', 'delete');
    await expectVisible();
  });
});
