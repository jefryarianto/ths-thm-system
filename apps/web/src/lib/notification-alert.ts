/**
 * Subtle notification alert for session expiry warnings on web.
 * Uses Web Audio API to generate a soft two-tone chime.
 * Falls back gracefully if AudioContext is not available.
 *
 * Sound can be toggled via getNotificationSoundEnabled/setNotificationSoundEnabled.
 */

const SOUND_PREF_KEY = 'notification-sound-enabled';

let audioCtx: AudioContext | null = null;

// ─── Sound Preference ──────────────────────────────────────

export function getNotificationSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(SOUND_PREF_KEY);
    return val !== 'false'; // default: enabled
  } catch {
    return true;
  }
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SOUND_PREF_KEY, String(enabled));
  } catch {
    // Ignore
  }
}

// ─── Audio Context ─────────────────────────────────────────

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

// ─── Alert Sounds ──────────────────────────────────────────

/**
 * Play a soft two-tone chime: two sine wave notes, gentle fade-in/out.
 * Think: a subtle "ding-ding" — noticeable but not jarring.
 * Respects the notification sound preference.
 */
export function playSessionWarningAlert(): void {
  if (!getNotificationSoundEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Two-tone chime: C5 (523Hz) then E5 (659Hz)
  const frequencies = [523, 659];
  const noteDelay = 0.15; // gap between notes

  frequencies.forEach((freq, i) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, now);

    // Gentle envelope: fade in 30ms, sustain, fade out 150ms
    const startTime = now + i * noteDelay;
    const noteDuration = 0.25;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.03); // soft volume
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + noteDuration + 0.01);
  });

  // Also try browser vibration API (some desktop browsers support it)
  try {
    if (navigator.vibrate) {
      navigator.vibrate([0, 200, 100, 200]);
    }
  } catch {
    // Ignore — vibration not supported on this device
  }
}

/**
 * Play a stronger three-tone alert for session expired.
 */
export function playSessionExpiredAlert(): void {
  if (!getNotificationSoundEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Three descending tones: E5 (659Hz), C5 (523Hz), A4 (440Hz)
  const frequencies = [659, 523, 440];
  const noteDelay = 0.15;

  frequencies.forEach((freq, i) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, now);

    const startTime = now + i * noteDelay;
    const noteDuration = 0.3;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + noteDuration + 0.01);
  });

  try {
    if (navigator.vibrate) {
      navigator.vibrate([0, 300, 150, 300, 150, 300]);
    }
  } catch {
    // Ignore
  }
}
