import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import apiClient from './api-client';
import { logError, logWarning } from './error-logger';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
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

  // Android-specific: create notification channel
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563eb',
    });
  }

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
