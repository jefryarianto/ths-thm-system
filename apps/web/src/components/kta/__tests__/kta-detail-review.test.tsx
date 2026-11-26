import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { KtaReviewApplication } from '@/components/kta/types';
import KtaDetailPage from '@/app/(dashboard)/kta/[id]/page';

const state = vi.hoisted(() => ({
  getMock: vi.fn(),
  backMock: vi.fn(),
  panelProps: null as Record<string, unknown> | null,
}));

vi.mock('@/lib/api-client', () => ({ default: { get: state.getMock } }));

vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/navigation')>();
  return {
    ...actual,
    useParams: () => ({ id: 'app-1' }),
    useRouter: () => ({ back: state.backMock }),
  };
});

vi.mock('@/components/kta/KtaReviewPanel', () => ({
  default: (props: Record<string, unknown>) => {
    state.panelProps = props;
    const application = props.application as KtaReviewApplication;
    return (
      <div data-testid="review-panel">
        {application.id} {application.submittedSnapshot?.anggota.namaLengkap}
      </div>
    );
  },
}));

const detail: KtaReviewApplication = {
  id: 'app-1',
  status: 'PAYMENT_PENDING',
  biaya: '50000.00',
  rekeningTujuan: 'BRI 12345',
  statusPembayaran: 'MENUNGGU_VERIFIKASI',
  catatanAdmin: null,
  createdAt: '2026-11-20T10:30:00.000Z',
  buktiBayarPath: '/api/uploads/kta-proofs/kta-proof-1.png',
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
      ranting: { id: 'r1', nama: 'Ranting Lama' },
      wilayah: { id: 'w1', nama: 'Wilayah Lama' },
      distrik: { id: 'd1', nama: 'Distrik Lama' },
      alamatDistrik: null,
    },
    missingFields: [],
  },
  anggota: {
    namaLengkap: 'Nama Terbaru',
    nomorAnggota: 'NRA-BARU',
    ranting: { nama: 'Ranting Terbaru' },
  },
  histories: [],
};

describe('halaman detail KTA', () => {
  beforeEach(() => {
    state.getMock.mockReset();
    state.backMock.mockReset();
    state.panelProps = null;
    state.getMock.mockResolvedValue({ data: { success: true, data: detail } });
  });

  it('merender panel tinjau dari respons detail secara read-only', async () => {
    render(<KtaDetailPage />);

    expect(await screen.findByTestId('review-panel')).toHaveTextContent('Nama Saat Submit');
    expect(state.getMock).toHaveBeenCalledWith('/kta-applications/app-1');
    expect(state.panelProps?.application).toEqual(detail);
    expect(state.panelProps?.onVerify).toBeUndefined();
    expect(state.panelProps?.onCatatanChange).toBeUndefined();
  });

  it('mempertahankan tombol kembali dan tidak menggandakan riwayat lama', async () => {
    render(<KtaDetailPage />);

    const backButton = await screen.findByRole('button', { name: 'Kembali' });
    backButton.click();
    expect(state.backMock).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('Riwayat Proses')).not.toBeInTheDocument());
  });
});
