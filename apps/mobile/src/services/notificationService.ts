import apiClient from '../lib/api-client';

export async function registerDeviceToken(token: string, platform: string) {
  await apiClient.post('/notifications/fcm-token', { token, platform });
  return { success: true };
}