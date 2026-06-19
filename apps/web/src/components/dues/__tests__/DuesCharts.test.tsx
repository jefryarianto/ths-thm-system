import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DuesCharts from '../DuesCharts';

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

const mockMonthlyTrend = [
  { bulan: 'Jan 2026', jumlah: 2000000, transaksi: 30 },
  { bulan: 'Feb 2026', jumlah: 2500000, transaksi: 35 },
  { bulan: 'Mar 2026', jumlah: 2200000, transaksi: 32 },
];

describe('DuesCharts', () => {
  it('renders chart titles', () => {
    render(<DuesCharts stats={mockStats} monthlyTrend={mockMonthlyTrend} />);
    expect(screen.getByText('Tren Iuran Bulanan')).toBeInTheDocument();
    expect(screen.getByText('Kepatuhan Bulan Ini')).toBeInTheDocument();
  });

  it('shows compliance rate', () => {
    render(<DuesCharts stats={mockStats} monthlyTrend={mockMonthlyTrend} />);
    expect(screen.getByText(/45 \/ 60 anggota/)).toBeInTheDocument();
  });

  it('shows empty message when no monthly trend', () => {
    render(<DuesCharts stats={mockStats} monthlyTrend={[]} />);
    expect(screen.getByText('Belum ada data tren bulanan')).toBeInTheDocument();
  });

  it('renders compliance bar', () => {
    render(<DuesCharts stats={mockStats} monthlyTrend={mockMonthlyTrend} />);
    expect(screen.getByText('Kepatuhan Bulan Ini')).toBeInTheDocument();
  });
});
