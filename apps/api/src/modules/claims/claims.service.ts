import { Injectable, NotFoundException, Optional, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { PersistentAuditService } from '../../common/services/persistent-audit.service';
import { RevisionService } from '../../common/services/revision.service';
import { MailService } from '../../mail/mail.service';
import { BaseCrudService } from '../../common/utils/base-crud.service';
import { claimStatusEmail, credentialEmail } from '../../mail/email-templates';
import { CreateClaimDto, UpdateClaimDto, ClaimFilterDto } from './dto/claim.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { NraService } from '../../common/services/nra.service';
import { normalizePhone } from '../../common/utils/phone.util';
import { normalizePrismaDate } from '../../common/utils/date.util';
import { deleteClaimFile } from '../../common/utils/claim-upload.util';
import { Response } from 'express';
import { TipeKlaim } from '@prisma/client';

const CLAIM_INCLUDE = {
  anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true, rantingId: true } },
  ranting: { select: { id: true, nama: true } },
  buktiKeanggotaan: true,
  dokumenPendukung: true,
};

@Injectable()
export class ClaimsService extends BaseCrudService<CreateClaimDto, UpdateClaimDto> {
  constructor(
    prisma: PrismaService,
    scopeHelper: ScopeHelper,
    cache: CacheService,
    private readonly mailService: MailService,
    private readonly nraService: NraService,
    @Optional() protected readonly persistentAudit?: PersistentAuditService,
    @Optional() protected readonly revisions?: RevisionService,
  ) {
    super(
      prisma,
      scopeHelper,
      cache,
      {
        model: 'klaim',
        prefix: 'claims:',
        notFound: 'Klaim tidak ditemukan',
        scopeStrategy: 'anggota_indirect',
      },
      persistentAudit,
      revisions,
    );
  }

  // ── Hooks ──────────────────────────────────────────────

  protected async beforeCreate(dto: CreateClaimDto): Promise<Record<string, unknown>> {
    return {
      ...dto,
      tanggalLahir: normalizePrismaDate(dto.tanggalLahir) ?? null,
      status: 'pending',
    };
  }

  protected async beforeUpdate(_id: string, dto: UpdateClaimDto): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};
    if (dto.catatan !== undefined) data.catatan = dto.catatan;
    return data;
  }

  // ── CRUD overrides ─────────────────────────────────────

  async findAll(query: ClaimFilterDto, scope?: UserScope) {
    const scopeBucket = scope?.rantingId || scope?.wilayahId || scope?.distrikId || 'all';
    return this.baseFindAll(
      `claims:${scopeBucket}:${JSON.stringify(query)}`,
      async () => {
        const where: Record<string, unknown> = {};
        if (query.status) where.status = query.status;
        if (query.tipe) where.tipe = query.tipe;
        if (scope?.rantingId) {
          where.OR = [
            { rantingId: scope.rantingId },
            { anggota: this.buildIndirectScopeFilter(scope, 'anggota').anggota },
          ];
        } else {
          Object.assign(where, this.buildIndirectScopeFilter(scope, 'anggota'));
        }
        return where;
      },
      {
        page: query.page,
        limit: query.limit,
        orderBy: { createdAt: 'desc' },
        include: CLAIM_INCLUDE,
      },
    );
  }

  async findOne(id: string, scope?: UserScope) {
    return this.baseFindOne(id, scope, CLAIM_INCLUDE);
  }

  async create(
    dto: CreateClaimDto,
    files?: { 
      buktiFiles?: Express.Multer.File[]; 
      dokumenPendukungFiles?: Express.Multer.File[] 
    }
  ) {
    // Filter out undefined values from dto
    const dtoData = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined)
    ) as Record<string, unknown>;
    
    // Ensure required fields are present
    const claimData = {
      ...dtoData,
      tipe: dto.tipe as TipeKlaim,
      tanggalLahir: normalizePrismaDate(dto.tanggalLahir) ?? null,
      status: 'pending' as const,
    };
    
    // Create claim record first
    const claim = await this.prisma.klaim.create({
      data: claimData,
    });

    // Save bukti keanggotaan files
    if (files?.buktiFiles?.length) {
      await this.saveBuktiFiles(claim.id, files.buktiFiles);
    }

    // Save dokumen pendukung files
    if (files?.dokumenPendukungFiles?.length) {
      await this.saveDokumenFiles(claim.id, files.dokumenPendukungFiles);
    }

    this.invalidateCache();
    this.audit('CLAIM_CREATE', 'Klaim', claim.id);
    
    return this.findOne(claim.id);
  }

  async update(id: string, dto: UpdateClaimDto, scope?: UserScope, userId?: string) {
    return this.baseUpdate(id, dto, scope, 'Klaim berhasil diperbarui', userId);
  }

  async remove(id: string, scope?: UserScope) {
    // Delete associated files first
    const claim = await this.prisma.klaim.findUnique({
      where: { id },
      include: { buktiKeanggotaan: true, dokumenPendukung: true },
    });
    
    if (claim) {
      for (const file of claim.buktiKeanggotaan) {
        deleteClaimFile(file.filePath);
      }
      for (const file of claim.dokumenPendukung) {
        deleteClaimFile(file.filePath);
      }
    }
    
    return this.baseRemove(id, scope, 'Klaim berhasil dihapus');
  }

  // ── Domain Methods ─────────────────────────────────────

  async approve(id: string, scope?: UserScope, userId?: string) {
    await this.verifyScope(id, scope);
    const claim = await this.prismaDelegate.findUnique({
      where: { id },
      include: {
        anggota: {
          select: { id: true, nomorAnggota: true, namaLengkap: true, email: true, rantingId: true },
        },
        ranting: { select: { id: true, nama: true } },
      },
    });
    if (!claim) throw new NotFoundException('Klaim tidak ditemukan');

    if (claim.tipe === 'keanggotaan') {
      if (!claim.namaLengkap || !claim.jenisKelamin || !claim.rantingId) {
        throw new BadRequestException(
          'Data tidak lengkap: nama, jenis kelamin, dan ranting wajib diisi',
        );
      }

      if (claim.email) {
        const existingAnggota = await this.prisma.anggota.findFirst({
          where: { email: claim.email, deletedAt: null },
          select: { id: true },
        });
        if (existingAnggota) {
          throw new BadRequestException('Email sudah terdaftar sebagai anggota');
        }
      }

      const nomorAnggota = await this.nraService.generateMemberNumber(claim.rantingId);

      const anggota = await this.prisma.anggota.create({
        data: {
          namaLengkap: claim.namaLengkap,
          jenisKelamin: claim.jenisKelamin as 'L' | 'P',
          tempatLahir: claim.tempatLahir,
          tanggalLahir: claim.tanggalLahir,
          tempatDadar: claim.tempatDadar,
          tahunDadar: claim.tahunDadar,
          alamat: claim.alamat,
          noHp: claim.noHp,
          noHpNormalized: normalizePhone(claim.noHp),
          email: claim.email,
          rantingId: claim.rantingId,
          nomorAnggota,
          statusKeanggotaan: 'aktif',
          statusData: 'complete',
          statusValidasi: 'approved',
        },
      });

      if (claim.email) {
        const existingUser = await this.prisma.user.findUnique({
          where: { email: claim.email },
          select: { id: true },
        });

        if (!existingUser) {
          const temporaryPassword = Math.random().toString(36).slice(-8);
          const bcrypt = await import('bcryptjs');
          const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

          await this.prisma.user.create({
            data: {
              email: claim.email,
              passwordHash: hashedPassword,
              namaLengkap: claim.namaLengkap,
              role: 'anggota',
              isActive: true,
              mustChangePassword: true,
            },
          });

          this.logger.log(`User account created for ${claim.email} with temporary password`);
          this.sendCredentialEmail(
            { namaLengkap: claim.namaLengkap, email: claim.email },
            temporaryPassword,
          );
        } else {
          this.logger.log(`User account already exists for ${claim.email}, skipping user creation`);
        }
      }

      await this.prismaDelegate.update({
        where: { id },
        data: {
          status: 'disetujui',
          anggotaId: anggota.id,
          approvedBy: userId || null,
          approvedAt: new Date(),
        },
      });

      this.sendClaimStatusEmail(
        { namaLengkap: claim.namaLengkap, email: claim.email },
        'disetujui',
      );
    } else {
      await this.prismaDelegate.update({
        where: { id },
        data: {
          status: 'disetujui',
          approvedBy: userId || null,
          approvedAt: new Date(),
        },
      });
      if (claim.anggota?.email) {
        this.sendClaimStatusEmail(claim.anggota, 'disetujui');
      }
    }

    this.invalidateCache();
    this.audit('CLAIM_APPROVE', 'Klaim', id);
  }

  async reject(id: string, reason?: string, scope?: UserScope) {
    await this.verifyScope(id, scope);
    const claim = await this.prismaDelegate.findUnique({
      where: { id },
      include: {
        anggota: { select: { id: true, namaLengkap: true, email: true, rantingId: true } },
      },
    });
    if (!claim) throw new NotFoundException('Klaim tidak ditemukan');

    const updateData: Record<string, unknown> = { status: 'ditolak' };
    if (reason) updateData.catatan = reason;
    await this.prismaDelegate.update({ where: { id }, data: updateData });
    this.sendClaimStatusEmail(claim.anggota, 'ditolak', reason);
    this.invalidateCache();
    this.audit('CLAIM_REJECT', 'Klaim', id, undefined, { reason });
  }

  async process(id: string, scope?: UserScope) {
    await this.verifyScope(id, scope);
    const claim = await this.prismaDelegate.findUnique({
      where: { id },
      include: {
        anggota: { select: { id: true, namaLengkap: true, email: true, rantingId: true } },
      },
    });
    if (!claim) throw new NotFoundException('Klaim tidak ditemukan');

    const updated = await this.prismaDelegate.update({
      where: { id },
      data: { status: 'diproses' },
    });
    this.sendClaimStatusEmail(claim.anggota, 'diproses');
    this.invalidateCache();
    return updated;
  }

  // ── File Handling ──────────────────────────────────────

  private async saveBuktiFiles(klaimId: string, files: Express.Multer.File[]) {
    const results = await Promise.allSettled(
      files.map(file => this.prisma.buktiKeanggotaan.create({
        data: {
          klaimId,
          tipe: 'sertifikat', // Default, bisa di-extend dari field terpisah jika perlu
          filePath: file.path,
          fileName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        },
      }))
    );

    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      failed.forEach((r, i) => {
        this.logger.error(`Failed to save bukti file ${files[i].originalname}:`, r.reason);
      });
    }
  }

  private async saveDokumenFiles(klaimId: string, files: Express.Multer.File[]) {
    const results = await Promise.allSettled(
      files.map(file => this.prisma.dokumenPendukung.create({
        data: {
          klaimId,
          filePath: file.path,
          fileName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        },
      }))
    );

    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      failed.forEach((r, i) => {
        this.logger.error(`Failed to save dokumen file ${files[i].originalname}:`, r.reason);
      });
    }
  }

  async downloadFile(claimId: string, fileId: string, res: Response) {
    // Cek di BuktiKeanggotaan
    const buktiFile = await this.prisma.buktiKeanggotaan.findUnique({
      where: { id: fileId, klaimId: claimId },
    });

    // Cek di DokumenPendukung
    const dokumenFile = await this.prisma.dokumenPendukung.findUnique({
      where: { id: fileId, klaimId: claimId },
    });

    const file = buktiFile || dokumenFile;

    if (!file) {
      throw new NotFoundException('File tidak ditemukan');
    }

    const fs = require('fs');
    const path = require('path');
    const fullPath = path.resolve(file.filePath);

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('File tidak ditemukan di storage');
    }

    res.download(fullPath, file.fileName);
  }

  async deleteFile(claimId: string, fileId: string) {
    // Cek di BuktiKeanggotaan
    const buktiFile = await this.prisma.buktiKeanggotaan.findUnique({
      where: { id: fileId, klaimId: claimId },
    });

    // Cek di DokumenPendukung
    const dokumenFile = await this.prisma.dokumenPendukung.findUnique({
      where: { id: fileId, klaimId: claimId },
    });

    const file = buktiFile || dokumenFile;
    const isBukti = !!buktiFile;

    if (!file) {
      throw new NotFoundException('File tidak ditemukan');
    }

    // Hapus dari database
    if (buktiFile) {
      await this.prisma.buktiKeanggotaan.delete({ where: { id: fileId } });
    } else {
      await this.prisma.dokumenPendukung.delete({ where: { id: fileId } });
    }

    // Hapus file fisik
    deleteClaimFile(file.filePath);

    this.invalidateCache();
    this.audit('CLAIM_FILE_DELETE', 'Klaim', fileId);

    return { success: true, message: 'File berhasil dihapus' };
  }

  // ── Email Helper ──────────────────────────────────────

  private sendCredentialEmail(
    anggota: { namaLengkap?: string; email?: string } | null | undefined,
    password: string,
  ): void {
    if (!anggota || !anggota.email) return;
    const email = anggota.email;
    const nama = anggota.namaLengkap || 'Anggota';
    (async () => {
      try {
        const tpl = await this.mailService.renderWithOverride(
          'credentialEmail',
          () => credentialEmail(nama, email, password),
          { nama },
        );
        await this.mailService.sendMail({
          to: email,
          subject: tpl.subject,
          html: tpl.html,
          metadata: { module: 'claims', template: 'credentialEmail' },
        });
      } catch (err) {
        this.logger.error(`Credential email failed for ${email}: ${(err as Error).message}`);
      }
    })();
  }

  private sendClaimStatusEmail(
    anggota: { namaLengkap?: string; email?: string } | null | undefined,
    status: string,
    reason?: string,
  ): void {
    if (!anggota || !anggota.email) return;
    const email = anggota.email;
    const nama = anggota.namaLengkap || 'Anggota';
    (async () => {
      try {
        const tpl = await this.mailService.renderWithOverride(
          'claimStatusEmail',
          () => claimStatusEmail(nama, status, reason),
          { nama, status, alasan: reason || '' },
        );
        await this.mailService.sendMail({
          to: email,
          subject: tpl.subject,
          html: tpl.html,
          metadata: { module: 'claims', template: 'claimStatusEmail' },
        });
      } catch (err) {
        this.logger.error(`Claim status email failed for ${email}: ${(err as Error).message}`);
      }
    })();
  }
}