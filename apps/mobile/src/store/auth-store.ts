import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { setTokens, clearTokens } from '../lib/api-client';
import { registerForPushNotifications } from '../lib/fcm';

interface User {
  id: string;
  email: string;
  namaLengkap: string;
  role: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<{ mustChangePassword?: boolean; resetToken?: string }>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (identifier: string, password: string) => {
    const res = await apiClient.post('/auth/login', { identifier, password });
    const data = res.data.data;

    if (data.mustChangePassword) {
      return { mustChangePassword: true, resetToken: data.resetToken };
    }

    const { user, accessToken, refreshToken } = data;
    await setTokens(accessToken, refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ user, isAuthenticated: true });
    return {};
  },

  logout: async () => {
    await clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      set({ user, isAuthenticated: !!user, isLoading: false });
      if (user) {
        registerForPushNotifications().catch(() => {
        });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
