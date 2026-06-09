import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Users, RefreshCw } from 'lucide-react';

import Pagination from '@/components/ui/pagination';
import TableSkeleton from '@/components/ui/table-skeleton';
import EmptyState from '@/components/ui/empty-state';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';

describe('Pagination', () => {
  it('renders total count', () => {
    render(<Pagination page={1} totalPages={3} total={25} onPageChange={() => {}} />);
    expect(screen.getByText('25 total')).toBeInTheDocument();
  });

  it('returns null when totalPages <= 1', () => {
    const { container } = render(<Pagination page={1} totalPages={1} total={5} onPageChange={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders page number buttons within range', () => {
    render(<Pagination page={3} totalPages={5} total={50} onPageChange={() => {}} />);
    // page=3 → start=1, end=5 → shows 1,2,3,4,5
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('highlights active page', () => {
    render(<Pagination page={3} totalPages={5} total={50} onPageChange={() => {}} />);
    const activeBtn = screen.getByText('3');
    expect(activeBtn.className).toContain('bg-blue-600');
  });

  it('calls onPageChange when page button clicked', () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} totalPages={3} total={30} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByText('2'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables prev button on first page', () => {
    render(<Pagination page={1} totalPages={3} total={30} onPageChange={() => {}} />);
    const buttons = screen.getAllByRole('button');
    // First button is ChevronLeft (prev)
    expect(buttons[0]).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(<Pagination page={3} totalPages={3} total={30} onPageChange={() => {}} />);
    const buttons = screen.getAllByRole('button');
    const lastBtn = buttons[buttons.length - 1]; // ChevronRight
    expect(lastBtn).toBeDisabled();
  });
});

describe('TableSkeleton', () => {
  it('renders specified number of rows', () => {
    const { container } = render(<table><tbody><TableSkeleton rows={3} columns={4} /></tbody></table>);
    const rows = container.querySelectorAll('tr');
    expect(rows.length).toBe(3);
  });

  it('renders specified number of columns', () => {
    const { container } = render(<table><tbody><TableSkeleton rows={1} columns={5} /></tbody></table>);
    const cells = container.querySelectorAll('td');
    expect(cells.length).toBe(5);
  });

  it('renders pulse animation elements', () => {
    const { container } = render(<table><tbody><TableSkeleton rows={1} columns={2} /></tbody></table>);
    const pulsingDivs = container.querySelectorAll('.animate-pulse');
    expect(pulsingDivs.length).toBe(2);
  });

  it('uses colSpan when provided', () => {
    const { container } = render(<table><tbody><TableSkeleton rows={2} colSpan={3} /></tbody></table>);
    const cells = container.querySelectorAll('td');
    expect(cells.length).toBe(6); // 2 rows × 3 colSpan
  });

  it('has deterministic widths (no Math.random)', () => {
    const { container: container1 } = render(<table><tbody><TableSkeleton rows={1} columns={2} /></tbody></table>);
    const { container: container2 } = render(<table><tbody><TableSkeleton rows={1} columns={2} /></tbody></table>);
    const widths1 = Array.from(container1.querySelectorAll('.animate-pulse')).map(el => (el as HTMLElement).style.width);
    const widths2 = Array.from(container2.querySelectorAll('.animate-pulse')).map(el => (el as HTMLElement).style.width);
    expect(widths1).toEqual(widths2); // Same widths = deterministic
  });
});

describe('EmptyState', () => {
  it('renders message', () => {
    render(<table><tbody><EmptyState icon={Users} message="No data found" colSpan={5} /></tbody></table>);
    expect(screen.getByText('No data found')).toBeInTheDocument();
  });

  it('renders optional title', () => {
    render(<table><tbody><EmptyState icon={Users} title="Oops" message="No data" colSpan={5} /></tbody></table>);
    expect(screen.getByText('Oops')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    const onClick = vi.fn();
    render(<table><tbody><EmptyState icon={Users} message="No data" action={{ label: 'Retry', onClick }} colSpan={5} /></tbody></table>);
    const btn = screen.getByText('Retry');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not render action when not provided', () => {
    render(<table><tbody><EmptyState icon={Users} message="No data" colSpan={5} /></tbody></table>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('uses colSpan 999 by default', () => {
    const { container } = render(<table><tbody><EmptyState icon={Users} message="No data" /></tbody></table>);
    const td = container.querySelector('td');
    expect(td?.getAttribute('colspan')).toBe('999');
  });
});

describe('SummaryBar', () => {
  it('renders label and total', () => {
    render(<SummaryBar icon={Users} label="Total Anggota" total={42} />);
    expect(screen.getByText(/Total Anggota/)).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders refresh button when onRefresh provided', () => {
    render(<SummaryBar icon={Users} label="Total" total={10} onRefresh={() => {}} />);
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('does not render refresh button when onRefresh not provided', () => {
    render(<SummaryBar icon={Users} label="Total" total={10} />);
    expect(screen.queryByText('Refresh')).not.toBeInTheDocument();
  });

  it('calls onRefresh when refresh clicked', () => {
    const onRefresh = vi.fn();
    render(<SummaryBar icon={Users} label="Total" total={10} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText('Refresh'));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('renders the icon', () => {
    const { container } = render(<SummaryBar icon={Users} label="Total" total={5} />);
    // lucide Users icon renders as an SVG
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});

describe('SearchBar', () => {
  it('renders search input with value', () => {
    render(<SearchBar search="test" onSearchChange={() => {}} onReset={() => {}} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('test');
  });

  it('calls onSearchChange when input changes', () => {
    const onSearchChange = vi.fn();
    render(<SearchBar search="" onSearchChange={onSearchChange} onReset={() => {}} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new search' } });
    expect(onSearchChange).toHaveBeenCalledWith('new search');
  });

  it('renders reset button and calls onReset', () => {
    const onReset = vi.fn();
    render(<SearchBar search="something" onSearchChange={() => {}} onReset={onReset} />);
    const resetBtn = screen.getByText('Reset');
    expect(resetBtn).toBeInTheDocument();
    fireEvent.click(resetBtn);
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('renders custom placeholder', () => {
    render(<SearchBar search="" onSearchChange={() => {}} onReset={() => {}} placeholder="Cari sesuatu..." />);
    const input = screen.getByPlaceholderText('Cari sesuatu...');
    expect(input).toBeInTheDocument();
  });

  it('renders children (filter controls)', () => {
    render(
      <SearchBar search="" onSearchChange={() => {}} onReset={() => {}}>
        <select aria-label="Filter">
          <option value="">All</option>
        </select>
      </SearchBar>
    );
    expect(screen.getByLabelText('Filter')).toBeInTheDocument();
  });
});
