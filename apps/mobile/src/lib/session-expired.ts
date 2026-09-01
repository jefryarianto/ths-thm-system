/**
 * Simple event bus for session expiry and expiry warnings.
 * The api-client interceptor emits when refresh fails;
 * the root layout listens and navigates to Login.
 */

type Listener = () => void;
type ExpiringSoonListener = (expiresInSeconds: number) => void;

let listeners: Listener[] = [];
let expiringSoonListeners: ExpiringSoonListener[] = [];
// Guard agar emit hanya terjadi sekali per episode sesi berakhir,
// sehingga listener (navigasi ke Login) tidak dipanggil berulang kali
// ketika banyak request 401 memicu refresh gagal secara konkuren.
let emitted = false;

export function onSessionExpired(cb: Listener): () => void {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

export function emitSessionExpired(): void {
  if (emitted) return;
  emitted = true;
  listeners.forEach((l) => l());
}

/** Reset guard (panggil saat login/refresh berhasil) agar episode berikutnya bisa emit lagi. */
export function resetSessionExpired(): void {
  emitted = false;
}

// ─── Expiring Soon ──────────────────────────────────────────────

export function onExpiringSoon(cb: ExpiringSoonListener): () => void {
  expiringSoonListeners.push(cb);
  return () => {
    expiringSoonListeners = expiringSoonListeners.filter((l) => l !== cb);
  };
}

export function emitExpiringSoon(secondsRemaining: number): void {
  expiringSoonListeners.forEach((l) => l(secondsRemaining));
}

// ─── Expiry Warning Timer ──────────────────────────────────────

let expiryWarningTimer: ReturnType<typeof setTimeout> | null = null;
let expiryWarningFired = false;

/**
 * Decode a JWT payload safely.
 */
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

/**
 * Schedule a warning toast/alert N seconds before the JWT expires.
 * Default warning window: 300 seconds (5 minutes).
 */
export function scheduleExpiryWarning(accessToken: string, warnSecondsBefore = 300): void {
  cancelExpiryWarning();
  expiryWarningFired = false;

  const payload = decodeJwtPayload(accessToken);
  if (!payload || typeof payload.exp !== 'number') return;

  const expiresAtMs = payload.exp * 1000;
  const now = Date.now();
  const secondsUntilExpiry = Math.floor((expiresAtMs - now) / 1000);
  const secondsUntilWarning = secondsUntilExpiry - warnSecondsBefore;

  console.log(
    `[session-expired] Token expires in ${secondsUntilExpiry}s, warning in ${Math.max(secondsUntilWarning, 0)}s`,
  );

  if (secondsUntilWarning <= 0) {
    // Already within the warning window — fire immediately
    fireExpiringSoon(secondsUntilExpiry);
    return;
  }

  expiryWarningTimer = setTimeout(() => {
    fireExpiringSoon(secondsUntilExpiry);
  }, secondsUntilWarning * 1000);
}

export function cancelExpiryWarning(): void {
  if (expiryWarningTimer) {
    clearTimeout(expiryWarningTimer);
    expiryWarningTimer = null;
  }
}

function fireExpiringSoon(secondsRemaining: number): void {
  if (expiryWarningFired) return;
  expiryWarningFired = true;
  console.log(`[session-expired] Token expiring soon: ${secondsRemaining}s remaining`);
  emitExpiringSoon(secondsRemaining);
}
