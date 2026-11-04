import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandPalette } from '../command-palette';
import { menuGroups } from '../navigation';
import * as nextNavigation from 'next/navigation';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('CommandPalette', () => {
  it('menampilkan item saat terbuka', () => {
    render(<CommandPalette open={true} onOpenChange={vi.fn()} groups={menuGroups} />);
    expect(screen.getByPlaceholderText('Cari halaman atau menu...')).toBeInTheDocument();
    // Cari item pertama (Dashboard)
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('memfilter hasil berdasarkan query', () => {
    render(<CommandPalette open={true} onOpenChange={vi.fn()} groups={menuGroups} />);
    const input = screen.getByPlaceholderText('Cari halaman atau menu...');
    fireEvent.change(input, { target: { value: 'Forum' } });
    expect(screen.getByText('Forum')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });
});
