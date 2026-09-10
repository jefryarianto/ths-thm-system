import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

jest.mock('../../../lib/api-client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  unwrap: (response: { data: { data: unknown } }) => response.data?.data,
}));

import apiClient from '../../../lib/api-client';
import NotificationsScreen from '../index';

type MockFn = jest.Mock<(...args: unknown[]) => Promise<unknown>>;

const mockApi = () => apiClient as unknown as { get: MockFn; patch: MockFn; delete: MockFn };

const STATS_PAYLOAD = {
  types: [
    { key: 'umum', label: 'Umum', description: 'Notifikasi umum' },
    { key: 'reminder_iuran', label: 'Pengingat Iuran', description: 'Pengingat iuran' },
  ],
};

const LIST_PAYLOAD = {
  data: [
    {
      id: 'n1',
      judul: 'Judul 1',
      isi: 'Isi 1',
      tipe: 'umum',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
  ],
  meta: { total: 1, totalPages: 1, unreadCount: 1 },
};

describe('NotificationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi().get.mockImplementation(
      ((url: string) => {
        if (url === '/notifications/stats') {
          return Promise.resolve({ data: { success: true, data: STATS_PAYLOAD } });
        }
        return Promise.resolve({ data: { success: true, data: LIST_PAYLOAD } });
      }) as MockFn,
    );
    mockApi().delete.mockResolvedValue({ data: { success: true, data: { deleted: true } } });
  });

  it('renders notification items and type filter chips', async () => {
    render(<NotificationsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Judul 1')).toBeTruthy();
    });

    expect(screen.getByText('Notifikasi')).toBeTruthy();
    expect(screen.getByText('Semua')).toBeTruthy();
    expect(screen.getByText('Pengingat Iuran')).toBeTruthy();
  });

  it('refetches with selected type filter', async () => {
    render(<NotificationsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Judul 1')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Pengingat Iuran'));

    await waitFor(() => {
      const listCalls = mockApi().get.mock.calls.filter((c) => c[0] === '/notifications');
      expect(listCalls.length).toBeGreaterThan(0);
      const last = listCalls[listCalls.length - 1];
      expect((last![1] as { params?: { tipe?: string } }).params?.tipe).toBe('reminder_iuran');
    });
  });

  it('confirms and deletes all notifications', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');

    render(<NotificationsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Judul 1')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Hapus semua'));

    expect(alertSpy).toHaveBeenCalled();
    const buttons = alertSpy.mock.calls[0]?.[2] as
      | Array<{ text: string; style?: string; onPress?: () => void }>
      | undefined;
    const confirm = buttons?.find((b) => b.text === 'Hapus');
    expect(confirm).toBeTruthy();

    confirm!.onPress!();

    await waitFor(() => {
      expect(mockApi().delete).toHaveBeenCalledWith('/notifications');
    });
    alertSpy.mockRestore();
  });
});