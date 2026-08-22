import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Href } from 'expo-router';

export type NotificationType = 
  | 'status_klaim'
  | 'dokumen_ready'
  | 'forum_reply'
  | 'reminder_latihan'
  | 'reminder_iuran'
  | 'umum';

export interface NotificationDeepLinkData {
  type: NotificationType;
  id?: string;
  screen?: string;
  screenId?: string;
  [key: string]: any;
}

const TYPE_TO_ROUTE: Record<NotificationType, (data: NotificationDeepLinkData) => string> = {
  status_klaim: (data) => `/claims/${data.id}`,
  dokumen_ready: (data) => `/documents/${data.id}`,
  forum_reply: (data) => `/forum/thread/${data.id}`,
  reminder_latihan: (data) => `/trainings/${data.id}`,
  reminder_iuran: (data) => '/dues',
  umum: (data) => '/notifications',
};

export function mapNotificationToRoute(data: NotificationDeepLinkData): string | null {
  if (data.type && TYPE_TO_ROUTE[data.type]) {
    return TYPE_TO_ROUTE[data.type](data);
  }

  if (data.screen && data.screenId) {
    return `/${data.screen}/${data.screenId}`;
  }

  if (data.screen) {
    return `/${data.screen}`;
  }

  return null;
}

export function handleNotificationNavigation(response: Notifications.NotificationResponse): void {
  const data = response.notification?.request?.content?.data as NotificationDeepLinkData | undefined;
  
  if (!data) {
    console.warn('Notification deep link: No data found');
    return;
  }

  const route = mapNotificationToRoute(data);
  
  if (route) {
    console.log('Navigating to:', route);
    router.push(route as Href<string>);
  } else {
    console.warn('Notification deep link: Unknown notification type', data);
    router.push('/notifications' as Href<string>);
  }
}

export function handleInitialNotification(response: Notifications.NotificationResponse | null): void {
  if (!response) return;
  
  // Small delay to ensure router is ready
  setTimeout(() => {
    handleNotificationNavigation(response);
  }, 100);
}

export function setupNotificationDeepLinkHandlers(): (() => void) {
  const receivedListener = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received:', notification.request.content.data);
  });

  const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    handleNotificationNavigation(response);
  });

  return () => {
    receivedListener.remove();
    responseListener.remove();
  };
}