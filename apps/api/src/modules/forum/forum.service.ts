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
  private readonly ADMIN_ROLES = ['superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─────────────────────────────────────────────────────────
  //  HELPERS
  // ─────────────────────────────────────────────────────────

  /**
   * Resolve the current user's Anggota.id — the forum `authorId` references
   * the `Anggota` model (NOT the User model), so we must map via email.
   */
  private async resolveAnggotaId(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user?.email) return null;

    const anggota = await this.prisma.anggota.findFirst({
      where: { email: user.email, deletedAt: null },
      select: { id: true },
    });
    return anggota?.id ?? null;
  }

  /**
   * Resolve the User.id for a given Anggota.id (via shared email).
   * `Notifikasi.userId` references the User model, while forum `authorId`
   * references the Anggota model — notifications must use the User id.
   */
  private async resolveUserIdByAnggotaId(anggotaId: string): Promise<string | null> {
    const anggota = await this.prisma.anggota.findUnique({
      where: { id: anggotaId },
      select: { email: true },
    });
    if (!anggota?.email) return null;

    const user = await this.prisma.user.findFirst({
      where: { email: anggota.email, isActive: true },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  /**
   * Authorisation guard: admins may always act; members only on their own content.
   * Admins without an Anggota record are still allowed to moderate.
   */
  private isAllowedToModify(authorId: string | null, contentAuthorId: string, role?: string): boolean {
    if (this.isAdmin(role)) return true;
    return !!authorId && authorId === contentAuthorId;
  }

  private isAdmin(role?: string): boolean {
    return !!role && this.ADMIN_ROLES.includes(role);
  }

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

    return { ...thread, posts };
  }

  async createThread(dto: CreateThreadDto, user: { id: string; role?: string }) {
    const category = await this.prisma.forumCategory.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan');

    const authorId = await this.resolveAnggotaId(user.id);
    if (!authorId) {
      throw new ForbiddenException('Data keanggotaan Anda tidak ditemukan. Tidak dapat membuat thread.');
    }

    const thread = await this.prisma.forumThread.create({
      data: { categoryId: dto.categoryId, authorId, judul: dto.judul, konten: dto.konten },
      include: {
        author: { select: { id: true, namaLengkap: true, nomorAnggota: true } },
        category: { select: { id: true, nama: true } },
      },
    });

    return thread;
  }

  async updateThread(id: string, dto: UpdateThreadDto, user: { id: string; role?: string }) {
    const thread = await this.prisma.forumThread.findUnique({ where: { id } });
    if (!thread) throw new NotFoundException('Thread tidak ditemukan');

    const authorId = await this.resolveAnggotaId(user.id);
    if (!this.isAllowedToModify(authorId, thread.authorId, user.role)) {
      throw new ForbiddenException('Anda hanya dapat mengedit thread sendiri');
    }

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

    return updated;
  }

  async togglePin(id: string) {
    const thread = await this.prisma.forumThread.findUnique({ where: { id } });
    if (!thread) throw new NotFoundException('Thread tidak ditemukan');

    const updated = await this.prisma.forumThread.update({
      where: { id },
      data: { isPinned: !thread.isPinned },
    });

    return updated;
  }

  async toggleLock(id: string) {
    const thread = await this.prisma.forumThread.findUnique({ where: { id } });
    if (!thread) throw new NotFoundException('Thread tidak ditemukan');

    const updated = await this.prisma.forumThread.update({
      where: { id },
      data: { isLocked: !thread.isLocked },
    });

    return updated;
  }

  async deleteThread(id: string, user: { id: string; role?: string }) {
    const thread = await this.prisma.forumThread.findUnique({ where: { id } });
    if (!thread) throw new NotFoundException('Thread tidak ditemukan');

    const authorId = await this.resolveAnggotaId(user.id);
    if (!this.isAllowedToModify(authorId, thread.authorId, user.role)) {
      throw new ForbiddenException('Anda hanya dapat menghapus thread sendiri');
    }

    await this.prisma.forumThread.delete({ where: { id } });
  }

  // ─────────────────────────────────────────────────────────
  //  POSTS
  // ─────────────────────────────────────────────────────────

  async createPost(threadId: string, dto: CreatePostDto, user: { id: string; role?: string }) {
    const thread = await this.prisma.forumThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('Thread tidak ditemukan');
    if (thread.isLocked) throw new ForbiddenException('Thread ini dikunci. Tidak dapat menambah balasan.');

    const authorId = await this.resolveAnggotaId(user.id);
    if (!authorId) {
      throw new ForbiddenException('Data keanggotaan Anda tidak ditemukan. Tidak dapat membalas.');
    }

    const post = await this.prisma.forumPost.create({
      data: { threadId, authorId, konten: dto.konten },
      include: { author: { select: { id: true, namaLengkap: true, nomorAnggota: true } } },
    });

    if (thread.authorId !== authorId) {
      const threadAuthorUserId = await this.resolveUserIdByAnggotaId(thread.authorId);
      if (threadAuthorUserId) {
        try {
          await this.notificationsService.send(threadAuthorUserId, {
            userId: threadAuthorUserId,
            judul: 'Balasan Baru di Thread Anda',
            isi: `${post.author.namaLengkap} membalas thread "${thread.judul}"`,
            tipe: 'forum_reply',
            data: { threadId, postId: post.id },
          });
        } catch (error) {
          this.logger.warn(`Gagal kirim notifikasi balasan forum: ${error}`);
        }
      }
    }

    return post;
  }

  async updatePost(id: string, dto: UpdatePostDto, user: { id: string; role?: string }) {
    const post = await this.prisma.forumPost.findUnique({
      where: { id },
      include: { author: { select: { id: true } } },
    });
    if (!post) throw new NotFoundException('Post tidak ditemukan');

    const authorId = await this.resolveAnggotaId(user.id);
    if (!this.isAllowedToModify(authorId, post.authorId, user.role)) {
      throw new ForbiddenException('Anda hanya dapat mengedit balasan sendiri');
    }

    const updated = await this.prisma.forumPost.update({
      where: { id },
      data: { konten: dto.konten! },
      include: { author: { select: { id: true, namaLengkap: true, nomorAnggota: true } } },
    });

    return updated;
  }

  async markAsSolution(postId: string, threadId: string, user: { id: string; role?: string }) {
    const post = await this.prisma.forumPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post tidak ditemukan');
    if (post.threadId !== threadId) throw new ForbiddenException('Post tidak termasuk dalam thread ini');

    const thread = await this.prisma.forumThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('Thread tidak ditemukan');

    const authorId = await this.resolveAnggotaId(user.id);
    if (!this.isAllowedToModify(authorId, thread.authorId, user.role)) {
      throw new ForbiddenException('Hanya pembuat thread yang dapat menandai solusi');
    }

    await this.prisma.forumPost.updateMany({
      where: { threadId, isSolution: true },
      data: { isSolution: false },
    });

    const updated = await this.prisma.forumPost.update({
      where: { id: postId },
      data: { isSolution: true },
      include: { author: { select: { id: true, namaLengkap: true, nomorAnggota: true } } },
    });

    if (post.authorId !== authorId) {
      const postAuthorUserId = await this.resolveUserIdByAnggotaId(post.authorId);
      if (postAuthorUserId) {
        try {
          await this.notificationsService.send(postAuthorUserId, {
            userId: postAuthorUserId,
            judul: 'Balasan Anda Ditandai Solusi',
            isi: `Balasan Anda di thread "${thread.judul}" telah ditandai sebagai solusi`,
            tipe: 'forum_solution',
            data: { threadId, postId },
          });
        } catch (error) {
          this.logger.warn(`Gagal kirim notifikasi solusi forum: ${error}`);
        }
      }
    }

    return updated;
  }

  async deletePost(id: string, user: { id: string; role?: string }) {
    const post = await this.prisma.forumPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post tidak ditemukan');

    const authorId = await this.resolveAnggotaId(user.id);
    if (!this.isAllowedToModify(authorId, post.authorId, user.role)) {
      throw new ForbiddenException('Anda hanya dapat menghapus balasan sendiri');
    }

    await this.prisma.forumPost.delete({ where: { id } });
  }
}
