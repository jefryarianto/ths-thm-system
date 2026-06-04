import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, UserFilterDto } from './dto/user.dto';
import bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: UserFilterDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const where: Record<string, unknown> = {};
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

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password || 'password123', 12);
    const user = await this.prisma.user.create({ data: { email: dto.email, namaLengkap: dto.namaLengkap, role: dto.role as never, rantingId: dto.rantingId, passwordHash } });
    const { passwordHash: _, ...result } = user;
    return { success: true, data: result, message: 'User berhasil dibuat' };
  }

  async update(id: string, dto: UpdateUserDto) {
    const data: Record<string, unknown> = {};
    if (dto.email) data.email = dto.email;
    if (dto.namaLengkap) data.namaLengkap = dto.namaLengkap;
    if (dto.role) data.role = dto.role;
    if (dto.rantingId !== undefined) data.rantingId = dto.rantingId;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.update({ where: { id }, data, select: { id: true, email: true, namaLengkap: true, role: true, isActive: true } });
    return { success: true, data: user, message: 'User berhasil diperbarui' };
  }

  async remove(id: string) {
    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    return { success: true, message: 'User dinonaktifkan' };
  }
}
