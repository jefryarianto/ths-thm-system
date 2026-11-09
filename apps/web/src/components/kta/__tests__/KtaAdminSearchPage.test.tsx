import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import KtaAdminSearchPage, { metadata } from '@/app/admin/kta/page';

vi.mock('@/components/kta/AnggotaSearch', () => ({
  AnggotaSearch: () => <div data-testid="mock-anggota-search">AnggotaSearch Component</div>,
}));

describe('KtaAdminSearchPage', () => {
  it('has correct metadata title', () => {
    expect(metadata.title).toBe('Cari Anggota - KTA Admin');
  });

  it('renders page header and AnggotaSearch component', () => {
    render(<KtaAdminSearchPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /Kelola Kartu Tanda Anggota \(KTA\)/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Cari anggota untuk melihat pratinjau, unduh, atau cetak KTA')
    ).toBeInTheDocument();
    expect(screen.getByTestId('mock-anggota-search')).toBeInTheDocument();
  });
});
