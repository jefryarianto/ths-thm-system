import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DuesStatCards, { formatRupiah } from '../DuesStatCards';

const mockStats = {
  totalIuran: 15000000,
  totalTransaksi: 120,
  totalLunas: 80,
  totalMenunggak: 15,
  iuranBulanIni: 2500000,
  lunasBulanIni: 45,
  anggotaAktif: 60,
};

describe('formatRupiah', () => {
  it('formats millions', () => {
    expect(formatRupiah(15_000_000)).toBe('Rp 15.0jt');
  });

  it('formats thousands', () => {
    expect(formatRupiah(1_500_000)).toBe('Rp 1.5jt');
    expect(formatRupiah(500_000)).toBe('Rp 500rb');
  });

  it('formats values below 1000 with locale', () => {
    expect(formatRupiah(500)).toBe('Rp 500');
  });

  it('handles zero', () => {
    expect(formatRupiah(0)).toBe('Rp 0');
  });
});

describe('DuesStatCards', () => {
  it('renders all four main stat cards', () => {
    render(<DuesStatCards stats={mockStats} />);
    expect(screen.getByText('Total Iuran')).toBeInTheDocument();
    expect(screen.getByText('Iuran Bulan Ini')).toBeInTheDocument();
    expect(screen.getByText('Menunggak')).toBeInTheDocument();
    expect(screen.getByText('Kepatuhan')).toBeInTheDocument();
  });

  it('renders formatted values', () => {
    render(<DuesStatCards stats={mockStats} />);
    expect(screen.getByText('Rp 15.0jt')).toBeInTheDocument();
    expect(screen.getByText('Rp 2.5jt')).toBeInTheDocument();
    expect(screen.getByText('15 anggota')).toBeInTheDocument();
  });

  it('calculates compliance rate correctly', () => {
    render(<DuesStatCards stats={mockStats} />);
    const complianceRate = Math.round((45 / 60) * 100);
    expect(screen.getByText(`${complianceRate}%`)).toBeInTheDocument();
  });

  it('renders mini stat row', () => {
    render(<DuesStatCards stats={mockStats} />);
    expect(screen.getByText('Total Lunas')).toBeInTheDocument();
    expect(screen.getByText('Total Menunggak')).toBeInTheDocument();
    expect(screen.getByText('Anggota Aktif')).toBeInTheDocument();
    expect(screen.getByText('Total Transaksi')).toBeInTheDocument();
  });

  it('handles zero anggotaAktif for compliance', () => {
    const zeroStats = { ...mockStats, anggotaAktif: 0, lunasBulanIni: 0 };
    render(<DuesStatCards stats={zeroStats} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
