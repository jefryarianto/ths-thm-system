import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { welcomeMemberEmail } from '../../mail/email-templates';
import { CreateMemberDto, UpdateMemberDto, MemberFilterDto } from './dto/member.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { MemberMailService } from '../../common/services/member-mail.service';
import { NraService } from '../../common/services/nra.service';
import { paginate } from '../../common/utils/pagination';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);
  private readonly CACHE_PREFIX = 'members:';
  private readonly CACHE_TTL = 30_000; // 30 seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
    private readonly cache: CacheService,
    private readonly memberMailService: MemberMailService,
    private readonly nraService: NraService,
  ) {}

  async findAll(filter: MemberFilterDto, scope?: UserScope) {
    const cacheKey = `${this.CACHE_PREFIX}list:${scope?.rantingId || 'all'}:${filter.page || 1}:${filter.limit || 10}:${filter.search || ''}:${filter.rantingId || ''}:${filter.statusKeanggotaan || ''}:${filter.statusValidasi || ''}`;

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const scopeFilter = this.scopeHelper.buildScopeFilter(scope || {});
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = { deletedAt: null, ...scopeFilter };

        if (filter.search) {
          where.OR = [
            { namaLengkap: { contains: filter.search } },
            { nomorAnggota: { contains: filter.search } },
            { email: { contains: filter.search } },
          ];
        }
        if (filter.rantingId) where.rantingId = filter.rantingId;
        if (filter.statusKeanggotaan) where.statusKeanggotaan = filter.statusKeanggotaan;
        if (filter.statusValidasi) where.statusValidasi = filter.statusValidasi;

        return paginate(this.prisma.anggota, where, {
          page: filter.page,
          limit: filter.limit,
          orderBy: { createdAt: 'desc' },
          include: { ranting: true },
        });
      },
      this.CACHE_TTL,
    );
  }

  async findOne(id: string, scope?: UserScope) {
    const member = await this.prisma.anggota.findUnique({
      where: { id, deletedAt: null },
      include: {
        ranting: { include: { wilayah: { include: { distrik: true } } } },
        dokumen: true,
        iuran: true,
      },
    });

    if (!member) throw new NotFoundException('Anggota tidak ditemukan');

    // Verify scope access (async for region/district hierarchy check)
    if (
      scope &&
      !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, member.rantingId))
    ) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }

    return { success: true, data: member };
  }

  async create(dto: CreateMemberDto, scope?: UserScope) {
    // Auto-assign rantingId from scope for branch-level users
    if (scope?.rantingId && !dto.rantingId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dto as any).rantingId = scope.rantingId;
    }
    const member = await this.prisma.anggota.create({
      data: {
        ...dto,
        nomorAnggota: await this.nraService.generateMemberNumber(dto.rantingId || scope?.rantingId || ''),
        statusData: 'complete',
        statusValidasi: 'pending',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });

    // Send welcome email if email address is provided
    if (member.email) {
      this.memberMailService.sendToMember(
        member.id,
        (nama) => welcomeMemberEmail(nama),
        { template: 'welcomeMemberEmail', email: member.email },
        'members',
      );
    }

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: member, message: 'Anggota berhasil ditambahkan' };
  }

  async update(id: string, dto: UpdateMemberDto, scope?: UserScope) {
    await this.scopeHelper.verifyResourceAccess(
      this.prisma,
      scope,
      id,
      (prisma, rid) =>
        prisma.anggota.findUnique({ where: { id: rid }, select: { rantingId: true } }),
      'Anggota tidak ditemukan',
    );

    const updated = await this.prisma.anggota.update({
      where: { id },
      data: dto,
    });

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: updated, message: 'Data anggota berhasil diperbarui' };
  }

  async remove(id: string, scope?: UserScope) {
    await this.scopeHelper.verifyResourceAccess(
      this.prisma,
      scope,
      id,
      (prisma, rid) =>
        prisma.anggota.findUnique({ where: { id: rid }, select: { rantingId: true } }),
      'Anggota tidak ditemukan',
    );

    await this.prisma.anggota.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, message: 'Anggota berhasil dihapus' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async importCsv(data: any[], scope?: UserScope) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = { success: 0, incomplete: 0, errors: 0, details: [] as any[] };

    for (const row of data) {
      try {
        const missingFields = this.validateCsvRow(row);

        // Normalize ranting: accept ranting_id from CSV
        let rantingId = row.ranting_id || row.rantingId || '';
        if (!rantingId && scope?.rantingId) {
          rantingId = scope.rantingId;
        }

        // Support legacy import: accept existing member number from CSV
        // If exists, prepend [kode_distrik]- to the old NRA
        // Otherwise generate NRA in new format [kode_distrik]-[kode_wilayah][kode_ranting]-[3digit_urut]-[tahun_dadar]
        const existingNumber = row.nomor_anggota || row.nomorAnggota || row.no_anggota;
        let nomorAnggota: string;
        if (existingNumber) {
          // Fetch distrik code for this ranting
          const rantingRow = rantingId
            ? await this.prisma.ranting.findUnique({
                where: { id: rantingId },
                select: { wilayah: { select: { distrik: { select: { kodeDistrik: true } } } } },
              })
            : null;
          const kodeDistrik = rantingRow?.wilayah?.distrik?.kodeDistrik?.replace(/^\D+/g, '') || '';
          nomorAnggota = kodeDistrik ? `${kodeDistrik}-${String(existingNumber).trim()}` : String(existingNumber).trim();
        } else {
          nomorAnggota = await this.nraService.generateMemberNumber(
            rantingId || '',
            row.tahun_dadar || row.tahunDadar || undefined,
          );
        }

        // Accept semua field termasuk fotoPath, tempatDadar, tahunDadar
        const member = await this.prisma.anggota.create({
          data: {
            nomorAnggota,
            namaLengkap: row.nama || row.name || row.nama_lengkap,
            jenisKelamin: row.jenis_kelamin || row.jenisKelamin || 'L',
            tempatLahir: row.tempat_lahir || row.tempatLahir || null,
            tanggalLahir: row.tanggal_lahir || row.tanggalLahir || null,
            tempatDadar: row.tempat_dadar || row.tempatDadar || null,
            tahunDadar: row.tahun_dadar || row.tahunDadar || null,
            fotoPath: row.foto || row.fotoPath || row.foto_path || null,
            noHp: row.no_hp || row.phone || null,
            email: row.email || null,
            alamat: row.alamat || row.address || null,
            rantingId: rantingId || undefined,
            tingkat: row.tingkat || row.tingkatan || null,
            statusData: missingFields.length > 0 ? 'incomplete' : 'complete',
            statusValidasi: 'pending',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            missingFields: missingFields.length > 0 ? (missingFields as any) : undefined,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        });

        if (missingFields.length > 0) {
          results.incomplete++;
          results.details.push({ row, missingFields, memberId: member.id });

          // Kirim notifikasi data incomplete ke user yang punya email
          if (member.email) {
            this.memberMailService.sendToMember(
              member.id,
              (nama) => ({
                subject: 'Data Anggota Belum Lengkap — THS-THM',
                html: `<h2>Halo ${nama},</h2><p>Data keanggotaan Anda masih belum lengkap. Harap lengkapi data berikut:</p><ul>${missingFields.map((f: string) => `<li>${f.replace(/_/g, ' ')}</li>`).join('')}</ul><p>Silakan login ke sistem untuk melengkapi data.</p>`,
                text: `Halo ${nama},\n\nData keanggotaan Anda masih belum lengkap. Harap lengkapi data berikut: ${missingFields.join(', ')}\n\nSilakan login ke sistem untuk melengkapi data.`,
              }),
              { template: 'dataIncompleteEmail', email: member.email },
              'members',
            );
          }
        } else {
          results.success++;

          // Send welcome email if email is provided
          if (member.email) {
            this.memberMailService.sendToMember(
              member.id,
              (nama) => welcomeMemberEmail(nama),
              { template: 'welcomeMemberEmail', email: member.email },
              'members',
            );
          }
        }
      } catch (error) {
        results.errors++;
        results.details.push({ row, error: (error as Error).message });
      }
    }

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: results };
  }

  async exportCsv(filter: MemberFilterDto, scope?: UserScope) {
    const scopeFilter = this.scopeHelper.buildScopeFilter(scope || {});
    const members = await this.prisma.anggota.findMany({
      where: { deletedAt: null, ...scopeFilter },
      select: {
        nomorAnggota: true,
        namaLengkap: true,
        jenisKelamin: true,
        tempatLahir: true,
        tanggalLahir: true,
        alamat: true,
        noHp: true,
        email: true,
        statusKeanggotaan: true,
        tingkat: true,
      },
    });

    return { success: true, data: members };
  }

  async validate(id: string) {
    const member = await this.prisma.anggota.findUnique({ where: { id } });

    if (!member) throw new NotFoundException('Anggota tidak ditemukan');

    const missingFields: string[] = [];
    if (!member.namaLengkap) missingFields.push('nama_lengkap');
    if (!member.jenisKelamin) missingFields.push('jenis_kelamin');
    if (!member.tempatLahir) missingFields.push('tempat_lahir');
    if (!member.tanggalLahir) missingFields.push('tanggal_lahir');
    if (!member.tempatDadar) missingFields.push('tempat_dadar');
    if (!member.tahunDadar) missingFields.push('tahun_dadar');
    if (!member.tingkat) missingFields.push('tingkat');

    if (missingFields.length > 0) {
      await this.prisma.anggota.update({
        where: { id },
        data: { statusData: 'incomplete', missingFields },
      });
      return { success: true, data: { valid: false, missingFields } };
    }

    await this.prisma.anggota.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { statusData: 'complete', missingFields: undefined as any },
    });

    return { success: true, data: { valid: true } };
  }

  async findByEmail(email: string) {
    const member = await this.prisma.anggota.findFirst({
      where: { email, deletedAt: null },
      include: {
        ranting: { include: { wilayah: { include: { distrik: true } } } },
      },
    });

    if (!member) {
      return { success: false, message: 'Anggota tidak ditemukan untuk email ini' };
    }

    return { success: true, data: member };
  }

  async approve(id: string) {
    await this.prisma.anggota.update({
      where: { id },
      data: { statusValidasi: 'approved', statusKeanggotaan: 'aktif' },
    });

    return { success: true, message: 'Anggota berhasil disetujui' };
  }

  async suspend(id: string) {
    await this.prisma.anggota.update({
      where: { id },
      data: { statusKeanggotaan: 'nonaktif' },
    });

    return { success: true, message: 'Anggota berhasil ditangguhkan' };
  }

  async reactivate(id: string) {
    await this.prisma.anggota.update({
      where: { id },
      data: { statusKeanggotaan: 'aktif' },
    });

    return { success: true, message: 'Anggota berhasil diaktifkan kembali' };
  }

  async getDocuments(id: string) {
    const documents = await this.prisma.dokumen.findMany({
      where: { anggotaId: id },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: documents };
  }

  async getDues(id: string) {
    const dues = await this.prisma.iuran.findMany({
      where: { anggotaId: id },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: dues };
  }

    // ── Digital Member Card ──

  async getDigitalCard(memberId: string, scope?: UserScope) {
    const { card, memberData, verificationUrl } = await this.prepareDigitalCardData(memberId, scope);
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#1a365d', light: '#ffffff' },
    });

    return {
      success: true,
      data: {
        card,
        member: memberData,
        qrCode: qrDataUrl,
      },
    };
  }

  async getDigitalCardImage(memberId: string, scope?: UserScope): Promise<Buffer> {
    const pdfBuffer = await this.getDigitalCardPdf(memberId, scope);
    const { pdfToPng } = require('../documents/pdf-templates/pdf-to-image');
    return pdfToPng(pdfBuffer);
  }

  async getDigitalCardPdf(memberId: string, scope?: UserScope): Promise<Buffer> {
    const { card, memberData, verificationUrl } = await this.prepareDigitalCardData(memberId, scope);
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#1a365d', light: '#ffffff' },
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ReactPDF = require('@react-pdf/renderer');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { buildMemberCardPdf } = require('../documents/pdf-templates/member-card');

      const pdfDoc = buildMemberCardPdf({
        member: {
          namaLengkap: memberData.namaLengkap,
          nomorAnggota: memberData.nomorAnggota,
          tempatLahir: memberData.tempatLahir,
          tanggalLahir: memberData.tanggalLahir,
          jenisKelamin: memberData.jenisKelamin || 'L',
          ranting: memberData.ranting,
          wilayah: memberData.wilayah,
          distrik: memberData.distrik,
          statusKeanggotaan: memberData.statusKeanggotaan,
        },
        cardConfig: {
          nomorDokumen: card.nomorDokumen,
          qrDataUrl,
          verificationUrl: card.verificationUrl,
          signerName: process.env.SIGNER_NAME || 'Koordinator Distrik',
          signerTitle: process.env.SIGNER_TITLE || 'THS-THM',
        },
      });

      const pdfBuffer = await ReactPDF.renderToBuffer(pdfDoc);
      return pdfBuffer;
    } catch (error) {
      this.logger.error('PDF generation failed, returning JSON fallback:', (error as Error).message);
      // Fallback: return minimal PDF header as buffer
      throw new Error('PDF generation requires react-pdf setup. Use /digital-card JSON endpoint instead.');
    }
  }

  private async prepareDigitalCardData(memberId: string, scope?: UserScope) {
    const member = await this.prisma.anggota.findUnique({
      where: { id: memberId, deletedAt: null },
      include: {
        ranting: { include: { wilayah: { include: { distrik: true } } } },
        dokumen: { where: { tipe: 'kartu_anggota', status: { not: 'revoked' } }, take: 1 },
      },
    });

    if (!member) throw new NotFoundException('Anggota tidak ditemukan');

    if (
      scope &&
      !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, member.rantingId))
    ) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }

    // Generate or reuse existing card token
    let existingCard = member.dokumen[0];
    if (!existingCard) {
      // Auto-generate digital card document
      const token = uuidv4();
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${token}`;
      const nomorDokumen = `KTA-${member.nomorAnggota}`;

      existingCard = await this.prisma.dokumen.create({
        data: {
          anggotaId: member.id,
          tipe: 'kartu_anggota',
          nomorDokumen,
          verificationUrl,
          status: 'generated',
        },
      });

      await this.prisma.qRValidation.create({
        data: { dokumenId: existingCard.id, token, isValid: true },
      });
    }

    const memberData = {
      id: member.id,
      nomorAnggota: member.nomorAnggota,
      namaLengkap: member.namaLengkap,
      jenisKelamin: member.jenisKelamin,
      tempatLahir: member.tempatLahir,
      tanggalLahir: member.tanggalLahir,
      alamat: member.alamat,
      noHp: member.noHp,
      email: member.email,
      fotoPath: member.fotoPath,
      statusKeanggotaan: member.statusKeanggotaan,
      ranting: member.ranting?.nama,
      wilayah: member.ranting?.wilayah?.nama,
      distrik: member.ranting?.wilayah?.distrik?.nama,
    };

    const card = {
      id: existingCard.id,
      nomorDokumen: existingCard.nomorDokumen,
      verificationUrl: existingCard.verificationUrl || '',
      status: existingCard.status,
    };

    return { card, memberData, verificationUrl: card.verificationUrl };
  }



  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private validateCsvRow(row: any): string[] {
    const required = ['nama', 'name'];
    const missing: string[] = [];

    const hasName = required.some((field) => row[field]);
    if (!hasName) missing.push('nama');

    if (!row.jenis_kelamin && !row.gender) missing.push('jenis_kelamin');

    return missing;
  }
}
