import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, STATUS_LABELS } from '../constants';

describe('StatusBadge (registrations)', () => {
  it('renders with label for pending status', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders with label for verified status', () => {
    render(<StatusBadge status="verified" />);
    expect(screen.getByText('Terverifikasi')).toBeInTheDocument();
  });

  it('renders with label for approved status', () => {
    render(<StatusBadge status="approved" />);
    expect(screen.getByText('Disetujui')).toBeInTheDocument();
  });

  it('renders with label for rejected status', () => {
    render(<StatusBadge status="rejected" />);
    expect(screen.getByText('Ditolak')).toBeInTheDocument();
  });

  it('falls back to raw status for unknown status', () => {
    render(<StatusBadge status="unknown_status" />);
    expect(screen.getByText('unknown_status')).toBeInTheDocument();
  });

  it('applies correct color classes for each status', () => {
    const { container } = render(<StatusBadge status="pending" />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain('bg-yellow-100');
  });

  it('uses fallback classes for unknown status', () => {
    const { container } = render(<StatusBadge status="foo" />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain('bg-gray-100');
  });
});
