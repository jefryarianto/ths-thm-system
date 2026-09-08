import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';
import { resolveWriteDistrikId } from '../../common/utils/distrik-scope';

/**
 * Preset jabatan (dropdown di form penandatangan / tanda tangan / struktur
 * organisasi). Global (distrikId null) dikelola superadmin; setiap distrik
 * bisa menambah preset sendiri yang berlaku untuk distriknya.
 *
 * Aturan scope:
 * - Baca: superadmin melihat semua; admin lain melihat preset distriknya + global.
 * - Tulis: superadmin bebas (menentukan scope via body.distrikId);
 *   admin_distrik hanya preset distriknya sendiri; preset global = superadmin-only.
 */
@Injectable()
export class JabatanService {
  constructor(private readonly prisma: PrismaService) {}

  /** Baca sesuai scope: superadmin semua; admin lain distriknya + global. */
  async findAll(scope?: { role?: string; distrikId?: string | null }) {
    const isScoped = scope?.role && scope.role !== 'superadmin' && scope.distrikId;
    return this.prisma.jabatan.findMany({
      where: isScoped
        ? { OR: [{ distrikId: scope!.distrikId! }, { distrikId: null }] }
        : undefined,
      orderBy: [{ urutan: 'asc' }, { nama: 'asc' }],
      include: {
        _count: { select: { pengurus: true } },
        distrik: { select: { id: true, nama: true } },
      },
    });
  }

  async findOne(id: string) {
    const jabatan = await this.prisma.jabatan.findUnique({
      where: { id },
      include: {
        _count: { select: { pengurus: true } },
        distrik: { select: { id: true, nama: true } },
      },
    });
    if (!jabatan) throw new NotFoundException('Jabatan tidak ditemukan');
    return jabatan;
  }

  /** Aturan kepemilikan: non-superadmin hanya boleh mengelola preset distriknya. */
  private assertCanManage(
    jabatan: { distrikId?: string | null },
    scope?: { role?: string; distrikId?: string | null },
  ) {
    if (scope?.role && scope.role !== 'superadmin') {
      if (!scope.distrikId || (jabatan.distrikId ?? null) !== scope.distrikId) {
        throw new ForbiddenException('Anda hanya dapat mengelola jabatan distrik Anda sendiri');
      }
    }
  }

  async create(
    req: ScopedRequest | undefined,
    data: { nama: string; kode?: string; urutan?: number; distrikId?: string | null },
  ) {
    // superadmin bebas menentukan scope (null = global); admin_distrik terkunci ke distriknya.
    const distrikId = resolveWriteDistrikId(req, data.distrikId ?? null);
    const existing = await this.prisma.jabatan.findFirst({
      where: { nama: data.nama, distrikId: distrikId ?? null },
    });
    if (existing) throw new ConflictException(`Jabatan "${data.nama}" sudah ada pada scope ini`);
    return this.prisma.jabatan.create({
      data: { nama: data.nama, kode: data.kode, urutan: data.urutan, distrikId: distrikId ?? null },
      include: { distrik: { select: { id: true, nama: true } } },
    });
  }

  async update(
    req: ScopedRequest | undefined,
    id: string,
    data: { nama?: string; kode?: string; urutan?: number },
  ) {
    const jabatan = await this.findOne(id);
    this.assertCanManage(jabatan, { role: req?.user?.role, distrikId: req?.scope?.distrikId });

    if (data.nama !== undefined && data.nama !== jabatan.nama) {
      const duplicate = await this.prisma.jabatan.findFirst({
        where: { nama: data.nama, distrikId: jabatan.distrikId ?? null, id: { not: id } },
      });
      if (duplicate) throw new ConflictException(`Jabatan "${data.nama}" sudah ada pada scope ini`);
    }
    if (data.kode !== undefined && data.kode !== null && data.kode !== jabatan.kode) {
      const duplicate = await this.prisma.jabatan.findFirst({
        where: { kode: data.kode, distrikId: jabatan.distrikId ?? null, id: { not: id } },
      });
      if (duplicate) throw new ConflictException(`Kode "${data.kode}" sudah dipakai pada scope ini`);
    }
    return this.prisma.jabatan.update({ where: { id }, data });
  }

  async remove(req: ScopedRequest | undefined, id: string) {
    const jabatan = await this.findOne(id);
    this.assertCanManage(jabatan, { role: req?.user?.role, distrikId: req?.scope?.distrikId });
    if (jabatan._count.pengurus > 0) {
      throw new ConflictException(
        `Jabatan "${jabatan.nama}" masih digunakan oleh ${jabatan._count.pengurus} pengurus`,
      );
    }
    await this.prisma.jabatan.delete({ where: { id } });
    return { deleted: true };
  }
}
