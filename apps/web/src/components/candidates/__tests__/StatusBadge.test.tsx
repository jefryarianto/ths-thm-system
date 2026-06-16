import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../constants';

describe('Candidates StatusBadge', () => {
  it('renders status label text', () => {
    render(<StatusBadge status="diusulkan" />);
    expect(screen.getByText('Diusulkan')).toBeInTheDocument();
  });

  it('renders all candidate status types', () => {
    const statuses = ['diusulkan', 'mengikuti_pendadaran', 'lulus', 'gagal', 'dibatalkan'];
    const labels = ['Diusulkan', 'Mengikuti Pendadaran', 'Lulus', 'Gagal', 'Dibatalkan'];
    statuses.forEach((status, i) => {
      const { unmount } = render(<StatusBadge status={status} />);
      expect(screen.getByText(labels[i])).toBeInTheDocument();
      unmount();
    });
  });

  it('renders raw status when status is unknown', () => {
    render(<StatusBadge status="unknown_status" />);
    expect(screen.getByText('unknown_status')).toBeInTheDocument();
  });

  it('renders with icon for known statuses', () => {
    const { container } = render(<StatusBadge status="lulus" />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it('includes border in style classes', () => {
    const { container } = render(<StatusBadge status="diusulkan" />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain('border');
  });

  it('accepts custom className', () => {
    const { container } = render(<StatusBadge status="lulus" className="custom-class" />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain('custom-class');
  });
});
