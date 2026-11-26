import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/lib/api-client', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { data: [] } }) },
  unwrap: <T,>(r: { data: { data: T } }): T => {
    const { data } = r;
    return data.data;
  },
}));

const mockTypedGet = vi.fn();
const mockTypedPatch = vi.fn();
vi.mock('@/lib/api-typed', () => ({
  typedApi: {
    get: (...args: unknown[]) => mockTypedGet(...args),
    patch: (...args: unknown[]) => mockTypedPatch(...args),
  },
}));

import EditMemberModal from '../EditMemberModal';
import apiClient from '@/lib/api-client';

const memberDetail = {
  id: 'a1',
  nomorAnggota: 'NRA-1',
  namaLengkap: 'Budi Santoso',
  jenisKelamin: 'L',
  tempatLahir: 'Jakarta',
  tanggalLahir: '2000-01-15',
  tempatDadar: 'Dadar',
  tahunDadar: '2015',
  alamat: 'Jl. Test',
  noHp: '081234567890',
  email: 'budi@ths-thm.org',
  tingkat: 'Pemuda',
  rantingId: 'r1',
  pekerjaan: 'Wiraswasta',
  pelantikan: '10 JANUARI 2018',
};

describe('EditMemberModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [] } } as never);
    mockTypedGet.mockImplementation(async (path: string) => ({
      data: { data: path === '/members/{id}' ? memberDetail : [] },
      status: 200,
    }));
    mockTypedPatch.mockResolvedValue({ data: { data: {} }, status: 200 });
  });

  it('mengirim pekerjaan dan pelantikan yang diubah ke PATCH /members/{id}', async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    render(<EditMemberModal open memberId="a1" onClose={onClose} onSuccess={onSuccess} />);

    fireEvent.change(await screen.findByDisplayValue('Wiraswasta'), {
      target: { value: 'Guru' },
    });
    fireEvent.change(screen.getByDisplayValue('10 JANUARI 2018'), {
      target: { value: '12 JULI 2020' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Simpan Perubahan/i }));

    await waitFor(() =>
      expect(mockTypedPatch).toHaveBeenCalledWith(
        '/members/{id}',
        expect.objectContaining({ pekerjaan: 'Guru', pelantikan: '12 JULI 2020' }),
        { path: { id: 'a1' } },
      ),
    );
  });
});
