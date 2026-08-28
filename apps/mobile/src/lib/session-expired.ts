/**
 * Simple event bus for session expiry.
 * The api-client interceptor emits when refresh fails;
 * the root layout listens and navigates to Login.
 */

type Listener = () => void;

let listeners: Listener[] = [];
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
