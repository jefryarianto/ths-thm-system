import { describe, it, expect, vi, afterAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ScanStatsPage from '@/app/(dashboard)/scan-stats/page';

// Mock apiClient
vi.mock('@/lib/api-client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { success: true, data: null } }),
  },
}));

import apiClient from '@/lib/api-client';
const mockApi = vi.mocked(apiClient);

const mockStats = {
  totalAbsensi: 150,
  totalDokumen: 30,
  activeKegiatan: 3,
  absensiHarian: [
    { tanggal: '2026-05-15', count: 5 },
    { tanggal: '2026-05-16', count: 8 },
    { tanggal: '2026-05-17', count: 12 },
  ],
  recentAbsensi: [
    {
      namaAnggota: 'Budi Santoso',
      nomorAnggota: 'ANG-001',
      kegiatan: 'Latihan Mingguan',
      hadir: true,
      catatan: 'Check-in via QR',
      tanggal: '2026-06-01T10:00:00.000Z',
    },
    {
      namaAnggota: 'Siti Rahayu',
      nomorAnggota: 'ANG-002',
      kegiatan: 'Kegiatan Sosial',
      hadir: false,
      catatan: null,
      tanggal: '2026-05-30T09:00:00.000Z',
    },
  ],
};

const emptyStats = {
  totalAbsensi: 0,
  totalDokumen: 0,
  activeKegiatan: 0,
  absensiHarian: [],
  recentAbsensi: [],
};

// Save original for restoration
const originalClick = HTMLAnchorElement.prototype.click;

afterAll(() => {
  HTMLAnchorElement.prototype.click = originalClick;
});

beforeEach(() => {
  mockApi.get.mockReset();
  mockApi.get.mockResolvedValue({ data: { success: true, data: mockStats } });
  HTMLAnchorElement.prototype.click = vi.fn();
});

describe('ScanStatsPage', () => {
  it('renders the page title and subtitle', async () => {
    render(<ScanStatsPage />);
    expect(screen.getByText('Statistik Scan')).toBeInTheDocument();
    expect(screen.getByText(/Statistik scan QR, absensi/)).toBeInTheDocument();
  });

  it('shows loading skeleton before data loads', () => {
    mockApi.get.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ScanStatsPage />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(4);
  });

  it('renders 4 stat cards after loading', async () => {
    render(<ScanStatsPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Absensi')).toBeInTheDocument();
    });
    expect(screen.getByText('Dokumen Terverifikasi')).toBeInTheDocument();
    expect(screen.getByText('Kegiatan Aktif')).toBeInTheDocument();
    expect(screen.getByText('Absensi 30 Hari')).toBeInTheDocument();
  });

  it('displays correct stat values', async () => {
    render(<ScanStatsPage />);
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
    });
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('renders the absensi chart section title', async () => {
    render(<ScanStatsPage />);
    await waitFor(() => {
      expect(screen.getByText('Absensi 30 Hari Terakhir')).toBeInTheDocument();
    });
  });

  it('renders the recent absensi table with correct headers', async () => {
    render(<ScanStatsPage />);
    await waitFor(() => {
      expect(screen.getByText('Absensi Terbaru')).toBeInTheDocument();
    });
    expect(screen.getByText('Anggota')).toBeInTheDocument();
    expect(screen.getByText('Kegiatan')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Catatan')).toBeInTheDocument();
    expect(screen.getByText('Tanggal')).toBeInTheDocument();
  });

  it('renders recent absensi data rows', async () => {
    render(<ScanStatsPage />);
    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    });
    expect(screen.getByText('ANG-001')).toBeInTheDocument();
    expect(screen.getByText('Latihan Mingguan')).toBeInTheDocument();
    expect(screen.getByText('Check-in via QR')).toBeInTheDocument();
    expect(screen.getByText('Siti Rahayu')).toBeInTheDocument();
  });

  it('renders the refresh button', async () => {
    render(<ScanStatsPage />);
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });

  it('refetches data when refresh button is clicked', async () => {
    render(<ScanStatsPage />);
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Refresh'));
    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledTimes(2);
    });
  });

  it('renders the export CSV button', async () => {
    render(<ScanStatsPage />);
    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });
  });

  it('export CSV button is not disabled when data exists', async () => {
    render(<ScanStatsPage />);
    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });
    const exportBtn = screen.getByText('Export CSV').closest('button');
    expect(exportBtn).not.toBeDisabled();
  });

  it('shows empty state when no absensi data', async () => {
    mockApi.get.mockResolvedValue({ data: { success: true, data: emptyStats } });
    render(<ScanStatsPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Absensi')).toBeInTheDocument();
    });
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Belum ada data absensi')).toBeInTheDocument();
    expect(screen.getByText('Belum ada data')).toBeInTheDocument();
  });

  it('export CSV button is disabled when no recent absensi data', async () => {
    mockApi.get.mockResolvedValue({ data: { success: true, data: emptyStats } });
    render(<ScanStatsPage />);
    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });
    const exportBtn = screen.getByText('Export CSV').closest('button');
    expect(exportBtn).toBeDisabled();
  });

  it('fetches data on mount', async () => {
    render(<ScanStatsPage />);
    expect(mockApi.get).toHaveBeenCalledWith('/reports/scan-stats');
  });

  it('handles API error gracefully', async () => {
    mockApi.get.mockRejectedValue(new Error('Network error'));
    render(<ScanStatsPage />);
    await waitFor(() => {
      expect(document.querySelectorAll('.animate-pulse').length).toBe(0);
    });
    // Export CSV button still renders (always in header) but is disabled
    const exportBtn = screen.getByText('Export CSV').closest('button');
    expect(exportBtn).toBeDisabled();
    // Stat cards should not render
    expect(screen.queryByText('Total Absensi')).not.toBeInTheDocument();
  });
});
