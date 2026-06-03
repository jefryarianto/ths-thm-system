import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const where: any = {};
    if (query.role) where.role = query.role;
    if (query.search) where.namaLengkap = { contains: query.search };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip: (page - 1) * limit, take: limit, select: { id: true, email: true, namaLengkap: true, role: true, isActive: true, createdAt: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count({ where }),
    ]);
    return { success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, email: true, namaLengkap: true, role: true, rantingId: true, isActive: true, createdAt: true } });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    return { success: true, data: user };
  }

  async create(dto: any) {
    const passwordHash = await bcrypt.hash(dto.password || 'password123', 12);
    const user = await this.prisma.user.create({ data: { ...dto, passwordHash } });
    const { passwordHash: _, ...result } = user;
    return { success: true, data: result, message: 'User berhasil dibuat' };
  }

  async update(id: string, dto: any) {
    const data: any = { ...dto };
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 12);
    delete data.password;
    const user = await this.prisma.user.update({ where: { id }, data, select: { id: true, email: true, namaLengkap: true, role: true, isActive: true } });
    return { success: true, data: user, message: 'User berhasil diperbarui' };
  }

  async remove(id: string) {
    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    return { success: true, message: 'User dinonaktifkan' };
  }
}