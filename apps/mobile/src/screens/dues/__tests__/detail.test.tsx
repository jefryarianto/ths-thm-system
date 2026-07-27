import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock dependencies
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true })),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({ id: 'test-dues-id' })),
  router: { push: jest.fn(), replace: jest.fn() },
}));

jest.mock('../../lib/api-client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
  unwrap: (response: { data: unknown }) => response.data,
}));

import { render, screen, waitFor } from '@testing-library/react-native';
import DuesDetailScreen from '../detail';

describe('DuesDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    const { getByText } = render(<DuesDetailScreen />);
    expect(getByText('Memuat...')).toBeTruthy();
  });

  it('shows bank info when loaded', async () => {
    const mockApi = require('../../lib/api-client').default;
    mockApi.get
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            id: '1',
            periode: '2026/01',
            jumlah: 50000,
            status: 'belum_dibayar',
            tanggalBayar: null,
            buktiBayarPath: null,
            createdAt: new Date().toISOString(),
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          bankName: 'BCA',
          accountNumber: '1234567890',
          accountName: 'THS-THM',
          qrisImageUrl: null,
        },
      });

    render(<DuesDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('BCA')).toBeTruthy();
    });

    expect(screen.getByText('1234567890')).toBeTruthy();
    expect(screen.getByText('THS-THM')).toBeTruthy();
  });

  it('shows error toast when API fails', async () => {
    const mockApi = require('../../lib/api-client').default;
    mockApi.get.mockRejectedValue(new Error('Network error'));

    render(<DuesDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Gagal memuat data')).toBeTruthy();
    });
  });
});
