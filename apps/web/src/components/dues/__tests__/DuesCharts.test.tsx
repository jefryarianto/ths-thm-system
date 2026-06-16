import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DuesCharts from '../DuesCharts';

const mockStats = {
  totalTransaksi: 120,
  totalMenunggak: 15,
  anggotaAktif: 60,
  lunasBulanIni: 45,
};

const mockMonthlyTrend = [
  { bulan: 'Jan', jumlah: 2000000, transaksi: 30 },
  { bulan: 'Feb', jumlah: 2500000, transaksi: 35 },
  { bulan: 'Mar', jumlah: 2200000, transaksi: 32 },
];

describe('DuesCharts', () => {
  it('renders chart titles', () => {
    render(<DuesCharts stats={mockStats} monthlyTrend={mockMonthlyTrend} />);
    expect(screen.getByText('Tren Iuran Bulanan')).toBeInTheDocument();
    expect(screen.getByText('Status Pembayaran')).toBeInTheDocument();
  });

  it('shows compliance rate', () => {
    render(<DuesCharts stats={mockStats} monthlyTrend={mockMonthlyTrend} />);
    const complianceRate = Math.round((45 / 60) * 100);
    expect(screen.getByText(`${complianceRate}%`)).toBeInTheDocument();
    expect(screen.getByText(/45 dari 60 anggota/)).toBeInTheDocument();
  });

  it('shows empty message when no monthly trend', () => {
    render(<DuesCharts stats={mockStats} monthlyTrend={[]} />);
    expect(screen.getByText('Belum ada data tren bulanan')).toBeInTheDocument();
  });

  it('shows empty message when no stats', () => {
    render(<DuesCharts stats={null} monthlyTrend={[]} />);
    expect(screen.getByText('Status Pembayaran')).toBeInTheDocument();
    const pieLoading = document.querySelector('.animate-pulse');
    expect(pieLoading).toBeTruthy();
  });

  it('shows empty message when no stats for pie', () => {
    const zeroStats = { totalTransaksi: 0, totalMenunggak: 0, anggotaAktif: 0, lunasBulanIni: 0 };
    render(<DuesCharts stats={zeroStats} monthlyTrend={[]} />);
    expect(screen.getByText('Belum ada data iuran')).toBeInTheDocument();
  });

  it('renders compliance bar with percentage', () => {
    render(<DuesCharts stats={mockStats} monthlyTrend={mockMonthlyTrend} />);
    expect(screen.getByText('Kepatuhan Bulan Ini')).toBeInTheDocument();
  });
});
