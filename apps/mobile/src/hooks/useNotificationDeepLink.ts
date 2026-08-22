import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { handleInitialNotification, handleNotificationNavigation, setupNotificationDeepLinkHandlers } from '../services/notification-deeplink';

export function useNotificationDeepLink() {
  useEffect(() => {
    const cleanup = setupNotificationDeepLinkHandlers();
    
    Notifications.getLastNotificationResponseAsync().then(handleInitialNotification);
    
    return cleanup;
  }, []);
}

export function useNotificationPermissions() {
  const [permissions, setPermissions] = useState<Notifications.NotificationPermissionsStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      const status = await Notifications.getPermissionsAsync();
      setPermissions(status as Notifications.NotificationPermissionsStatus);
      setLoading(false);
    };

    checkPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setPermissions(status as unknown as Notifications.NotificationPermissionsStatus);
    return status;
  };

  return { permissions, loading, requestPermissions };
}