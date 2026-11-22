import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CeritaHistoriPanel } from '../CeritaHistoriPanel';

describe('CeritaHistoriPanel', () => {
  it('shows the submitted cerita and proof mode to approvers', () => {
    const cerita = 'Saya berlatih sejak 2010 dan didadar oleh Andi serta Budi pada 2012.';
    render(<CeritaHistoriPanel modeBukti="cerita" ceritaHistori={cerita} />);

    expect(screen.getByRole('heading', { name: /cerita histori/i })).toBeInTheDocument();
    expect(screen.getByText(/mode pembuktian: cerita/i)).toBeInTheDocument();
    expect(screen.getByText(cerita)).toBeInTheDocument();
  });

  it('still shows the proof mode for uploaded evidence claims', () => {
    render(<CeritaHistoriPanel modeBukti="unggah" ceritaHistori={null} />);
    expect(screen.getByText(/mode pembuktian: unggah/i)).toBeInTheDocument();
    expect(screen.queryByText(/cerita histori/i)).not.toBeInTheDocument();
  });

  it('renders nothing when no proof mode or cerita exists', () => {
    const { container } = render(<CeritaHistoriPanel />);
    expect(container).toBeEmptyDOMElement();
  });
});
