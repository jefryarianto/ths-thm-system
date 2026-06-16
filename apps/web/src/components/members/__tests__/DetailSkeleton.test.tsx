import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DetailSkeleton } from '../constants';

describe('Members DetailSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<DetailSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('has animate-pulse class', () => {
    const { container } = render(<DetailSkeleton />);
    const firstDiv = container.firstChild as HTMLElement;
    expect(firstDiv.className).toContain('animate-pulse');
  });

  it('renders skeleton grid with two columns on large screens', () => {
    const { container } = render(<DetailSkeleton />);
    const gridDivs = container.querySelectorAll('.lg\\:grid-cols-2');
    expect(gridDivs.length).toBeGreaterThanOrEqual(1);
  });
});
