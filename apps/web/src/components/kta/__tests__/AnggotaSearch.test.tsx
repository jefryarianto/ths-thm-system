import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AnggotaSearch } from '@/components/kta/AnggotaSearch';
import * as apiModule from '@/lib/kta/api';
import type { Anggota } from '@/components/kta/types';

vi.mock('@/lib/kta/api', () => ({
  searchAnggota: vi.fn(),
}));

describe('AnggotaSearch', () => {
  const mockResults: Anggota[] = [
    {
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
    },
    {
      nama: 'Siti Aminah',
      nomor: '0987654321',
      ranting: 'Ranting Klojen',
      tempatDadar: 'Malang',
      tahunDadar: '2018',
      tingkatan: 'tamtama',
      tempatTanggalLahir: 'Malang, 02-02-1995',
      pekerjaan: 'Pegawai',
      status: 'Aktif',
      alamat: 'Jl. Mawar No. 5',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input with placeholder', () => {
    render(<AnggotaSearch />);
    expect(screen.getByPlaceholderText('Cari nama atau nomor anggota...')).toBeInTheDocument();
  });

  it('clears results and does not search when query length is less than 2', async () => {
    render(<AnggotaSearch />);
    const input = screen.getByPlaceholderText('Cari nama atau nomor anggota...');

    fireEvent.change(input, { target: { value: 'a' } });

    expect(apiModule.searchAnggota).not.toHaveBeenCalled();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('searches and shows results with preview links when typing 2 or more characters', async () => {
    vi.mocked(apiModule.searchAnggota).mockResolvedValue(mockResults);

    render(<AnggotaSearch />);
    const input = screen.getByPlaceholderText('Cari nama atau nomor anggota...');

    fireEvent.change(input, { target: { value: 'Budi' } });

    await waitFor(() => {
      expect(apiModule.searchAnggota).toHaveBeenCalledWith('Budi');
    });

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
      expect(screen.getByText('Siti Aminah')).toBeInTheDocument();
    });

    const budiLink = screen.getByRole('link', { name: /Budi Santoso/i });
    expect(budiLink).toHaveAttribute('href', '/admin/kta/1234567890');

    const sitiLink = screen.getByRole('link', { name: /Siti Aminah/i });
    expect(sitiLink).toHaveAttribute('href', '/admin/kta/0987654321');
  });

  it('handles search API failure gracefully by setting empty results', async () => {
    vi.mocked(apiModule.searchAnggota).mockRejectedValue(new Error('Pencarian gagal'));

    render(<AnggotaSearch />);
    const input = screen.getByPlaceholderText('Cari nama atau nomor anggota...');

    fireEvent.change(input, { target: { value: 'ErrorTest' } });

    await waitFor(() => {
      expect(apiModule.searchAnggota).toHaveBeenCalledWith('ErrorTest');
    });

    await waitFor(() => {
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });
  });

  it('clears results when query is emptied after having results', async () => {
    vi.mocked(apiModule.searchAnggota).mockResolvedValue(mockResults);

    render(<AnggotaSearch />);
    const input = screen.getByPlaceholderText('Cari nama atau nomor anggota...');

    fireEvent.change(input, { target: { value: 'Budi' } });

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    });

    fireEvent.change(input, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });
  });
});
