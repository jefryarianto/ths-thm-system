class SessionManager {
  private static instance: SessionManager;
  private listeners: Set<() => void> = new Set();
  private _isExpired = false;

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

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  expire(shouldRedirect = true) {
    if (this._isExpired) return;
    console.log('[session-manager] Session expired', { shouldRedirect });
    this._isExpired = true;
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
    localStorage.removeItem('session-expired');
    this.listeners.forEach((l) => l());
  }
}

export const sessionManager = SessionManager.getInstance();
