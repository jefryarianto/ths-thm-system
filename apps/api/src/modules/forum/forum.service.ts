import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateThreadDto,
  CreatePostDto,
  UpdateThreadDto,
  UpdatePostDto,
  ThreadFilterDto,
} from './dto/forum.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { paginate } from '../../common/utils/pagination';

@Injectable()
export class ForumService {
  private readonly logger = new Logger(ForumService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─────────────────────────────────────────────────────────
  //  THREADS
  // ─────────────────────────────────────────────────────────

  async getThreads(categoryId: string, filter: ThreadFilterDto) {
    const where: Record<string, unknown> = { categoryId };

    if (filter.search) {
      where.OR = [
        { judul: { contains: filter.search, mode: 'insensitive' } },
        { konten: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    if (filter.isPinned !== undefined) where.isPinned = filter.isPinned;
    if (filter.isLocked !== undefined) where.isLocked = filter.isLocked;
    if (filter.authorId) where.authorId = filter.authorId;

    const orderBy = filter.isPinned
      ? [{ isPinned: 'desc' as const }, { createdAt: 'desc' as const }]
      : { createdAt: 'desc' as const };

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.forumThread.findMany({
        where,
        skip,
        take: limit,
        orderBy: orderBy as unknown as Record<string, 'asc' | 'desc'>[],
        include: {
          author: { select: { id: true, namaLengkap: true, nomorAnggota: true } },
          category: { select: { id: true, nama: true } },
          _count: { select: { posts: true } },
        },
      }),
      this.prisma.forumThread.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getThread(id: string) {
    const thread = await this.prisma.forumThread.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, namaLengkap: true, nomorAnggota: true } },
        category: { select: { id: true, nama: true } },
      },
    });
    if (!thread) throw new NotFoundException('Thread tidak ditemukan');

    await this.prisma.forumThread.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    const posts = await this.prisma.forumPost.findMany({
      where: { threadId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, namaLengkap: true, nomorAnggota: true } },
      },
    });

    return { data: { ...thread, posts } };
  }

  async createThread(dto: CreateThreadDto, authorId: string) {
    const category = await this.prisma.forumCategory.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan');

    const thread = await this.prisma.forumThread.create({
      data: { categoryId: dto.categoryId, authorId, judul: dto.judul, konten: dto.konten },
      include: {
        author: { select: { id: true, namaLengkap: true, nomorAnggota: true } },
        category: { select: { id: true, nama: true } },
      },
    });

    return { data: thread, message: 'Thread berhasil dibuat' };
  }

  async updateThread(id: string, dto: UpdateThreadDto, userId: string) {
    const thread = await this.prisma.forumThread.findUnique({ where: { id } });
    if (!thread) throw new NotFoundException('Thread tidak ditemukan');

    const updated = await this.prisma.forumThread.update({
      where: { id },
      data: {
        ...(dto.judul !== undefined && { judul: dto.judul }),
        ...(dto.konten !== undefined && { konten: dto.konten }),
      },
      include: {
        author: { select: { id: true, namaLengkap: true, nomorAnggota: true } },
        category: { select: { id: true, nama: true } },
      },
    });

    return { data: updated, message: 'Thread berhasil diperbarui' };
  }

  async togglePin(id: string) {
    const thread = await this.prisma.forumThread.findUnique({ where: { id } });
    if (!thread) throw new NotFoundException('Thread tidak ditemukan');

    const updated = await this.prisma.forumThread.update({
      where: { id },
      data: { isPinned: !thread.isPinned },
    });

    return { data: updated, message: updated.isPinned ? 'Thread dipin' : 'Thread unpin' };
  }

  async toggleLock(id: string) {
    const thread = await this.prisma.forumThread.findUnique({ where: { id } });
    if (!thread) throw new NotFoundException('Thread tidak ditemukan');

    const updated = await this.prisma.forumThread.update({
      where: { id },
      data: { isLocked: !thread.isLocked },
    });

    return { data: updated, message: updated.isLocked ? 'Thread dikunci' : 'Thread dibuka' };
  }

  async deleteThread(id: string) {
    const thread = await this.prisma.forumThread.findUnique({ where: { id } });
    if (!thread) throw new NotFoundException('Thread tidak ditemukan');
    await this.prisma.forumThread.delete({ where: { id } });
    return { message: 'Thread berhasil dihapus' };
  }

  // ─────────────────────────────────────────────────────────
  //  POSTS
  // ─────────────────────────────────────────────────────────

  async createPost(threadId: string, dto: CreatePostDto, authorId: string) {
    const thread = await this.prisma.forumThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('Thread tidak ditemukan');
    if (thread.isLocked) throw new ForbiddenException('Thread ini dikunci. Tidak dapat menambah balasan.');

    const post = await this.prisma.forumPost.create({
      data: { threadId, authorId, konten: dto.konten },
      include: { author: { select: { id: true, namaLengkap: true, nomorAnggota: true } } },
    });

    if (thread.authorId !== authorId) {
      try {
        await this.notificationsService.send(thread.authorId, {
          userId: thread.authorId,
          judul: 'Balasan Baru di Thread Anda',
          isi: `${post.author.namaLengkap} membalas thread "${thread.judul}"`,
          tipe: 'forum_reply',
          data: { threadId, postId: post.id },
        });
      } catch {
        // ignore notification failure
      }
    }

    return { data: post, message: 'Balasan berhasil dikirim' };
  }

  async updatePost(id: string, dto: UpdatePostDto, userId: string) {
    const post = await this.prisma.forumPost.findUnique({
      where: { id },
      include: { author: { select: { id: true } } },
    });
    if (!post) throw new NotFoundException('Post tidak ditemukan');
    if (post.authorId !== userId) throw new ForbiddenException('Anda hanya dapat mengedit balasan sendiri');

    const updated = await this.prisma.forumPost.update({
      where: { id },
      data: { konten: dto.konten! },
      include: { author: { select: { id: true, namaLengkap: true, nomorAnggota: true } } },
    });

    return { data: updated, message: 'Balasan berhasil diperbarui' };
  }

  async markAsSolution(postId: string, threadId: string, userId: string) {
    const post = await this.prisma.forumPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post tidak ditemukan');
    if (post.threadId !== threadId) throw new ForbiddenException('Post tidak termasuk dalam thread ini');

    const thread = await this.prisma.forumThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('Thread tidak ditemukan');

    await this.prisma.forumPost.updateMany({
      where: { threadId, isSolution: true },
      data: { isSolution: false },
    });

    const updated = await this.prisma.forumPost.update({
      where: { id: postId },
      data: { isSolution: true },
      include: { author: { select: { id: true, namaLengkap: true, nomorAnggota: true } } },
    });

    if (post.authorId !== userId) {
      try {
        await this.notificationsService.send(post.authorId, {
          userId: post.authorId,
          judul: 'Balasan Anda Ditandai Solusi',
          isi: `Balasan Anda di thread "${thread.judul}" telah ditandai sebagai solusi`,
          tipe: 'forum_solution',
          data: { threadId, postId },
        });
      } catch {
        // ignore
      }
    }

    return { data: updated, message: 'Solusi berhasil ditandai' };
  }

  async deletePost(id: string) {
    const post = await this.prisma.forumPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post tidak ditemukan');
    await this.prisma.forumPost.delete({ where: { id } });
    return { message: 'Balasan berhasil dihapus' };
  }
}
