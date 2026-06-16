import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DetailSkeleton } from '../constants';

describe('DetailSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<DetailSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('has animate-pulse class', () => {
    const { container } = render(<DetailSkeleton />);
    const firstDiv = container.firstChild as HTMLElement;
    expect(firstDiv.className).toContain('animate-pulse');
  });

  it('renders skeleton placeholders', () => {
    const { container } = render(<DetailSkeleton />);
    const roundedElements = container.querySelectorAll('.rounded');
    expect(roundedElements.length).toBeGreaterThanOrEqual(3);
  });
});
