import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InfoRow } from '../constants';
import { User, Mail } from 'lucide-react';

describe('InfoRow (members)', () => {
  it('renders label and value', () => {
    render(<InfoRow icon={User} label="Nama Lengkap" value="Budi Santoso" />);
    expect(screen.getByText('Nama Lengkap')).toBeInTheDocument();
    expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
  });

  it('shows italic placeholder when value is null', () => {
    render(<InfoRow icon={User} label="Alamat" value={null} />);
    expect(screen.getByText('Tidak ada data')).toBeInTheDocument();
  });

  it('renders with href as an anchor link', () => {
    render(
      <InfoRow icon={Mail} label="Email" value="test@example.com" href="mailto:test@example.com" />,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'mailto:test@example.com');
  });

  it('does not render as link when no href', () => {
    const { container } = render(<InfoRow icon={User} label="Nama" value="Test" />);
    const links = container.querySelectorAll('a');
    expect(links.length).toBe(0);
  });

  it('renders icon SVG', () => {
    const { container } = render(<InfoRow icon={User} label="Test" value="test" />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it('renders with label in uppercase tracking style', () => {
    render(<InfoRow icon={User} label="Nama Lengkap" value="Test" />);
    const labelEl = screen.getByText('Nama Lengkap');
    expect(labelEl.className).toContain('uppercase');
  });
});
