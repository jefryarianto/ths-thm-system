/**
 * Subtle notification alert for session expiry warnings.
 * Uses vibration patterns and optional sound via expo-av.
 *
 * Sound can be toggled via getNotificationSoundEnabled/setNotificationSoundEnabled.
 */

import { Vibration } from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOUND_PREF_KEY = 'notification-sound-enabled';

let alertSound: Audio.Sound | null = null;
let soundReady = false;

// ─── Sound Preference ──────────────────────────────────────

export async function getNotificationSoundEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(SOUND_PREF_KEY);
    return val !== 'false'; // default: enabled
  } catch {
    return true;
  }
}

export async function setNotificationSoundEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SOUND_PREF_KEY, String(enabled));
  } catch {
    // Ignore
  }
}

// ─── Alert Sound ───────────────────────────────────────────

/**
 * Preload a subtle notification sound.
 * Safe to call multiple times — only initializes once.
 */
export async function preloadAlertSound(): Promise<void> {
  if (soundReady) return;
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

    const { sound } = await Audio.Sound.createAsync(
      { uri: 'data:audio/wav;base64,UklGRl9vT19teleXAVlbm9ZQ0FDQUFBQW1BQUFBQUFBQUFBUUFBUFBQV1dBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQX8=' },
      { volume: 0.25, shouldPlay: false, isLooping: false },
    );
    alertSound = sound;
    soundReady = true;
  } catch {
    console.log('[notification-alert] Sound preload skipped, using vibration only');
    soundReady = true;
  }
}

/**
 * Play a subtle alert for session expiry warning.
 * - Vibration: gentle double-pulse (200ms on, 100ms off, 200ms on)
 * - Sound: soft chime if preloaded and enabled
 */
export async function playSessionWarningAlert(): Promise<void> {
  // Gentle double-pulse vibration
  Vibration.vibrate([0, 200, 100, 200]);

  // Play sound if available and enabled
  const soundEnabled = await getNotificationSoundEnabled();
  if (soundEnabled && alertSound) {
    try {
      await alertSound.setPositionAsync(0);
      await alertSound.playAsync();
    } catch {
      // Ignore playback errors silently
    }
  }
}

/**
 * Play a stronger alert for session expired.
 * - Vibration: triple-pulse with longer duration
 */
export function playSessionExpiredAlert(): void {
  Vibration.vibrate([0, 300, 150, 300, 150, 300]);
}

/**
 * Stop and unload alert sound.
 */
export async function cleanupAlertSound(): Promise<void> {
  if (alertSound) {
    try {
      await alertSound.stopAsync();
      await alertSound.unloadAsync();
    } catch {
      // Ignore cleanup errors
    }
    alertSound = null;
    soundReady = false;
  }
}
