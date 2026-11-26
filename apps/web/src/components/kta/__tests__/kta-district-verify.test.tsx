import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { KtaReviewApplication } from '@/components/kta/types';
import KtaDistrikProcessPage from '@/app/(dashboard)/kta/distrik-process/page';

const state = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  default: { get: state.getMock, post: state.postMock },
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => state.toastMock }));

vi.mock('@/components/kta/KtaProofPreview', () => ({
  default: ({ applicationId, buktiBayarPath }: { applicationId: string; buktiBayarPath?: string | null }) => (
    <div data-testid="proof-preview">
      {applicationId} {buktiBayarPath ?? 'tanpa-bukti'}
    </div>
  ),
}));

function makeApplication(buktiBayarPath: string | null = '/api/uploads/kta-proofs/kta-proof-1.png'): KtaReviewApplication {
  return {
    id: 'app-1',
    status: 'PAYMENT_PENDING',
    biaya: '50000.00',
    rekeningTujuan: 'BRI 12345',
    statusPembayaran: 'MENUNGGU_VERIFIKASI',
    catatanAdmin: null,
    createdAt: '2026-11-20T10:30:00.000Z',
    buktiBayarPath,
    submittedSnapshot: {
      version: 1,
      submittedAt: '2026-11-20T10:30:00.000Z',
      submittedBy: { id: 'user-1', role: 'anggota' },
      payload: null,
      anggota: {
        id: 'm1',
        nomorAnggota: 'NRA-LAMA',
        namaLengkap: 'Nama Saat Submit',
        jenisKelamin: null,
        tempatLahir: null,
        tanggalLahir: null,
        alamat: null,
        noHp: null,
        email: null,
        fotoPath: null,
        statusKeanggotaan: null,
        tingkat: null,
        tempatDadar: null,
        tahunDadar: null,
        pekerjaan: null,
        pelantikan: null,
        ranting: { id: 'r1', nama: 'Ranting Lama' },
        wilayah: null,
        distrik: null,
        alamatDistrik: null,
      },
      missingFields: [],
    },
    anggota: {
      id: 'm1',
      namaLengkap: 'Nama Terbaru',
      nomorAnggota: 'NRA-BARU',
      ranting: { id: 'r1', nama: 'Ranting Terbaru' },
    },
    histories: [
      {
        id: 'h1',
        level: 'RANTING',
        action: 'APPROVED',
        actorRole: 'admin_ranting',
        catatan: 'Data sesuai',
        isSkipped: false,
        skippedReason: null,
        createdAt: '2026-11-21T01:00:00.000Z',
      },
    ],
  };
}

async function renderQueue(applications: KtaReviewApplication[] = [makeApplication()]) {
  state.getMock.mockImplementation((url: string) => {
    if (url.includes('distrik-queue')) {
      return Promise.resolve({ data: { success: true, data: applications } });
    }
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
  render(<KtaDistrikProcessPage />);
  const triggers = await screen.findAllByRole('button', { name: 'Tinjau & Verifikasi' });
  return triggers[0];
}

describe('verifikasi pembayaran di halaman distrik', () => {
  beforeEach(() => {
    state.getMock.mockReset();
    state.postMock.mockReset();
    state.toastMock.mockReset();
    state.postMock.mockResolvedValue({ data: { success: true, data: {} } });
  });

  it('mengganti ikon verifikasi langsung dengan pemicu modal', async () => {
    const trigger = await renderQueue();

    expect(trigger).toBeInTheDocument();
    expect(screen.queryByTitle('Verifikasi Pembayaran')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Verifikasi Pembayaran' })).not.toBeInTheDocument();
  });

  it('menampilkan bukti, panel tinjau, dan textarea di dalam modal', async () => {
    const trigger = await renderQueue();
    fireEvent.click(trigger);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('proof-preview')).toHaveTextContent('/api/uploads/kta-proofs/kta-proof-1.png');
    expect(screen.getByText('Nama Saat Submit')).toBeInTheDocument();
    expect(screen.getByLabelText('Catatan verifikasi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Batal' })).toBeInTheDocument();
  });

  it('mengirim catatan ke endpoint verify-payment lalu menutup modal dan menyegarkan antrian', async () => {
    const trigger = await renderQueue();
    fireEvent.click(trigger);
    fireEvent.change(await screen.findByLabelText('Catatan verifikasi'), { target: { value: 'Bukti cocok' } });
    fireEvent.click(screen.getByRole('button', { name: /Verifikasi Pembayaran/i }));

    await waitFor(() => {
      expect(state.postMock).toHaveBeenCalledWith('/kta-applications/app-1/verify-payment', {
        buktiPath: '',
        catatan: 'Bukti cocok',
      });
    });
    expect(state.toastMock).toHaveBeenCalledWith('success', 'Pembayaran diverifikasi');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(state.getMock.mock.calls.filter(([url]) => url.includes('distrik-queue'))).toHaveLength(2);
  });

  it('menjaga modal aplikasi lain tetap terbuka saat verifikasi aplikasi sebelumnya selesai', async () => {
    let resolvePost: (value: unknown) => void = () => {};
    state.postMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        }),
    );

    const second = makeApplication('/api/uploads/kta-proofs/kta-proof-2.png');
    second.id = 'app-2';
    await renderQueue([makeApplication(), second]);

    const triggers = screen.getAllByRole('button', { name: 'Tinjau & Verifikasi' });
    fireEvent.click(triggers[0]);
    fireEvent.change(await screen.findByLabelText('Catatan verifikasi'), { target: { value: 'Bukti cocok' } });
    fireEvent.click(screen.getByRole('button', { name: /Verifikasi Pembayaran/i }));

    await waitFor(() => {
      expect(state.postMock).toHaveBeenCalledWith('/kta-applications/app-1/verify-payment', {
        buktiPath: '',
        catatan: 'Bukti cocok',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Tinjau & Verifikasi' })[1]);

    const confirm = await screen.findByRole('button', { name: /Verifikasi Pembayaran|Memverifikasi/i });
    expect(confirm).toBeEnabled();
    expect(screen.getByLabelText('Catatan verifikasi')).toHaveValue('');

    await act(async () => {
      resolvePost({ data: { success: true, data: {} } });
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('proof-preview')).toHaveTextContent('/api/uploads/kta-proofs/kta-proof-2.png');
    expect(state.postMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    null,
    '/api/uploads/other/bukti.png',
    '/api/uploads/kta-proofs/evil.png',
    '/api/uploads/kta-proofs/kta-proof-1.exe',
    '/api/uploads/kta-proofs/nested/kta-proof-1.png',
  ])('menonaktifkan konfirmasi untuk bukti tidak valid: %s', async (buktiBayarPath) => {
    const trigger = await renderQueue([makeApplication(buktiBayarPath)]);
    fireEvent.click(trigger);

    const confirm = await screen.findByRole('button', { name: /Verifikasi Pembayaran/i });
    expect(confirm).toBeDisabled();
    expect(state.postMock).not.toHaveBeenCalled();
  });
});
