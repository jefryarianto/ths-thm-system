import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InfoRow } from '../constants';
import { User, Mail } from 'lucide-react';

describe('InfoRow', () => {
  it('renders label and value', () => {
    render(<InfoRow icon={User} label="Nama Lengkap" value="Budi Santoso" />);
    expect(screen.getByText('Nama Lengkap')).toBeInTheDocument();
    expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
  });

  it('shows italic placeholder when value is null', () => {
    render(<InfoRow icon={User} label="Alamat" value={null} />);
    expect(screen.getByText('Tidak ada data')).toBeInTheDocument();
  });

  it('renders with icon SVG', () => {
    const { container } = render(<InfoRow icon={User} label="Test" value="test" />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });
});
