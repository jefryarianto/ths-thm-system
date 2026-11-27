import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KtaCard } from '@/components/kta/KtaCard';
import { H, W, pt } from '@/components/kta/layout';
import type { Anggota } from '@/components/kta/types';
import { BACK } from '@/lib/card-design';

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

  it('renders the dynamic signer title and stamp when both are present', () => {
    const { container } = render(
      <KtaCard
        side="belakang"
        anggota={{
          ...anggota,
          koordinator: 'Yoseph',
          koordinatorJabatan: 'SEKRETARIS DISTRIK',
          tandaTanganUrl: '/api/uploads/signature.png',
          stempelUrl: '/api/uploads/stamp.png',
        }}
      />,
    );

    expect(container.textContent).toContain('SEKRETARIS DISTRIK');
    expect(container.querySelector('image[href="/api/uploads/stamp.png"]')).not.toBeNull();
  });

  it('falls back to the default title and hides a missing stamp', () => {
    const { container } = render(
      <KtaCard side="belakang" anggota={{ ...anggota, koordinator: 'Yoseph' }} />,
    );

    expect(container.textContent).toContain('KOORDINATOR DISTRIK');
    expect(container.querySelector('image[href="/api/uploads/stamp.png"]')).toBeNull();
  });

  it('uses the shared styled QR markup for a local verification QR', () => {
    const { container } = render(
      <KtaCard side="depan" anggota={{ ...anggota, verifyUrl: 'https://example.com/verify/1' }} />,
    );

    expect(container.querySelectorAll('.qr-eye')).toHaveLength(3);
    expect(container.querySelector('.qr-logo-image')).not.toBeNull();
  });

  it('keeps qrImageUrl ahead of verifyUrl', () => {
    const { container } = render(
      <KtaCard
        side="depan"
        anggota={{
          ...anggota,
          qrImageUrl: 'data:image/png;base64,QR',
          verifyUrl: 'https://example.com/verify/1',
        }}
      />,
    );

    expect(container.querySelector('image[href="data:image/png;base64,QR"]')).not.toBeNull();
    expect(container.querySelectorAll('.qr-eye')).toHaveLength(0);
  });

  it('uses label typography for the issue date and signer text', () => {
    const { container } = render(
      <KtaCard
        side="belakang"
        anggota={{
          ...anggota,
          koordinator: 'Yoseph',
          koordinatorJabatan: 'SEKRETARIS DISTRIK',
        }}
      />,
    );
    const byText = (text: string) =>
      Array.from(container.querySelectorAll('text')).find((node) => node.textContent === text);

    expect(byText('TANGGAL TERBIT : ...............')?.getAttribute('font-size')).toBe(String(pt(4)));
    expect(byText('SEKRETARIS DISTRIK')?.getAttribute('font-size')).toBe(String(pt(4)));
    expect(byText('YOSEPH')?.getAttribute('font-size')).toBe(String(pt(4)));
  });

  it('left-aligns the signer title and name inside the shared block', () => {
    const { container } = render(
      <KtaCard
        side="belakang"
        anggota={{
          ...anggota,
          koordinator: 'Yoseph',
          koordinatorJabatan: 'SEKRETARIS DISTRIK',
        }}
      />,
    );
    const byText = (text: string) =>
      Array.from(container.querySelectorAll('text')).find((node) => node.textContent === text);
    const signerLeft = W - BACK.signer.right - BACK.signer.w;
    const signerNameX = signerLeft + BACK.signer.name.left;
    const title = byText('SEKRETARIS DISTRIK');
    const name = byText('YOSEPH');

    expect(title?.getAttribute('x')).toBe(String(signerLeft + BACK.signer.title.left));
    expect(name?.getAttribute('x')).toBe(String(signerNameX));
    expect(title?.getAttribute('text-anchor')).not.toBe('end');
    expect(name?.getAttribute('text-anchor')).not.toBe('end');
    expect(name?.getAttribute('y')).toBe(String(H - BACK.signer.bottom - BACK.signer.name.bottom));
    expect(container.querySelector('line[stroke-width="1.6"]')?.getAttribute('x1')).toBe(
      String(signerNameX),
    );
    expect(container.querySelector('line[stroke-width="1.6"]')?.getAttribute('x2')).toBe(
      String(signerNameX + BACK.signer.w),
    );
  });
});
