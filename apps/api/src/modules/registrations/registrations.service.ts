import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { registrationApprovedEmail, registrationRejectedEmail } from '../../mail/email-templates';
import { CreateRegistrationDto, UpdateRegistrationDto, RegistrationFilterDto } from './dto/registration.dto';

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async findAll(query: RegistrationFilterDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.pendaftaran.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.pendaftaran.count({ where }),
    ]);
    return { success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const reg = await this.prisma.pendaftaran.findUnique({ where: { id } });
    if (!reg) throw new NotFoundException('Pendaftaran tidak ditemukan');
    return { success: true, data: reg };
  }

  async create(dto: CreateRegistrationDto) {
    const reg = await this.prisma.pendaftaran.create({ data: { ...dto, status: 'pending', jenisKelamin: dto.jenisKelamin as never } });
    return { success: true, data: reg, message: 'Pendaftaran berhasil dibuat' };
  }

  async update(id: string, dto: UpdateRegistrationDto) {
    const reg = await this.prisma.pendaftaran.update({ where: { id }, data: dto as never });
    return { success: true, data: reg, message: 'Pendaftaran berhasil diperbarui' };
  }

  async remove(id: string) {
    await this.prisma.pendaftaran.delete({ where: { id } });
    return { success: true, message: 'Pendaftaran berhasil dihapus' };
  }

  async verify(id: string) {
    const reg = await this.prisma.pendaftaran.findUnique({ where: { id } });
    if (!reg) throw new NotFoundException('Pendaftaran tidak ditemukan');
    const missing: string[] = [];
    if (!reg.namaLengkap) missing.push('nama_lengkap');
    if (!reg.jenisKelamin) missing.push('jenis_kelamin');
    if (missing.length > 0) return { success: true, data: { valid: false, missingFields: missing } };
    return { success: true, data: { valid: true } };
  }

  async approve(id: string, userId?: string) {
    const reg = await this.prisma.pendaftaran.findUnique({ where: { id } });
    if (!reg) throw new NotFoundException('Pendaftaran tidak ditemukan');

    const candidate = await this.prisma.calonAnggota.create({
      data: {
        rantingId: (reg.sumberInfo as string) || '',
        namaLengkap: reg.namaLengkap,
        jenisKelamin: reg.jenisKelamin,
        tempatLahir: reg.tempatLahir,
        tanggalLahir: reg.tanggalLahir,
        alamat: reg.alamat,
        noHp: reg.noHp,
        email: reg.email,
        status: 'diusulkan',
        usulOlehUserId: userId || reg.id,
      },
    });

    await this.prisma.pendaftaran.update({ where: { id }, data: { status: 'approved' } });

    // Send confirmation email if email address is provided
    if (reg.email) {
      this.sendRegistrationApprovedEmail(reg.namaLengkap, reg.email).catch((err) =>
        this.logger.error(`Registration approved email failed for ${reg.email}: ${err.message}`),
      );
    }

    return { success: true, data: candidate, message: 'Pendaftaran disetujui, calon anggota berhasil dibuat' };
  }

  async reject(id: string, reason?: string) {
    const reg = await this.prisma.pendaftaran.findUnique({ where: { id } });
    if (!reg) throw new NotFoundException('Pendaftaran tidak ditemukan');

    await this.prisma.pendaftaran.update({ where: { id }, data: { status: 'rejected', catatan: reason } });

    // Send rejection email if email address is provided
    if (reg.email) {
      this.sendRegistrationRejectedEmail(reg.namaLengkap, reg.email, reason).catch((err) =>
        this.logger.error(`Registration rejected email failed for ${reg.email}: ${err.message}`),
      );
    }

    return { success: true, message: reason || 'Pendaftaran ditolak' };
  }

  private async sendRegistrationApprovedEmail(nama: string, email: string): Promise<void> {
    const tpl = registrationApprovedEmail(nama);
    await this.mailService.sendMail({ to: email, ...tpl, metadata: { module: 'registrations', template: 'registrationApprovedEmail', email } });
  }

  private async sendRegistrationRejectedEmail(nama: string, email: string, reason?: string): Promise<void> {
    const tpl = registrationRejectedEmail(nama, reason);
    await this.mailService.sendMail({ to: email, ...tpl, metadata: { module: 'registrations', template: 'registrationRejectedEmail', email } });
  }



  async importCsv(data: Record<string, unknown>[]) {
    let imported = 0;
    for (const row of data) {
      try {
        await this.prisma.pendaftaran.create({
          data: {
            namaLengkap: (row.nama_lengkap || row.name) as string,
            jenisKelamin: ((row.jenis_kelamin as string) || 'L') as never,
            noHp: row.no_hp as string,
            email: row.email as string,
            alamat: row.alamat as string,
            sumberInfo: row.sumber_info as string,
            status: 'pending',
          },
        });
        imported++;
      } catch { /* skip */ }
    }
    return { success: true, data: { imported, total: data.length } };
  }
}
