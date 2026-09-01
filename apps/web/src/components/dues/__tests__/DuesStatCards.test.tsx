import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DuesStatCards, { formatRupiah } from '../DuesStatCards';

const mockStats = {
  totalIuran: 15000000,
  totalTransaksi: 120,
  totalLunas: 8000000,
  totalMenunggak: 2000000,
  iuranBulanIni: 2500000,
  lunasBulanIni: 45,
  belumBayarBulanIni: 15,
  anggotaAktif: 60,
};

describe('formatRupiah', () => {
  it('formats millions', () => {
    expect(formatRupiah(15_000_000)).toBe('Rp 15.000.000');
  });

  it('handles zero', () => {
    expect(formatRupiah(0)).toBe('Rp 0');
  });
});

describe('DuesStatCards', () => {
  it('renders all four main stat cards', () => {
    render(<DuesStatCards stats={mockStats} />);
    expect(screen.getByText('Total Iuran Terkumpul')).toBeInTheDocument();
    expect(screen.getByText('Iuran Bulan Ini')).toBeInTheDocument();
    expect(screen.getByText('Total Menunggak')).toBeInTheDocument();
    expect(screen.getByText('Total Lunas')).toBeInTheDocument();
  });

  it('renders formatted values', () => {
    render(<DuesStatCards stats={mockStats} />);
    expect(screen.getByText('Rp 15.000.000')).toBeInTheDocument();
  });

  it('handles zero anggotaAktif', () => {
    const zeroStats = { ...mockStats, anggotaAktif: 0, lunasBulanIni: 0 };
    render(<DuesStatCards stats={zeroStats} />);
    // All 4 stat cards should still render with their monetary values
    expect(screen.getByText('Total Iuran Terkumpul')).toBeInTheDocument();
    expect(screen.getByText('Rp 15.000.000')).toBeInTheDocument();
  });
});
