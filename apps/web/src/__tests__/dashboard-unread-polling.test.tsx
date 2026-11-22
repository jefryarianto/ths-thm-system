import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const state = { count: 0 };
  const socket = {
    on: vi.fn(),
    off: vi.fn(),
    connected: false,
  };
  const getSocket = vi.fn(() => socket);
  const apiGet = vi.fn((url: string) =>
    Promise.resolve(
      url === '/notifications/count' ? { data: { data: { count: state.count } } } : { data: [] },
    ),
  );
  return { state, socket, getSocket, apiGet };
});

vi.mock('@/lib/socket', () => ({
  getSocket: mocks.getSocket,
  disconnectSocket: vi.fn(),
}));
vi.mock('@/lib/api-client', () => ({
  default: {
    get: mocks.apiGet,
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  },
}));
vi.mock('@/lib/session-manager', () => ({
  sessionManager: {
    startInactivityTracking: vi.fn(),
    stopInactivityTracking: vi.fn(),
    logout: vi.fn(),
  },
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: null,
    role: null,
    isAdmin: false,
    hasRole: () => false,
    hasMinRole: () => false,
    isActivityScoped: false,
    isActivityAdmin: false,
    isActivityPenguji: false,
  }),
}));
vi.mock('@/hooks/use-menu-overrides', () => ({ useMenuOverrides: () => ({}) }));
vi.mock('@/lib/role-redirect', () => ({
  getHomePathForRole: () => '/dashboard',
  getAdminDashboardRedirect: () => null,
}));
vi.mock('@/lib/scope-badge', () => ({
  extractScopeUnits: () => [],
  findScopeUnitName: () => null,
  resolveScopeBadgeTarget: () => null,
}));
vi.mock('@/components/layout/navigation', () => ({
  menuGroups: [],
  filterVisibleGroups: () => [],
  getPageTitle: () => 'Dashboard',
  DEFAULT_OPEN_GROUPS: {},
}));
vi.mock('@/components/layout/sidebar', () => ({ default: () => null }));
vi.mock('@/components/layout/dashboard-header', () => ({
  default: ({ unreadCount }: { unreadCount: number }) => (
    <div data-testid="unread-count">{unreadCount}</div>
  ),
}));
vi.mock('@/components/layout/command-palette', () => ({ CommandPalette: () => null }));
vi.mock('@/components/welcome/admin-kegiatan-guide', () => ({ default: () => null }));
vi.mock('@/components/welcome/penguji-guide', () => ({ default: () => null }));

import DashboardLayout from '../../app/(dashboard)/layout';

describe('dashboard unread badge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => (key === 'accessToken' ? 'token' : null)),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
    });
    mocks.state.count = 0;
    mocks.getSocket.mockClear();
    mocks.socket.on.mockClear();
    mocks.socket.off.mockClear();
    mocks.apiGet.mockClear();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls /notifications/count every 30s even when getSocket returns a noop socket', async () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

    render(
      <DashboardLayout>
        <div>content</div>
      </DashboardLayout>,
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(mocks.getSocket).toHaveBeenCalledWith('token');
    expect(mocks.socket.on).toHaveBeenCalledWith('notification:new', expect.any(Function));
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);

    mocks.state.count = 7;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(screen.getByTestId('unread-count')).toHaveTextContent('7');
    setIntervalSpy.mockRestore();
  });

  it('still updates immediately from socket count events', async () => {
    render(
      <DashboardLayout>
        <div>content</div>
      </DashboardLayout>,
    );
    await act(async () => {
      await Promise.resolve();
    });

    const call = mocks.socket.on.mock.calls.find(([event]) => event === 'notification:count');
    expect(call).toBeDefined();
    const handler = (call as [string, (payload: { count: number }) => void])[1];

    await act(async () => {
      handler({ count: 12 });
    });
    expect(screen.getByTestId('unread-count')).toHaveTextContent('12');
  });
});
