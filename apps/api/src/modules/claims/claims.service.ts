import {
  Injectable,
  NotFoundException,
  Optional,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
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
import { randomUUID } from 'crypto';
import { KtaAppAction, KtaAppLevel, TipeKlaim } from '@prisma/client';
import { KtaApplicationService } from '../members/kta-application.service';

import { NotificationsService } from '../notifications/notifications.service';

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
    @Optional() private readonly notificationsService?: NotificationsService,
    @Optional() protected readonly persistentAudit?: PersistentAuditService,
    @Optional() protected readonly revisions?: RevisionService,
    @Optional() private readonly ktaApplicationService?: KtaApplicationService,
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
        } else if (scope?.wilayahId || scope?.distrikId) {
          // Filter by claim's direct ranting relation (for claims without anggota yet)
          // AND by anggota's ranting relation (for claims with anggota)
          const rantingFilter: Record<string, unknown> = {};
          if (scope.wilayahId) rantingFilter.wilayahId = scope.wilayahId;
          if (scope.distrikId) rantingFilter.wilayah = { distrikId: scope.distrikId };

          const anggotaFilter = this.buildIndirectScopeFilter(scope, 'anggota').anggota;

          where.OR = [
            { ranting: rantingFilter },
            { anggota: anggotaFilter },
          ];
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

  private validateClaimEvidence(
    dto: CreateClaimDto,
    files?: {
      buktiFiles?: Express.Multer.File[];
      dokumenPendukungFiles?: Express.Multer.File[];
    },
  ) {
    if (dto.tipe !== TipeKlaim.keanggotaan || dto.anggotaId) return;

    const hasBukti = Boolean(files?.buktiFiles?.length);
    const mode = dto.modeBukti ?? (hasBukti ? 'unggah' : undefined);

    if (!mode) {
      throw new BadRequestException('Pilih mode pembuktian: unggah atau cerita');
    }
    if (mode === 'unggah' && !hasBukti) {
      throw new BadRequestException('Mode unggah memerlukan minimal satu berkas bukti');
    }
    if (mode === 'cerita') {
      const cerita = dto.ceritaHistori?.trim() || '';
      if (cerita.length < 20 || cerita.length > 1000) {
        throw new BadRequestException('Cerita histori harus antara 20 sampai 1000 karakter');
      }
    }
  }

  async create(
    dto: CreateClaimDto,
    files?: { 
      buktiFiles?: Express.Multer.File[]; 
      dokumenPendukungFiles?: Express.Multer.File[] 
    },
    buktiTipe: 'sertifikat' | 'kartu_anggota' = 'kartu_anggota',
  ) {
    this.validateClaimEvidence(dto, files);

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
      trackingToken: randomUUID(),
    };
    
    // Create claim record first
    const claim = await this.prisma.klaim.create({
      data: claimData,
    });

    // Save bukti keanggotaan files
    if (files?.buktiFiles?.length) {
      await this.saveBuktiFiles(claim.id, files.buktiFiles, buktiTipe);
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

async addBuktiFiles(
    id: string,
    files: Express.Multer.File[],
    tipe: 'sertifikat' | 'kartu_anggota',
    scope?: UserScope,
  ) {
    await this.verifyScope(id, scope);
    const claim = await this.prisma.klaim.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException('Klaim tidak ditemukan');
    await this.saveBuktiFiles(id, files, tipe);
    this.invalidateCache();
    this.audit('CLAIM_ADD_BUKTI', 'Klaim', id, undefined, { tipe, count: files.length });
    return this.findOne(id);
  }

  async addDokumenFiles(
    id: string,
    files: Express.Multer.File[],
    description?: string,
    scope?: UserScope,
  ) {
    await this.verifyScope(id, scope);
    const claim = await this.prisma.klaim.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException('Klaim tidak ditemukan');
    await this.saveDokumenFiles(id, files, description);
    this.invalidateCache();
    this.audit('CLAIM_ADD_DOKUMEN', 'Klaim', id, undefined, { count: files.length });
    return this.findOne(id);
  }

  async remove(id: string, scope?: UserScope) {
    const claim = await this.prisma.klaim.findUnique({
      where: { id },
      include: { buktiKeanggotaan: true, dokumenPendukung: true },
    });
    if (!claim) throw new NotFoundException('Klaim tidak ditemukan');
    await this.verifyScope(id, scope);
    if (claim.status !== 'ditolak') throw new BadRequestException('Hanya klaim yang ditolak yang dapat dihapus');

    for (const file of claim.buktiKeanggotaan) deleteClaimFile(file.filePath);
    for (const file of claim.dokumenPendukung) deleteClaimFile(file.filePath);
    await this.prisma.klaim.delete({ where: { id } });
    this.invalidateCache();
    this.audit('CLAIM_DELETE_REJECTED', 'Klaim', id);
    return { message: 'Klaim harus dihapus' };
  }

  // ── Scope Verification Override ────────────────────────

  protected override async verifyScope(id: string, scope?: UserScope): Promise<void> {
    if (!scope) return;

    // Admin nasional / superadmin memiliki akses penuh tanpa pembatasan ranting
    if (scope.role === 'admin_nasional' || (!scope.rantingId && !scope.wilayahId && !scope.distrikId)) {
      const exists = await this.prisma.klaim.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!exists) {
        throw new NotFoundException('Klaim tidak ditemukan');
      }
      return;
    }

    const claim = await this.prisma.klaim.findUnique({
      where: { id },
      select: {
        id: true,
        rantingId: true,
        anggotaId: true,
        anggota: { select: { rantingId: true } },
      },
    });

    if (!claim) {
      throw new NotFoundException('Klaim tidak ditemukan');
    }

    // Klaim keanggotaan baru belum terikat ke `anggotaId`; ranting tercatat di `claim.rantingId`
    const targetRantingId = claim.anggota?.rantingId || claim.rantingId || undefined;

    const hasAccess = await this.scopeHelper.hasAccessToResourceAsync(
      this.prisma,
      scope,
      targetRantingId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }
  }

  // ── Domain Methods ─────────────────────────────────────

  private expectedApprovalRole(stage: string): string | null {
    if (stage === 'ranting') return 'admin_ranting';
    if (stage === 'wilayah') return 'admin_wilayah';
    if (stage === 'distrik') return 'admin_distrik';
    if (stage === 'nasional') return 'admin_nasional';
    return null;
  }

  private async nextApprovalStage(stage: string, rantingId: string): Promise<string> {
    if (stage === 'ranting') {
      const ranting = await this.prisma.ranting.findUnique({ where: { id: rantingId }, select: { wilayahId: true } });
      return ranting?.wilayahId ? 'wilayah' : 'distrik';
    }
    if (stage === 'wilayah') return 'distrik';
    if (stage === 'distrik') return 'nasional';
    return 'kta_processing';
  }

  private async assertApprovalStage(claim: { currentStage: string }, scope?: UserScope): Promise<void> {
    if (!scope || scope.role === 'superadmin') return;
    if (scope.role !== this.expectedApprovalRole(claim.currentStage)) {
      const labels: Record<string, string> = { ranting: 'Admin Ranting', wilayah: 'Admin Wilayah', distrik: 'Admin Distrik', nasional: 'Admin Nasional' };
      throw new ForbiddenException(`Level ini hanya dapat diproses oleh ${labels[claim.currentStage] || 'admin yang berwenang'}`);
    }
  }

  async approve(id: string, scope?: UserScope, userId?: string) {
    await this.verifyScope(id, scope);
    const claim = await this.prisma.klaim.findUnique({
      where: { id },
      include: {
        anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true, email: true, rantingId: true } },
        ranting: { include: { wilayah: { include: { distrik: true } } } },
      },
    });
    if (!claim) throw new NotFoundException('Klaim tidak ditemukan');

    if (claim.tipe !== 'keanggotaan') {
      await this.prismaDelegate.update({ where: { id }, data: { status: 'disetujui', approvedBy: userId || null, approvedAt: new Date() } });
      if (claim.anggota?.email) this.sendClaimStatusEmail({ namaLengkap: claim.anggota.namaLengkap, email: claim.anggota.email }, 'disetujui');
      this.invalidateCache();
      this.audit('CLAIM_APPROVE', 'Klaim', id);
      return { success: true, status: 'disetujui' };
    }

    await this.assertApprovalStage(claim, scope);
    if (claim.status === 'ditolak') throw new BadRequestException('Klaim yang ditolak tidak dapat disetujui');
    if (claim.currentStage === 'kta_processing' || claim.status === 'disetujui') throw new BadRequestException('Tahap verifikasi klaim telah selesai');
    if (!claim.namaLengkap || !claim.jenisKelamin || !claim.rantingId) throw new BadRequestException('Data tidak lengkap: nama, jenis kelamin, dan ranting wajib diisi');

    if (claim.currentStage !== 'nasional') {
      const nextStage = await this.nextApprovalStage(claim.currentStage, claim.rantingId);
      const approverField: Record<string, string> = { ranting: 'rantingApprovedBy', wilayah: 'wilayahApprovedBy', distrik: 'distrikApprovedBy' };
      await this.prisma.$transaction(async (tx) => {
        await tx.klaim.update({ where: { id }, data: { currentStage: nextStage, status: 'pending', ...(approverField[claim.currentStage] ? { [approverField[claim.currentStage]]: userId || null } : {}) } });
        await tx.klaimApprovalHistory.create({ data: { klaimId: id, stage: claim.currentStage.toUpperCase(), action: 'APPROVED', actorId: userId || null, actorRole: scope?.role || 'superadmin' } });
        if (claim.currentStage === 'ranting' && nextStage === 'distrik') {
          await tx.klaimApprovalHistory.create({ data: { klaimId: id, stage: 'WILAYAH', action: 'SKIPPED', actorId: userId || null, actorRole: scope?.role || 'superadmin', catatan: 'Ranting tidak terhubung dengan Wilayah' } });
        }
      });
      this.invalidateCache();
      this.audit('CLAIM_STAGE_APPROVE', 'Klaim', id, undefined, { stage: claim.currentStage, nextStage, actorId: userId });
      // Send in-app notification to admin at the next stage
      await this.sendNotificationToNextStageApprovers(claim.id, nextStage, claim.ranting?.nama || 'Tidak diketahui', userId);
      return { success: true, status: 'pending', nextStage };
    }

    if (!this.ktaApplicationService || typeof this.ktaApplicationService !== 'object') throw new BadRequestException('Layanan pengajuan KTA tidak tersedia');
    if (claim.email && await this.prisma.anggota.findFirst({ where: { email: claim.email, deletedAt: null }, select: { id: true } })) {
      throw new BadRequestException('Email sudah terdaftar sebagai anggota');
    }

    const finalized = await this.prisma.$transaction(async (tx) => {
      const nomorAnggota = await this.nraService.generateMemberNumber(claim.rantingId!);
      const anggota = await tx.anggota.create({
        data: {
          namaLengkap: claim.namaLengkap!, jenisKelamin: claim.jenisKelamin as 'L' | 'P',
          tempatLahir: claim.tempatLahir, tanggalLahir: claim.tanggalLahir,
          tempatDadar: claim.tempatDadar, tahunDadar: claim.tahunDadar, alamat: claim.alamat,
          noHp: claim.noHp, noHpNormalized: normalizePhone(claim.noHp), email: claim.email,
          rantingId: claim.rantingId!, nomorAnggota,
          statusKeanggotaan: 'aktif', statusData: 'complete', statusValidasi: 'approved',
        },
      });
      if (claim.email && !(await tx.user.findUnique({ where: { email: claim.email }, select: { id: true } }))) {
        const temporaryPassword = Math.random().toString(36).slice(-8);
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
        await tx.user.create({ data: { email: claim.email, passwordHash: hashedPassword, namaLengkap: claim.namaLengkap!, role: 'anggota', isActive: true, mustChangePassword: true } });
        this.sendCredentialEmail({ namaLengkap: claim.namaLengkap || undefined, email: claim.email || undefined }, temporaryPassword);
      }
      const app = await tx.ktaApplication.create({
        data: { anggotaId: anggota.id, submittedById: userId || anggota.id, submittedByRole: 'admin_nasional', status: 'APPROVED' },
      });
      const history = [
        { level: 'RANTING', action: 'APPROVED', skipped: false, actorId: claim.rantingApprovedBy || userId || anggota.id, actorRole: 'admin_ranting' },
        { level: 'WILAYAH', action: claim.ranting?.wilayahId ? 'APPROVED' : 'SKIPPED', skipped: !claim.ranting?.wilayahId, actorId: claim.ranting?.wilayahId ? (claim.wilayahApprovedBy || userId || anggota.id) : userId || anggota.id, actorRole: claim.ranting?.wilayahId ? 'admin_wilayah' : 'system' },
        { level: 'DISTRIK', action: 'APPROVED', skipped: false, actorId: claim.distrikApprovedBy || userId || anggota.id, actorRole: 'admin_distrik' },
        { level: 'NASIONAL', action: 'APPROVED', skipped: false, actorId: userId || anggota.id, actorRole: scope?.role || 'admin_nasional' },
      ];
      for (const item of history) {
        await tx.ktaAppHistory.create({ data: { ktaApplicationId: app.id, level: item.level as KtaAppLevel, action: item.action as KtaAppAction, actorId: item.actorId, actorRole: item.actorRole, isSkipped: item.skipped, skippedReason: item.skipped ? 'Ranting tidak terhubung dengan Wilayah' : null } });
      }
      await tx.klaim.update({ where: { id }, data: { status: 'disetujui', currentStage: 'kta_processing', anggotaId: anggota.id, ktaApplicationId: app.id, approvedBy: userId || null, approvedAt: new Date() } });
      await tx.klaimApprovalHistory.create({ data: { klaimId: id, stage: 'NASIONAL', action: 'APPROVED', actorId: userId || null, actorRole: scope?.role || 'admin_nasional' } });
      return { anggotaId: anggota.id, ktaApplicationId: app.id };
    });
this.invalidateCache();
      this.audit('CLAIM_APPROVE_NATIONAL', 'Klaim', id, undefined, finalized);
      this.sendClaimStatusEmail({ namaLengkap: claim.namaLengkap || undefined, email: claim.email || undefined }, 'disetujui');
      // Send in-app notification to admin_nasional
      await this.sendNotificationToNationalApprovers(claim.id, claim.namaLengkap || 'Pelanggan', userId);
      return { success: true, status: 'disetujui', ...finalized };
    }



  async reject(id: string, reason?: string, scope?: UserScope, userId?: string) {
    await this.verifyScope(id, scope);
    const claim = await this.prisma.klaim.findUnique({
      where: { id },
      include: { anggota: { select: { id: true, namaLengkap: true, email: true, rantingId: true } } },
    });
    if (!claim) throw new NotFoundException('Klaim tidak ditemukan');
    if (claim.tipe === 'keanggotaan') {
      await this.assertApprovalStage(claim, scope);
      if (claim.currentStage === 'kta_processing' || claim.status === 'disetujui') {
        throw new BadRequestException('Klaim yang sudah disetujui tidak dapat ditolak');
      }
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.klaim.update({ where: { id }, data: { status: 'ditolak', catatan: reason || claim.catatan } });
      if (claim.tipe === 'keanggotaan') {
        await tx.klaimApprovalHistory.create({
          data: { klaimId: id, stage: claim.currentStage.toUpperCase(), action: 'REJECTED', actorId: userId || null, actorRole: scope?.role || 'superadmin', catatan: reason || null },
        });
      }
    });
    if (claim.anggota?.email) this.sendClaimStatusEmail({ namaLengkap: claim.anggota.namaLengkap, email: claim.anggota.email }, 'ditolak', reason);
    this.invalidateCache();
    this.audit('CLAIM_REJECT', 'Klaim', id, undefined, { reason, stage: claim.currentStage });
    return { success: true, status: 'ditolak' };
  }

  async process(id: string, scope?: UserScope) {
    await this.verifyScope(id, scope);
    const claim = await this.prismaDelegate.findUnique({
      where: { id },
      include: { anggota: { select: { id: true, namaLengkap: true, email: true, rantingId: true } } },
    });
    if (!claim) throw new NotFoundException('Klaim tidak ditemukan');
    if (claim.tipe === 'keanggotaan') {
      throw new BadRequestException('Klaim keanggotaan menggunakan persetujuan bertahap; gunakan Setujui atau Tolak pada tahap Anda');
    }
    const updated = await this.prismaDelegate.update({ where: { id }, data: { status: 'diproses' } });
    this.sendClaimStatusEmail(claim.anggota, 'diproses');
    this.invalidateCache();
    return updated;
  }

  // ── File Handling ──────────────────────────────────────

  private async saveBuktiFiles(klaimId: string, files: Express.Multer.File[], tipe: 'sertifikat' | 'kartu_anggota' = 'kartu_anggota') {
    const results = await Promise.allSettled(
      files.map(file => this.prisma.buktiKeanggotaan.create({
        data: {
          klaimId,
          tipe,
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

  private async saveDokumenFiles(klaimId: string, files: Express.Multer.File[], description?: string) {
    const results = await Promise.allSettled(
      files.map(file => this.prisma.dokumenPendukung.create({
        data: {
          klaimId,
          filePath: file.path,
          fileName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          description: description || null,
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

  private async sendNotificationToNextStageApprovers(
    claimId: string,
    nextStage: string,
    rantingNama: string,
    approvedById?: string,
  ) {
    if (!this.notificationsService) return;

    const stageLabels: Record<string, string> = {
      ranting: 'Admin Ranting',
      wilayah: 'Admin Wilayah',
      distrik: 'Admin Distrik',
      nasional: 'Admin Nasional',
    };

    const roleByStage: Record<string, string> = {
      ranting: 'admin_ranting',
      wilayah: 'admin_wilayah',
      distrik: 'admin_distrik',
      nasional: 'admin_nasional',
    };

    const role = roleByStage[nextStage];
    if (!role) return;

    const stageLabel = stageLabels[nextStage] || role;

    try {
      await this.notificationsService.sendToRole({
        judul: 'Klaim Menunggu Verifikasi',
        isi: `Klaim anggota dari ${rantingNama} telah dinormalisasi ke ${stageLabel}. Silakan verifikasi.`,
        data: { claimId, actorId: approvedById },
        role,
      });
    } catch (err) {
      this.logger.error(`Failed to send notification to ${role}: ${(err as Error).message}`);
    }
  }

  private async sendNotificationToNationalApprovers(
    claimId: string,
    namaLengkap: string,
    approvedById?: string,
  ) {
    if (!this.notificationsService) return;

    try {
      await this.notificationsService.sendToRole({
        judul: 'Klaim Siap Diproses',
        isi: `Klaim pendaftaran ${namaLengkap} telah disetujui dan siap untuk proses KTA.`,
        data: { claimId, actorId: approvedById },
        role: 'admin_nasional',
      });
    } catch (err) {
      this.logger.error(`Failed to send notification to admin_nasional: ${(err as Error).message}`);
    }
  }
}