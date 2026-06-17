import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateThreadDto, CreatePostDto } from './dto/forum.dto';
import { paginate } from '../../common/utils/pagination';

@Injectable()
export class ForumService {
  constructor(private readonly prisma: PrismaService) {}

  async getCategories() {
    const categories = await this.prisma.forumCategory.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { threads: true } } },
    });
    return { success: true, data: categories };
  }

  async getThreads(categoryId: string, page = 1, limit = 20) {
    const where = { categoryId };
    const result = await paginate(this.prisma.forumThread, where, {
      page,
      limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, namaLengkap: true, nomorAnggota: true } },
        category: { select: { id: true, nama: true } },
        _count: { select: { posts: true } },
      },
    });
    return result;
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

    return { success: true, data: { ...thread, posts } };
  }

  async createThread(dto: CreateThreadDto, authorId: string) {
    const category = await this.prisma.forumCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan');

    const thread = await this.prisma.forumThread.create({
      data: {
        categoryId: dto.categoryId,
        authorId,
        judul: dto.judul,
        konten: dto.konten,
      },
      include: {
        author: { select: { id: true, namaLengkap: true, nomorAnggota: true } },
        category: { select: { id: true, nama: true } },
      },
    });

    return { success: true, data: thread, message: 'Thread berhasil dibuat' };
  }

  async createPost(threadId: string, dto: CreatePostDto, authorId: string) {
    const thread = await this.prisma.forumThread.findUnique({
      where: { id: threadId },
    });
    if (!thread) throw new NotFoundException('Thread tidak ditemukan');
    if (thread.isLocked)
      throw new ForbiddenException('Thread ini dikunci. Tidak dapat menambah balasan.');

    const post = await this.prisma.forumPost.create({
      data: {
        threadId,
        authorId,
        konten: dto.konten,
      },
      include: {
        author: { select: { id: true, namaLengkap: true, nomorAnggota: true } },
      },
    });

    return { success: true, data: post, message: 'Balasan berhasil dikirim' };
  }

  async togglePin(id: string) {
    const thread = await this.prisma.forumThread.findUnique({ where: { id } });
    if (!thread) throw new NotFoundException('Thread tidak ditemukan');

    const updated = await this.prisma.forumThread.update({
      where: { id },
      data: { isPinned: !thread.isPinned },
    });

    return {
      success: true,
      data: updated,
      message: updated.isPinned ? 'Thread dipin' : 'Thread unpin',
    };
  }

  async toggleLock(id: string) {
    const thread = await this.prisma.forumThread.findUnique({ where: { id } });
    if (!thread) throw new NotFoundException('Thread tidak ditemukan');

    const updated = await this.prisma.forumThread.update({
      where: { id },
      data: { isLocked: !thread.isLocked },
    });

    return {
      success: true,
      data: updated,
      message: updated.isLocked ? 'Thread dikunci' : 'Thread dibuka',
    };
  }

  async deleteThread(id: string) {
    const thread = await this.prisma.forumThread.findUnique({ where: { id } });
    if (!thread) throw new NotFoundException('Thread tidak ditemukan');

    await this.prisma.forumThread.delete({ where: { id } });
    return { success: true, message: 'Thread berhasil dihapus' };
  }

  async deletePost(id: string) {
    const post = await this.prisma.forumPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post tidak ditemukan');

    await this.prisma.forumPost.delete({ where: { id } });
    return { success: true, message: 'Balasan berhasil dihapus' };
  }
}
