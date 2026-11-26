import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { getMock, patchMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  patchMock: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  default: {
    get: (...args: unknown[]) => getMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
  },
}));

vi.mock('@/components/auth/permission-guard', () => ({
  PermissionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => vi.fn(),
}));

vi.mock('@/components/ui/member-avatar', () => ({
  MemberAvatar: () => <div data-testid="member-avatar" />,
}));

vi.mock('@/components/ui/breadcrumbs', () => ({
  default: () => <nav />,
}));

import ProfilePage from '../../app/(dashboard)/members/profile/page';

const profile = {
  id: 'a1',
  namaLengkap: 'Budi Santoso',
  nomorAnggota: 'NRA-1',
  email: 'budi@ths-thm.org',
  statusData: 'complete',
  statusKeanggotaan: 'aktif',
  tempatLahir: 'Jakarta',
  tanggalLahir: '2000-01-15',
  tempatDadar: 'Dadar',
  tahunDadar: '2015',
  pekerjaan: 'Wiraswasta',
  pelantikan: '10 JANUARI 2018',
  alamat: 'Jl. Test',
  noHp: '081234567890',
};

describe('ProfilePage dadar fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMock.mockResolvedValue({ data: { success: true, data: profile } });
    patchMock.mockResolvedValue({ data: { success: true, data: {} } });
  });

  it('keeps dadar values read-only while saving pekerjaan and pelantikan to /auth/me', async () => {
    render(<ProfilePage />);

    const tempatDadar = await screen.findByDisplayValue('Dadar');
    const tahunDadar = screen.getByDisplayValue('2015');
    expect(tempatDadar).toBeDisabled();
    expect(tahunDadar).toBeDisabled();

    fireEvent.change(await screen.findByDisplayValue('Wiraswasta'), {
      target: { value: 'Guru' },
    });
    fireEvent.change(screen.getByDisplayValue('10 JANUARI 2018'), {
      target: { value: '12 JULI 2020' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Simpan Perubahan/i }));

    await waitFor(() => expect(patchMock).toHaveBeenCalledTimes(1));
    expect(patchMock.mock.calls[0][0]).toBe('/auth/me');
    const payload = patchMock.mock.calls[0][1] as Record<string, string>;
    expect(payload).toHaveProperty('pekerjaan', 'Guru');
    expect(payload).toHaveProperty('pelantikan', '12 JULI 2020');
    expect(payload).not.toHaveProperty('tempatDadar');
    expect(payload).not.toHaveProperty('tahunDadar');
  });
});
