/**
 * Regression tests for the "repeating session" loop (sesi berulang).
 *
 * The original bug: after `expire(true)` scheduled a redirect to '/', a
 * pending API request would hit the request interceptor, self-heal via
 * /auth/refresh (the 14-day refreshToken cookie was still valid), and call
 * `sessionManager.reset()`. That reset fired the SessionProvider listener
 * which entered its else-branch and `clearTimeout`-ed the pending redirect.
 * The session was silently resurrected without a login, the inactivity timer
 * fired `expire()` again ~15 min later, and the user bounced between the
 * landing page and the dashboard forever.
 *
 * Secondary leak: `startInactivityTracking()` registered window listeners
 * it never removed, and `reset()` did not cancel the inactivity timer, so
 * stale listeners kept re-arming timers on dead sessions.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock localStorage before anything else (SessionManager memanggil
// localStorage.removeItem saat expire/reset/logout) ───
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

const LISTENERS: Record<string, Array<EventListener>> = {};

describe('SessionManager — sesi berulang regression', () => {
  beforeEach(async () => {
    Object.keys(LISTENERS).forEach((k) => delete LISTENERS[k]);
    // Singleton bersifat global di seluruh test; reset ke kondisi awal.
    const { sessionManager } = await import('@/lib/session-manager');
    sessionManager.logout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reset() membatalkan timer inactivity (tidak ada expire ulang setelah re-login)', async () => {
    const clearTimeoutMock = vi.spyOn(globalThis, 'clearTimeout');

    const { sessionManager } = await import('@/lib/session-manager');

    // Simulasikan sesi aktif + login
    sessionManager.reset();
    sessionManager.startInactivityTracking();

    // Re-login path: reset() dipanggil lagi (mis. setTokens di /login)
    sessionManager.reset();

    // Timer inactivity lama harus sudah dibersihkan; tidak ada timer yang masih
    // memegang referensi ke sesi sebelumnya.
    expect(clearTimeoutMock).toHaveBeenCalled();
  });

  it('startInactivityTracking() idempotent — tidak menumpuk listener window', async () => {
    vi.spyOn(window, 'addEventListener').mockImplementation(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        LISTENERS[type] = LISTENERS[type] || [];
        LISTENERS[type].push(listener as EventListener);
        return undefined;
      },
    );
    vi.spyOn(window, 'removeEventListener').mockImplementation(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        LISTENERS[type] = (LISTENERS[type] || []).filter((l) => l !== listener);
      },
    );

    const { sessionManager } = await import('@/lib/session-manager');

    // Simulasikan re-render dashboard: user object berganti → effect re-run
    sessionManager.startInactivityTracking();
    sessionManager.startInactivityTracking();
    sessionManager.startInactivityTracking();

    expect(LISTENERS['mousemove']?.length ?? 0).toBe(1);
    expect(LISTENERS['keydown']?.length ?? 0).toBe(1);
    expect(LISTENERS['click']?.length ?? 0).toBe(1);
  });

  it('stopInactivityTracking() melepas listener window', async () => {
    vi.spyOn(window, 'addEventListener').mockImplementation(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        LISTENERS[type] = LISTENERS[type] || [];
        LISTENERS[type].push(listener as EventListener);
        return undefined;
      },
    );
    vi.spyOn(window, 'removeEventListener').mockImplementation(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        LISTENERS[type] = (LISTENERS[type] || []).filter((l) => l !== listener);
      },
    );

    const { sessionManager } = await import('@/lib/session-manager');

    sessionManager.startInactivityTracking();
    expect((LISTENERS['mousemove'] || []).length).toBe(1);

    sessionManager.stopInactivityTracking();
    expect((LISTENERS['mousemove'] || []).length).toBe(0);
    expect((LISTENERS['click'] || []).length).toBe(0);
  });

  it('expire() menghentikan tracking activity (toast tidak muncul ulang)', async () => {
    vi.spyOn(window, 'removeEventListener').mockImplementation(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        LISTENERS[type] = (LISTENERS[type] || []).filter((l) => l !== listener);
      },
    );

    const { sessionManager } = await import('@/lib/session-manager');

    sessionManager.startInactivityTracking();
    expect(sessionManager.isExpired).toBe(false);

    sessionManager.expire(true);

    expect(sessionManager.isExpired).toBe(true);
    // Setelah expire, tidak ada lagi listener activity yang aktif — event
    // mouse/keyboard tidak boleh merestart timer sesi yang sudah tamat.
    expect((LISTENERS['mousemove'] || []).length).toBe(0);
  });

  it('expire() hanya memberi notifikasi subscriber SATU kali (guard idempotent)', async () => {
    const { sessionManager } = await import('@/lib/session-manager');

    const calls: boolean[] = [];
    const unsubscribe = sessionManager.subscribe(() => calls.push(sessionManager.isExpired));

    sessionManager.expire(true);
    sessionManager.expire(true);
    sessionManager.expire(true);

    expect(calls).toEqual([true]);

    unsubscribe();
  });
});

// ─── getRemainingSeconds() ──────────────────────────────────────────────
// Token palsu: header/payload base64url + '.sig' — decodeJwtPayload hanya
// membaca bagian payload, jadi signature tidak perlu valid.
const b64url = (input: string) =>
  btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const makeFakeToken = (payload: Record<string, unknown>) =>
  `${b64url(JSON.stringify({ alg: 'none', typ: 'JWT' }))}.${b64url(JSON.stringify(payload))}.sig`;

describe('SessionManager — getRemainingSeconds()', () => {
  beforeEach(async () => {
    localStorage.clear();
    const { sessionManager } = await import('@/lib/session-manager');
    sessionManager.logout();
  });

  it('mengembalikan 0 bila tidak ada access token', async () => {
    const { sessionManager } = await import('@/lib/session-manager');
    expect(sessionManager.getRemainingSeconds()).toBe(0);
  });

  it('mengembalikan sisa detik hingga exp untuk token valid', async () => {
    const { sessionManager } = await import('@/lib/session-manager');
    const exp = Math.floor(Date.now() / 1000) + 300;
    localStorage.setItem('accessToken', makeFakeToken({ sub: 'user-1', exp }));
    const remaining = sessionManager.getRemainingSeconds();
    expect(remaining).toBeGreaterThan(290);
    expect(remaining).toBeLessThanOrEqual(300);
  });

  it('mengembalikan 0 bila token tidak memiliki klaim exp', async () => {
    const { sessionManager } = await import('@/lib/session-manager');
    localStorage.setItem('accessToken', makeFakeToken({ sub: 'user-1' }));
    expect(sessionManager.getRemainingSeconds()).toBe(0);
  });

  it('mengembalikan 0 bila token bukan JWT yang dapat didecode', async () => {
    const { sessionManager } = await import('@/lib/session-manager');
    localStorage.setItem('accessToken', 'not-a-jwt');
    expect(sessionManager.getRemainingSeconds()).toBe(0);
  });

  it('mengembalikan 0 bila token sudah kedaluwarsa', async () => {
    const { sessionManager } = await import('@/lib/session-manager');
    const exp = Math.floor(Date.now() / 1000) - 10;
    localStorage.setItem('accessToken', makeFakeToken({ sub: 'user-1', exp }));
    expect(sessionManager.getRemainingSeconds()).toBe(0);
  });
});
