import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DetailRow from '../detail-row';
import { User, Mail } from 'lucide-react';

describe('DetailRow', () => {
  it('renders label and value', () => {
    render(<DetailRow icon={User} label="Nama Lengkap" value="Budi Santoso" />);
    expect(screen.getByText('Nama Lengkap')).toBeInTheDocument();
    expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
  });

  it('shows italic placeholder when value is null', () => {
    render(<DetailRow icon={User} label="Alamat" value={null} />);
    expect(screen.getByText('Tidak ada data')).toBeInTheDocument();
  });

  it('renders as anchor link when href is provided', () => {
    render(
      <DetailRow
        icon={Mail}
        label="Email"
        value="test@example.com"
        href="mailto:test@example.com"
      />,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'mailto:test@example.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('does not render as link when no href', () => {
    const { container } = render(<DetailRow icon={User} label="Nama" value="Test" />);
    expect(container.querySelectorAll('a').length).toBe(0);
  });

  it('applies hover styles by default', () => {
    const { container } = render(<DetailRow icon={User} label="Nama" value="Test" />);
    const innerDiv = container.querySelector('.group');
    expect(innerDiv).toBeTruthy();
  });

  it('omits hover styles when hoverable={false}', () => {
    const { container } = render(
      <DetailRow icon={User} label="Nama" value="Test" hoverable={false} />,
    );
    const innerDiv = container.querySelector('.group');
    expect(innerDiv).toBeFalsy();
  });

  it('renders label with uppercase CSS class', () => {
    render(<DetailRow icon={User} label="Nama Lengkap" value="Test" />);
    const labelEl = screen.getByText('Nama Lengkap');
    expect(labelEl.className).toContain('uppercase');
  });

  it('renders icon SVG', () => {
    const { container } = render(<DetailRow icon={User} label="Test" value="test" />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it('renders ExternalLink icon when href is provided', () => {
    const { container } = render(
      <DetailRow icon={User} label="Test" value="test" href="https://example.com" />,
    );
    // There should be at least 2 SVGs: the icon + ExternalLink
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(2);
  });

  it('handles empty string value', () => {
    render(<DetailRow icon={User} label="Nama" value="" />);
    expect(screen.getByText('Tidak ada data')).toBeInTheDocument();
  });
});
