import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Users, Zap, Shield } from 'lucide-react';

import Pagination from '@/components/ui/pagination';
import TableSkeleton from '@/components/ui/table-skeleton';
import EmptyState from '@/components/ui/empty-state';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';
import FilterSelect from '@/components/ui/filter-select';
import PageHeader from '@/components/ui/page-header';
import DataTable from '@/components/ui/data-table';
import StatCard from '@/components/cards/stat-card';

describe('Pagination', () => {
  it('renders total count', () => {
    render(<Pagination page={1} totalPages={3} total={25} onPageChange={() => {}} />);
    expect(screen.getByText('25 total')).toBeInTheDocument();
  });

  it('returns null when totalPages <= 1', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} total={5} onPageChange={() => {}} />,
    );
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
    const { container } = render(
      <table>
        <tbody>
          <TableSkeleton rows={3} columns={4} />
        </tbody>
      </table>,
    );
    const rows = container.querySelectorAll('tr');
    expect(rows.length).toBe(3);
  });

  it('renders specified number of columns', () => {
    const { container } = render(
      <table>
        <tbody>
          <TableSkeleton rows={1} columns={5} />
        </tbody>
      </table>,
    );
    const cells = container.querySelectorAll('td');
    expect(cells.length).toBe(5);
  });

  it('renders pulse animation elements', () => {
    const { container } = render(
      <table>
        <tbody>
          <TableSkeleton rows={1} columns={2} />
        </tbody>
      </table>,
    );
    const pulsingDivs = container.querySelectorAll('.animate-pulse');
    expect(pulsingDivs.length).toBe(2);
  });

  it('uses colSpan when provided', () => {
    const { container } = render(
      <table>
        <tbody>
          <TableSkeleton rows={2} colSpan={3} />
        </tbody>
      </table>,
    );
    const cells = container.querySelectorAll('td');
    expect(cells.length).toBe(6); // 2 rows × 3 colSpan
  });

  it('has deterministic widths (no Math.random)', () => {
    const { container: container1 } = render(
      <table>
        <tbody>
          <TableSkeleton rows={1} columns={2} />
        </tbody>
      </table>,
    );
    const { container: container2 } = render(
      <table>
        <tbody>
          <TableSkeleton rows={1} columns={2} />
        </tbody>
      </table>,
    );
    const widths1 = Array.from(container1.querySelectorAll('.animate-pulse')).map(
      (el) => (el as HTMLElement).style.width,
    );
    const widths2 = Array.from(container2.querySelectorAll('.animate-pulse')).map(
      (el) => (el as HTMLElement).style.width,
    );
    expect(widths1).toEqual(widths2); // Same widths = deterministic
  });
});

describe('EmptyState', () => {
  it('renders message', () => {
    render(
      <table>
        <tbody>
          <EmptyState icon={Users} message="No data found" colSpan={5} />
        </tbody>
      </table>,
    );
    expect(screen.getByText('No data found')).toBeInTheDocument();
  });

  it('renders optional title', () => {
    render(
      <table>
        <tbody>
          <EmptyState icon={Users} title="Oops" message="No data" colSpan={5} />
        </tbody>
      </table>,
    );
    expect(screen.getByText('Oops')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    const onClick = vi.fn();
    render(
      <table>
        <tbody>
          <EmptyState
            icon={Users}
            message="No data"
            action={{ label: 'Retry', onClick }}
            colSpan={5}
          />
        </tbody>
      </table>,
    );
    const btn = screen.getByText('Retry');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not render action when not provided', () => {
    render(
      <table>
        <tbody>
          <EmptyState icon={Users} message="No data" colSpan={5} />
        </tbody>
      </table>,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('uses colSpan 999 by default', () => {
    const { container } = render(
      <table>
        <tbody>
          <EmptyState icon={Users} message="No data" />
        </tbody>
      </table>,
    );
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
    render(
      <SearchBar
        search=""
        onSearchChange={() => {}}
        onReset={() => {}}
        placeholder="Cari sesuatu..."
      />,
    );
    const input = screen.getByPlaceholderText('Cari sesuatu...');
    expect(input).toBeInTheDocument();
  });

  it('renders children (filter controls)', () => {
    render(
      <SearchBar search="" onSearchChange={() => {}} onReset={() => {}}>
        <select aria-label="Filter">
          <option value="">All</option>
        </select>
      </SearchBar>,
    );
    expect(screen.getByLabelText('Filter')).toBeInTheDocument();
  });

  describe('debounce integration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('does not call onDebouncedSearch when debounceMs is not provided', () => {
      const onDebouncedSearch = vi.fn();
      render(<SearchBar search="test" onSearchChange={() => {}} onReset={() => {}} />);
      // Without debounceMs, useDebounce is called with delay=0
      // The effect checks `if (debounceMs && debounceMs > 0 && onDebouncedSearch)`
      // Since debounceMs is undefined, this condition is false
      // So onDebouncedSearch should never be called
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(onDebouncedSearch).not.toHaveBeenCalled();
    });

    it('does not call onDebouncedSearch when onDebouncedSearch is not provided', () => {
      render(
        <SearchBar search="test" onSearchChange={() => {}} onReset={() => {}} debounceMs={300} />,
      );
      // debounceMs > 0 but onDebouncedSearch is undefined
      // The condition `if (debounceMs && debounceMs > 0 && onDebouncedSearch)` is false
      act(() => {
        vi.advanceTimersByTime(500);
      });
      // No error, just no call
    });

    it('calls onDebouncedSearch after debounce delay when both props provided', () => {
      const onDebouncedSearch = vi.fn();
      const { rerender } = render(
        <SearchBar
          search="initial"
          onSearchChange={() => {}}
          onReset={() => {}}
          debounceMs={300}
          onDebouncedSearch={onDebouncedSearch}
        />,
      );
      // Initial value is 'initial' - useDebounce returns 'initial' immediately
      // After 300ms, the effect fires with debouncedSearch='initial'
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(onDebouncedSearch).toHaveBeenCalledWith('initial');

      // Now simulate typing: new search value
      rerender(
        <SearchBar
          search="updated"
          onSearchChange={() => {}}
          onReset={() => {}}
          debounceMs={300}
          onDebouncedSearch={onDebouncedSearch}
        />,
      );
      // After 300ms, debounced value updates to 'updated'
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(onDebouncedSearch).toHaveBeenCalledWith('updated');
    });

    it('cancels previous debounce on rapid search changes', () => {
      const onDebouncedSearch = vi.fn();
      const { rerender } = render(
        <SearchBar
          search="a"
          onSearchChange={() => {}}
          onReset={() => {}}
          debounceMs={300}
          onDebouncedSearch={onDebouncedSearch}
        />,
      );
      // Fast typing: change to 'b' after 100ms
      act(() => {
        vi.advanceTimersByTime(100);
      });
      rerender(
        <SearchBar
          search="b"
          onSearchChange={() => {}}
          onReset={() => {}}
          debounceMs={300}
          onDebouncedSearch={onDebouncedSearch}
        />,
      );
      // Change to 'c' after another 100ms (total 200ms, not yet 300)
      act(() => {
        vi.advanceTimersByTime(100);
      });
      rerender(
        <SearchBar
          search="c"
          onSearchChange={() => {}}
          onReset={() => {}}
          debounceMs={300}
          onDebouncedSearch={onDebouncedSearch}
        />,
      );
      // Now advance to 300ms from the last change
      act(() => {
        vi.advanceTimersByTime(300);
      });
      // Should only have been called twice: once for 'a' (initial) and once for 'c' (final)
      // 'b' was cancelled by the rapid change
      expect(onDebouncedSearch).toHaveBeenCalledTimes(2);
      expect(onDebouncedSearch).toHaveBeenLastCalledWith('c');
    });

    it('calls onSearchChange immediately (not debounced)', () => {
      const onSearchChange = vi.fn();
      render(
        <SearchBar search="" onSearchChange={onSearchChange} onReset={() => {}} debounceMs={300} />,
      );
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'hello' } });
      // onSearchChange is called immediately (synchronous)
      expect(onSearchChange).toHaveBeenCalledWith('hello');
    });
  });
});

describe('FilterSelect', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
    { value: 'c', label: 'Option C' },
  ];

  it('renders placeholder option', () => {
    render(<FilterSelect value="" onChange={() => {}} options={options} placeholder="Pilih..." />);
    expect(screen.getByText('Pilih...')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(<FilterSelect value="" onChange={() => {}} options={options} />);
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
    expect(screen.getByText('Option C')).toBeInTheDocument();
  });

  it('shows selected value', () => {
    render(<FilterSelect value="b" onChange={() => {}} options={options} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('b');
  });

  it('calls onChange when selection changes', () => {
    const onChange = vi.fn();
    render(<FilterSelect value="" onChange={onChange} options={options} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'c' } });
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('uses default placeholder', () => {
    render(<FilterSelect value="" onChange={() => {}} options={options} />);
    expect(screen.getByText('Semua')).toBeInTheDocument();
  });
});

describe('PageHeader', () => {
  it('renders title', () => {
    render(<PageHeader title="Manajemen User" />);
    expect(screen.getByText('Manajemen User')).toBeInTheDocument();
  });

  it('renders refresh button when onRefresh provided', () => {
    render(<PageHeader title="Test" onRefresh={() => {}} />);
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('does not render refresh button without onRefresh', () => {
    render(<PageHeader title="Test" />);
    expect(screen.queryByText('Refresh')).not.toBeInTheDocument();
  });

  it('calls onRefresh when refresh clicked', () => {
    const onRefresh = vi.fn();
    render(<PageHeader title="Test" onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText('Refresh'));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('renders children (action buttons)', () => {
    render(
      <PageHeader title="Test" onRefresh={() => {}}>
        <button>Tambah</button>
      </PageHeader>,
    );
    expect(screen.getByText('Tambah')).toBeInTheDocument();
  });

  it('renders children without refresh', () => {
    render(
      <PageHeader title="Test">
        <button>Export</button>
      </PageHeader>,
    );
    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.queryByText('Refresh')).not.toBeInTheDocument();
  });
});

describe('StatCard', () => {
  it('renders label and value (large variant)', () => {
    render(<StatCard label="Total Anggota" value={42} icon={<Users size={20} />} />);
    expect(screen.getByText('Total Anggota')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders subtitle when sub prop provided', () => {
    render(<StatCard label="Revenue" value="Rp 1jt" icon={<Zap size={20} />} sub="Bulan ini" />);
    expect(screen.getByText('Bulan ini')).toBeInTheDocument();
  });

  it('renders mini variant with correct content', () => {
    const { container } = render(
      <StatCard label="Aktif" value={10} icon={<Users size={18} />} variant="mini" />,
    );
    // Mini variant renders with rounded-lg class on the icon wrapper
    expect(container.querySelector('.rounded-lg')).toBeInTheDocument();
    expect(screen.getByText('Aktif')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    // Mini variant has smaller text (text-xs for label, text-lg for value)
    expect(screen.getByText('Aktif').className).toContain('text-xs');
    expect(screen.getByText('10').className).toContain('text-lg');
  });

  it('renders all color variants without error', () => {
    const colors = [
      'blue',
      'green',
      'yellow',
      'red',
      'purple',
      'orange',
      'indigo',
      'teal',
      'pink',
      'cyan',
      'amber',
      'slate',
    ] as const;
    colors.forEach((color) => {
      const { container } = render(
        <StatCard label={color} value={1} icon={<Shield size={20} />} color={color} />,
      );
      expect(screen.getByText(color)).toBeInTheDocument();
      // Each color renders a ring class
      expect(container.querySelector('[class*="ring-"]')).toBeInTheDocument();
    });
  });

  it('defaults to blue color when not specified', () => {
    const { container } = render(<StatCard label="Default" value={5} icon={<Users size={20} />} />);
    expect(container.querySelector('[class*="ring-blue"]')).toBeInTheDocument();
  });

  it('renders icon element', () => {
    const { container } = render(<StatCard label="Test" value={1} icon={<Zap size={20} />} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('has hover shadow transition on large variant', () => {
    const { container } = render(<StatCard label="Test" value={1} icon={<Users size={20} />} />);
    // Large variant has transition-shadow class (from hover:shadow-md transition-shadow)
    expect(container.querySelector('.transition-shadow')).toBeInTheDocument();
  });

  describe('StatCard visual regression - large variant', () => {
    it('renders blue stat card correctly', () => {
      const { container } = render(
        <StatCard label="Anggota" value="1.234" icon={<Users size={20} />} color="blue" />,
      );
      expect(container.querySelector('[class*="ring-blue"]')).toBeInTheDocument();
      expect(screen.getByText('Anggota')).toBeInTheDocument();
      expect(screen.getByText('1.234')).toBeInTheDocument();
    });

    it('renders green stat card correctly', () => {
      const { container } = render(
        <StatCard
          label="Hadir"
          value="96%"
          icon={<Zap size={20} />}
          color="green"
          sub="Bulan ini"
        />,
      );
      expect(container.querySelector('[class*="ring-green"]')).toBeInTheDocument();
      expect(screen.getByText('Hadir')).toBeInTheDocument();
      expect(screen.getByText('Bulan ini')).toBeInTheDocument();
    });

    it('renders purple stat card correctly', () => {
      const { container } = render(
        <StatCard label="Total Poin" value={5000} icon={<Shield size={20} />} color="purple" />,
      );
      expect(container.querySelector('[class*="ring-purple"]')).toBeInTheDocument();
      expect(screen.getByText('Total Poin')).toBeInTheDocument();
      expect(screen.getByText('5000')).toBeInTheDocument();
    });
  });

  describe('StatCard visual regression - mini variant', () => {
    it('renders mini blue stat card', () => {
      const { container } = render(
        <StatCard
          label="Aktif"
          value={42}
          icon={<Users size={18} />}
          color="blue"
          variant="mini"
        />,
      );
      expect(container.querySelector('[class*="p-2"]')).toBeInTheDocument();
      expect(screen.getByText('Aktif')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('renders mini green stat card', () => {
      const { container } = render(
        <StatCard
          label="Lunas"
          value="Rp 1jt"
          icon={<Zap size={18} />}
          color="green"
          variant="mini"
        />,
      );
      expect(container.querySelector('[class*="ring-green"]')).toBeInTheDocument();
      expect(screen.getByText('Lunas')).toBeInTheDocument();
    });

    it('renders mini red stat card', () => {
      const { container } = render(
        <StatCard label="Gagal" value={3} icon={<Shield size={18} />} color="red" variant="mini" />,
      );
      expect(container.querySelector('[class*="ring-red"]')).toBeInTheDocument();
      expect(screen.getByText('Gagal')).toBeInTheDocument();
    });
  });
});

describe('DataTable', () => {
  interface TestItem {
    id: string;
    name: string;
  }

  const columns = [{ label: 'Name' }, { label: 'Actions', align: 'right' as const }];

  const data: TestItem[] = [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
  ];

  it('renders column headers', () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        loading={false}
        empty={{ icon: Users, message: 'Empty' }}
        page={1}
        totalPages={1}
        total={2}
        onPageChange={() => {}}
        colSpan={2}
        renderRow={(item: TestItem) => (
          <tr key={item.id}>
            <td>{item.name}</td>
            <td>
              <button>Edit</button>
            </td>
          </tr>
        )}
      />,
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders data rows when not loading', () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        loading={false}
        empty={{ icon: Users, message: 'Empty' }}
        page={1}
        totalPages={1}
        total={2}
        onPageChange={() => {}}
        colSpan={2}
        renderRow={(item: TestItem) => (
          <tr key={item.id}>
            <td>{item.name}</td>
            <td>
              <button>Edit</button>
            </td>
          </tr>
        )}
      />,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('renders loading skeleton when loading', () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={[]}
        loading={true}
        empty={{ icon: Users, message: 'Empty' }}
        page={1}
        totalPages={1}
        total={0}
        onPageChange={() => {}}
        colSpan={2}
        renderRow={() => null}
      />,
    );
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders empty state when no data and not loading', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        loading={false}
        empty={{ icon: Users, message: 'No records found', title: 'Oops' }}
        page={1}
        totalPages={1}
        total={0}
        onPageChange={() => {}}
        colSpan={2}
        renderRow={() => null}
      />,
    );
    expect(screen.getByText('Oops')).toBeInTheDocument();
    expect(screen.getByText('No records found')).toBeInTheDocument();
  });

  it('renders empty state with action', () => {
    const onAction = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={[]}
        loading={false}
        empty={{ icon: Users, message: 'Empty', action: { label: 'Retry', onClick: onAction } }}
        page={1}
        totalPages={1}
        total={0}
        onPageChange={() => {}}
        colSpan={2}
        renderRow={() => null}
      />,
    );
    const btn = screen.getByText('Retry');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('renders pagination', () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        loading={false}
        empty={{ icon: Users, message: 'Empty' }}
        page={1}
        totalPages={3}
        total={10}
        onPageChange={() => {}}
        colSpan={2}
        renderRow={(item: TestItem) => (
          <tr key={item.id}>
            <td>{item.name}</td>
            <td>
              <button>Edit</button>
            </td>
          </tr>
        )}
      />,
    );
    expect(screen.getByText('10 total')).toBeInTheDocument();
  });

  it('does not render pagination when 1 page', () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={data}
        loading={false}
        empty={{ icon: Users, message: 'Empty' }}
        page={1}
        totalPages={1}
        total={2}
        onPageChange={() => {}}
        colSpan={2}
        renderRow={(item: TestItem) => (
          <tr key={item.id}>
            <td>{item.name}</td>
            <td>
              <button>Edit</button>
            </td>
          </tr>
        )}
      />,
    );
    // Pagination returns null when totalPages <= 1
    expect(container.querySelector('.justify-between')).toBeNull();
  });

  it('includes hidden classes on column headers', () => {
    const cols = [{ label: 'Name' }, { label: 'Email', hidden: 'hidden sm:table-cell' }];
    const { container } = render(
      <DataTable
        columns={cols}
        data={data}
        loading={false}
        empty={{ icon: Users, message: 'Empty' }}
        page={1}
        totalPages={1}
        total={2}
        onPageChange={() => {}}
        colSpan={2}
        renderRow={(item: TestItem) => (
          <tr key={item.id}>
            <td>{item.name}</td>
            <td>-</td>
          </tr>
        )}
      />,
    );
    const headers = container.querySelectorAll('th');
    expect(headers[1].className).toContain('hidden sm:table-cell');
  });

  describe('auto-render mode (column render functions)', () => {
    interface NamedItem {
      id: string;
      firstName: string;
      lastName: string;
      role: string;
    }

    const autoColumns = [
      { key: 'firstName', label: 'Nama Depan' },
      {
        key: 'lastName',
        label: 'Nama Belakang',
        render: (item: NamedItem) => <span className="font-bold">{item.lastName}</span>,
      },
      {
        key: 'role',
        label: 'Role',
        align: 'right' as const,
        render: (item: NamedItem) => (
          <span
            className={`px-2 py-0.5 rounded-full text-xs ${item.role === 'admin' ? 'bg-blue-100' : 'bg-gray-100'}`}
          >
            {item.role}
          </span>
        ),
      },
    ];

    const namedData: NamedItem[] = [
      { id: '1', firstName: 'Alice', lastName: 'Smith', role: 'admin' },
      { id: '2', firstName: 'Bob', lastName: 'Jones', role: 'user' },
    ];

    it('renders auto-generated rows from column render functions', () => {
      render(
        <DataTable
          columns={autoColumns}
          data={namedData}
          loading={false}
          empty={{ icon: Users, message: 'Empty' }}
          page={1}
          totalPages={1}
          total={2}
          onPageChange={() => {}}
        />,
      );
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Jones')).toBeInTheDocument();
    });

    it('renders column with render function (custom element)', () => {
      render(
        <DataTable
          columns={autoColumns}
          data={namedData}
          loading={false}
          empty={{ icon: Users, message: 'Empty' }}
          page={1}
          totalPages={1}
          total={2}
          onPageChange={() => {}}
        />,
      );
      // lastName column uses render function with font-bold
      const boldSpans = screen.getAllByText('Smith');
      expect(boldSpans[0].className).toContain('font-bold');
      // role column uses render function with badge
      expect(screen.getByText('admin').className).toContain('rounded-full');
    });

    it('renders columns without render function as plain text from key', () => {
      render(
        <DataTable
          columns={autoColumns}
          data={namedData}
          loading={false}
          empty={{ icon: Users, message: 'Empty' }}
          page={1}
          totalPages={1}
          total={2}
          onPageChange={() => {}}
        />,
      );
      // firstName column has no render function, so displays the raw value
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('renders actions column when actions prop provided', () => {
      render(
        <DataTable
          columns={autoColumns}
          data={namedData}
          loading={false}
          empty={{ icon: Users, message: 'Empty' }}
          page={1}
          totalPages={1}
          total={2}
          onPageChange={() => {}}
          actions={(item: NamedItem) => <button onClick={() => {}}>Edit {item.id}</button>}
        />,
      );
      expect(screen.getByText('Edit 1')).toBeInTheDocument();
      expect(screen.getByText('Edit 2')).toBeInTheDocument();
      expect(screen.getByText('Aksi')).toBeInTheDocument(); // header
    });

    it('calls onRowClick when row is clicked', () => {
      const onRowClick = vi.fn();
      render(
        <DataTable
          columns={autoColumns}
          data={namedData}
          loading={false}
          empty={{ icon: Users, message: 'Empty' }}
          page={1}
          totalPages={1}
          total={2}
          onPageChange={() => {}}
          onRowClick={onRowClick}
        />,
      );
      const rows = screen.getAllByRole('row');
      // rows[0] is thead, rows[1] is first data row
      fireEvent.click(rows[1]);
      expect(onRowClick).toHaveBeenCalledWith(namedData[0]);
    });

    it('renders actions with column-based auto-render and onRowClick together', () => {
      const onRowClick = vi.fn();
      const onAction = vi.fn();
      render(
        <DataTable
          columns={autoColumns}
          data={namedData}
          loading={false}
          empty={{ icon: Users, message: 'Empty' }}
          page={1}
          totalPages={1}
          total={2}
          onPageChange={() => {}}
          onRowClick={onRowClick}
          actions={(item: NamedItem) => <button onClick={() => onAction(item.id)}>Act</button>}
        />,
      );
      // Actions column header should be present
      expect(screen.getByText('Aksi')).toBeInTheDocument();
      // Action buttons should be rendered
      const actionBtns = screen.getAllByText('Act');
      expect(actionBtns).toHaveLength(2);
      fireEvent.click(actionBtns[0]);
      expect(onAction).toHaveBeenCalledWith('1');
    });

    it('renders pagination with default onPageChange (no-op)', () => {
      render(
        <DataTable
          columns={autoColumns}
          data={namedData}
          loading={false}
          empty={{ icon: Users, message: 'Empty' }}
          page={1}
          totalPages={3}
          total={10}
        />,
      );
      expect(screen.getByText('10 total')).toBeInTheDocument();
    });
  });

  describe('DataTable lifecycle', () => {
    interface LifecycleItem {
      id: string;
      name: string;
    }

    const lifecycleColumns = [
      {
        key: 'name',
        label: 'Name',
        render: (item: LifecycleItem) => <span>{item.name}</span>,
      },
    ];

    it('transitions from loading to data state', () => {
      const { rerender } = render(
        <DataTable
          columns={lifecycleColumns}
          data={[]}
          loading={true}
          empty={{ icon: Users, message: 'No data' }}
          page={1}
          totalPages={1}
          total={0}
        />,
      );
      // Loading state: skeleton visible
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();

      // Transition to data state
      rerender(
        <DataTable
          columns={lifecycleColumns}
          data={[{ id: '1', name: 'Alice' }]}
          loading={false}
          empty={{ icon: Users, message: 'No data' }}
          page={1}
          totalPages={1}
          total={1}
        />,
      );
      // Data state: content visible, skeleton gone
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(document.querySelector('.animate-pulse')).toBeNull();
    });

    it('transitions from loading to empty state', () => {
      const { rerender } = render(
        <DataTable
          columns={lifecycleColumns}
          data={[]}
          loading={true}
          empty={{ icon: Users, message: 'No records', title: 'Empty' }}
          page={1}
          totalPages={1}
          total={0}
        />,
      );
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();

      rerender(
        <DataTable
          columns={lifecycleColumns}
          data={[]}
          loading={false}
          empty={{ icon: Users, message: 'No records', title: 'Empty' }}
          page={1}
          totalPages={1}
          total={0}
        />,
      );
      expect(screen.getByText('Empty')).toBeInTheDocument();
      expect(screen.getByText('No records')).toBeInTheDocument();
      expect(document.querySelector('.animate-pulse')).toBeNull();
    });

    it('transitions from data to loading (refetch) back to data', () => {
      const { rerender } = render(
        <DataTable
          columns={lifecycleColumns}
          data={[{ id: '1', name: 'Alice' }]}
          loading={false}
          empty={{ icon: Users, message: 'No data' }}
          page={1}
          totalPages={1}
          total={1}
        />,
      );
      expect(screen.getByText('Alice')).toBeInTheDocument();

      // Simulate refetch: loading with old data cleared
      rerender(
        <DataTable
          columns={lifecycleColumns}
          data={[]}
          loading={true}
          empty={{ icon: Users, message: 'No data' }}
          page={1}
          totalPages={1}
          total={0}
        />,
      );
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();

      // New data loaded
      rerender(
        <DataTable
          columns={lifecycleColumns}
          data={[{ id: '2', name: 'Bob' }]}
          loading={false}
          empty={{ icon: Users, message: 'No data' }}
          page={1}
          totalPages={1}
          total={1}
        />,
      );
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.queryByText('Alice')).toBeNull();
    });

    it('displays pagination controls when multiple pages', () => {
      render(
        <DataTable
          columns={lifecycleColumns}
          data={[]}
          loading={false}
          empty={{ icon: Users, message: 'No data' }}
          page={1}
          totalPages={3}
          total={25}
        />,
      );
      expect(screen.getByText('25 total')).toBeInTheDocument();
    });

    it('calls onPageChange when paginating', () => {
      const onPageChange = vi.fn();
      render(
        <DataTable
          columns={lifecycleColumns}
          data={[{ id: '1', name: 'Alice' }]}
          loading={false}
          empty={{ icon: Users, message: 'No data' }}
          page={1}
          totalPages={3}
          total={25}
          onPageChange={onPageChange}
        />,
      );
      // Click page 2
      fireEvent.click(screen.getByText('2'));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });
  });
});
