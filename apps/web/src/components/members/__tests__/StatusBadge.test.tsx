import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../constants';

describe('StatusBadge', () => {
  it('renders status text', () => {
    render(<StatusBadge status="aktif" />);
    expect(screen.getByText('aktif')).toBeInTheDocument();
  });

  it('renders label when provided via labels map', () => {
    render(<StatusBadge status="aktif" labels={{ aktif: 'Aktif' }} />);
    expect(screen.getByText('Aktif')).toBeInTheDocument();
  });

  it('renders status value as fallback when no matching label', () => {
    render(<StatusBadge status="unknown_status" />);
    expect(screen.getByText('unknown_status')).toBeInTheDocument();
  });

  it('renders with correct CSS classes for known statuses', () => {
    const { container } = render(<StatusBadge status="aktif" />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain('rounded-full');
    expect(span.className).toContain('text-xs');
  });

  it('renders with fallback classes for unknown status', () => {
    const { container } = render(<StatusBadge status="unknown" />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain('bg-gray-100');
  });
});
