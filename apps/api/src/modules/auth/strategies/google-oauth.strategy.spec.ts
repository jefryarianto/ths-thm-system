import { Test, TestingModule } from '@nestjs/testing';
import { GoogleOAuthStrategy } from './google-oauth.strategy';
import { AuthService } from '../auth.service';

describe('GoogleOAuthStrategy', () => {
  let strategy: GoogleOAuthStrategy;
  let authService: AuthService;

  const mockAuthService = {
    findOrCreateOAuthUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GoogleOAuthStrategy, { provide: AuthService, useValue: mockAuthService }],
    }).compile();

    strategy = module.get<GoogleOAuthStrategy>(GoogleOAuthStrategy);
    authService = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    const mockProfile = {
      id: 'google-123',
      emails: [{ value: 'user@gmail.com' }],
      displayName: 'Test User',
      photos: [{ value: 'https://photo.url/test.jpg' }],
    };

    const mockUser = {
      id: 'u1',
      email: 'user@gmail.com',
      namaLengkap: 'Test User',
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    };

    it('should call findOrCreateOAuthUser with parsed profile', async () => {
      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      await new Promise<void>((resolve, reject) => {
        strategy.validate('access-token', 'refresh-token', mockProfile, (err, user) => {
          try {
            expect(err).toBeNull();
            expect(user).toEqual(mockUser);
            expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith({
              provider: 'google',
              providerId: 'google-123',
              email: 'user@gmail.com',
              name: 'Test User',
              photo: 'https://photo.url/test.jpg',
            });
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    it('should handle missing email gracefully', async () => {
      const profileWithoutEmail = {
        ...mockProfile,
        emails: undefined,
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      await new Promise<void>((resolve, reject) => {
        strategy.validate('access-token', 'refresh-token', profileWithoutEmail, (err, user) => {
          try {
            expect(err).toBeNull();
            expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
              expect.objectContaining({ email: undefined }),
            );
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    it('should handle missing photos gracefully', async () => {
      const profileWithoutPhotos = {
        ...mockProfile,
        photos: undefined,
      };

      mockAuthService.findOrCreateOAuthUser.mockResolvedValue(mockUser);

      await new Promise<void>((resolve, reject) => {
        strategy.validate('access-token', 'refresh-token', profileWithoutPhotos, (err, user) => {
          try {
            expect(err).toBeNull();
            expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
              expect.objectContaining({ photo: undefined }),
            );
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    it('should call done with error when findOrCreateOAuthUser throws', async () => {
      const error = new Error('Database error');
      mockAuthService.findOrCreateOAuthUser.mockRejectedValue(error);

      await new Promise<void>((resolve, reject) => {
        strategy.validate('access-token', 'refresh-token', mockProfile, (err, user) => {
          try {
            expect(err).toBe(error);
            expect(user).toBe(false);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });
  });
});
