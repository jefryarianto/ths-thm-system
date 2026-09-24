import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsService } from '../../common/services/metrics.service';

function makeReq(cookie?: string): Record<string, unknown> {
  return {
    headers: cookie ? { cookie } : {},
    get: jest.fn().mockReturnValue('agent/1.0'),
  };
}

describe('AuthController metrics instrumentation', () => {
  let controller: AuthController;
  let metrics: jest.Mocked<Pick<MetricsService, 'recordAuth'>>;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    validateRefreshToken: jest.fn(),
    setRefreshTokenCookie: jest.fn(),
    clearRefreshTokenCookie: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    forceChangePassword: jest.fn(),
    listSessions: jest.fn(),
  };

  const mockPrisma = {};

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'ENV', useValue: {} },
        {
          provide: MetricsService,
          useValue: { recordAuth: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    metrics = module.get(MetricsService) as jest.Mocked<
      Pick<MetricsService, 'recordAuth'>
    >;
    jest.clearAllMocks();
  });

  describe('session/verify', () => {
    it('records success when the refresh session is valid', async () => {
      mockAuthService.validateRefreshToken.mockResolvedValue({ valid: true });
      const req = makeReq('refreshToken=abc');

      const result = await controller.verifySession(req as never);

      expect(result).toEqual({ valid: true });
      expect(metrics.recordAuth).toHaveBeenCalledWith(
        'session_verify',
        'success',
        expect.any(Number),
      );
    });

    it('records unauthorized when the refresh token is missing (401)', async () => {
      const req = makeReq();

      await expect(controller.verifySession(req as never)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(metrics.recordAuth).toHaveBeenCalledWith(
        'session_verify',
        'unauthorized',
        expect.any(Number),
      );
    });

    it('records unauthorized when the refresh session is invalid', async () => {
      mockAuthService.validateRefreshToken.mockResolvedValue({ valid: false });
      const req = makeReq('refreshToken=revoked');

      await expect(controller.verifySession(req as never)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(metrics.recordAuth).toHaveBeenCalledWith(
        'session_verify',
        'unauthorized',
        expect.any(Number),
      );
    });

    it('records internal when validation throws a non-401 server error', async () => {
      mockAuthService.validateRefreshToken.mockRejectedValue(new Error('db down'));
      const req = makeReq('refreshToken=abc');

      await expect(controller.verifySession(req as never)).rejects.toThrow('db down');
      expect(metrics.recordAuth).toHaveBeenCalledWith(
        'session_verify',
        'internal',
        expect.any(Number),
      );
    });
  });

  describe('refresh', () => {
    it('records success on successful token rotation', async () => {
      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
      const req = makeReq('refreshToken=abc');
      const res: Record<string, unknown> = {};

      const result = await controller.refresh(
        req as never,
        {} as never,
        res as never,
      );

      expect(result).toBeDefined();
      expect(metrics.recordAuth).toHaveBeenCalledWith(
        'refresh',
        'success',
        expect.any(Number),
      );
    });

    it('records unauthorized when refresh token is missing', async () => {
      const req = makeReq();
      const res: Record<string, unknown> = {};

      await expect(
        controller.refresh(req as never, {} as never, res as never),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(metrics.recordAuth).toHaveBeenCalledWith(
        'refresh',
        'unauthorized',
        expect.any(Number),
      );
    });
  });

  describe('logout', () => {
    it('records success on logout', async () => {
      mockAuthService.logout.mockResolvedValue({ success: true });
      const req = makeReq('refreshToken=abc');
      const res: Record<string, unknown> = {};

      const result = await controller.logout(
        { id: 'user-1' },
        req as never,
        res as never,
      );

      expect(result).toEqual({ success: true, message: expect.any(String) });
      expect(metrics.recordAuth).toHaveBeenCalledWith(
        'logout',
        'success',
        expect.any(Number),
      );
    });
  });
});
