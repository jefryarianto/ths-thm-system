import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatCards from '../StatCards';
import type { GamificationStats } from '@/app/(dashboard)/gamification/types';

const mockStats: GamificationStats = {
  totalMembers: 245,
  totalEvents: 89,
  totalPointsAwarded: 15750,
  badgesAwarded: 34,
};

describe('StatCards', () => {
  it('renders all four stat cards', () => {
    render(<StatCards stats={mockStats} />);
    expect(screen.getByText('Peserta Aktif')).toBeInTheDocument();
    expect(screen.getByText('Total Poin')).toBeInTheDocument();
    expect(screen.getByText('Badge Diraih')).toBeInTheDocument();
    expect(screen.getByText('Total Aktivitas')).toBeInTheDocument();
  });

  it('renders formatted stat values', () => {
    render(<StatCards stats={mockStats} />);
    expect(screen.getByText('245')).toBeInTheDocument();
    expect(screen.getByText('89')).toBeInTheDocument();
    expect(screen.getByText('15.750')).toBeInTheDocument();
    expect(screen.getByText('34')).toBeInTheDocument();
  });

  it('handles zero values', () => {
    const zeroStats: GamificationStats = {
      totalMembers: 0,
      totalEvents: 0,
      totalPointsAwarded: 0,
      badgesAwarded: 0,
    };
    render(<StatCards stats={zeroStats} />);
    // '0' appears in all 4 stat cards, use getAllByText
    expect(screen.getAllByText('0').length).toBe(4);
  });

  it('renders correctly with large numbers', () => {
    const largeStats: GamificationStats = {
      totalMembers: 1234567,
      totalEvents: 50000,
      totalPointsAwarded: 9999999,
      badgesAwarded: 1234,
    };
    render(<StatCards stats={largeStats} />);
    expect(screen.getByText('1.234.567')).toBeInTheDocument();
    expect(screen.getByText('50.000')).toBeInTheDocument();
    expect(screen.getByText('9.999.999')).toBeInTheDocument();
    expect(screen.getByText('1.234')).toBeInTheDocument();
  });
});
