import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Page, { metadata } from '@/app/admin/kta/[id]/page';
import * as apiModule from '@/lib/kta/api';
import * as navigationModule from 'next/navigation';
import type { Anggota } from '@/components/kta/types';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@/lib/kta/api', () => ({
  fetchAnggota: vi.fn(),
}));

describe('Admin KTA [id] Page', () => {
  const mockAnggota: Anggota = {
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
    berlakuSampai: '2031-10',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has correct metadata title', () => {
    expect(metadata.title).toBe('KTA Admin Preview');
  });

  it('fetches anggota by id and renders KtaAdminPreview', async () => {
    vi.mocked(apiModule.fetchAnggota).mockResolvedValue(mockAnggota);

    const jsx = await Page({ params: Promise.resolve({ id: '123' }) });
    render(jsx);

    expect(apiModule.fetchAnggota).toHaveBeenCalledWith('123');
    expect(screen.getByText('Depan')).toBeInTheDocument();
    expect(screen.getByText('Belakang')).toBeInTheDocument();
  });

  it('calls notFound when fetchAnggota fails', async () => {
    vi.mocked(apiModule.fetchAnggota).mockRejectedValue(new Error('Anggota tidak ditemukan'));

    await expect(Page({ params: Promise.resolve({ id: '999' }) })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(navigationModule.notFound).toHaveBeenCalled();
  });

  it('calls notFound when fetchAnggota returns null', async () => {
    vi.mocked(apiModule.fetchAnggota).mockResolvedValue(null as unknown as Anggota);

    await expect(Page({ params: Promise.resolve({ id: '999' }) })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(navigationModule.notFound).toHaveBeenCalled();
  });
});
