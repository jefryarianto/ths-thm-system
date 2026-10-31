type ExpiringSoonListener = (expiresInSeconds: number) => void;

export const SESSION_EXPIRY_WARNING_SECONDS = 300;

// Decode a JWT payload safely. Returns null if the token is invalid.
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// Web session inactivity timeout.
// Default 15 menit. Dapat dioverride via NEXT_PUBLIC_INACTIVITY_TIMEOUT_MINUTES
// (integer menit, di-inline Next.js saat build). Min 1 menit; nilai tidak valid
// diabaikan dan fallback ke default. Default lama 5 menit sering menendang
// user yang hanya membaca halaman tanpa input — pesan "sesi berakhir" yang
// datang tiba-tiba.
const DEFAULT_INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
const INACTIVITY_TIMEOUT_MS = (() => {
  if (typeof process === 'undefined') return DEFAULT_INACTIVITY_TIMEOUT_MS;
  const raw = Number(process.env.NEXT_PUBLIC_INACTIVITY_TIMEOUT_MINUTES);
  if (!Number.isFinite(raw) || raw < 1) return DEFAULT_INACTIVITY_TIMEOUT_MS;
  return Math.floor(raw) * 60 * 1000;
})();

class SessionManager {
  private static instance: SessionManager;
  private listeners: Set<() => void> = new Set();
  private expiringSoonListeners: Set<ExpiringSoonListener> = new Set();
  private _isExpired = false;
  private _terminalExpiry = false;
  private _expiryWarningTimer: ReturnType<typeof setTimeout> | undefined;
  private _expiryDeadlineTimer: ReturnType<typeof setTimeout> | undefined;
  private _expiryWarningFired = false;
  private _inactivityTimer: ReturnType<typeof setTimeout> | undefined;
  // Handler global activity yang sedang terdaftar di window — disimpan agar
  // bisa dilepas (removeEventListener) saat tracking dihentikan.
  private _activityHandler: (() => void) | undefined;
  private _lastActivityAt = Date.now();

  private constructor() {}

  static getInstance() {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  get isExpired() {
    return this._isExpired;
  }

  /** True hanya untuk expiry yang disengaja (timer habis / refresh token invalid). */
  get isTerminalExpiry() {
    if (this._terminalExpiry) return true;
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('session-expired') === 'true';
    } catch {
      return false;
    }
  }

  // ─── Session State Listeners ──────────────────────────────────

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ─── Expiring Soon Listeners ──────────────────────────────────

  /**
   * Subscribe to "expiring soon" events. The callback receives the number
   * of seconds remaining before the token expires.
   */
  subscribeExpiringSoon(listener: ExpiringSoonListener) {
    this.expiringSoonListeners.add(listener);
    return () => this.expiringSoonListeners.delete(listener);
  }

  // ─── Expiry Timers ───────────────────────────────────────────

  private clearExpiryDeadline() {
    if (this._expiryDeadlineTimer) {
      clearTimeout(this._expiryDeadlineTimer);
      this._expiryDeadlineTimer = undefined;
    }
  }

  /**
   * Decode the access token and schedule a warning toast N seconds before
   * the JWT expires. Default warning window: 300 seconds (5 minutes).
   * Called after every token set/refresh.
   */
  scheduleExpiryWarning(accessToken: string, warnSecondsBefore = SESSION_EXPIRY_WARNING_SECONDS) {
    this.cancelExpiryWarning();
    this._expiryWarningFired = false;

    if (typeof window === 'undefined') return;

    const payload = decodeJwtPayload(accessToken);
    if (!payload || typeof payload.exp !== 'number') return;

    const expiresAtMs = payload.exp * 1000;
    const now = Date.now();
    const secondsUntilExpiry = Math.floor((expiresAtMs - now) / 1000);

    // Token sudah kedaluwarsa → akhiri sesi
    if (secondsUntilExpiry <= 0) {
      this.expire(true);
      return;
    }

    // Deadline keras: logout tepat saat token habis jika tidak diperpanjang
    this.clearExpiryDeadline();
    const msUntilExpiry = expiresAtMs - Date.now();
    if (msUntilExpiry <= 0) {
      this.expire(true);
      return;
    }
    this._expiryDeadlineTimer = setTimeout(() => {
      this._expiryDeadlineTimer = undefined;
      if (typeof window === 'undefined') return;
      if (this._isExpired) return;
      const currentToken = localStorage.getItem('accessToken');
      if (!currentToken) return;
      if (currentToken !== accessToken) {
        this.scheduleExpiryWarning(currentToken);
        return;
      }
      const remaining = this.getRemainingSeconds();
      if (remaining <= 0) {
        this.expire(true);
        return;
      }
      // Timer terlalu awal (clock skew) → jadwalkan ulang
      this.scheduleExpiryWarning(currentToken);
    }, msUntilExpiry);

    const secondsUntilWarning = secondsUntilExpiry - warnSecondsBefore;

    // eslint-disable-next-line no-console -- verbose session timing diagnostic
    console.debug(
      `[session-manager] Token expires in ${secondsUntilExpiry}s, warning in ${Math.max(secondsUntilWarning, 0)}s`,
    );

    if (secondsUntilWarning <= 0) {
      // Already within the warning window — fire immediately
      this._fireExpiringSoon(secondsUntilExpiry);
      return;
    }

    this._expiryWarningTimer = setTimeout(() => {
      this._fireExpiringSoon(secondsUntilExpiry);
    }, secondsUntilWarning * 1000);
  }

  /** Cancel any pending expiry warning and deadline. */
  cancelExpiryWarning() {
    if (this._expiryWarningTimer) {
      clearTimeout(this._expiryWarningTimer);
      this._expiryWarningTimer = undefined;
    }
    this.clearExpiryDeadline();
  }

  /**
   * Re-schedule the warning after a proactive refresh. Resets the timer
   * based on the new token's exp claim.
   */
  onTokenRefreshed(accessToken: string) {
    this.scheduleExpiryWarning(accessToken);
  }

  /**
   * Get remaining seconds until the current access token expires.
   * Returns 0 if no valid token is present.
   */
  getRemainingSeconds(): number {
    const token = localStorage.getItem('accessToken');
    if (!token) return 0;
    const payload = decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== 'number') return 0;
    const nowSec = Math.floor(Date.now() / 1000);
    return Math.max(payload.exp - nowSec, 0);
  }

  private _fireExpiringSoon(secondsRemaining: number) {
    if (this._expiryWarningFired || this._isExpired) return;
    this._expiryWarningFired = true;
    // eslint-disable-next-line no-console -- verbose session timing diagnostic
    console.debug(`[session-manager] Token expiring soon: ${secondsRemaining}s remaining`);
    this.expiringSoonListeners.forEach((l) => l(secondsRemaining));
  }

  // ─── Inactivity Timeout ─────────────────────────────────────

  /** Track user activity to reset the inactivity timer */
  trackActivity() {
    if (this._isExpired) return;
    this._lastActivityAt = Date.now();
    this.resetInactivityTimer();
  }

  /** Reset the inactivity timer */
  private resetInactivityTimer() {
    if (this._inactivityTimer) {
      clearTimeout(this._inactivityTimer);
    }
    this._inactivityTimer = setTimeout(() => {
      if (!this._isExpired) {
        // eslint-disable-next-line no-console -- verbose session timing diagnostic
        console.debug('[session-manager] Inactivity timeout reached, expiring session');
        this.expire(true);
      }
    }, INACTIVITY_TIMEOUT_MS);
  }

  /** Start tracking activity (called after login) */
  startInactivityTracking() {
    // BUG FIX: fungsi ini mendaftarkan listener window tapi tidak pernah
    // melepasnya, dan dipanggil ulang setiap kali objek `user` berganti
    // (useAuth membuat state baru tiap render → useEffect [user] re-run).
    // Listener lama terus aktif & bertumpuk, memanggil trackActivity() pada
    // timer yang sudah seharusnya mati. Lepas dulu listener sebelumnya
    // (idempotent) baru pasang yang bersih.
    this.stopInactivityTracking();
    if (this._isExpired) return;

    this._lastActivityAt = Date.now();
    this.resetInactivityTimer();

    // Listen for user activity
    const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handler = () => this.trackActivity();
    this._activityHandler = handler;
    events.forEach((event) => window.addEventListener(event, handler, { passive: true }));
  }

  /** Stop tracking activity (called on logout) */
  stopInactivityTracking() {
    if (this._inactivityTimer) {
      clearTimeout(this._inactivityTimer);
      this._inactivityTimer = undefined;
    }
    // BUG FIX: lepas listener window yang dipasang startInactivityTracking,
    // bukan hanya menghentikan timernya. Tanpa ini listener terus mendaftar
    // event mouse/keyboard dan memanggil resetInactivityTimer() bahkan setelah
    // sesi berakhir, yang merestart countdown di luar kendali login state.
    if (this._activityHandler) {
      const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
      events.forEach((event) =>
        window.removeEventListener(event, this._activityHandler as EventListener),
      );
      this._activityHandler = undefined;
    }
  }

  // ─── Expire / Reset ──────────────────────────────────────────

  expire(shouldRedirect = true) {
    if (this._isExpired) return;
    // eslint-disable-next-line no-console -- verbose session timing diagnostic
    console.debug('[session-manager] Session expired', { shouldRedirect });
    this._isExpired = true;
    if (shouldRedirect) {
      this._terminalExpiry = true;
    }
    this.cancelExpiryWarning();
    // BUG FIX: hentikan tracking activity. Tanpa ini, listener mouse/keyboard
    // tetap aktif setelah sesi berakhir, memanggil trackActivity() ->
    // resetInactivityTimer() yang menjadwalkan timeout baru, sementara
    // _isExpired sudah true. Timer itu memicu expire() lagi (di-guard, tidak
    // melakukan apa-apa) TAPI inilah sumber "toast sesi berakhir" yang
    // muncul berulang dan jeda aneh saat user sudah ada di halaman publik.
    this.stopInactivityTracking();
    // Also drop the cached user: useAuth() reads localStorage['user'], and a
    // stale user object keeps `isAuthenticated` true (and app/page.tsx's
    // role-redirect) even though the server session is gone — bouncing the
    // user off the public landing page into a /login?session_invalid=1 loop.
    this.clearTokens();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('user');
      } catch {
        /* ignore */
      }
    }
    if (shouldRedirect) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('session-expired', 'true');
        } catch {
          /* ignore */
        }
      }
    }
    this.listeners.forEach((l) => l());
  }

  clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  /**
   * Clean logout — clears tokens and state WITHOUT firing expired listeners
   * (no toast, no redirect). Use this for voluntary logout.
   */
  logout() {
    this._isExpired = false;
    this._terminalExpiry = false;
    this._expiryWarningFired = false;
    this.cancelExpiryWarning();
    this.stopInactivityTracking();
    this.clearTokens();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('session-expired');
        localStorage.removeItem('user');
      } catch {
        /* ignore */
      }
    }
    // Notify subscribers (e.g. useAuth) so any client-side "authenticated"
    // state derived from a stale localStorage.user is cleared immediately.
    // This breaks the login redirect loop where the server rejects a
    // protected page (invalid refreshToken) but the client still believes
    // it is signed in and keeps bouncing back to the dashboard.
    this.listeners.forEach((l) => l());
  }

  reset() {
    this._isExpired = false;
    this._terminalExpiry = false;
    this._expiryWarningFired = false;
    this.cancelExpiryWarning();
    // BUG FIX (loop "sesi berulang"): reset() TIDAK membatalkan timer
    // ketidakaktifan. Setelah login ulang, timer lama tetap berjalan dan
    // memicu expire() lagi → toast "sesi berakhir" + redirect, lalu self-healing
    // interceptor berhasil refresh (cookie 14 hari masih ada) → reset() lagi.
    // Siklus ini membuat pengguna ditarik pulang-pergi landing ↔ dashboard
    // tanpa henti. Hentikan semua timer sesi sebelum memberi tahu subscriber.
    this.stopInactivityTracking();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('session-expired');
      } catch {
        /* ignore */
      }
    }
    this.listeners.forEach((l) => l());
  }
}

export const sessionManager = SessionManager.getInstance();
