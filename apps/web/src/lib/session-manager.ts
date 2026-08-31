type ExpiringSoonListener = (expiresInSeconds: number) => void;

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

class SessionManager {
  private static instance: SessionManager;
  private listeners: Set<() => void> = new Set();
  private expiringSoonListeners: Set<ExpiringSoonListener> = new Set();
  private _isExpired = false;
  private _expiryWarningTimer: ReturnType<typeof setTimeout> | undefined;
  private _expiryWarningFired = false;

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

  // ─── Expiry Warning Timer ─────────────────────────────────────

  /**
   * Decode the access token and schedule a warning toast N seconds before
   * the JWT expires. Default warning window: 300 seconds (5 minutes).
   * Called after every token set/refresh.
   */
  scheduleExpiryWarning(accessToken: string, warnSecondsBefore = 300) {
    this.cancelExpiryWarning();
    this._expiryWarningFired = false;

    const payload = decodeJwtPayload(accessToken);
    if (!payload || typeof payload.exp !== 'number') return;

    const expiresAtMs = payload.exp * 1000;
    const now = Date.now();
    const secondsUntilExpiry = Math.floor((expiresAtMs - now) / 1000);
    const secondsUntilWarning = secondsUntilExpiry - warnSecondsBefore;

    console.log(
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

  /** Cancel any pending expiry warning. */
  cancelExpiryWarning() {
    if (this._expiryWarningTimer) {
      clearTimeout(this._expiryWarningTimer);
      this._expiryWarningTimer = undefined;
    }
  }

  /**
   * Re-schedule the warning after a proactive refresh. Resets the timer
   * based on the new token's exp claim.
   */
  onTokenRefreshed(accessToken: string) {
    this.scheduleExpiryWarning(accessToken);
  }

  private _fireExpiringSoon(secondsRemaining: number) {
    if (this._expiryWarningFired || this._isExpired) return;
    this._expiryWarningFired = true;
    console.log(`[session-manager] Token expiring soon: ${secondsRemaining}s remaining`);
    this.expiringSoonListeners.forEach((l) => l(secondsRemaining));
  }

  // ─── Expire / Reset ──────────────────────────────────────────

  expire(shouldRedirect = true) {
    if (this._isExpired) return;
    console.log('[session-manager] Session expired', { shouldRedirect });
    this._isExpired = true;
    this.cancelExpiryWarning();
    this.clearTokens();
    if (shouldRedirect) {
      localStorage.setItem('session-expired', 'true');
    }
    this.listeners.forEach((l) => l());
  }

  clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  reset() {
    this._isExpired = false;
    this._expiryWarningFired = false;
    this.cancelExpiryWarning();
    localStorage.removeItem('session-expired');
    this.listeners.forEach((l) => l());
  }
}

export const sessionManager = SessionManager.getInstance();
