import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Must mock before importing the hooks
vi.mock('@/lib/api-client', () => ({
  default: {
    get: vi.fn(),
  },
}));

import apiClient from '@/lib/api-client';
import {
  useMailLogs,
  useMailStats,
  useMailSuppressions,
  useMailEngagement,
  useMailModules,
  useMailStatus,
} from '../use-mail';

const mockApi = vi.mocked(apiClient);

const mockLogsResponse = {
  data: {
    data: [
      { id: '1', to: 'a@b.com', subject: 'Test', status: 'sent', provider: 'resend', error: null, metadata: { module: 'members' }, createdAt: '2026-05-01T00:00:00.000Z' },
    ],
    meta: { total: 1, totalPages: 1, page: 1, limit: 20 },
  },
};

const mockStatsResponse = {
  data: {
    data: {
      total: 10, sent: 8, failed: 1, skipped: 1, successRate: 80,
      dailyStats: [{ date: '2026-05-01', sent: 5, failed: 0, skipped: 1 }],
      topRecipients: [{ email: 'a@b.com', count: 3 }],
    },
  },
};

const mockSuppressionsResponse = {
  data: {
    data: [
      { id: '1', email: 'bounce@b.com', reason: 'bounced', event: { event: 'bounce', timestamp: '2026-05-01T00:00:00.000Z' }, createdAt: '2026-05-01T00:00:00.000Z' },
    ],
    meta: { total: 1, totalPages: 1, page: 1, limit: 20 },
  },
};

const mockEngagementResponse = {
  data: {
    data: {
      totalSent: 100, totalEvents: 50, events: { opened: 30, clicked: 10 },
      rates: { delivered: 95, opened: 30, clicked: 10, bounced: 5, complained: 0 },
      dailyTrend: [{ date: '2026-05-01', sent: 20, opened: 6, clicked: 2, bounced: 1, openRate: 30, clickRate: 10, bounceRate: 5 }],
    },
  },
};

const mockModulesResponse = {
  data: {
    data: [
      { module: 'members', count: 5 },
      { module: 'auth', count: 3 },
    ],
  },
};

const mockStatusResponse = {
  data: {
    data: {
      mode: 'production',
      resend: { configured: true, hasApiKey: true, hasDomain: true },
      smtp: { configured: true, host: 'smtp.example.com', port: 587, hasCredentials: true },
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── useMailLogs ───

describe('useMailLogs', () => {
  it('fetches paginated logs on mount', async () => {
    mockApi.get.mockResolvedValue(mockLogsResponse);

    const { result } = renderHook(() => useMailLogs({ page: 1 }));

    expect(mockApi.get).toHaveBeenCalledWith('/mail/logs', {
      params: { page: 1, limit: 20 },
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].to).toBe('a@b.com');
    expect(result.current.meta!.total).toBe(1);
  });

  it('passes optional filter params', async () => {
    mockApi.get.mockResolvedValue(mockLogsResponse);

    renderHook(() => useMailLogs({
      page: 1,
      status: 'failed',
      module: 'members',
      startDate: '2026-05-01',
      endDate: '2026-05-31',
    }));

    expect(mockApi.get).toHaveBeenCalledWith('/mail/logs', {
      params: { page: 1, limit: 20, status: 'failed', module: 'members', startDate: '2026-05-01', endDate: '2026-05-31' },
    });
  });

  it('re-fetches when params change', async () => {
    mockApi.get.mockResolvedValue(mockLogsResponse);

    const { result, rerender } = renderHook(
      (params: { page: number; module?: string }) => useMailLogs(params),
      { initialProps: { page: 1 } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockApi.get).toHaveBeenCalledTimes(1);
    expect(mockApi.get).toHaveBeenCalledWith('/mail/logs', {
      params: { page: 1, limit: 20 },
    });

    mockApi.get.mockResolvedValueOnce(mockLogsResponse);
    rerender({ page: 2 });

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledTimes(2);
      expect(mockApi.get).toHaveBeenLastCalledWith('/mail/logs', {
        params: { page: 2, limit: 20 },
      });
    });
  });
});

// ─── useMailStats ───

describe('useMailStats', () => {
  it('fetches stats on mount', async () => {
    mockApi.get.mockResolvedValue(mockStatsResponse);

    const { result } = renderHook(() => useMailStats({}));

    expect(mockApi.get).toHaveBeenCalledWith('/mail/logs/stats', {
      params: {},
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data!.total).toBe(10);
    expect(result.current.data!.sent).toBe(8);
    expect(result.current.data!.successRate).toBe(80);
  });

  it('passes optional module filter', async () => {
    mockApi.get.mockResolvedValue(mockStatsResponse);

    renderHook(() => useMailStats({ module: 'members' }));

    expect(mockApi.get).toHaveBeenCalledWith('/mail/logs/stats', {
      params: { module: 'members' },
    });
  });
});

// ─── useMailSuppressions ───

describe('useMailSuppressions', () => {
  it('fetches suppressions on mount', async () => {
    mockApi.get.mockResolvedValue(mockSuppressionsResponse);

    const { result } = renderHook(() => useMailSuppressions(1));

    expect(mockApi.get).toHaveBeenCalledWith('/mail/suppressions', {
      params: { page: 1, limit: 20 },
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data!.data).toHaveLength(1);
    expect(result.current.data!.data[0].email).toBe('bounce@b.com');
    expect(result.current.data!.meta.total).toBe(1);
  });

  it('re-fetches when page changes', async () => {
    mockApi.get.mockResolvedValue(mockSuppressionsResponse);

    const { result, rerender } = renderHook(
      (page: number) => useMailSuppressions(page),
      { initialProps: 1 },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockApi.get).toHaveBeenCalledTimes(1);

    mockApi.get.mockResolvedValueOnce(mockSuppressionsResponse);
    rerender(2);

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledTimes(2);
      expect(mockApi.get).toHaveBeenLastCalledWith('/mail/suppressions', {
        params: { page: 2, limit: 20 },
      });
    });
  });
});

// ─── useMailEngagement ───

describe('useMailEngagement', () => {
  it('fetches engagement data on mount', async () => {
    mockApi.get.mockResolvedValue(mockEngagementResponse);

    const { result } = renderHook(() => useMailEngagement());

    expect(mockApi.get).toHaveBeenCalledWith('/mail/logs/engagement');

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data!.totalSent).toBe(100);
    expect(result.current.data!.rates.delivered).toBe(95);
  });
});

// ─── useMailModules ───

describe('useMailModules', () => {
  it('fetches modules on mount', async () => {
    mockApi.get.mockResolvedValue(mockModulesResponse);

    const { result } = renderHook(() => useMailModules());

    expect(mockApi.get).toHaveBeenCalledWith('/mail/modules');

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].module).toBe('members');
  });
});

// ─── useMailStatus ───

describe('useMailStatus', () => {
  it('fetches mail server status on mount', async () => {
    mockApi.get.mockResolvedValue(mockStatusResponse);

    const { result } = renderHook(() => useMailStatus());

    expect(mockApi.get).toHaveBeenCalledWith('/mail/status');

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data!.mode).toBe('production');
    expect(result.current.data!.resend.configured).toBe(true);
  });
});

// ─── Error handling ───

describe('email hooks error handling', () => {
  it('handles API errors gracefully for useMailLogs', async () => {
    mockApi.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMailLogs({ page: 1 }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([]);
    expect(result.current.meta).toEqual({ total: 0, totalPages: 0 });
  });

  it('handles API errors gracefully for useMailStats', async () => {
    mockApi.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMailStats({}));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
  });

  it('handles API errors gracefully for useMailSuppressions', async () => {
    mockApi.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMailSuppressions(1));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
  });

  it('handles API errors gracefully for useMailEngagement', async () => {
    mockApi.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMailEngagement());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
  });

  it('handles API errors gracefully for useMailModules', async () => {
    mockApi.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMailModules());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
  });
});
