/**
 * Shared helpers for mobile screen snapshot tests.
 *
 * These tests assert the *resolved* style outputs of the screens, which contain
 * theme token colors (e.g. `backgroundColor: theme.colors.surfaceMuted`). The
 * purpose is to guard visual integrity after theme-token migrations: if a screen
 * stops referencing a token (hard-codes a color), its snapshot diff will reveal it.
 */

import { jest } from '@jest/globals';

/**
 * A fully mocked `lib/api-client` module. Screens import `apiClient` (default)
 * and named exports `unwrap`/`toAbsoluteUrl`/`setTokens`/`clearTokens`.
 *
 * `unwrap(r)` simply returns `r.data.data` (mirrors the real implementation).
 */
export function mockApiClient(overrides: Partial<Record<'get' | 'post' | 'patch' | 'put' | 'delete', jest.Mock>> = {}) {
  const handlers = {
    get: overrides.get ?? jest.fn().mockResolvedValue({ data: { data: null } }),
    post: overrides.post ?? jest.fn().mockResolvedValue({ data: { data: null } }),
    patch: overrides.patch ?? jest.fn().mockResolvedValue({ data: { data: null } }),
    put: overrides.put ?? jest.fn().mockResolvedValue({ data: { data: null } }),
    delete: overrides.delete ?? jest.fn().mockResolvedValue({ data: { data: null } }),
  };

  jest.doMock('../lib/api-client', () => ({
    __esModule: true,
    default: handlers,
    unwrap: (r: any) => r?.data?.data,
    toAbsoluteUrl: (u?: string | null) => u ?? '',
    setTokens: jest.fn(),
    clearTokens: jest.fn(),
    API_URL: 'http://localhost:3001',
  }));

  return handlers;
}

/**
 * A non-loading `useApi`-style response for mocking two `useApi` hooks at once
 * (e.g. `useMemberProfile` + `useRole` results).
 */
export function loadedResponse(data: unknown) {
  return { data, loading: false, error: null, refetch: jest.fn() };
}

export function loadingResponse() {
  return { data: null, loading: true, error: null, refetch: jest.fn() };
}
