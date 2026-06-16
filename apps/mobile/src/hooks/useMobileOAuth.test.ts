import { renderHook, act } from '@testing-library/react-native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../lib/api-client';
import { useAuthStore } from '../store/auth-store';
import { useMobileOAuth } from './useMobileOAuth';

// ─── Mocks ───

// Mock react-native entirely to avoid native module bridge errors
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Platform: {
    OS: 'android',
    select: jest.fn().mockImplementation((obj: any) => obj.default ?? obj.android),
  },
  NativeModules: {},
  TurboModuleRegistry: { getEnforcing: jest.fn() },
  StyleSheet: { create: jest.fn((styles: any) => styles) },
  Dimensions: { get: jest.fn(() => ({ width: 400, height: 800 })) },
}));

jest.mock('expo-web-browser', () => ({
  warmUpAsync: jest.fn(),
  coolDownAsync: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('../lib/api-client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('../lib/fcm', () => ({
  registerForPushNotifications: jest.fn(() => Promise.resolve()),
}));

const { Alert } = require('react-native');
const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// ─── Helpers ───

const mockAuthSessionResult = (overrides: Partial<{ type: string; url: string }>) => ({
  type: 'success',
  url: 'http://localhost:3000/login?token=test_token&refresh=test_refresh',
  ...overrides,
});

// ─── Tests ───

beforeEach(() => {
  jest.clearAllMocks();
  // Reset auth store
  useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
});

describe('useMobileOAuth', () => {
  it('returns handler functions and loading state', () => {
    const { result } = renderHook(() => useMobileOAuth());

    expect(result.current).toHaveProperty('handleGoogleLogin');
    expect(result.current).toHaveProperty('handleLinkedInLogin');
    expect(result.current).toHaveProperty('loading');
    expect(result.current.loading).toBeNull();
  });

  it('opens WebBrowser for Google OAuth', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue(
      mockAuthSessionResult({ type: 'cancel' }),
    );

    const { result } = renderHook(() => useMobileOAuth());

    await act(async () => {
      await result.current.handleGoogleLogin();
    });

    expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/google'),
      expect.any(String),
    );
  });

  it('opens WebBrowser for LinkedIn OAuth', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue(
      mockAuthSessionResult({ type: 'cancel' }),
    );

    const { result } = renderHook(() => useMobileOAuth());

    await act(async () => {
      await result.current.handleLinkedInLogin();
    });

    expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/linkedin'),
      expect.any(String),
    );
  });

  it('stores tokens and fetches user profile on success', async () => {
    const mockUser = { id: '1', email: 'test@test.com', namaLengkap: 'Test User', role: 'anggota' };
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue(mockAuthSessionResult({}));
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { success: true, data: mockUser },
    });

    const { result } = renderHook(() => useMobileOAuth());

    await act(async () => {
      await result.current.handleGoogleLogin();
    });

    // Token stored
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('accessToken', 'test_token');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('refreshToken', 'test_refresh');

    // User profile fetched
    expect(apiClient.get).toHaveBeenCalledWith('/auth/me');

    // User stored
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));

    // Auth store updated
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
  });

  it('shows alert on OAuth failure from URL param', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue(
      mockAuthSessionResult({ url: 'http://localhost:3000/login?error=oauth_failed' }),
    );

    const { result } = renderHook(() => useMobileOAuth());

    await act(async () => {
      await result.current.handleGoogleLogin();
    });

    expect(mockAlert).toHaveBeenCalledWith('Login Gagal', expect.stringContaining('gagal'));
  });

  it('shows alert when tokens are missing from redirect URL', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue(
      mockAuthSessionResult({ url: 'http://localhost:3000/login?some_other_param=value' }),
    );

    const { result } = renderHook(() => useMobileOAuth());

    await act(async () => {
      await result.current.handleGoogleLogin();
    });

    expect(mockAlert).toHaveBeenCalledWith(
      'Login Gagal',
      expect.stringContaining('Tidak menerima token'),
    );
  });

  it('does nothing when user cancels the flow', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({ type: 'cancel' });

    const { result } = renderHook(() => useMobileOAuth());

    await act(async () => {
      await result.current.handleGoogleLogin();
    });

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('sets loading state during the OAuth flow', async () => {
    // Keep the promise unresolved to test loading state
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockImplementation(
      () => new Promise(() => {}), // never resolves
    );

    const { result } = renderHook(() => useMobileOAuth());

    act(async () => {
      result.current.handleGoogleLogin();
    });

    // Should be loading for google provider
    expect(result.current.loading).toBe('google');
  });

  it('handles user profile fetch failure gracefully', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue(mockAuthSessionResult({}));
    (apiClient.get as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMobileOAuth());

    await act(async () => {
      await result.current.handleGoogleLogin();
    });

    // Tokens still stored despite profile fetch failure
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('accessToken', 'test_token');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('refreshToken', 'test_refresh');

    // Shows info alert about profile
    expect(mockAlert).toHaveBeenCalledWith('Info', expect.stringContaining('gagal memuat profil'));
  });

  it('resets loading state after completion', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({ type: 'cancel' });

    const { result, rerender } = renderHook(() => useMobileOAuth());

    await act(async () => {
      await result.current.handleGoogleLogin();
    });

    // Re-render to flush pending React state updates in RN test env
    rerender({});

    expect(result.current.loading).toBeNull();
  });
});
