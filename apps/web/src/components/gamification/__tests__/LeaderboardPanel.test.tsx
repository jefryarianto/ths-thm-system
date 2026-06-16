import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LeaderboardPanel from '../LeaderboardPanel';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockEntries = [
  {
    rank: 1,
    anggotaId: 'a1',
    namaLengkap: 'Anggota Satu',
    points: 9500,
    badges: 8,
    streaks: { latihan: 10, iuran: 8 },
  },
  {
    rank: 2,
    anggotaId: 'a2',
    namaLengkap: 'Anggota Dua',
    points: 8500,
    badges: 6,
    streaks: { latihan: 8, iuran: 7 },
  },
  {
    rank: 3,
    anggotaId: 'a3',
    namaLengkap: 'Anggota Tiga',
    points: 7500,
    badges: 5,
    streaks: { latihan: 7, iuran: 5 },
  },
  {
    rank: 4,
    anggotaId: 'a4',
    namaLengkap: 'Anggota Empat',
    points: 6000,
    badges: 4,
    streaks: { latihan: 5, iuran: 4 },
  },
];

describe('LeaderboardPanel', () => {
  const defaultProps = {
    entries: mockEntries,
    searchQuery: '',
    onSearchChange: vi.fn(),
    hasMore: false,
    onLoadMore: vi.fn(),
  };

  it('renders leaderboard heading', () => {
    render(<LeaderboardPanel {...defaultProps} />);
    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
  });

  it('renders search input with placeholder', () => {
    render(<LeaderboardPanel {...defaultProps} />);
    const input = screen.getByPlaceholderText('Cari anggota...');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('displays search query value', () => {
    render(<LeaderboardPanel {...defaultProps} searchQuery="test" />);
    const input = screen.getByPlaceholderText('Cari anggota...') as HTMLInputElement;
    expect(input.value).toBe('test');
  });

  it('calls onSearchChange when typing', () => {
    const onSearchChange = vi.fn();
    render(<LeaderboardPanel {...defaultProps} onSearchChange={onSearchChange} />);
    const input = screen.getByPlaceholderText('Cari anggota...');
    fireEvent.change(input, { target: { value: 'new search' } });
    expect(onSearchChange).toHaveBeenCalledWith('new search');
  });

  it('shows clear button when searchQuery has value', () => {
    render(<LeaderboardPanel {...defaultProps} searchQuery="something" />);
    // The clear button is an X icon button inside the search container
    const clearBtn = screen.getByRole('button', { name: '' });
    expect(clearBtn).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<LeaderboardPanel {...defaultProps} />);
    expect(screen.getByText('Rank')).toBeInTheDocument();
    expect(screen.getByText('Anggota')).toBeInTheDocument();
    expect(screen.getByText('Poin')).toBeInTheDocument();
    expect(screen.getByText('Badge')).toBeInTheDocument();
    expect(screen.getByText('Latihan')).toBeInTheDocument();
    expect(screen.getByText('Iuran')).toBeInTheDocument();
  });

  it('renders all entries as table rows', () => {
    render(<LeaderboardPanel {...defaultProps} />);
    expect(screen.getByText('Anggota Satu')).toBeInTheDocument();
    expect(screen.getByText('Anggota Dua')).toBeInTheDocument();
    expect(screen.getByText('Anggota Tiga')).toBeInTheDocument();
    expect(screen.getByText('Anggota Empat')).toBeInTheDocument();
  });

  it('renders points with locale formatting', () => {
    render(<LeaderboardPanel {...defaultProps} />);
    expect(screen.getByText('9.500')).toBeInTheDocument();
    expect(screen.getByText('8.500')).toBeInTheDocument();
  });

  it('renders badges count', () => {
    render(<LeaderboardPanel {...defaultProps} />);
    expect(screen.getAllByText('8').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('renders streak values', () => {
    render(<LeaderboardPanel {...defaultProps} />);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getAllByText('8').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('7').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1);
  });

  it('renders rank icons for top 3', () => {
    const { container } = render(<LeaderboardPanel {...defaultProps} />);
    // Rank 1, 2, 3 should have emoji icons (🥇, 🥈, 🥉)
    const rankCells = container.querySelectorAll('tbody tr td:first-child span');
    expect(rankCells[0].textContent).toBe('🥇');
    expect(rankCells[1].textContent).toBe('🥈');
    expect(rankCells[2].textContent).toBe('🥉');
  });

  it('renders numeric rank for 4th place', () => {
    const { container } = render(<LeaderboardPanel {...defaultProps} />);
    const rankCells = container.querySelectorAll('tbody tr td:first-child span');
    expect(rankCells[3].textContent).toBe('4');
  });

  it('shows load more button when hasMore is true', () => {
    render(<LeaderboardPanel {...defaultProps} hasMore={true} />);
    expect(screen.getByText('Muat Lainnya')).toBeInTheDocument();
  });

  it('hides load more button when hasMore is false', () => {
    render(<LeaderboardPanel {...defaultProps} hasMore={false} />);
    expect(screen.queryByText('Muat Lainnya')).not.toBeInTheDocument();
  });

  it('calls onLoadMore when load more clicked', () => {
    const onLoadMore = vi.fn();
    render(<LeaderboardPanel {...defaultProps} hasMore={true} onLoadMore={onLoadMore} />);
    fireEvent.click(screen.getByText('Muat Lainnya'));
    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it('shows empty state when no entries', () => {
    render(<LeaderboardPanel {...defaultProps} entries={[]} />);
    expect(screen.getByText('Belum ada data leaderboard')).toBeInTheDocument();
  });

  it('does not render table when no entries', () => {
    const { container } = render(<LeaderboardPanel {...defaultProps} entries={[]} />);
    expect(container.querySelector('table')).not.toBeInTheDocument();
  });

  it('uses entries without namaLengkap fallback', () => {
    const entriesWithoutName = [
      {
        rank: 5,
        anggotaId: 'a5',
        namaLengkap: undefined,
        points: 5000,
        badges: 3,
        streaks: { latihan: 4, iuran: 3 },
      },
    ];
    render(<LeaderboardPanel {...defaultProps} entries={entriesWithoutName} />);
    // Should show a truncated anggotaId
    expect(screen.getByText('a5')).toBeInTheDocument();
  });
});
