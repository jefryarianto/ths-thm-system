import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { paramsRef, replace, push, logout, localStorageMock, sessionStorageMock } = vi.hoisted(() => {
  const makeStorage = () => {
    const store = new Map<string, string>();
    return {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, String(value)),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() {
        return store.size;
      },
    } as Storage;
  };

  return {
    paramsRef: { current: new URLSearchParams('') },
    replace: vi.fn(),
    push: vi.fn(),
    logout: vi.fn(),
    localStorageMock: makeStorage(),
    sessionStorageMock: makeStorage(),
  };
});

vi.stubGlobal('localStorage', localStorageMock);
vi.stubGlobal('sessionStorage', sessionStorageMock);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push }),
  useSearchParams: () => paramsRef.current,
}));

vi.mock('@/lib/session-manager', () => ({
  sessionManager: {
    logout,
    reset: vi.fn(),
    scheduleExpiryWarning: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
  },
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { role: 'superadmin' },
    isAuthenticated: true,
  }),
}));

vi.mock('@/lib/api-client', () => {
  const apiClient = {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: { success: false } }),
  };
  return { default: apiClient, setTokens: vi.fn() };
});

import LoginPage from '@/app/login/page';

describe('LoginPage session_invalid handling', () => {
  beforeEach(() => {
    paramsRef.current = new URLSearchParams('');
    replace.mockClear();
    push.mockClear();
    logout.mockClear();
    localStorageMock.clear();
    sessionStorageMock.clear();
  });

  it('clears stale auth state when session_invalid arrives after mount', async () => {
    localStorageMock.setItem('user', JSON.stringify({ id: 'stale', role: 'superadmin' }));

    const { rerender } = render(<LoginPage />);
    await screen.findByLabelText('Anda sudah masuk. Mengalihkan...');

    paramsRef.current = new URLSearchParams('session_invalid=1');
    rerender(<LoginPage />);

    await waitFor(() => expect(logout).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('login-submit')).toBeInTheDocument());
  });
});
