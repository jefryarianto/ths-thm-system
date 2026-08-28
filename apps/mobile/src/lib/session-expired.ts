/**
 * Simple event bus for session expiry.
 * The api-client interceptor emits when refresh fails;
 * the root layout listens and navigates to Login.
 */

type Listener = () => void;

let listeners: Listener[] = [];

export function onSessionExpired(cb: Listener): () => void {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

export function emitSessionExpired(): void {
  listeners.forEach((l) => l());
}
