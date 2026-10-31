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
import { EventsGateway } from '../notifications/events.gateway';
import { paginate } from '../../common/utils/pagination';

type PostAuthor = { id: string; namaLengkap: string; nomorAnggota: string };

type ForumActor = { id: string; role?: string; namaLengkap?: string };

/** Flat ForumPost row including its author (as returned by Prisma). */
type ForumPostWithAuthor = {
  id: string;
  threadId: string;
  authorId: string | null;
  authorName: string | null;
  parentId: string | null;
  konten: string;
  isSolution: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: PostAuthor | null;
};

/** ForumPostWithAuthor with its nested replies (recursive tree node). */
type ForumPostTreeNode = ForumPostWithAuthor & { children: ForumPostTreeNode[] };

@Injectable()
export class ForumService {
  private readonly logger = new Logger(ForumService.name);
  private readonly ADMIN_ROLES = [
    'superadmin',
    'admin_nasional',
    'admin_distrik',
    'admin_wilayah',
    'admin_ranting',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /** Emit a forum realtime event; failures must never break the request flow. */
  private emit(event: string, data: unknown): void {
    try {
      this.eventsGateway.broadcast(event, data);
    } catch (error) {
      this.logger.warn(`Gagal broadcast event ${event}: ${error}`);
    }
  }

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

  private async resolveAuthor(
    user: ForumActor,
  ): Promise<{ authorId: string | null; authorName: string | null }> {
    const userRow = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, namaLengkap: true },
    });
    if (!userRow) return { authorId: null, authorName: null };

    const anggotaId = await this.resolveAnggotaId(user.id);
    if (anggotaId) return { authorId: anggotaId, authorName: null };
    if (this.isAdmin(user.role)) {
      const authorName = userRow.namaLengkap?.trim() || user.namaLengkap?.trim() || 'Admin';
      return { authorId: null, authorName };
    }
    return { authorId: null, authorName: null };
  }

  /**
   * Resolve the User.id for a given Anggota.id (via shared email).
   * `Notifikasi.userId` references the User model, while forum `authorId`
   * references the Anggota model — notifications must use the User id.
   */
  private async resolveUserIdByAnggotaId(anggotaId: string | null): Promise<string | null> {
    if (!anggotaId) return null;
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
  private isAllowedToModify(
    authorId: string | null,
    contentAuthorId: string | null,
    role?: string,
  ): boolean {
    if (this.isAdmin(role)) return true;
    if (!authorId || !contentAuthorId) return false;
    return authorId === contentAuthorId;
  }

  private isAdmin(role?: string): boolean {
    return !!role && this.ADMIN_ROLES.includes(role);
  }

  /**
   * Convert a flat list of posts into a nested tree.
   *
   * The schema stores `parentId` (self-reference); we build the tree in-memory
   * so consumers receive `children: Post[]` on every post. Orphan replies —
   * whose parent was deleted (FK is ON DELETE SET NULL) — are treated as
   * top-level posts so the thread stays fully readable.
   */
  private buildPostTree(posts: ForumPostWithAuthor[]): ForumPostTreeNode[] {
    const nodes = new Map<string, ForumPostTreeNode>();
    for (const post of posts) {
      nodes.set(post.id, { ...post, children: [] });
    }

    const roots: ForumPostTreeNode[] = [];
    for (const post of posts) {
      const node = nodes.get(post.id)!;
      const parent = post.parentId ? nodes.get(post.parentId) : undefined;
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
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

    const dataWithPreview = data.map((thread) => ({
      ...thread,
      konten: thread.konten.length > 400
        ? `${thread.konten.slice(0, 400)}…`
        : thread.konten,
    }));

    return {
      data: dataWithPreview,
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

    return { ...thread, posts: this.buildPostTree(posts) };
  }

  async createThread(dto: CreateThreadDto, user: ForumActor) {
    const category = await this.prisma.forumCategory.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan');

    const author = await this.resolveAuthor(user);
    if (!author.authorId && !author.authorName) {
      throw new ForbiddenException(
        'Data keanggotaan Anda tidak ditemukan. Tidak dapat membuat thread.',
      );
    }

    const thread = await this.prisma.forumThread.create({
      data: {
        categoryId: dto.categoryId,
        authorId: author.authorId,
        authorName: author.authorName,
        judul: dto.judul,
        konten: dto.konten,
      },
      include: {
        author: { select: { id: true, namaLengkap: true, nomorAnggota: true } },
        category: { select: { id: true, nama: true } },
      },
    });

    this.emit('forum:threadCreated', thread);

    return thread;
  }

  async updateThread(id: string, dto: UpdateThreadDto, user: ForumActor) {
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

    this.emit('forum:threadUpdated', updated);

    return updated;
  }

  async togglePin(id: string) {
    const thread = await this.prisma.forumThread.findUnique({ where: { id } });
    if (!thread) throw new NotFoundException('Thread tidak ditemukan');

    const updated = await this.prisma.forumThread.update({
      where: { id },
      data: { isPinned: !thread.isPinned },
    });

    this.emit('forum:threadUpdated', updated);

    return updated;
  }

  async toggleLock(id: string) {
    const thread = await this.prisma.forumThread.findUnique({ where: { id } });
    if (!thread) throw new NotFoundException('Thread tidak ditemukan');

    const updated = await this.prisma.forumThread.update({
      where: { id },
      data: { isLocked: !thread.isLocked },
    });

    this.emit('forum:threadUpdated', updated);

    return updated;
  }

  async deleteThread(id: string, user: ForumActor) {
    const thread = await this.prisma.forumThread.findUnique({ where: { id } });
    if (!thread) throw new NotFoundException('Thread tidak ditemukan');

    const authorId = await this.resolveAnggotaId(user.id);
    if (!this.isAllowedToModify(authorId, thread.authorId, user.role)) {
      throw new ForbiddenException('Anda hanya dapat menghapus thread sendiri');
    }

    await this.prisma.forumThread.delete({ where: { id } });
    this.emit('forum:threadDeleted', { id, categoryId: thread.categoryId });
  }

  // ─────────────────────────────────────────────────────────
  //  POSTS
  // ─────────────────────────────────────────────────────────

  async createPost(threadId: string, dto: CreatePostDto, user: ForumActor) {
    const thread = await this.prisma.forumThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('Thread tidak ditemukan');
    if (thread.isLocked)
      throw new ForbiddenException('Thread ini dikunci. Tidak dapat menambah balasan.');

    const author = await this.resolveAuthor(user);
    if (!author.authorId && !author.authorName) {
      throw new ForbiddenException('Data keanggotaan Anda tidak ditemukan. Tidak dapat membalas.');
    }

    // Reply bersarang: pastikan post induk ada & merupakan bagian thread ini.
    let parentPost: { id: string; authorId: string | null; threadId: string } | null = null;
    if (dto.parentId) {
      parentPost = await this.prisma.forumPost.findUnique({
        where: { id: dto.parentId },
        select: { id: true, authorId: true, threadId: true },
      });
      if (!parentPost) throw new NotFoundException('Post induk tidak ditemukan');
      if (parentPost.threadId !== threadId) {
        throw new ForbiddenException('Post induk tidak termasuk dalam thread ini');
      }
      if (author.authorId && parentPost.authorId === author.authorId) {
        throw new ForbiddenException('Tidak dapat membalas post sendiri');
      }
    }

    const post = await this.prisma.forumPost.create({
      data: {
        threadId,
        authorId: author.authorId,
        authorName: author.authorName,
        parentId: dto.parentId ?? null,
        konten: dto.konten,
      },
      include: { author: { select: { id: true, namaLengkap: true, nomorAnggota: true } } },
    });

    const postAuthorName =
      (post.author?.namaLengkap as string | undefined) ?? post.authorName ?? 'Admin';

    if (parentPost) {
      // Notifikasi ke pembuat post induk (bila bukan dirinya sendiri)
      const parentAuthorUserId = await this.resolveUserIdByAnggotaId(parentPost.authorId);
      if (parentAuthorUserId) {
        try {
          await this.notificationsService.send(parentAuthorUserId, {
            userId: parentAuthorUserId,
            judul: 'Membalas Komentar Anda',
            isi: `${postAuthorName} membalas komentar Anda di thread "${thread.judul}"`,
            tipe: 'forum_reply',
            data: { threadId, postId: post.id, parentId: parentPost.id },
          });
        } catch (error) {
          this.logger.warn(`Gagal kirim notifikasi balasan forum: ${error}`);
        }
      }
    } else if (thread.authorId && thread.authorId !== author.authorId) {
      const threadAuthorUserId = await this.resolveUserIdByAnggotaId(thread.authorId);
      if (threadAuthorUserId) {
        try {
          await this.notificationsService.send(threadAuthorUserId, {
            userId: threadAuthorUserId,
            judul: 'Balasan Baru di Thread Anda',
            isi: `${postAuthorName} membalas thread "${thread.judul}"`,
            tipe: 'forum_reply',
            data: { threadId, postId: post.id },
          });
        } catch (error) {
          this.logger.warn(`Gagal kirim notifikasi balasan forum: ${error}`);
        }
      }
    }

    this.emit('forum:postCreated', { threadId, post });

    return post;
  }

  /**
   * Membalas komentar tertentu (reply bersarang).
   * Endpoint khusus: `POST /forum/posts/:id/replies`.
   * Mendelegasikan ke createPost dengan parentId yang sudah ditetapkan.
   */
  async replyToPost(postId: string, dto: CreatePostDto, user: ForumActor) {
    const parentPost = await this.prisma.forumPost.findUnique({
      where: { id: postId },
      select: { id: true, threadId: true },
    });
    if (!parentPost) throw new NotFoundException('Post induk tidak ditemukan');

    return this.createPost(parentPost.threadId, { ...dto, parentId: parentPost.id }, user);
  }

  async updatePost(id: string, dto: UpdatePostDto, user: ForumActor) {
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

    this.emit('forum:postUpdated', { threadId: post.threadId, post: updated });

    return updated;
  }

  async markAsSolution(postId: string, threadId: string, user: ForumActor) {
    const post = await this.prisma.forumPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post tidak ditemukan');
    if (post.threadId !== threadId)
      throw new ForbiddenException('Post tidak termasuk dalam thread ini');

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

    if (post.authorId && post.authorId !== authorId) {
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

    this.emit('forum:postUpdated', { threadId, post: updated });

    return updated;
  }

  async deletePost(id: string, user: ForumActor) {
    const post = await this.prisma.forumPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post tidak ditemukan');

    const authorId = await this.resolveAnggotaId(user.id);
    if (!this.isAllowedToModify(authorId, post.authorId, user.role)) {
      throw new ForbiddenException('Anda hanya dapat menghapus balasan sendiri');
    }

    if (authorId && post.authorId && post.authorId !== authorId) {
      const postAuthorUserId = await this.resolveUserIdByAnggotaId(post.authorId);
      if (postAuthorUserId) {
        try {
          await this.notificationsService.send(postAuthorUserId, {
            userId: postAuthorUserId,
            judul: 'Balasan Anda Dihapus',
            isi: `Balasan Anda di thread telah dihapus oleh moderator`,
            tipe: 'forum_deleted',
            data: { threadId: post.threadId, postId: post.id },
          });
        } catch (error) {
          this.logger.warn(`Gagal kirim notifikasi penghapusan forum: ${error}`);
        }
      }
    }

    await this.prisma.forumPost.delete({ where: { id } });
    this.emit('forum:postDeleted', { threadId: post.threadId, postId: post.id });
  }
}
