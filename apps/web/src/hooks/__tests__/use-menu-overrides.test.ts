import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMenuOverrides } from '../use-menu-overrides';

/**
 * Kontrak hook sidebar:
 * - fetch hanya saat enabled + role non-superadmin;
 * - superadmin / disabled → null (tanpa fetch);
 * - gagal fetch → null (fail-open, gerbang kode tetap berlaku).
 */

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock('@/lib/api-client', () => ({
  default: {
    get: (...args: unknown[]) => getMock(...args),
  },
  // Bentuk asli: TransformInterceptor membungkus body jadi { success, data }.
  // eslint-disable-next-line no-restricted-syntax
  unwrap: (r: { data: { data: unknown } }) => r.data.data,
}));

describe('useMenuOverrides', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMock.mockResolvedValue({
      data: { success: true, data: { permissions: { forum: false, reports: true } } },
    });
  });

  it('mengambil izin menu role sendiri saat enabled', async () => {
    const { result } = renderHook(() => useMenuOverrides('admin_ranting', true));

    expect(result.current).toBeNull(); // belum termuat
    await waitFor(() =>
      expect(result.current).toEqual({ forum: false, reports: true }),
    );
    expect(getMock).toHaveBeenCalledWith('/role-menu-permissions/my-menus');
  });

  it('superadmin: null tanpa fetch (diatur via kode)', () => {
    const { result } = renderHook(() => useMenuOverrides('superadmin', true));
    expect(result.current).toBeNull();
    expect(getMock).not.toHaveBeenCalled();
  });

  it('belum enabled (belum mount/login): null tanpa fetch', () => {
    const { result } = renderHook(() => useMenuOverrides('admin_ranting', false));
    expect(result.current).toBeNull();
    expect(getMock).not.toHaveBeenCalled();
  });

  it('tanpa role: null tanpa fetch', () => {
    const { result } = renderHook(() => useMenuOverrides(null, true));
    expect(result.current).toBeNull();
    expect(getMock).not.toHaveBeenCalled();
  });

  it('gagal fetch → null (fail-open: gerbang kode tetap berlaku)', async () => {
    getMock.mockRejectedValue(new Error('jaringan mati'));
    const { result } = renderHook(() => useMenuOverrides('admin_ranting', true));

    // Tetap null setelah error — tanpa crash dan tanpa fail-closed.
    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(1));
    expect(result.current).toBeNull();
  });

  it('respons tanpa permissions → record kosong (semua menu ikut gerbang kode)', async () => {
    getMock.mockResolvedValue({ data: { success: true, data: {} } });
    const { result } = renderHook(() => useMenuOverrides('penguji', true));
    await waitFor(() => expect(result.current).toEqual({}));
  });
});
