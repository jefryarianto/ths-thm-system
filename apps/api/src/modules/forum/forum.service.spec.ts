import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ForumService } from './forum.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

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

  const mockNotificationsService = {
    send: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForumService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<ForumService>(ForumService);
    jest.clearAllMocks();
  });

  describe('getCategories', () => {
    it('should return all categories with thread counts', async () => {
      const result = await service.getCategories();
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getCategory', () => {
    it('should return a category by id', async () => {
      mockPrisma.forumCategory.findUnique.mockResolvedValue(mockCategory);
      const result = await service.getCategory('cat1');
      expect(result.data.nama).toBe('Diskusi Umum');
    });

    it('should throw NotFoundException if category not found', async () => {
      mockPrisma.forumCategory.findUnique.mockResolvedValue(null);
      await expect(service.getCategory('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createCategory', () => {
    it('should create a new category', async () => {
      mockPrisma.forumCategory.create.mockResolvedValue({ ...mockCategory, id: 'cat2' });
      const result = await service.createCategory({ nama: 'Baru', deskripsi: 'Test', order: 1 });
      expect(mockPrisma.forumCategory.create).toHaveBeenCalled();
    });
  });

  describe('updateCategory', () => {
    it('should update an existing category', async () => {
      mockPrisma.forumCategory.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.forumCategory.update.mockResolvedValue({ ...mockCategory, nama: 'Updated' });
      const result = await service.updateCategory('cat1', { nama: 'Updated' });
      expect(result.data.nama).toBe('Updated');
    });

    it('should throw NotFoundException for non-existent category', async () => {
      mockPrisma.forumCategory.findUnique.mockResolvedValue(null);
      await expect(service.updateCategory('invalid', { nama: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteCategory', () => {
    it('should delete a category', async () => {
      mockPrisma.forumCategory.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.forumCategory.delete.mockResolvedValue(mockCategory);
      const result = await service.deleteCategory('cat1');
      expect(mockPrisma.forumCategory.delete).toHaveBeenCalledWith({ where: { id: 'cat1' } });
    });
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
      expect(result.data.posts).toHaveLength(1);
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
      const result = await service.createThread({ categoryId: 'cat1', judul: 'Test', konten: 'Konten' }, 'user1');
    });

    it('should throw NotFoundException for invalid category', async () => {
      mockPrisma.forumCategory.findUnique.mockResolvedValue(null);
      await expect(
        service.createThread({ categoryId: 'invalid', judul: 'Test', konten: 'Konten' }, 'user1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateThread', () => {
    it('should update a thread', async () => {
      mockPrisma.forumThread.findUnique.mockResolvedValue(mockThread);
      mockPrisma.forumThread.update.mockResolvedValue({ ...mockThread, judul: 'Updated' });
      const result = await service.updateThread('thread1', { judul: 'Updated' }, 'user1');
    });
  });

  describe('togglePin', () => {
    it('should toggle pin status', async () => {
      mockPrisma.forumThread.findUnique.mockResolvedValue(mockThread);
      mockPrisma.forumThread.update.mockResolvedValue({ ...mockThread, isPinned: true });
      const result = await service.togglePin('thread1');
      expect(result.data.isPinned).toBe(true);
    });
  });

  describe('toggleLock', () => {
    it('should toggle lock status', async () => {
      mockPrisma.forumThread.findUnique.mockResolvedValue(mockThread);
      mockPrisma.forumThread.update.mockResolvedValue({ ...mockThread, isLocked: true });
      const result = await service.toggleLock('thread1');
      expect(result.data.isLocked).toBe(true);
    });
  });

  describe('deleteThread', () => {
    it('should delete a thread', async () => {
      mockPrisma.forumThread.findUnique.mockResolvedValue(mockThread);
      mockPrisma.forumThread.delete.mockResolvedValue(mockThread);
      const result = await service.deleteThread('thread1');
    });
  });

  describe('createPost', () => {
    it('should create a post in unlocked thread', async () => {
      mockPrisma.forumThread.findUnique.mockResolvedValue({ ...mockThread, isLocked: false });
      mockPrisma.forumPost.create.mockResolvedValue(mockPost);
      const result = await service.createPost('thread1', { konten: 'Reply' }, 'user2');
    });

    it('should throw ForbiddenException for locked thread', async () => {
      mockPrisma.forumThread.findUnique.mockResolvedValue({ ...mockThread, isLocked: true });
      await expect(service.createPost('thread1', { konten: 'Reply' }, 'user2')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should notify thread author on new reply', async () => {
      mockPrisma.forumThread.findUnique.mockResolvedValue({ ...mockThread, isLocked: false, authorId: 'user1' });
      mockPrisma.forumPost.create.mockResolvedValue({ ...mockPost, author: { id: 'user2', namaLengkap: 'Replyer' } });
      await service.createPost('thread1', { konten: 'Reply' }, 'user2');
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
      const result = await service.updatePost('post1', { konten: 'Updated' }, 'user1');
    });

    it('should throw ForbiddenException for non-author', async () => {
      mockPrisma.forumPost.findUnique.mockResolvedValue({ ...mockPost, authorId: 'user1' });
      await expect(service.updatePost('post1', { konten: 'Hack' }, 'user2')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('markAsSolution', () => {
    it('should mark a post as solution and clear others', async () => {
      mockPrisma.forumPost.findUnique.mockResolvedValue(mockPost);
      mockPrisma.forumThread.findUnique.mockResolvedValue(mockThread);
      mockPrisma.forumPost.updateMany.mockResolvedValue([]);
      mockPrisma.forumPost.update.mockResolvedValue({ ...mockPost, isSolution: true });
      const result = await service.markAsSolution('post1', 'thread1', 'user1');
      expect(result.data.isSolution).toBe(true);
    });

    it('should notify post author when marked as solution', async () => {
      mockPrisma.forumPost.findUnique.mockResolvedValue({ ...mockPost, authorId: 'user2', threadId: 'thread1' });
      mockPrisma.forumThread.findUnique.mockResolvedValue(mockThread);
      mockPrisma.forumPost.updateMany.mockResolvedValue([]);
      mockPrisma.forumPost.update.mockResolvedValue({ ...mockPost, isSolution: true });
      await service.markAsSolution('post1', 'thread1', 'user1');
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
    it('should delete a post', async () => {
      mockPrisma.forumPost.findUnique.mockResolvedValue(mockPost);
      mockPrisma.forumPost.delete.mockResolvedValue(mockPost);
      const result = await service.deletePost('post1');
    });
  });
});
