import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  toast: vi.fn(),
  push: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  default: {
    get: (...args: unknown[]) => mocks.get(...args),
    post: vi.fn(),
  },
}));

vi.mock('@/components/auth/permission-guard', () => ({
  PermissionGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => mocks.toast,
}));

vi.mock('@/components/ui/breadcrumbs', () => ({
  default: () => <nav />,
}));

vi.mock('@/components/claims/FileUploadZone', () => ({
  FileUploadZone: () => <div data-testid="file-upload-zone" />,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

import NewClaimPage from '../../../../app/(dashboard)/claims/new/page';

function requiredLabel(text: string) {
  return screen.getByText(
    (_content, element) =>
      element?.tagName === 'LABEL' && element.textContent?.trim() === `${text} *`,
  );
}

describe('admin claim form parity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({ data: { data: [] } });
  });

  it('marks tempat lahir, tanggal lahir, and alamat as required', () => {
    render(<NewClaimPage />);

    for (const text of ['Tempat Lahir', 'Tanggal Lahir', 'Alamat']) {
      const marker = requiredLabel(text).querySelector('span');
      expect(marker).not.toBeNull();
      expect(marker).toHaveTextContent('*');
      expect(marker).toHaveClass('text-red-500');
    }
  });

  it('submits through the shared validator without native validation', async () => {
    render(<NewClaimPage />);

    const form = screen.getByRole('button', { name: 'Ajukan Klaim' }).closest('form');
    expect(form).not.toBeNull();
    expect(form).toHaveAttribute('novalidate');

    fireEvent.submit(form!);
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith('error', 'Nama lengkap minimal 3 karakter'),
    );
  });
});
