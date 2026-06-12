'use client';

import apiClient, { unwrap } from '@/lib/api-client';
import { useApi, usePaginatedList } from './use-api';
import type { EmailLogEntry, LogStats, UsedModule, Engagement, SuppressionEntry, SuppressionMeta } from '@/app/(dashboard)/settings/email/shared';

interface SuppressionsResponse {
  data: SuppressionEntry[];
  meta: SuppressionMeta;
}

/**
 * Hook for fetching paginated email logs.
 */
export function useMailLogs(params: {
  page: number;
  status?: string;
  module?: string;
  startDate?: string;
  endDate?: string;
}) {
  const paramsKey = JSON.stringify(params);
  return usePaginatedList<EmailLogEntry>(
    () => {
      const queryParams: Record<string, unknown> = { page: params.page, limit: 20 };
      if (params.status) queryParams.status = params.status;
      if (params.module) queryParams.module = params.module;
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      return apiClient.get('/mail/logs', { params: queryParams }).then(r => r.data);
    },
    [paramsKey],
  );
}

/**
 * Hook for fetching email log statistics.
 */
export function useMailStats(params: {
  module?: string;
  startDate?: string;
  endDate?: string;
}) {
  const paramsKey = JSON.stringify(params);
  return useApi<LogStats>(
    () => {
      const queryParams: Record<string, unknown> = {};
      if (params.module) queryParams.module = params.module;
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      return apiClient.get('/mail/logs/stats', { params: queryParams }).then(r => unwrap<LogStats>(r));
    },
    [paramsKey],
  );
}

/**
 * Hook for fetching paginated email suppressions.
 */
export function useMailSuppressions(page: number) {
  return useApi<SuppressionsResponse>(
    () => apiClient.get('/mail/suppressions', { params: { page, limit: 20 } }).then(r => r.data as SuppressionsResponse),
    [page],
  );
}

/**
 * Hook for fetching email engagement data.
 */
export function useMailEngagement() {
  return useApi<Engagement>(
    () => apiClient.get('/mail/logs/engagement').then(r => unwrap<Engagement>(r)),
    [],
  );
}

/**
 * Hook for fetching available modules (with email count).
 */
export function useMailModules() {
  return useApi<UsedModule[]>(
    () => apiClient.get('/mail/modules').then(r => unwrap<UsedModule[]>(r)),
    [],
  );
}

/**
 * Hook for fetching mail server status.
 */
export function useMailStatus() {
  return useApi<{ mode: string; resend: { configured: boolean; hasApiKey: boolean; hasDomain: boolean }; smtp: { configured: boolean; host: string | null; port: number | null; hasCredentials: boolean } }>(
    () => apiClient.get('/mail/status').then(r => unwrap(r)),
    [],
  );
}
