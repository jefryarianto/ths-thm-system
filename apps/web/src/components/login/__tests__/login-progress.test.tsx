import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoginSteps, SuccessCheck } from '../login-progress';

describe('LoginSteps', () => {
  it('merender 3 langkah dengan label persis', () => {
    render(<LoginSteps doneCount={0} activeIndex={0} />);
    expect(screen.getByText('Memverifikasi kredensial')).toBeInTheDocument();
    expect(screen.getByText('Membuat sesi aman')).toBeInTheDocument();
    expect(screen.getByText('Mengalihkan ke dashboard')).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveAttribute('data-state', 'active');
    expect(items[1]).toHaveAttribute('data-state', 'pending');
    expect(items[2]).toHaveAttribute('data-state', 'pending');
  });

  it('menandai langkah selesai saat doneCount bertambah', () => {
    render(<LoginSteps doneCount={2} activeIndex={2} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveAttribute('data-state', 'done');
    expect(items[1]).toHaveAttribute('data-state', 'done');
    expect(items[2]).toHaveAttribute('data-state', 'active');
  });
});

describe('SuccessCheck', () => {
  it('SuccessCheck merender svg checkmark', () => {
    const { container } = render(<SuccessCheck />);
    expect(container.querySelector('svg.success-check')).toBeInTheDocument();
    expect(container.querySelector('path')).toBeInTheDocument();
  });
});
