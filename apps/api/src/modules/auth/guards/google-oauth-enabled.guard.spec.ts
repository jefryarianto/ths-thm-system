import { ForbiddenException } from '@nestjs/common';
import { GoogleOAuthEnabledGuard } from './google-oauth-enabled.guard';

describe('GoogleOAuthEnabledGuard', () => {
  let guard: GoogleOAuthEnabledGuard;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      setting: {
        findUnique: jest.fn(),
      },
    };
    guard = new GoogleOAuthEnabledGuard(mockPrisma);
  });

  it('should allow access when setting is missing (default true)', async () => {
    mockPrisma.setting.findUnique.mockResolvedValue(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await guard.canActivate({} as any);
    expect(result).toBe(true);
  });

  it('should allow access when google_oauth_enabled is true', async () => {
    mockPrisma.setting.findUnique.mockResolvedValue({ key: 'google_oauth_enabled', value: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await guard.canActivate({} as any);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when google_oauth_enabled is false', async () => {
    mockPrisma.setting.findUnique.mockResolvedValue({ key: 'google_oauth_enabled', value: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(guard.canActivate({} as any)).rejects.toThrow(ForbiddenException);
  });
});