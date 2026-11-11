import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KtaAdminPreview } from '@/components/kta/KtaAdminPreview';
import type { Anggota } from '@/components/kta/types';
import * as exportPngModule from '@/components/kta/exportPng';

vi.mock('@/components/kta/exportPng', () => ({
  downloadCardPng: vi.fn(),
  cardPngDataUrl: vi.fn(),
}));

describe('KtaAdminPreview', () => {
  const completeAnggota: Anggota = {
    nama: 'Budi Santoso',
    nomor: '1234567890',
    ranting: 'Ranting Sukun',
    tempatDadar: 'Malang',
    tahunDadar: '2015',
    tingkatan: 'pratama',
    tempatTanggalLahir: 'Malang, 01-01-1990',
    pekerjaan: 'Wiraswasta',
    status: 'Aktif',
    alamat: 'Jl. Melati No. 12',
    fotoUrl: 'https://example.com/foto.jpg',
    berlakuSampai: '2031-10',
    verifyUrl: 'https://verify.ths-thm.org/1234567890',
  };

  const invalidAnggota: Anggota = {
    nama: 'Budi Santoso',
    nomor: '1234567890',
    ranting: 'Ranting Sukun',
    tempatDadar: 'Malang',
    tahunDadar: '2015',
    tingkatan: 'pratama',
    tempatTanggalLahir: 'Malang, 01-01-1990',
    pekerjaan: 'Wiraswasta',
    status: 'Aktif',
    alamat: 'Jl. Melati No. 12',
    berlakuSampai: 'invalid-date',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders both sides with export and print buttons', () => {
    render(<KtaAdminPreview anggota={completeAnggota} />);

    expect(screen.getByText('Depan')).toBeInTheDocument();
    expect(screen.getByText('Belakang')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /unduh depan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /unduh belakang/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cetak/i })).toBeInTheDocument();
  });

  it('displays warnings and disables export buttons when member data is invalid', async () => {
    render(<KtaAdminPreview anggota={invalidAnggota} />);

    await waitFor(() => {
      const warningsList = screen.getByRole('alert');
      expect(warningsList).toBeInTheDocument();
      expect(screen.getByText('Berlaku sampai harus berupa YYYY-MM.')).toBeInTheDocument();
    });

    const unduhDepanBtn = screen.getByRole('button', { name: /unduh depan/i });
    const unduhBelakangBtn = screen.getByRole('button', { name: /unduh belakang/i });
    expect(unduhDepanBtn).toBeDisabled();
    expect(unduhBelakangBtn).toBeDisabled();
  });

  it('calls downloadCardPng when download buttons are clicked with valid data', async () => {
    const downloadMock = vi.mocked(exportPngModule.downloadCardPng).mockResolvedValue(undefined);

    render(<KtaAdminPreview anggota={completeAnggota} />);

    const unduhDepanBtn = screen.getByRole('button', { name: /unduh depan/i });
    expect(unduhDepanBtn).toBeEnabled();
    fireEvent.click(unduhDepanBtn);

    await waitFor(() => {
      expect(downloadMock).toHaveBeenCalledWith(expect.any(Object), 'depan');
    });

    const unduhBelakangBtn = screen.getByRole('button', { name: /unduh belakang/i });
    expect(unduhBelakangBtn).toBeEnabled();
    fireEvent.click(unduhBelakangBtn);

    await waitFor(() => {
      expect(downloadMock).toHaveBeenCalledWith(expect.any(Object), 'belakang');
    });
  });

  it('displays error alert when export fails', async () => {
    vi.mocked(exportPngModule.downloadCardPng).mockRejectedValue(new Error('Aset tidak dapat diambil (periksa CORS)'));

    render(<KtaAdminPreview anggota={completeAnggota} />);

    const unduhDepanBtn = screen.getByRole('button', { name: /unduh depan/i });
    fireEvent.click(unduhDepanBtn);

    await waitFor(() => {
      expect(screen.getByText(/Aset tidak dapat diambil/i)).toBeInTheDocument();
    });
  });

  it('opens a print window with the generated PNG when print button is clicked', async () => {
    vi.mocked(exportPngModule.cardPngDataUrl).mockResolvedValue('data:image/png;base64,abc123');

    const printSpy = vi.fn();
    const fakeWindow = {
      document: { write: vi.fn(), close: vi.fn(), getElementById: () => null },
      focus: vi.fn(),
      print: printSpy,
    };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(fakeWindow as unknown as Window);

    render(<KtaAdminPreview anggota={completeAnggota} />);

    fireEvent.click(screen.getByRole('button', { name: /cetak/i }));

    await waitFor(() => expect(printSpy).toHaveBeenCalledTimes(1));
    expect(fakeWindow.document.write).toHaveBeenCalledWith(expect.stringContaining('data:image/png;base64,abc123'));
    openSpy.mockRestore();
  });
});
