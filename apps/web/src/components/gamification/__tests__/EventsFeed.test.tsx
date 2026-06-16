import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import EventsFeed from '../EventsFeed';
import type { PointEvent } from '@/app/(dashboard)/gamification/types';

const mockEvents: PointEvent[] = [
  {
    id: '1',
    anggotaId: 'ang-001',
    namaLengkap: 'Budi Santoso',
    type: 'training',
    points: 50,
    description: 'Hadir latihan rutin',
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
  {
    id: '2',
    anggotaId: 'ang-002',
    namaLengkap: 'Siti Rahayu',
    type: 'dues',
    points: 25,
    description: 'Pembayaran iuran bulanan',
    timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  },
  {
    id: '3',
    anggotaId: 'ang-003',
    namaLengkap: 'Ahmad Fauzi',
    type: 'badge',
    points: 100,
    description: 'Meraih badge Prestasi',
    timestamp: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
  },
];

describe('EventsFeed', () => {
  it('renders section heading', () => {
    render(<EventsFeed events={mockEvents} />);
    expect(screen.getByText('Aktivitas Terbaru')).toBeInTheDocument();
  });

  it('renders all event names', () => {
    render(<EventsFeed events={mockEvents} />);
    expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    expect(screen.getByText('Siti Rahayu')).toBeInTheDocument();
    expect(screen.getByText('Ahmad Fauzi')).toBeInTheDocument();
  });

  it('renders event descriptions', () => {
    render(<EventsFeed events={mockEvents} />);
    expect(screen.getByText('Hadir latihan rutin')).toBeInTheDocument();
    expect(screen.getByText('Pembayaran iuran bulanan')).toBeInTheDocument();
    expect(screen.getByText('Meraih badge Prestasi')).toBeInTheDocument();
  });

  it('renders point values', () => {
    render(<EventsFeed events={mockEvents} />);
    expect(screen.getByText('+50')).toBeInTheDocument();
    expect(screen.getByText('+25')).toBeInTheDocument();
    expect(screen.getByText('+100')).toBeInTheDocument();
  });

  it('shows empty state when no events', () => {
    render(<EventsFeed events={[]} />);
    expect(screen.getByText('Belum ada aktivitas')).toBeInTheDocument();
  });

  it('shows time ago text', () => {
    render(<EventsFeed events={mockEvents} />);
    expect(screen.getByText('1j lalu')).toBeInTheDocument();
    expect(screen.getByText('1h lalu')).toBeInTheDocument();
    expect(screen.getByText('3h lalu')).toBeInTheDocument();
  });

  it('renders with missing namaLengkap', () => {
    const eventsWithoutName: PointEvent[] = [
      {
        id: '4',
        anggotaId: 'ang-004',
        type: 'achievement',
        points: 75,
        description: 'Mencapai target latihan',
        timestamp: new Date().toISOString(),
      },
    ];
    render(<EventsFeed events={eventsWithoutName} />);
    expect(screen.getByText('ang-004'.slice(0, 8))).toBeInTheDocument();
  });
});
