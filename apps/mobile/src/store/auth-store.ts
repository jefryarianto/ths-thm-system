import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { setTokens, clearTokens } from '../lib/api-client';

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
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const { user, accessToken, refreshToken } = res.data.data;
    await setTokens(accessToken, refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ user, isAuthenticated: true });
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
    } catch {
      set({ isLoading: false });
    }
  },
}));