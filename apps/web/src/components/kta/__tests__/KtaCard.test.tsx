import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KtaCard } from '@/components/kta/KtaCard';
import type { Anggota } from '@/components/kta/types';

const anggota: Anggota = {
  nama: 'Budi Santoso',
  nomor: '1234567890',
  ranting: 'Ranting Sukun',
  distrik: 'Keuskupan Ende',
  tempatDadar: 'Malang',
  tahunDadar: '2015',
  tingkatan: 'pratama',
  tempatTanggalLahir: 'Malang, 01 Januari 1990',
  pekerjaan: 'Wiraswasta',
  status: 'AKTIF',
  alamat: 'Jl. Melati No. 12',
};

describe('KtaCard', () => {
  it('renders the member district on the front header', () => {
    const { container } = render(<KtaCard side="depan" anggota={anggota} />);
    expect(container.textContent).toContain('DISTRIK KEUSKUPAN ENDE');
  });

  it('falls back to THS-THM when district is missing', () => {
    const { container } = render(
      <KtaCard side="depan" anggota={{ ...anggota, distrik: undefined }} />,
    );
    expect(container.textContent).toContain('DISTRIK KEUSKUPAN THS-THM');
  });

  it('renders the back microtext in uppercase', () => {
    const { container } = render(<KtaCard side="belakang" anggota={anggota} />);
    expect(container.querySelector('[aria-label="FORTITER IN RE, SUAVITER IN MODO"]')).not.toBeNull();
    expect(container.textContent).toContain('FORTITER IN RE, SUAVITER IN MODO •');
    expect(container.textContent).not.toContain('Fortiter in Re');
  });
});
