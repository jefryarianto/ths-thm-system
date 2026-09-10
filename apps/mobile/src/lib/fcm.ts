import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './api-client';
import { logError, logWarning } from './error-logger';

const SOUND_KEY = 'notif_sound';
const VIBRATE_KEY = 'notif_vibrate';

export interface NotificationDeviceSettings {
  sound: boolean;
  vibrate: boolean;
}

export async function getNotificationDeviceSettings(): Promise<NotificationDeviceSettings> {
  const [[, soundRaw], [, vibrateRaw]] = await AsyncStorage.multiGet([SOUND_KEY, VIBRATE_KEY]);
  return {
    sound: soundRaw ? soundRaw !== 'false' : true,
    vibrate: vibrateRaw ? vibrateRaw !== 'false' : true,
  };
}

export async function setNotificationDeviceSettings(
  settings: NotificationDeviceSettings,
): Promise<NotificationDeviceSettings> {
  await AsyncStorage.multiSet([
    [SOUND_KEY, String(settings.sound)],
    [VIBRATE_KEY, String(settings.vibrate)],
  ]);
  await applyAndroidChannel(settings);
  return settings;
}

async function applyAndroidChannel(settings: NotificationDeviceSettings) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: settings.vibrate ? [0, 250, 250, 250] : null,
    sound: settings.sound ? 'default' : null,
    lightColor: '#2563eb',
  });
}

Notifications.setNotificationHandler({
  handleNotification: async () => {
    const settings = await getNotificationDeviceSettings();
    return {
      shouldShowAlert: true,
      shouldPlaySound: settings.sound,
      shouldSetBadge: true,
    };
  },
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    logWarning('Push notifications require a physical device', { module: 'FCM', action: 'register' });
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    logWarning('Permission not granted', { module: 'FCM', action: 'register' });
    return null;
  }

  // Get Expo push token (uses FCM under the hood for Android)
  const tokenData = await Notifications.getExpoPushTokenAsync();
  const pushToken = tokenData.data;

  // Register token with API
  try {
    const platform = Platform.OS === 'android' ? 'android' : 'ios';
    await apiClient.post('/notifications/fcm-token', {
      token: pushToken,
      platform,
    });
    logWarning('Token registered successfully', { module: 'FCM', action: 'register' });
  } catch (error) {
    logError(error, { module: 'FCM', action: 'register' });
  }

  // Apply user's local sound/vibration settings to the Android channel
  const deviceSettings = await getNotificationDeviceSettings();
  await applyAndroidChannel(deviceSettings);

  return pushToken;
}

export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationTapped?: (response: Notifications.NotificationResponse) => void,
) {
  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    onNotificationReceived?.(notification);
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    onNotificationTapped?.(response);
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}