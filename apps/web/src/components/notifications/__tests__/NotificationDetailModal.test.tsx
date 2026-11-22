import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NotificationDetailModal, {
  getSafeInternalUrl,
  type NotificationDetail,
} from '../NotificationDetailModal';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const baseNotification: NotificationDetail = {
  id: 'n1',
  judul: 'KTA Disetujui',
  isi: 'Pengajuan KTA Anda disetujui.',
  tipe: 'kta_approved',
  isRead: true,
  createdAt: '2026-11-15T01:00:00.000Z',
};

describe('getSafeInternalUrl', () => {
  it('accepts internal paths starting with a single slash', () => {
    expect(getSafeInternalUrl({ url: '/kta/123' })).toBe('/kta/123');
    expect(getSafeInternalUrl({ url: '/kta/123?tab=biaya#detail' })).toBe(
      '/kta/123?tab=biaya#detail',
    );
  });

  it.each([
    'javascript:alert(1)',
    'http://evil.example/path',
    'https://evil.example/path',
    '//evil.example/path',
    '/\\evil.example/path',
    ' /kta/123',
    '/kta\njavascript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
  ])('rejects unsafe url %j', (url) => {
    expect(getSafeInternalUrl({ url })).toBeNull();
  });

  it('rejects missing or non-string urls', () => {
    expect(getSafeInternalUrl(undefined)).toBeNull();
    expect(getSafeInternalUrl({})).toBeNull();
    expect(getSafeInternalUrl({ url: 42 })).toBeNull();
  });
});

describe('NotificationDetailModal', () => {
  it('links a safe data.url with a Buka button', () => {
    render(
      <NotificationDetailModal
        notification={{
          ...baseNotification,
          data: { url: '/kta/123' },
        }}
        onClose={vi.fn()}
      />,
    );

    const link = screen.getByRole('link', { name: 'Buka' });
    expect(link).toHaveAttribute('href', '/kta/123');
  });

  it.each([
    'javascript:alert(1)',
    'http://evil.example/path',
    'https://evil.example/path',
    '//evil.example/path',
    '/\\evil.example/path',
  ])('does not link unsafe data.url %j', (url) => {
    render(
      <NotificationDetailModal
        notification={{ ...baseNotification, data: { url } }}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByRole('link', { name: 'Buka' })).toBeNull();
  });
});
