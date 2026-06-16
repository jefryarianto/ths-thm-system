import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DetailStats } from '../constants';

const mockProps = {
  createdAt: '2025-01-15T00:00:00Z',
  dokumenCount: 3,
  paidDues: 5,
  totalDues: 12,
  rantingNama: 'Ranting Harapan Indah',
};

describe('DetailStats', () => {
  it('renders all four stat cards', () => {
    render(<DetailStats {...mockProps} />);
    expect(screen.getByText('Tgl Daftar')).toBeInTheDocument();
    expect(screen.getByText('Dokumen')).toBeInTheDocument();
    expect(screen.getByText('Iuran Lunas')).toBeInTheDocument();
    expect(screen.getByText('Organisasi')).toBeInTheDocument();
  });

  it('renders formatted date', () => {
    render(<DetailStats {...mockProps} />);
    expect(screen.getByText('15 Jan 2025')).toBeInTheDocument();
  });

  it('renders dokumen count', () => {
    render(<DetailStats {...mockProps} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders paid dues fraction', () => {
    render(<DetailStats {...mockProps} />);
    expect(screen.getByText('5/12')).toBeInTheDocument();
  });

  it('renders ranting name', () => {
    render(<DetailStats {...mockProps} />);
    expect(screen.getByText('Ranting Harapan Indah')).toBeInTheDocument();
  });

  it('handles zero values', () => {
    render(
      <DetailStats
        createdAt={mockProps.createdAt}
        dokumenCount={0}
        paidDues={0}
        totalDues={0}
        rantingNama="-"
      />,
    );
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('0/0')).toBeInTheDocument();
  });
});
