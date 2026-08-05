import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ForumService } from './forum.service';
import { ForumCategoryService } from './forum-category.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';

describe('ForumService', () => {
  let service: ForumService;

  const mockCategory = {
    id: 'cat1',
    nama: 'Diskusi Umum',
    deskripsi: 'Kategori umum',
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockThread = {
    id: 'thread1',
    categoryId: 'cat1',
    authorId: 'user1',
    judul: 'Test Thread',
    konten: 'Test konten',
    isPinned: false,
    isLocked: false,
    viewCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: { id: 'user1', namaLengkap: 'Test User', nomorAnggota: '001' },
    category: { id: 'cat1', nama: 'Diskusi Umum' },
    _count: { posts: 0 },
  };

  const mockPost = {
    id: 'post1',
    threadId: 'thread1',
    authorId: 'user1',
    konten: 'Test post',
    isSolution: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: { id: 'user1', namaLengkap: 'Test User', nomorAnggota: '001' },
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn().mockImplementation(({ where: { id } }: { where: { id: string } }) =>
        Promise.resolve({ id, email: `${id}@test.com` }),
      ),
      findFirst: jest.fn().mockImplementation(({ where: { email } }: { where: { email: string } }) =>
        Promise.resolve({ id: email.split('@')[0] }),
      ),
    },
    anggota: {
      findFirst: jest.fn().mockImplementation(({ where: { email } }: { where: { email: string } }) =>
        Promise.resolve({ id: email.split('@')[0] }),
      ),
      findUnique: jest.fn().mockImplementation(({ where: { id } }: { where: { id: string } }) =>
        Promise.resolve({ id, email: `${id}@test.com` }),
      ),
    },
    forumCategory: {
      findMany: jest.fn().mockResolvedValue([mockCategory]),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    forumThread: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    forumPost: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  // Standard authed user helpers — authorId (Anggota.id) = "user1"
  const author = { id: 'user1', role: 'anggota' };
  const otherUser = { id: 'user2', role: 'anggota' };

  const mockNotificationsService = {
    send: jest.fn().mockResolvedValue(undefined),
  };

  const mockScopeHelper = {
    buildScopeFilter: jest.fn().mockReturnValue({}),
    buildIndirectScopeFilter: jest.fn().mockReturnValue({}),
    verifyResourceAccess: jest.fn().mockResolvedValue(true),
    hasAccessToResource: jest.fn().mockReturnValue(true),
    hasAccessToResourceAsync: jest.fn().mockResolvedValue(true),
    verifyKegiatanScope: jest.fn().mockResolvedValue(true),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    getOrSet: jest.fn(),
    invalidatePrefix: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForumService,
        ForumCategoryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: ScopeHelper, useValue: mockScopeHelper },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<ForumService>(ForumService);
    jest.clearAllMocks();
  });

  describe('getThreads', () => {
    it('should return threads for a category', async () => {
      mockPrisma.forumThread.findMany.mockResolvedValue([mockThread]);
      const result = await service.getThreads('cat1', {});
      expect(result.data).toBeDefined();
    });
  });

  describe('getThread', () => {
    it('should return thread detail with posts', async () => {
      mockPrisma.forumThread.findUnique.mockResolvedValue(mockThread);
      mockPrisma.forumThread.update.mockResolvedValue(mockThread);
      mockPrisma.forumPost.findMany.mockResolvedValue([mockPost]);
      const result = await service.getThread('thread1');
      expect(result.posts).toHaveLength(1);
    });

    it('should increment viewCount', async () => {
      mockPrisma.forumThread.findUnique.mockResolvedValue(mockThread);
      mockPrisma.forumThread.update.mockResolvedValue(mockThread);
      mockPrisma.forumPost.findMany.mockResolvedValue([]);
      await service.getThread('thread1');
      expect(mockPrisma.forumThread.update).toHaveBeenCalledWith({
        where: { id: 'thread1' },
        data: { viewCount: { increment: 1 } },
      });
    });
  });

  describe('createThread', () => {
    it('should create a new thread', async () => {
      mockPrisma.forumCategory.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.forumThread.create.mockResolvedValue(mockThread);
      const result = await service.createThread({ categoryId: 'cat1', judul: 'Test', konten: 'Konten' }, author);
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException for invalid category', async () => {
      mockPrisma.forumCategory.findUnique.mockResolvedValue(null);
      await expect(
        service.createThread({ categoryId: 'invalid', judul: 'Test', konten: 'Konten' }, author),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateThread', () => {
    it('should update own thread', async () => {
      mockPrisma.forumThread.findUnique.mockResolvedValue(mockThread);
      mockPrisma.forumThread.update.mockResolvedValue({ ...mockThread, judul: 'Updated' });
      const result = await service.updateThread('thread1', { judul: 'Updated' }, author);
      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException for non-author', async () => {
      mockPrisma.forumThread.findUnique.mockResolvedValue(mockThread);
      await expect(
        service.updateThread('thread1', { judul: 'Updated' }, otherUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('togglePin', () => {
    it('should toggle pin status', async () => {
      mockPrisma.forumThread.findUnique.mockResolvedValue(mockThread);
      mockPrisma.forumThread.update.mockResolvedValue({ ...mockThread, isPinned: true });
      const result = await service.togglePin('thread1');
      expect(result.isPinned).toBe(true);
    });
  });

  describe('toggleLock', () => {
    it('should toggle lock status', async () => {
      mockPrisma.forumThread.findUnique.mockResolvedValue(mockThread);
      mockPrisma.forumThread.update.mockResolvedValue({ ...mockThread, isLocked: true });
      const result = await service.toggleLock('thread1');
      expect(result.isLocked).toBe(true);
    });
  });

  describe('deleteThread', () => {
    it('should delete own thread', async () => {
      mockPrisma.forumThread.findUnique.mockResolvedValue(mockThread);
      mockPrisma.forumThread.delete.mockResolvedValue(mockThread);
      await service.deleteThread('thread1', author);
    });

    it('should throw ForbiddenException for non-author', async () => {
      mockPrisma.forumThread.findUnique.mockResolvedValue(mockThread);
      await expect(service.deleteThread('thread1', otherUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createPost', () => {
    it('should create a post in unlocked thread', async () => {
      mockPrisma.forumThread.findUnique.mockResolvedValue({ ...mockThread, isLocked: false });
      mockPrisma.forumPost.create.mockResolvedValue(mockPost);
      const result = await service.createPost('thread1', { konten: 'Reply' }, otherUser);
      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException for locked thread', async () => {
      mockPrisma.forumThread.findUnique.mockResolvedValue({ ...mockThread, isLocked: true });
      await expect(service.createPost('thread1', { konten: 'Reply' }, otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should notify thread author on new reply', async () => {
      mockPrisma.forumThread.findUnique.mockResolvedValue({ ...mockThread, isLocked: false, authorId: 'user1' });
      mockPrisma.forumPost.create.mockResolvedValue({ ...mockPost, author: { id: 'user2', namaLengkap: 'Replyer' } });
      await service.createPost('thread1', { konten: 'Reply' }, otherUser);
      expect(mockNotificationsService.send).toHaveBeenCalledWith('user1', {
        userId: 'user1',
        judul: 'Balasan Baru di Thread Anda',
        isi: 'Replyer membalas thread "Test Thread"',
        tipe: 'forum_reply',
        data: { threadId: 'thread1', postId: expect.any(String) },
      });
    });
  });

  describe('updatePost', () => {
    it('should allow author to update their post', async () => {
      mockPrisma.forumPost.findUnique.mockResolvedValue({ ...mockPost, authorId: 'user1' });
      mockPrisma.forumPost.update.mockResolvedValue({ ...mockPost, konten: 'Updated' });
      const result = await service.updatePost('post1', { konten: 'Updated' }, author);
      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException for non-author', async () => {
      mockPrisma.forumPost.findUnique.mockResolvedValue({ ...mockPost, authorId: 'user1' });
      await expect(service.updatePost('post1', { konten: 'Hack' }, otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('markAsSolution', () => {
    it('should allow thread author to mark a solution', async () => {
      mockPrisma.forumPost.findUnique.mockResolvedValue(mockPost);
      mockPrisma.forumThread.findUnique.mockResolvedValue(mockThread);
      mockPrisma.forumPost.updateMany.mockResolvedValue([]);
      mockPrisma.forumPost.update.mockResolvedValue({ ...mockPost, isSolution: true });
      const result = await service.markAsSolution('post1', 'thread1', author);
      expect(result.isSolution).toBe(true);
    });

    it('should throw ForbiddenException for non-thread-author', async () => {
      mockPrisma.forumPost.findUnique.mockResolvedValue(mockPost);
      mockPrisma.forumThread.findUnique.mockResolvedValue(mockThread);
      await expect(service.markAsSolution('post1', 'thread1', otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should notify post author when marked as solution', async () => {
      mockPrisma.forumPost.findUnique.mockResolvedValue({ ...mockPost, authorId: 'user2', threadId: 'thread1' });
      mockPrisma.forumThread.findUnique.mockResolvedValue(mockThread);
      mockPrisma.forumPost.updateMany.mockResolvedValue([]);
      mockPrisma.forumPost.update.mockResolvedValue({ ...mockPost, isSolution: true });
      await service.markAsSolution('post1', 'thread1', author);
      expect(mockNotificationsService.send).toHaveBeenCalledWith('user2', {
        userId: 'user2',
        judul: 'Balasan Anda Ditandai Solusi',
        isi: 'Balasan Anda di thread "Test Thread" telah ditandai sebagai solusi',
        tipe: 'forum_solution',
        data: { threadId: 'thread1', postId: 'post1' },
      });
    });
  });

  describe('deletePost', () => {
    it('should delete own post', async () => {
      mockPrisma.forumPost.findUnique.mockResolvedValue(mockPost);
      mockPrisma.forumPost.delete.mockResolvedValue(mockPost);
      await service.deletePost('post1', author);
    });

    it('should throw ForbiddenException for non-author', async () => {
      mockPrisma.forumPost.findUnique.mockResolvedValue(mockPost);
      await expect(service.deletePost('post1', otherUser)).rejects.toThrow(ForbiddenException);
    });
  });
});
