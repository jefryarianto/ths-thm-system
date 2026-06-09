// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('UsersService', () => {
  let service: UsersService;

  const mockPrisma = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    ranting: {
      findUnique: jest.fn(),
    },
  };

  const mockMailService = {
    sendMail: jest.fn().mockResolvedValue(true),
  };

  const mockScopeHelper = {
    buildScopeFilter: jest.fn().mockReturnValue({}),
    buildIndirectScopeFilter: jest.fn().mockReturnValue({}),
    hasAccessToResource: jest.fn().mockReturnValue(true),
    hasAccessToResourceAsync: jest.fn().mockResolvedValue(true),
    verifyKegiatanScope: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMailService },
        { provide: ScopeHelper, useValue: mockScopeHelper },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const mockUsers = [{ id: '1', email: 'test@test.com', namaLengkap: 'Test', role: 'admin_ranting', isActive: true }];
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUsers);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by role', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.findAll({ role: 'admin_ranting' });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: 'admin_ranting' } }),
      );
    });

    it('should filter by scope rantingId', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10 }, { rantingId: 'r1' });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ rantingId: 'r1' }) }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a single user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1', email: 'test@test.com' });

      const result = await service.findOne('1');
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for out-of-scope user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1', rantingId: 'r-other' });
      mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(false);
      await expect(service.findOne('1', { rantingId: 'r1' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('should create a user with hashed password', async () => {
      const dto = { email: 'new@test.com', namaLengkap: 'New User', password: 'secret' };
      const mockCreated = { id: '1', email: 'new@test.com', passwordHash: 'hashed-password' };
      mockPrisma.user.create.mockResolvedValue(mockCreated);

      const result = await service.create(dto);
      expect(result.success).toBe(true);
      expect(result.data.email).toBe('new@test.com');
      expect(result.data).not.toHaveProperty('passwordHash');
    });

    it('should auto-assign rantingId from scope', async () => {
      mockPrisma.user.create.mockResolvedValue({ id: '1', email: 'new@test.com', passwordHash: 'hashed-password' });
      await service.create({ email: 'new@test.com', namaLengkap: 'New User' }, { rantingId: 'r1' });
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ rantingId: 'r1' }) }),
      );
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const dto = { namaLengkap: 'Updated' };
      mockPrisma.user.update.mockResolvedValue({ id: '1', namaLengkap: 'Updated' });

      const result = await service.update('1', dto);
      expect(result.success).toBe(true);
      expect(result.data.namaLengkap).toBe('Updated');
    });

    it('should throw ForbiddenException for out-of-scope user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ rantingId: 'r-other' });
      mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(false);
      await expect(service.update('1', { namaLengkap: 'Test' }, { rantingId: 'r1' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should soft-deactivate user', async () => {
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.remove('1');
      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false },
      });
    });
  });
});
