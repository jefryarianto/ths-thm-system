/**
 * Snapshot test: LoginScreen (apps/mobile/src/screens/auth/login.tsx)
 *
 * Guards visual integrity of the login screen after theme-token migrations.
 * The snapshot captures the resolved StyleSheet objects (colors, spacing, etc.)
 * that reference `theme.colors.*`, including the dark-navy `primaryDark` brand
 * chip and the `#1e3a8a`/`#2563eb` accent handled by tokens.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { jest } from '@jest/globals';
import { mockApiClient } from '../../../test/snapshot-utils';

jest.mock('../../../lib/api-client');
jest.mock('../../../store/auth-store', () => ({
  useAuthStore: (selector: (s: any) => any) =>
    selector({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: jest.fn(() => Promise.resolve({})),
      logout: jest.fn(),
      loadUser: jest.fn(),
    }),
}));
jest.mock('../../../hooks/useMobileOAuth', () => ({
  useMobileOAuth: () => ({
    handleGoogleLogin: jest.fn(),
    loading: null,
  }),
}));
jest.mock('../../../lib/fcm', () => ({
  registerForPushNotifications: jest.fn(),
}));

beforeEach(() => {
  mockApiClient({});
});

describe('LoginScreen snapshot', () => {
  it('matches snapshot with theme tokens resolved', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const LoginScreen = require('../login').default;
    const { toJSON } = render(<LoginScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
