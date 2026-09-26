import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

// Mock next/server so NextResponse.next()/redirect() behave as plain objects we
// can assert on. This lets us unit-test the `proxy` auth-gate in isolation
// (menggunakan global fetch untuk memompa respons verifikasi backend).
vi.mock('next/server', () => {
  const next = vi.fn(() => ({ type: 'next' }));
  const redirect = vi.fn((url: URL | string) => ({ type: 'redirect', url: String(url) }));
  return {
    NextResponse: { next, redirect },
  };
});

import { proxy } from '../../proxy';
import { NextResponse } from 'next/server';

const mockedNextResponse = vi.mocked(NextResponse);

function makeRequest(opts: {
  pathname?: string;
  url?: string;
  cookieValue?: string | null;
  e2eBypass?: string | null;
}) {
  const pathname = opts.pathname ?? '/dashboard';
  const url = opts.url ?? `http://localhost:3002${pathname}`;
  const cookies = {
    get: vi.fn((name: string) =>
      name === 'refreshToken' && opts.cookieValue ? { value: opts.cookieValue } : undefined
    ),
    toString: vi.fn(() => (opts.cookieValue ? `refreshToken=${opts.cookieValue}` : '')),
  };
  const headers = {
    get: vi.fn((name: string) => (name === 'x-e2e-bypass' ? opts.e2eBypass ?? null : null)),
  };
  return {
    nextUrl: { pathname },
    url,
    cookies,
    headers,
  } as unknown as NextRequest;
}

describe('proxy (auth gate)', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = mockFetch;
  });

  it('allows public paths through without touching any token / fetch', async () => {
    const req = makeRequest({ pathname: '/login' });
    const res = await proxy(req);
    expect(res).toEqual({ type: 'next' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('allows /force-change-password through — putus loop kick akun must-change-password', async () => {
    // Halaman ini diakses TANPA sesi (login tidak mengeluarkan token ketika
    // mustChangePassword aktif), sehingga proxy tidak boleh menganggapnya
    // protected — kalau tidak, user terjebak loop login → kick → login.
    for (const pathname of ['/force-change-password', '/force-change-password/']) {
      const req = makeRequest({ pathname, cookieValue: null });
      const res = await proxy(req);
      expect(res).toEqual({ type: 'next' });
    }
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('allows /api/* requests through (they are not page routes)', async () => {
    const req = makeRequest({ pathname: '/api/auth/login', cookieValue: null });
    const res = await proxy(req);
    expect(res).toEqual({ type: 'next' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('excludes static assets via the config.matcher regex (not the function body)', () => {
    // RegExp yang sama dengan `export const config.matcher` di proxy.ts.
    const matcher = '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|bmp|woff|woff2|ttf|otf|eot|css|js|map|json|webmanifest|txt|pdf|doc|docx|xls|xlsx|zip|mp4|webm|mp3|wav)).*)';
    const re = new RegExp(matcher);
    // Aset statis tidak dicocokkan → tidak dicegat proxy.
    expect('/logo.svg'.match(re)).toBeNull();
    expect('/peta-indonesia.png'.match(re)).toBeNull();
    expect('/favicon.ico'.match(re)).toBeNull();
    // Route halaman tetap dicocokkan → dicegat (auth) proxy.
    expect('/dashboard'.match(re)).not.toBeNull();
    expect('/login'.match(re)).not.toBeNull();
  });

  it('redirects to /login?session_invalid=1 when there is no refreshToken cookie', async () => {
    const req = makeRequest({ pathname: '/dashboard', cookieValue: null });
    const res = await proxy(req);
    expect(res.type).toBe('redirect');
    expect(String(res.url)).toContain('/login');
    expect(String(res.url)).toContain('session_invalid=1');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('allows the page through when the backend verify returns 200 (valid session)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    const req = makeRequest({ pathname: '/dashboard', cookieValue: 'valid-token' });
    const res = await proxy(req);
    expect(res).toEqual({ type: 'next' });
    // Verifies the fetch hit the backend directly with the cookie attached.
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = mockFetch.mock.calls[0];
    expect(String(calledUrl)).toContain('/api/auth/session/verify');
    expect(init.headers.cookie).toContain('refreshToken=valid-token');
  });

  it('redirects to login when the backend explicitly returns 401 (revoked/expired session)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    const req = makeRequest({ pathname: '/dashboard', cookieValue: 'revoked-token' });
    const res = await proxy(req);
    expect(res.type).toBe('redirect');
    expect(String(res.url)).toContain('session_invalid=1');
  });

  it('fails OPEN (allows through) on 5xx so a flaky backend does not kick valid users', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });
    const req = makeRequest({ pathname: '/dashboard', cookieValue: 'valid-token' });
    const res = await proxy(req);
    expect(res).toEqual({ type: 'next' });
  });

  it('fails OPEN (allows through) on network error / timeout so valid sessions survive', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const req = makeRequest({ pathname: '/dashboard', cookieValue: 'valid-token' });
    const res = await proxy(req);
    expect(res).toEqual({ type: 'next' });
  });

  it('never forwards the incoming host/origin headers to the backend (only cookie)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    const req = makeRequest({ pathname: '/dashboard', cookieValue: 'valid-token' });
    await proxy(req);
    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.host).toBeUndefined();
    expect(init.headers.origin).toBeUndefined();
  });
});
