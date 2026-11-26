import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { KtaReviewApplication } from '@/components/kta/types';
import KtaReviewPanel from '@/components/kta/KtaReviewPanel';
import { formatDateTime } from '@/lib/format';

vi.mock('@/components/kta/KtaProofPreview', () => ({
  default: ({
    applicationId,
    buktiBayarPath,
  }: {
    applicationId: string;
    buktiBayarPath?: string | null;
  }) => (
    <div data-testid="proof-preview">
      {applicationId} {buktiBayarPath ?? 'tanpa-bukti'}
    </div>
  ),
}));

const snapshot = {
  version: 1 as const,
  submittedAt: '2026-11-20T10:30:00.000Z',
  submittedBy: { id: 'user-1', role: 'anggota' },
  payload: { namaLengkap: 'Data Formulir' },
  anggota: {
    id: 'm1',
    nomorAnggota: 'NRA-LAMA',
    namaLengkap: 'Nama Saat Submit',
    jenisKelamin: 'L',
    tempatLahir: 'Malang',
    tanggalLahir: '1990-01-01T00:00:00.000Z',
    alamat: 'Jl. Lama No. 1',
    noHp: '081234567890',
    email: 'lama@example.com',
    fotoPath: null,
    statusKeanggotaan: 'Aktif',
    tingkat: 'Pratama',
    tempatDadar: 'Malang',
    tahunDadar: '2015',
    pekerjaan: 'Wiraswasta',
    pelantikan: '12 JULI 2020',
    ranting: { id: 'r1', nama: 'Ranting Lama' },
    wilayah: { id: 'w1', nama: 'Wilayah Lama' },
    distrik: { id: 'd1', nama: 'Distrik Lama' },
    alamatDistrik: 'Jl. Distrik Lama',
  },
  missingFields: ['foto'],
};

const histories = [
  {
    id: 'h1',
    level: 'RANTING',
    action: 'APPROVED',
    actorRole: 'admin_ranting',
    catatan: 'Data ranting sesuai',
    isSkipped: false,
    skippedReason: null,
    createdAt: '2026-11-21T01:00:00.000Z',
  },
  {
    id: 'h2',
    level: 'DISTRIK',
    action: 'PAYMENT_VERIFIED',
    actorRole: 'admin_distrik',
    catatan: 'Bukti pembayaran cocok',
    isSkipped: false,
    skippedReason: null,
    createdAt: '2026-11-22T02:00:00.000Z',
  },
];

function makeApplication(overrides: Partial<KtaReviewApplication> = {}): KtaReviewApplication {
  return {
    id: 'app-1',
    nomorAnggota: 'NRA-LAMA',
    status: 'PAYMENT_PENDING',
    biaya: '50000.00',
    rekeningTujuan: 'BRI 12345',
    statusPembayaran: 'MENUNGGU_VERIFIKASI',
    catatanAdmin: null,
    createdAt: '2026-11-20T10:30:00.000Z',
    updatedAt: '2026-11-22T02:00:00.000Z',
    buktiBayarPath: '/api/uploads/kta-proofs/kta-proof-1.png',
    submittedSnapshot: snapshot,
    anggota: {
      namaLengkap: 'Nama Terbaru',
      nomorAnggota: 'NRA-BARU',
      ranting: {
        nama: 'Ranting Terbaru',
        wilayah: { nama: 'Wilayah Terbaru', distrik: { nama: 'Distrik Terbaru' } },
      },
    },
    histories,
    ...overrides,
  };
}

function renderPanel(overrides: Partial<KtaReviewApplication> = {}) {
  const props = {
    application: makeApplication(overrides),
    canVerify: true,
    catatan: '',
    onCatatanChange: vi.fn(),
    onVerify: vi.fn(),
    verifying: false,
  };
  return { ...props, ...render(<KtaReviewPanel {...props} />) };
}

describe('KtaReviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merender data snapshot saat pengajuan', () => {
    renderPanel();

    expect(screen.getByText('Nama Saat Submit')).toBeInTheDocument();
    expect(screen.getAllByText('NRA-LAMA').length).toBeGreaterThan(0);
    expect(screen.getByText('Ranting Lama')).toBeInTheDocument();
    expect(screen.getByText('Wilayah Lama')).toBeInTheDocument();
    expect(screen.getByText('Distrik Lama')).toBeInTheDocument();
    expect(screen.getByText('Pratama')).toBeInTheDocument();
    expect(screen.getByText('Wiraswasta')).toBeInTheDocument();
    expect(screen.getByText('12 JULI 2020')).toBeInTheDocument();
    expect(screen.getByText('anggota')).toBeInTheDocument();
    expect(screen.getByText(formatDateTime(snapshot.submittedAt))).toBeInTheDocument();
  });

  it('menampilkan Snapshot tidak tersedia dan data anggota terkini untuk aplikasi lama', () => {
    renderPanel({ submittedSnapshot: null });

    expect(screen.getByText('Snapshot tidak tersedia')).toBeInTheDocument();
    expect(screen.getByText('Nama Terbaru')).toBeInTheDocument();
    expect(screen.getByText('NRA-BARU')).toBeInTheDocument();
    expect(screen.getByText('Ranting Terbaru')).toBeInTheDocument();
    expect(screen.queryByText('Nama Saat Submit')).not.toBeInTheDocument();
  });

  it('mengelompokkan riwayat datar per level beserta catatan dan peran', () => {
    renderPanel();

    expect(screen.getByRole('heading', { name: 'Ranting' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Distrik' })).toBeInTheDocument();
    expect(screen.getByText('Data ranting sesuai')).toBeInTheDocument();
    expect(screen.getByText('Bukti pembayaran cocok')).toBeInTheDocument();
    expect(screen.getByText('oleh admin_ranting')).toBeInTheDocument();
    expect(screen.getByText('oleh admin_distrik')).toBeInTheDocument();
    expect(screen.getByText('Disetujui')).toBeInTheDocument();
    expect(screen.getByText('Pembayaran Diverifikasi')).toBeInTheDocument();
  });

  it('memformat biaya Decimal berupa string memakai formatRupiah', () => {
    renderPanel();

    expect(screen.getAllByText('Rp 50.000').length).toBeGreaterThan(0);
  });

  it('mengirim catatan terkini ke onVerify', () => {
    const { onVerify, onCatatanChange, rerender } = renderPanel();

    const textarea = screen.getByLabelText('Catatan verifikasi');
    fireEvent.change(textarea, { target: { value: 'Bukti sesuai' } });
    expect(onCatatanChange).toHaveBeenCalledWith('Bukti sesuai');

    rerender(
      <KtaReviewPanel
        application={makeApplication()}
        canVerify
        catatan="Bukti sesuai"
        onCatatanChange={onCatatanChange}
        onVerify={onVerify}
        verifying={false}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Verifikasi Pembayaran/i }));

    expect(onVerify).toHaveBeenCalledWith('Bukti sesuai');
  });

  it('menonaktifkan tombol verifikasi ketika canVerify false', () => {
    render(
      <KtaReviewPanel
        application={makeApplication()}
        canVerify={false}
        catatan=""
        onCatatanChange={vi.fn()}
        onVerify={vi.fn()}
        verifying={false}
      />,
    );

    expect(screen.getByRole('button', { name: /Verifikasi Pembayaran/i })).toBeDisabled();
  });
});
