import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DataTable from '@/components/tables/data-table';

const mockColumns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
];

const mockData = [
  { id: '1', name: 'John Doe', email: 'john@test.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@test.com' },
];

describe('DataTable', () => {
  it('renders column headers', () => {
    render(<DataTable data={[]} columns={mockColumns} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders data rows', () => {
    render(<DataTable data={mockData} columns={mockColumns} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@test.com')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(<DataTable data={[]} columns={mockColumns} />);
    expect(screen.getByText('Tidak ada data')).toBeInTheDocument();
  });

  it('shows custom empty text', () => {
    render(<DataTable data={[]} columns={mockColumns} emptyText="No results found" />);
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<DataTable data={[]} columns={mockColumns} loading />);
    expect(screen.getByText('Memuat data...')).toBeInTheDocument();
  });

  it('renders custom column values with render function', () => {
    const cols = [
      {
        key: 'status',
        label: 'Status',
        render: (item: any) => <span data-testid={`status-${item.id}`}>{item.status === 'active' ? 'Active' : 'Inactive'}</span>,
      },
    ];
    const data = [{ id: '1', status: 'active' }];
    render(<DataTable data={data} columns={cols} />);
    expect(screen.getByTestId('status-1')).toHaveTextContent('Active');
  });

  it('calls onRowClick when a row is clicked', () => {
    const onRowClick = vi.fn();
    render(<DataTable data={mockData} columns={mockColumns} onRowClick={onRowClick} />);
    
    fireEvent.click(screen.getByText('John Doe'));
    expect(onRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it('does not add cursor-pointer class when onRowClick is not provided', () => {
    const { container } = render(<DataTable data={mockData} columns={mockColumns} />);
    const rows = container.querySelectorAll('tbody tr');
    rows.forEach((row) => {
      expect(row.className).not.toContain('cursor-pointer');
    });
  });

  it('adds cursor-pointer class when onRowClick is provided', () => {
    const onRowClick = vi.fn();
    const { container } = render(<DataTable data={mockData} columns={mockColumns} onRowClick={onRowClick} />);
    const rows = container.querySelectorAll('tbody tr');
    rows.forEach((row) => {
      expect(row.className).toContain('cursor-pointer');
    });
  });

  it('renders actions column', () => {
    const actions = (item: any) => <button data-testid={`action-${item.id}`}>Edit</button>;
    render(<DataTable data={mockData} columns={mockColumns} actions={actions} />);
    expect(screen.getByTestId('action-1')).toBeInTheDocument();
    expect(screen.getByTestId('action-2')).toBeInTheDocument();
  });

  it('renders pagination when totalPages > 1', () => {
    const onPageChange = vi.fn();
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        page={1}
        totalPages={5}
        total={50}
        onPageChange={onPageChange}
      />
    );
    expect(screen.getByText('Total 50 data')).toBeInTheDocument();
    expect(screen.getByText('1 / 5')).toBeInTheDocument();
  });

  it('calls onPageChange when pagination buttons are clicked', () => {
    const onPageChange = vi.fn();
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        page={2}
        totalPages={5}
        total={50}
        onPageChange={onPageChange}
      />
    );
    
    // Click next
    const buttons = screen.getAllByRole('button');
    const nextBtn = buttons.find((b) => b.querySelector('svg')?.nextElementSibling === null || b.textContent === '');
    // Find the chevron right button (next page)
    fireEvent.click(buttons[buttons.length - 1]);
    expect(onPageChange).toHaveBeenCalled();
  });

  it('does not render pagination when totalPages <= 1', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        page={1}
        totalPages={1}
        total={2}
        onPageChange={vi.fn()}
      />
    );
    expect(screen.queryByText('Total 2 data')).not.toBeInTheDocument();
  });
});
