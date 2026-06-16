import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MemberStatCards from '../MemberStatCards';

describe('MemberStatCards', () => {
  const mockStats = {
    total: 150,
    aktif: 120,
    pendingValidasi: 15,
    incomplete: 10,
  };

  it('renders all four stat cards', () => {
    render(<MemberStatCards stats={mockStats} />);
    expect(screen.getByText('Total Anggota')).toBeInTheDocument();
    expect(screen.getByText('Aktif')).toBeInTheDocument();
    expect(screen.getByText('Pending Validasi')).toBeInTheDocument();
    expect(screen.getByText('Data Incomplete')).toBeInTheDocument();
  });

  it('renders formatted stat values', () => {
    render(<MemberStatCards stats={mockStats} />);
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('renders large numbers with locale formatting', () => {
    render(
      <MemberStatCards
        stats={{ total: 1234567, aktif: 500000, pendingValidasi: 10000, incomplete: 500 }}
      />,
    );
    expect(screen.getByText('1.234.567')).toBeInTheDocument();
    expect(screen.getByText('500.000')).toBeInTheDocument();
    expect(screen.getByText('10.000')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('handles zero values', () => {
    render(<MemberStatCards stats={{ total: 0, aktif: 0, pendingValidasi: 0, incomplete: 0 }} />);
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(4);
  });
});
