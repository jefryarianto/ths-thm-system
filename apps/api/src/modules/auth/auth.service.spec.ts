import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';

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
    phone: null,
    mustChangePassword: false,
    refreshToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    anggota: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockMailService = {
    sendMail: jest.fn().mockResolvedValue(true),
    renderWithOverride: jest.fn().mockResolvedValue({
      subject: 'Reset Password - THS-THM',
      html: '<p>Reset your password</p>',
    }),
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
        { provide: MailService, useValue: mockMailService },
        { provide: 'ENV', useValue: { jwtRefreshSecret: 'test-refresh-secret', jwtRefreshExpiresIn: '7d', nodeEnv: 'test', frontendUrl: 'http://localhost:3000' } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    // Re-mock bcrypt methods after clearAllMocks
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashedpassword');
    mockJwt.sign.mockReturnValue('mock-jwt-token');
    mockJwt.verify.mockReset();
    // Default: fallback nama tidak menemukan anggota (agar test lama tetap pass)
    mockPrisma.anggota.findMany.mockResolvedValue([]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, refreshToken: 'refresh-token' });

      const result = await service.login({ identifier: 'test@ths-thm.org', password: 'password123' });
      expect(result.user.email).toBe('test@ths-thm.org');
      expect(result.accessToken).toBe('mock-jwt-token');
      // login() without response param returns refreshToken in data
      expect((result as { refreshToken: string }).refreshToken).toBe('mock-jwt-token');
    });

    it('should look up by phone when identifier matches phone pattern', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, refreshToken: 'refresh-token' });

      const result = await service.login({ identifier: '081234567890', password: 'password123' });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { phone: '081234567890' } });
      expect(result.user.email).toBe('test@ths-thm.org');
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ identifier: 'notfound@ths-thm.org', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(service.login({ identifier: 'test@ths-thm.org', password: 'wrong' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return mustChangePassword without tokens when flag is set', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, mustChangePassword: true });
      mockJwt.sign.mockReturnValue('force-change-token');

      const result = await service.login({ identifier: 'test@ths-thm.org', password: 'password123' });

      expect((result as { mustChangePassword: boolean }).mustChangePassword).toBe(true);
      expect((result as { resetToken: string }).resetToken).toBe('force-change-token');
      expect((result as { accessToken?: string }).accessToken).toBeUndefined();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('forceChangePassword', () => {
    it('should update password and clear mustChangePassword flag', async () => {
      mockJwt.verify.mockReturnValue({
        sub: 'u1',
        email: 'test@ths-thm.org',
        purpose: 'force-change-password',
      });
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, mustChangePassword: true });
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, mustChangePassword: false });

      const result = await service.forceChangePassword({
        token: 'valid-token',
        newPassword: 'newpass123',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: expect.objectContaining({ mustChangePassword: false }),
      });
      expect(result.success).toBe(true);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(
        service.forceChangePassword({ token: 'bad-token', newPassword: 'newpass123' }),
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
      expect(result.user).toBeDefined();
      expect(result.accessToken).toBe('mock-jwt-token');
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
      // sanitizeUser strips these fields so they don't appear on the type
      expect((result as Record<string, unknown>).passwordHash).toBeUndefined();
      expect((result as Record<string, unknown>).refreshToken).toBeUndefined();
      expect(result.email).toBe('test@ths-thm.org');
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
      expect(result.namaLengkap).toBe('Updated Name');
    });

    it('should update email if provided', async () => {
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        email: 'updated@ths-thm.org',
      });

      const result = await service.updateProfile('u1', { email: 'updated@ths-thm.org' });
    });

    it('should sync profile fields to Anggota model when noHp is provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        namaLengkap: 'Anggota User',
      });
      mockPrisma.anggota.findFirst.mockResolvedValue({ id: 'a1', email: 'test@ths-thm.org' });
      mockPrisma.anggota.update.mockResolvedValue({});

      const result = await service.updateProfile('u1', {
        namaLengkap: 'Anggota User',
        noHp: '081234567890',
        alamat: 'Jl. Test No. 123',
      });

      // Should find Anggota by user email
      expect(mockPrisma.anggota.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@ths-thm.org' },
      });
      // Should update Anggota with profile fields
      expect(mockPrisma.anggota.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: expect.objectContaining({
          namaLengkap: 'Anggota User',
          noHp: '081234567890',
          alamat: 'Jl. Test No. 123',
        }),
      });
    });

    it('should handle tanggalLahir conversion to Date', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.anggota.findFirst.mockResolvedValue({ id: 'a1', email: 'test@ths-thm.org' });
      mockPrisma.anggota.update.mockResolvedValue({});

      const result = await service.updateProfile('u1', {
        tempatLahir: 'Jakarta',
        tanggalLahir: '2000-01-15',
      });

      // Verify tanggalLahir is converted to Date object
      expect(mockPrisma.anggota.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: expect.objectContaining({
          tempatLahir: 'Jakarta',
          tanggalLahir: expect.any(Date),
        }),
      });
      // Verify date value
      const updateCall = mockPrisma.anggota.update.mock.calls[0][0];
      const date = updateCall.data.tanggalLahir as Date;
      expect(date.toISOString()).toContain('2000-01-15');
    });

    it('should not update Anggota when no matching record found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      // No matching Anggota record (email maupun fallback nama)
      mockPrisma.anggota.findFirst.mockResolvedValue(null);
      mockPrisma.anggota.findMany.mockResolvedValue([]);

      const result = await service.updateProfile('u1', {
        noHp: '081234567890',
        alamat: 'Jl. Test',
      });

      // Should NOT call anggota.update since no match found
      expect(mockPrisma.anggota.update).not.toHaveBeenCalled();
      // Fallback nama dicoba (cari anggota ber-email kosong dengan nama user)
      expect(mockPrisma.anggota.findMany).toHaveBeenCalled();
    });

    it('should sync Anggota via nama fallback when email tidak cocok tapi nama unik & email kosong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, namaLengkap: 'Anggota User' });
      // Email tidak cocok, tapi ada anggota bernama sama dengan email kosong (hasil import CSV)
      mockPrisma.anggota.findFirst.mockResolvedValue(null);
      mockPrisma.anggota.findMany.mockResolvedValue([{ id: 'a9', email: null, namaLengkap: 'Anggota User' }]);
      mockPrisma.anggota.update.mockResolvedValue({});

      await service.updateProfile('u1', {
        namaLengkap: 'Anggota User',
        noHp: '081234567890',
      });

      // Fallback nama harus memfilter hanya anggota ber-email kosong
      expect(mockPrisma.anggota.findMany).toHaveBeenCalledWith({
        where: {
          namaLengkap: { equals: 'Anggota User', mode: 'insensitive' },
          OR: [{ email: null }, { email: '' }],
        },
      });
      expect(mockPrisma.anggota.update).toHaveBeenCalledWith({
        where: { id: 'a9' },
        data: expect.objectContaining({ noHp: '081234567890' }),
      });
    });

    it('should not try to update Anggota when only core User fields change', async () => {
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.anggota.findFirst.mockResolvedValue(null);

      // No Anggota update should happen for core-only fields
      const result = await service.updateProfile('u1', {
        email: 'newemail@ths-thm.org',
      });

      // Should not update Anggota
      expect(mockPrisma.anggota.update).not.toHaveBeenCalled();
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
    it('should return success message when user not found (prevent enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await service.forgotPassword({ email: 'unknown@test.com' });
    });

    it('should send email when user exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      await service.forgotPassword({ email: 'test@ths-thm.org' });
      expect(mockMailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@ths-thm.org',
          subject: expect.stringContaining('Reset'),
        }),
      );
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      mockJwt.verify.mockReturnValue({
        sub: 'u1',
        email: 'test@ths-thm.org',
        purpose: 'reset-password',
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      await service.resetPassword({
        token: 'valid-token',
        newPassword: 'newpass123',
      });
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(
        service.resetPassword({ token: 'bad-token', newPassword: 'newpass' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens for valid refresh token', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'u1', email: 'test@ths-thm.org', role: 'anggota' });
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, refreshToken: 'valid-rt' });
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, refreshToken: 'new-rt' });

      const result = await service.refreshToken('valid-rt');
      expect(result.accessToken).toBe('mock-jwt-token');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(service.refreshToken('invalid-rt')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('setRefreshTokenCookie', () => {
    it('should set maxAge to 7 days (604800000 ms) for "7d", not 7 ms', () => {
      const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
      const res = {
        cookie: (name: string, value: string, options: Record<string, unknown>) =>
          cookies.push({ name, value, options }),
      } as unknown as import('express').Response;

      service.setRefreshTokenCookie(res, 'refresh-token-xyz');

      expect(cookies).toHaveLength(1);
      expect(cookies[0].name).toBe('refreshToken');
      expect(cookies[0].value).toBe('refresh-token-xyz');
      expect(cookies[0].options.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
      // nodeEnv 'test' → cookie tidak secure
      expect(cookies[0].options.secure).toBe(false);
      expect(cookies[0].options.httpOnly).toBe(true);
    });

    it('should handle short durations (e.g. "15m") as milliseconds', () => {
      const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
      const res = {
        cookie: (name: string, value: string, options: Record<string, unknown>) =>
          cookies.push({ name, value, options }),
      } as unknown as import('express').Response;

      const serviceWithShortTtl = Object.assign(Object.create(Object.getPrototypeOf(service)), service, {
        envConfig: { ...(service as unknown as { envConfig: Record<string, unknown> }).envConfig, jwtRefreshExpiresIn: '15m' },
      });

      serviceWithShortTtl.setRefreshTokenCookie(res, 'rt');
      expect(cookies[0].options.maxAge).toBe(15 * 60 * 1000);
    });
  });
});
