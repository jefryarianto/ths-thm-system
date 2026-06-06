import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

// Mock bcryptjs at module level so all tests can use it
jest.mock('bcryptjs', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
}));

import bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    id: 'u1',
    email: 'test@ths-thm.org',
    passwordHash: '$2b$12$hashed',
    namaLengkap: 'Test User',
    role: 'anggota',
    isActive: true,
    rantingId: 'r1',
    refreshToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    anggota: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    // Re-mock bcrypt methods after clearAllMocks
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashedpassword');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, refreshToken: 'refresh-token' });

      const result = await service.login({ email: 'test@ths-thm.org', password: 'password123' });
      expect(result.success).toBe(true);
      expect(result.data.user.email).toBe('test@ths-thm.org');
      expect(result.data.accessToken).toBe('mock-jwt-token');
      expect(result.data.refreshToken).toBe('mock-jwt-token');
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'notfound@ths-thm.org', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        service.login({ email: 'test@ths-thm.org', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should create a new user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, refreshToken: 'rt' });

      const result = await service.register({
        email: 'new@ths-thm.org',
        password: 'password123',
        namaLengkap: 'New User',
      });
      expect(result.success).toBe(true);
      expect(result.data.user).toBeDefined();
      expect(result.data.accessToken).toBe('mock-jwt-token');
    });

    it('should throw ConflictException for existing email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      await expect(
        service.register({
          email: 'test@ths-thm.org',
          password: 'password123',
          namaLengkap: 'Duplicate',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should default role to anggota when not provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, refreshToken: 'rt' });

      await service.register({
        email: 'new@ths-thm.org',
        password: 'password123',
        namaLengkap: 'New User',
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: 'anggota' }),
        }),
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile without sensitive fields', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('u1');
      expect(result.success).toBe(true);
      expect(result.data.passwordHash).toBeUndefined();
      expect(result.data.refreshToken).toBeUndefined();
      expect(result.data.email).toBe('test@ths-thm.org');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getProfile('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile fields', async () => {
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        namaLengkap: 'Updated Name',
      });

      const result = await service.updateProfile('u1', { namaLengkap: 'Updated Name' });
      expect(result.success).toBe(true);
      expect(result.data.namaLengkap).toBe('Updated Name');
    });

    it('should update email if provided', async () => {
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        email: 'updated@ths-thm.org',
      });

      const result = await service.updateProfile('u1', { email: 'updated@ths-thm.org' });
      expect(result.success).toBe(true);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await service.changePassword('u1', {
        currentPassword: 'oldpass',
        newPassword: 'newpass123',
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain('berhasil diubah');
      expect(bcrypt.hash).toHaveBeenCalledWith('newpass123', 12);
    });

    it('should throw UnauthorizedException for wrong current password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        service.changePassword('u1', {
          currentPassword: 'wrong',
          newPassword: 'newpass123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.changePassword('nonexistent', {
          currentPassword: 'old',
          newPassword: 'new',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('should return success message', async () => {
      const result = await service.forgotPassword({ email: 'test@ths-thm.org' });
      expect(result.success).toBe(true);
      expect(result.message).toContain('reset password');
    });
  });

  describe('resetPassword', () => {
    it('should return success message', async () => {
      const result = await service.resetPassword({ token: 'abc', newPassword: 'newpass' });
      expect(result.success).toBe(true);
      expect(result.message).toContain('reset');
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens for valid refresh token', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'u1', email: 'test@ths-thm.org', role: 'anggota' });
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, refreshToken: 'valid-rt' });
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, refreshToken: 'new-rt' });

      const result = await service.refreshToken({ refreshToken: 'valid-rt' });
      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBe('mock-jwt-token');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwt.verify.mockImplementation(() => { throw new Error('invalid'); });

      await expect(
        service.refreshToken({ refreshToken: 'invalid-rt' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
