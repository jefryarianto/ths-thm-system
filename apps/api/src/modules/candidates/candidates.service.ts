import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { CreateCandidateDto, UpdateCandidateDto, CandidateFilterDto } from './dto/candidate.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';

@Injectable()
export class CandidatesService {
  private readonly logger = new Logger(CandidatesService.name);
  private readonly CACHE_PREFIX = 'candidates:';
  private readonly CACHE_TTL = 30_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
    private readonly cache: CacheService,
    private readonly mailService: MailService,
  ) {}

  async findAll(filter: CandidateFilterDto, scope?: UserScope) {
    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const cacheKey = `${this.CACHE_PREFIX}list:${scope?.rantingId || 'all'}:${page}:${limit}:${filter.search || ''}:${filter.rantingId || ''}:${filter.status || ''}`;

    return this.cache.getOrSet(cacheKey, async () => {
      const skip = (page - 1) * limit;
      const scopeFilter = this.scopeHelper.buildScopeFilter(scope || {});
      const where: any = { ...scopeFilter };

      if (filter.search) {
        where.OR = [
          { namaLengkap: { contains: filter.search } },
          { email: { contains: filter.search } },
        ];
      }
      if (filter.rantingId) where.rantingId = filter.rantingId;
      if (filter.status) where.status = filter.status;

      const [data, total] = await Promise.all([
        this.prisma.calonAnggota.findMany({
          where,
          skip,
          take: limit,
          include: { ranting: true },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.calonAnggota.count({ where }),
      ]);

      return {
        success: true,
        data,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    }, this.CACHE_TTL);
  }

  async findOne(id: string, scope?: UserScope) {
    const candidate = await this.prisma.calonAnggota.findUnique({
      where: { id },
      include: { ranting: { include: { wilayah: { include: { distrik: true } } } } },
    });

    if (!candidate) throw new NotFoundException('Calon anggota tidak ditemukan');

    if (scope && !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, candidate.rantingId))) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }

    return { success: true, data: candidate };
  }

  async create(dto: CreateCandidateDto, scope?: UserScope) {
    if (scope?.rantingId && !dto.rantingId) {
      (dto as any).rantingId = scope.rantingId;
    }
    const candidate = await this.prisma.calonAnggota.create({
      data: {
        namaLengkap: dto.namaLengkap,
        jenisKelamin: dto.jenisKelamin,
        tempatLahir: dto.tempatLahir,
        tanggalLahir: dto.tanggalLahir,
        alamat: dto.alamat,
        noHp: dto.noHp,
        email: dto.email,
        rantingId: dto.rantingId,
        usulOlehUserId: dto.usulOlehId,
        status: 'diusulkan',
      } as never,
    });

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: candidate, message: 'Calon anggota berhasil ditambahkan' };
  }

  async update(id: string, dto: UpdateCandidateDto, scope?: UserScope) {
    if (scope) {
      const candidate = await this.prisma.calonAnggota.findUnique({ where: { id }, select: { rantingId: true } });
      if (!candidate) throw new NotFoundException('Calon anggota tidak ditemukan');
      if (!(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, candidate.rantingId))) {
        throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
      }
    }

    const updated = await this.prisma.calonAnggota.update({
      where: { id },
      data: dto,
    });

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: updated, message: 'Data calon anggota berhasil diperbarui' };
  }

  async remove(id: string, scope?: UserScope) {
    if (scope) {
      const candidate = await this.prisma.calonAnggota.findUnique({ where: { id }, select: { rantingId: true } });
      if (!candidate) throw new NotFoundException('Calon anggota tidak ditemukan');
      if (!(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, candidate.rantingId))) {
        throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
      }
    }

    await this.prisma.calonAnggota.delete({ where: { id } });
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, message: 'Calon anggota berhasil dihapus' };
  }

  async importCsv(data: any[]) {
    const results = { success: 0, errors: 0, details: [] as any[] };

    for (const row of data) {
      try {
        await this.prisma.calonAnggota.create({
          data: {
            namaLengkap: row.nama || row.name,
            jenisKelamin: row.jenis_kelamin || 'L',
            noHp: row.no_hp || row.phone,
            email: row.email,
            alamat: row.alamat || row.address,
            status: 'diusulkan',
            usulOlehId: row.usulOlehId || row.usul_oleh_id || 'seed',
            rantingId: row.rantingId || row.ranting_id || 'seed',
          } as any,
        });
        results.success++;
      } catch (error) {
        results.errors++;
        results.details.push({ row, error: (error as Error).message });
      }
    }

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: results };
  }

  async validate(id: string) {
    const candidate = await this.prisma.calonAnggota.findUnique({ where: { id } });
    if (!candidate) throw new NotFoundException('Calon anggota tidak ditemukan');

    return { success: true, data: { valid: true, candidate } };
  }

  async approve(id: string) {
    const candidate = await this.prisma.calonAnggota.findUnique({ where: { id } });

    if (!candidate) throw new NotFoundException('Calon anggota tidak ditemukan');

    const member = await this.prisma.anggota.create({
      data: {
        namaLengkap: candidate.namaLengkap,
        jenisKelamin: candidate.jenisKelamin,
        tempatLahir: candidate.tempatLahir,
        tanggalLahir: candidate.tanggalLahir,
        alamat: candidate.alamat,
        noHp: candidate.noHp,
        email: candidate.email,
        rantingId: candidate.rantingId,
        nomorAnggota: await this.generateMemberNumber(),
        statusKeanggotaan: 'aktif',
        statusData: 'complete',
        statusValidasi: 'approved',
      },
    });

    await this.prisma.calonAnggota.update({
      where: { id },
      data: { status: 'lulus' },
    });

    // Send welcome email if email address is provided
    if (candidate.email) {
      this.sendApprovedEmail(candidate.namaLengkap, candidate.email, member.nomorAnggota).catch((err) =>
        this.logger.error(`Approval email failed for ${candidate.email}: ${err.message}`),
      );
    }

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    this.cache.invalidatePrefix('members:');
    return { success: true, data: member, message: 'Calon anggota disetujui dan menjadi anggota' };
  }

  async reject(id: string, reason?: string) {
    const candidate = await this.prisma.calonAnggota.findUnique({ where: { id } });

    if (!candidate) throw new NotFoundException('Calon anggota tidak ditemukan');

    await this.prisma.calonAnggota.update({
      where: { id },
      data: { status: 'dibatalkan' },
    });

    // Send rejection email if email address is provided
    if (candidate.email) {
      this.sendRejectedEmail(candidate.namaLengkap, candidate.email, reason).catch((err) =>
        this.logger.error(`Rejection email failed for ${candidate.email}: ${err.message}`),
      );
    }

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, message: reason || 'Calon anggota ditolak' };
  }

  private async sendApprovedEmail(nama: string, email: string, nomorAnggota: string): Promise<void> {
    await this.mailService.sendMail({
      to: email,
      subject: 'Selamat! Anda Telah Menjadi Anggota THS-THM',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a56db;">Selamat, ${nama}!</h1>
          <p>Anda telah resmi menjadi anggota <strong>THS-THM</strong>.</p>
          <p>Nomor Anggota Anda: <strong style="font-size: 18px; color: #1a56db;">${nomorAnggota}</strong></p>
          <p>Berikut adalah beberapa hal yang bisa Anda lakukan sebagai anggota:</p>
          <ul style="line-height: 1.8; color: #374151;">
            <li>Login ke aplikasi untuk melihat data keanggotaan</li>
            <li>Mengikuti kegiatan dan latihan rutin</li>
            <li>Mendapatkan kartu anggota digital</li>
            <li>Mengakses dokumen organisasi</li>
          </ul>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">
            THS-THM System &mdash; Taman Harapan Siswa / Taman Harapan Murid
          </p>
        </div>
      `,
    });
  }

  private async sendRejectedEmail(nama: string, email: string, reason?: string): Promise<void> {
    await this.mailService.sendMail({
      to: email,
      subject: 'Status Calon Anggota — THS-THM',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc2626;">Pemberitahuan</h1>
          <p>Halo <strong>${nama}</strong>,</p>
          <p>Pengajuan calon anggota Anda di <strong>THS-THM</strong> <strong>tidak dapat dilanjutkan</strong>.</p>
          ${reason ? `<p>Alasan: <em>${reason}</em></p>` : ''}
          <p>Silakan hubungi admin untuk informasi lebih lanjut.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">
            THS-THM System &mdash; Taman Harapan Siswa / Taman Harapan Murid
          </p>
        </div>
      `,
    });
  }

  async exportCsv(filter: CandidateFilterDto) {
    const candidates = await this.prisma.calonAnggota.findMany({
      where: {},
      select: {
        namaLengkap: true,
        jenisKelamin: true,
        tempatLahir: true,
        tanggalLahir: true,
        alamat: true,
        noHp: true,
        email: true,
        status: true,
      },
    });

    return { success: true, data: candidates };
  }

  private async generateMemberNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.anggota.count();
    return `THS-${year}-${String(count + 1).padStart(4, '0')}`;
  }
}
