import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import KtaBulkPage from '@/app/(dashboard)/kta/bulk/page';

const { getMock, postMock, pushMock, toastMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  pushMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return {
    ...actual,
    default: { get: getMock, post: postMock },
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

vi.mock('@/components/auth/permission-guard', () => ({
  PermissionGuard: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => toastMock,
}));

vi.mock('@/components/ui/breadcrumbs', () => ({
  default: () => null,
}));

vi.mock('@/lib/hooks/use-debounce', () => ({
  useDebounce: (value: unknown) => value,
}));

const member = {
  id: 'm1',
  namaLengkap: 'Budi Santoso',
  nomorAnggota: 'NRA-1',
};

async function selectBudi() {
  render(<KtaBulkPage />);
  getMock.mockResolvedValue({ data: { success: true, message: 'OK', data: [member] } });
  fireEvent.change(screen.getByLabelText('Cari Anggota'), { target: { value: 'budi' } });
  await screen.findByText('Budi Santoso');
  fireEvent.click(screen.getByRole('checkbox'));
}

describe('halaman bulk KTA', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    pushMock.mockReset();
    toastMock.mockReset();
  });

  it('memakai totalSubmitted dari payload yang dibungkus dan menampilkan ineligible', async () => {
    await selectBudi();
    postMock.mockResolvedValue({
      data: {
        success: true,
        message: 'OK',
        data: {
          batchId: 'b1',
          totalSubmitted: 7,
          ineligible: [{ anggotaId: 'm2', errors: ['Data tidak lengkap'] }],
        },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /Ajukan 1 KTA/ }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('success', expect.stringContaining('7 KTA berhasil diajukan'));
    });
    expect(toastMock).toHaveBeenCalledWith(
      'warning',
      expect.stringContaining('1 anggota tidak memenuhi syarat'),
    );
    expect(pushMock).toHaveBeenCalledWith('/kta/batches/b1');
  });

  it('menampilkan pesan error ternormalisasi dari apiClient', async () => {
    await selectBudi();
    postMock.mockRejectedValue({
      status: 403,
      message: 'Akses ditolak: diluar cakupan wilayah Anda',
      data: null,
    });

    fireEvent.click(screen.getByRole('button', { name: /Ajukan 1 KTA/ }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        'error',
        'Akses ditolak: diluar cakupan wilayah Anda',
      );
    });
  });

  it('menampilkan pesan saat pencarian anggota gagal', async () => {
    getMock.mockRejectedValue({ status: 500, message: 'Gagal memuat anggota', data: null });
    render(<KtaBulkPage />);

    fireEvent.change(screen.getByLabelText('Cari Anggota'), { target: { value: 'budi' } });

    expect(await screen.findByText(/Gagal mencari anggota/)).toBeInTheDocument();
  });

  it('mempertahankan detail anggota terpilih setelah hasil pencarian berubah', async () => {
    await selectBudi();
    getMock.mockResolvedValue({
      data: {
        success: true,
        message: 'OK',
        data: [{ id: 'm2', namaLengkap: 'Sari', nomorAnggota: 'NRA-2' }],
      },
    });

    fireEvent.change(screen.getByLabelText('Cari Anggota'), { target: { value: 'sari' } });
    await screen.findByText('Sari');

    expect(screen.getByText(/Budi Santoso/)).toBeInTheDocument();
    expect(screen.queryByText(/m1/)).not.toBeInTheDocument();
  });
});
