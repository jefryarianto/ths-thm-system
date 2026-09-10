import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

jest.mock('../../../lib/fcm', () => ({
  getNotificationDeviceSettings: jest.fn(() =>
    Promise.resolve({ sound: true, vibrate: true }),
  ),
  setNotificationDeviceSettings: jest.fn(() => Promise.resolve({ sound: true, vibrate: true })),
}));

jest.mock('../../../lib/api-client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
  },
  unwrap: (response: { data: { data: unknown } }) => response.data?.data,
}));

import apiClient from '../../../lib/api-client';
import NotificationPreferencesScreen from '../preferences';

type MockFn = jest.Mock<(...args: unknown[]) => Promise<unknown>>;

const mockApi = () => apiClient as unknown as { get: MockFn; patch: MockFn };

const PREFS_PAYLOAD = {
  prefs: {
    reminder_iuran: { push: true, inApp: true, email: true },
    umum: { push: false, inApp: true, email: false },
  },
  global: { push: true, inApp: true, email: true },
  quietHours: { enabled: false, start: '22:00', end: '06:00', timezoneOffset: 0 },
  types: [
    { key: 'reminder_iuran', label: 'Pengingat Iuran', description: 'Pengingat pembayaran iuran' },
    { key: 'umum', label: 'Umum', description: 'Notifikasi umum dan pengumuman' },
  ],
};

describe('NotificationPreferencesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi().get.mockResolvedValue({ data: { success: true, data: PREFS_PAYLOAD } });
    mockApi().patch.mockResolvedValue({ data: { success: true, data: PREFS_PAYLOAD } });
  });

  it('renders master switches, quiet hours and per-type settings', async () => {
    render(<NotificationPreferencesScreen />);

    await waitFor(() => {
      expect(screen.getByText('Pengaturan Notifikasi')).toBeTruthy();
    });

    // Master channel section
    expect(screen.getByText('Notifikasi Push')).toBeTruthy();
    expect(screen.getByText('In-App')).toBeTruthy();
    expect(screen.getByText('Email')).toBeTruthy();
    // Device local controls
    expect(screen.getByText('Suara')).toBeTruthy();
    expect(screen.getByText('Getar')).toBeTruthy();
    // Quiet hours
    expect(screen.getByText('Jangan Ganggu')).toBeTruthy();
    expect(screen.getByText('Mode Tenang')).toBeTruthy();
    // Per-type list uses API types (no fallback)
    expect(screen.getByText('Pengingat Iuran')).toBeTruthy();
    expect(screen.getByText('Umum')).toBeTruthy();
  });

  it('persists a per-type channel toggle via PATCH', async () => {
    render(<NotificationPreferencesScreen />);

    await waitFor(() => {
      expect(screen.getByText('Pengaturan Notifikasi')).toBeTruthy();
    });

    const umumEmailSwitch = screen.getByLabelText('umum Email');
    expect(umumEmailSwitch.props.value).toBe(false);

    fireEvent(umumEmailSwitch, 'valueChange', true);

    await waitFor(() => {
      expect(mockApi().patch).toHaveBeenCalled();
    });
    const body = mockApi().patch.mock.calls[0][1];
    expect(body).toEqual(
      expect.objectContaining({
        umum: expect.objectContaining({ email: true }),
        global: expect.objectContaining({ push: true, inApp: true, email: true }),
      }),
    );
  });

  it('persists a master channel toggle via PATCH', async () => {
    render(<NotificationPreferencesScreen />);

    await waitFor(() => {
      expect(screen.getByText('Pengaturan Notifikasi')).toBeTruthy();
    });

    const masterPush = screen.getByLabelText('Master Push');
    fireEvent(masterPush, 'valueChange', false);

    await waitFor(() => {
      expect(mockApi().patch).toHaveBeenCalled();
    });
    const body = mockApi().patch.mock.calls[0][1];
    expect(body).toEqual(expect.objectContaining({ global: expect.objectContaining({ push: false }) }));
  });
});