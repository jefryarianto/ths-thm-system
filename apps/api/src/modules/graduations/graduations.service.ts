import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { PersistentAuditService } from '../../common/services/persistent-audit.service';
import { BaseCrudService } from '../../common/utils/base-crud.service';
import { MailService } from '../../mail/mail.service';
import { graduationResultEmail, graduationRegisteredEmail } from '../../mail/email-templates';
import * as QRCode from 'qrcode';
import { DocumentsService } from '../documents/documents.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NraService } from '../../common/services/nra.service';
import { MemberMailService } from '../../common/services/member-mail.service';
import {
  CreateGraduationDto,
  UpdateGraduationDto,
  GraduationFilterDto,
  RegisterParticipantDto,
  GraduateDto,
  ValidateResultDto,
  GenerateDocsDto,
} from './dto/graduation.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { normalizePhone } from '../../common/utils/phone.util';
import bcrypt from 'bcryptjs';

/** Shape expected by DocumentsService.generateCertificate (#aspects). */
interface AspectScore {
  name: string;
  score: string | number;
  items: string[];
}

@Injectable()
export class GraduationsService extends BaseCrudService<CreateGraduationDto, UpdateGraduationDto> {
  constructor(
    prisma: PrismaService,
    scopeHelper: ScopeHelper,
    cache: CacheService,
    private readonly mailService: MailService,
    private readonly documentsService: DocumentsService,
    private readonly nraService: NraService,
    private readonly memberMailService: MemberMailService,
    private readonly notificationsService: NotificationsService,
    @Optional() protected readonly persistentAudit?: PersistentAuditService,
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'kegiatan',
      prefix: 'graduations:',
      notFound: 'Pendadaran tidak ditemukan',
      scopeStrategy: 'kegiatan',
    }, persistentAudit);
  }

  // ═══════════════════════════════════════════════════════════
  //  HOOKS
  // ═══════════════════════════════════════════════════════════

  /**
   * Before create: auto-resolve scope, convert dates, set fixed fields.
   * Eliminates the `as never` cast on the entire data object.
   */
  protected async beforeCreate(
    dto: CreateGraduationDto,
    scope?: UserScope,
    userId?: string,
  ): Promise<Record<string, unknown>> {
    const resolvedScopeType =
      dto.scopeType ||
      (scope?.rantingId
        ? 'ranting'
        : scope?.wilayahId
          ? 'wilayah'
          : scope?.distrikId
            ? 'distrik'
            : 'nasional');
    const resolvedScopeId =
      dto.scopeId || scope?.rantingId || scope?.wilayahId || scope?.distrikId || 'national';

    return {
      nama: dto.nama,
      lokasi: dto.lokasi,
      tanggalMulai: new Date(dto.tanggalMulai),
      // tanggalSelesai is required in schema — fall back to tanggalMulai if not provided
      tanggalSelesai: dto.tanggalSelesai ? new Date(dto.tanggalSelesai) : new Date(dto.tanggalMulai),
      scopeType: resolvedScopeType,
      scopeId: resolvedScopeId,
      createdBy: userId || 'system',
      adminKegiatanId: dto.adminKegiatanId || null,
      tipe: 'pendadaran',
      status: 'draft',
    };
  }

  /**
   * Before update: sparse field mapping with date conversion.
   */
  protected async beforeUpdate(
    _id: string,
    dto: UpdateGraduationDto,
  ): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};
    if (dto.nama !== undefined) data.nama = dto.nama;
    if (dto.lokasi !== undefined) data.lokasi = dto.lokasi;
    if (dto.tanggalMulai !== undefined) data.tanggalMulai = new Date(dto.tanggalMulai);
    if (dto.tanggalSelesai !== undefined) data.tanggalSelesai = new Date(dto.tanggalSelesai);
    if (dto.status !== undefined) data.status = dto.status;
    return data;
  }

  // ═══════════════════════════════════════════════════════════
  //  STANDARD CRUD
  // ═══════════════════════════════════════════════════════════

  async findAll(query: GraduationFilterDto, scope?: UserScope, userId?: string, role?: string) {
    return this.baseFindAll(
      `graduations:list:${scope?.rantingId || scope?.wilayahId || scope?.distrikId || 'all'}:${query.page || 1}:${query.limit || 10}:${query.status || 'all'}`,
      async () => {
        const where: Record<string, unknown> = { tipe: 'pendadaran' };

        // Apply kegiatan-based scope filter
        Object.assign(where, this.buildKegiatanScopeFilter(scope));

        // Activity-scoped roles: filter by assignments
        if (role === 'admin_kegiatan' && userId) {
          where.adminKegiatanId = userId;
        } else if (role === 'penguji' && userId) {
          // Penguji can only see kegiatan they're assigned to
          const assignments = await this.prisma.penugasanPenguji.findMany({
            where: { pengujiUserId: userId, status: 'approved' },
            select: { kegiatanId: true },
          });
          const kegiatanIds = assignments.map((a) => a.kegiatanId);
          where.id = { in: kegiatanIds };
        }

        if (query.status) where.status = query.status;

        return where;
      },
      {
        page: query.page,
        limit: query.limit,
        orderBy: { tanggalMulai: 'desc' },
      },
    );
  }

  async findOne(id: string, scope?: UserScope) {
    return this.baseFindOne(id, scope);
  }

  async create(dto: CreateGraduationDto, scope?: UserScope, userId?: string) {
    return this.baseCreate(dto, scope, userId, 'Pendadaran berhasil dibuat');
  }

  async update(id: string, dto: UpdateGraduationDto, scope?: UserScope) {
    return this.baseUpdate(id, dto, scope, 'Pendadaran berhasil diperbarui');
  }

  /**
   * Hapus (atau batalkan) pendadaran.
   * Jika ada data terkait (hasil/nilai/ujian), tidak dihapus permanen —
   * cukup `status='cancelled'` untuk menjaga integritas referensial.
   */
  async delete(graduationId: string, scope?: UserScope) {
    const grad = await this.getGraduationOrThrow(graduationId, scope);

    const [results, scores, exams] = await this.prisma.$transaction([
      this.prisma.hasilPendadaran.count({ where: { kegiatanId: grad.id } }),
      this.prisma.nilaiPendadaran.count({ where: { kegiatanId: grad.id } }),
      this.prisma.ujianPraktek.count({ where: { kegiatanId: grad.id } }),
    ]);
    const dependent = results + scores + exams;

    if (dependent > 0) {
      await this.prisma.kegiatan.update({
        where: { id: grad.id },
        data: { status: 'cancelled' },
      });
      this.invalidateCache();
      return { deleted: false, status: 'cancelled', reason: 'Memiliki data terkait (hasil/nilai/ujian)' };
    }

    await this.prisma.kegiatan.delete({ where: { id: grad.id } });
    this.invalidateCache();
    return { deleted: true };
  }


  async remove(id: string, scope?: UserScope) {
    return this.baseRemove(id, scope, 'Pendadaran berhasil dihapus');
  }

  // ═══════════════════════════════════════════════════════════
  //  MY KEGIATAN (activity-scoped roles)
  // ═══════════════════════════════════════════════════════════

  /**
   * Fetch kegiatan assigned to the current user based on their role.
   * - admin_kegiatan: kegiatan WHERE adminKegiatanId = userId
   * - penguji: kegiatan WHERE ada PenugasanPenguji dengan pengujiUserId = userId
   */
  async findMyKegiatan(userId: string, role: string) {
    let kegiatanIds: string[] = [];

    if (role === 'admin_kegiatan') {
      // Fetch kegiatan where adminKegiatanId = userId
      const kegiatan = await this.prisma.kegiatan.findMany({
        where: { adminKegiatanId: userId, tipe: 'pendadaran' },
        select: { id: true },
      });
      kegiatanIds = kegiatan.map((k) => k.id);
    } else if (role === 'penguji') {
      // Fetch kegiatan where user is assigned as penguji
      const assignments = await this.prisma.penugasanPenguji.findMany({
        where: { pengujiUserId: userId, status: 'approved' },
        select: { kegiatanId: true },
      });
      kegiatanIds = assignments.map((a) => a.kegiatanId);
    }

    if (kegiatanIds.length === 0) {
      return [];
    }

    // Fetch full kegiatan details
    const kegiatan = await this.prisma.kegiatan.findMany({
      where: { id: { in: kegiatanIds } },
      select: {
        id: true,
        nama: true,
        lokasi: true,
        tanggalMulai: true,
        tanggalSelesai: true,
        status: true,
        tipe: true,
        scopeType: true,
        scopeId: true,
        adminKegiatanId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { tanggalMulai: 'desc' },
    });

    return kegiatan;
  }

  // ═══════════════════════════════════════════════════════════
  //  PARTICIPANTS
  // ═══════════════════════════════════════════════════════════

  async registerParticipant(
    graduationId: string,
    dto: RegisterParticipantDto,
    scope?: UserScope,
  ) {
    // 1. Verify access to this pendadaran + existence
    await this.getGraduationOrThrow(graduationId, scope);

    // 2. Verify the caller can access the candidate (scope-bound)
    await this.scopeHelper.verifyResourceAccess(
      this.prisma,
      scope,
      dto.candidateId,
      (p, id) =>
        p.calonAnggota.findUnique({
          where: { id },
          select: { rantingId: true },
        }) as unknown as Promise<{ rantingId?: string | null } | null>,
      'Calon anggota tidak ditemukan',
    );

    const candidate = await this.prisma.calonAnggota.update({
      where: { id: dto.candidateId },
      data: { status: 'mengikuti_pendadaran' },
    });

    if (candidate.email) {
      this.sendGraduationRegisteredEmail(candidate.namaLengkap, candidate.email, graduationId);
    }

    this.invalidateCache();
    return candidate;
  }

  async unregisterParticipant(
    graduationId: string,
    dto: RegisterParticipantDto,
    scope?: UserScope,
  ) {
    await this.getGraduationOrThrow(graduationId, scope);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.prisma as any).calonAnggota.update({
      where: { id: dto.candidateId },
      data: { status: 'diusulkan' },
    });

    // void — interceptor returns { success: true }
  }

  /**
   * FIX BUG: sebelumnya mengeembalikan SELURUH calon dengan status
   * 'mengikuti_pendadaran' di seluruh sistem (tanpa filter scope / graduation).
   * Sekarang: verifikasi akses ke pendadaran + filter peserta sesuai scope
   * (konsisten dengan pola calon anggota lain).
   */
  async getParticipants(graduationId: string, scope?: UserScope) {
    await this.getGraduationOrThrow(graduationId, scope);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { status: 'mengikuti_pendadaran' };
    Object.assign(where, this.scopeHelper.buildScopeFilter(scope as UserScope));

    const participants = await this.prisma.calonAnggota.findMany({
      where,
      include: { ranting: true },
    });

    return participants;
  }

  async importParticipants(
    graduationId: string,
    data: Array<{ candidateId?: string; id?: string }>,
    scope?: UserScope,
  ) {
    // Verify access to the graduation (throws 404 if not found / 403 if out of scope)
    await this.getGraduationOrThrow(graduationId, scope);

    let imported = 0;
    for (const row of data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const candidateId = (row as any).candidateId || (row as any).id;
      if (!candidateId) continue;
      const candidate = await this.prisma.calonAnggota.findUnique({
        where: { id: candidateId },
      });
      if (candidate && candidate.status === 'diusulkan') {
        await this.prisma.calonAnggota.update({
          where: { id: candidateId },
          data: { status: 'mengikuti_pendadaran' },
        });
        imported++;
      }
    }

    this.invalidateCache();
    return { imported };
  }

  // ═══════════════════════════════════════════════════════════
  //  GRADUATE (Kelulusan)
  // ═══════════════════════════════════════════════════════════

  /**
   * Buat HasilPendadaran untuk setiap peserta.
   * - totalSkor & ranking: jika ditiadakan di DTO, dihitung otomatis
   *   dari NilaiPendadaran (pola DFD: "Hitung Total & Ranking").
   * - statusValidasi='pending' → menunggu validasi admin (Gap 1).
   */
  async graduate(graduationId: string, dto: GraduateDto, scope?: UserScope) {
    // Verify access to this pendadaran
    await this.getGraduationOrThrow(graduationId, scope);

    const candidateIds = (dto.results || []).map((r) => r.candidateId);

    // Auto-compute totalSkor per candidate from NilaiPendadaran (jika tidak disediakan).
    const nilaiList = await this.prisma.nilaiPendadaran.findMany({
      where: { kegiatanId: graduationId, calonAnggotaId: { in: candidateIds } },
      select: { calonAnggotaId: true, skor: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scoreMap = new Map<string, number>();
    for (const n of nilaiList) {
      scoreMap.set(
        n.calonAnggotaId,
        (scoreMap.get(n.calonAnggotaId) ?? 0) + Number(n.skor),
      );
    }

    // Determine totals (user-supplied or computed) then derive ranking by score desc.
    const computed = (dto.results || []).map((r) => ({
      candidateId: r.candidateId,
      totalSkor:
        r.totalSkor !== undefined && r.totalSkor > 0
          ? r.totalSkor
          : scoreMap.get(r.candidateId) ?? 0,
      ranking: r.ranking,
      lulus: r.lulus,
    }));

    // If NO ranking was supplied at all, compute rankings from totals (rank #1 = highest).
    const anyRankingSupplied = (dto.results || []).some((r) => r.ranking !== undefined && r.ranking > 0);
    if (!anyRankingSupplied) {
      const sorted = [...computed].sort((a, b) => b.totalSkor - a.totalSkor);
      const rankOf = new Map<string, number>();
      sorted.forEach((r, i) => rankOf.set(r.candidateId, i + 1));
      computed.forEach((r) => (r.ranking = rankOf.get(r.candidateId) ?? 0));
    }

    for (const r of computed) {
      await this.prisma.hasilPendadaran.create({
        data: {
          kegiatanId: graduationId,
          calonAnggotaId: r.candidateId,
          totalSkor: r.totalSkor,
          ranking: r.ranking,
          statusKelulusan: r.lulus ? 'lulus' : 'gagal',
          statusValidasi: 'pending',
        },
      });

      const candidate = await this.prisma.calonAnggota.update({
        where: { id: r.candidateId },
        data: { status: r.lulus ? 'lulus' : 'gagal' },
      });

      if (candidate.email) {
        this.sendGraduationResultEmail(
          candidate.namaLengkap,
          candidate.email,
          r.lulus,
          r.totalSkor,
        );
      }
    }

    this.invalidateCache();
    // void — interceptor returns { success: true }
  }

  // ═══════════════════════════════════════════════════════════
  //  VALIDATE RESULT (Gap 1 — Admin validasi nilai)
  // ═══════════════════════════════════════════════════════════

  /**
   * Validasi hasil pendadaran oleh Admin (Approve / Reject).
   * - Mengubah `statusValidasi` HasilPendadaran (pending → approved/rejected).
   * - Mengisi `divalidasiOleh` / `divalidasiAt` (sesuai DFD: "Validasi Nilai oleh Admin").
   * Mendukung bulk via `dto.results` atau single via `dto.candidateId`.
   */
  async validateResult(
    graduationId: string,
    dto: ValidateResultDto,
    userId?: string,
    scope?: UserScope,
  ) {
    await this.getGraduationOrThrow(graduationId, scope);

    // Normalize to action list
    let actions: Array<{ candidateId: string; approved: boolean; catatan?: string }>;
    if (dto.results && dto.results.length > 0) {
      actions = dto.results;
    } else if (dto.candidateId) {
      actions = [
        {
          candidateId: dto.candidateId,
          approved: dto.approved,
          catatan: dto.catatan,
        },
      ];
    } else {
      throw new BadRequestException('Harus menyertakan candidateId atau results');
    }

    let validated = 0;
    let skipped = 0;

    // Auto-compute sekali untuk semua aksi (alur langkah 11: nilai yang
    // diapprove dihitung otomatis menentukan kelulusan & peringkat).
    const computed = await this.autoComputeResults(graduationId);

    for (const action of actions) {
      const existing = await this.prisma.hasilPendadaran.findFirst({
        where: { kegiatanId: graduationId, calonAnggotaId: action.candidateId },
      });

      let hasil = existing;
      if (!hasil) {
        const found = computed.find((c) => c.calonAnggotaId === action.candidateId);
        if (found) {
          hasil = await this.prisma.hasilPendadaran.create({
            data: {
              kegiatanId: graduationId,
              calonAnggotaId: found.calonAnggotaId,
              totalSkor: found.totalSkor,
              ranking: found.ranking ?? null,
              statusKelulusan: found.lulus ? 'lulus' : 'gagal',
              statusValidasi: 'pending',
            },
          });
        }
      }
      if (!hasil) {
        skipped++;
        continue;
      }

      await this.prisma.hasilPendadaran.update({
        where: { id: hasil.id },
        data: {
          statusValidasi: action.approved ? 'approved' : 'rejected',
          divalidasiOleh: userId || null,
          divalidasiAt: new Date(),
        },
      });
      validated++;

      // Kick off member creation + KTA + certificate generation for approved results
      if (action.approved && hasil.statusKelulusan === 'lulus') {
        try {
          await this.ensureAnggotaAndDocument(graduationId, action.candidateId, hasil.totalSkor);
        } catch (error) {
          this.logger.error(
            `Post-approval member/doc generation failed for ${action.candidateId}: ${(error as Error).message}`,
          );
        }
      }
    }

    this.invalidateCache();
    this.cache.invalidatePrefix('members:');
    this.cache.invalidatePrefix('documents:');
    return { validated, skipped };
  }

  // ═══════════════════════════════════════════════════════════
  //  GENERATE DOCUMENTS (Gap 2 — Generate Sertifikat & Piagam + Update Anggota Aktif)
  // ═══════════════════════════════════════════════════════════

  /**
   * Generate dokumen (sertifikat) dan buat Anggota baru (dengan NRA) untuk
   * setiap calon yang `lulus` **dan sudah divalidasi (approved)**.
   * - Idempotency: jika calon sudah menjadi anggota (via email), gunakan kembali.
   * - Diperbolehkan filter hanya satu calon via `dto.candidateId`.
   */
  async generateDocuments(graduationId: string, dto?: GenerateDocsDto, scope?: UserScope) {
    await this.getGraduationOrThrow(graduationId, scope);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      kegiatanId: graduationId,
      statusKelulusan: 'lulus',
      statusValidasi: 'approved',
    };
    if (dto?.candidateId) where.calonAnggotaId = dto.candidateId;

    const results = await this.prisma.hasilPendadaran.findMany({
      where,
      include: { calonAnggota: true },
    });

    let generated = 0;
    const errors: string[] = [];

    for (const r of results) {
      try {
        await this.ensureAnggotaAndDocument(graduationId, r.calonAnggotaId, r.totalSkor, r.calonAnggota);
        generated++;
      } catch (error) {
        errors.push(`${r.calonAnggotaId}: ${(error as Error).message}`);
      }
    }

    return { generated, total: results.length, errors };
  }

  /**
   * Memastikan seorang calon punya Akun anggota (Anggota + NRA) dan dokumen
   * sertifikat_pendadaran. Dipanggil oleh `validateResult` (post-approve) dan
   * `generateDocuments`.
   */
  private async ensureAnggotaAndDocument(
    kegiatanId: string,
    calonAnggotaId: string,
    totalSkor: unknown,
    calon?: {
      id: string;
      namaLengkap: string;
      jenisKelamin: 'L' | 'P';
      tempatLahir: string | null;
      tanggalLahir: Date | null;
      alamat: string | null;
      noHp: string | null;
      email: string | null;
      tingkat: string | null;
      rantingId: string;
    },
  ): Promise<void> {
    const candidate =
      calon ??
      (await this.prisma.calonAnggota.findUnique({
        where: { id: calonAnggotaId },
      }));
    if (!candidate) throw new NotFoundException('Calon anggota tidak ditemukan');

    const kegiatan = await this.prisma.kegiatan.findUnique({
      where: { id: kegiatanId },
      select: { nama: true, lokasi: true },
    });

    // 1. Resolve atau create Anggota (dengan NRA) — pola mirip CandidatesService.approve()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let anggota: { id: string } | null = null;
    if (candidate.email) {
      anggota = await this.prisma.anggota.findUnique({
        where: { email: candidate.email },
        select: { id: true },
      });
    }
    if (!anggota) {
      anggota = await this.prisma.anggota.create({
        data: {
          namaLengkap: candidate.namaLengkap,
          jenisKelamin: candidate.jenisKelamin,
          tempatLahir: candidate.tempatLahir,
          tanggalLahir: candidate.tanggalLahir ?? null,
          alamat: candidate.alamat,
          noHp: candidate.noHp,
          noHpNormalized: normalizePhone(candidate.noHp),
          email: candidate.email,
          rantingId: candidate.rantingId,
          tingkat: candidate.tingkat || null,
          nomorAnggota: await this.nraService.generateMemberNumber(candidate.rantingId),
          statusKeanggotaan: 'aktif',
          statusData: 'complete',
          statusValidasi: 'approved',
        },
      });
      // Notify the new member
      if (candidate.email) {
        this.memberMailService.sendToMemberWithArgs(
          anggota.id,
          graduationResultEmail,
          [true, Number(totalSkor) || 0],
          { template: 'graduationResultEmail', email: candidate.email },
          'graduations',
          { nomorAnggota: (anggota as { nomorAnggota?: string }).nomorAnggota ?? '' },
        );
      }
    }

    // 2. Idempotency: jangan duplikasi dokumen yang sudah ada
    //    (validateResult auto-generate + generateDocuments batch bisa memproses calon sama)
    const existingKta = await this.prisma.dokumen.findFirst({
      where: { anggotaId: anggota.id, tipe: 'kartu_anggota' },
      select: { id: true },
    });
    if (!existingKta) {
      // 3. Kartu anggota (KTA) otomatis — langkah 12 alur pendadaran
      try {
        await this.documentsService.generate({ memberId: anggota.id, type: 'kartu_anggota' });
      } catch (error) {
        this.logger.warn(`KTA generation skipped for ${anggota.id}: ${(error as Error).message}`);
      }
    }

    // 4. Idempotency: jangan duplikasi sertifikat yang sudah ada
    const existingDoc = await this.prisma.dokumen.findFirst({
      where: { anggotaId: anggota.id, tipe: 'sertifikat_pendadaran' },
      select: { id: true },
    });
    if (!existingDoc) {
      // 5. Aspect scores dari NilaiPendadaran (untuk sertifikat)
      const aspects = await this.buildAspectScores(kegiatanId, calonAnggotaId);

      // 6. Generate sertifikat pendadaran
      const finalSkor = Number(totalSkor) || 0;
      await this.documentsService.generateCertificate({
        memberId: anggota.id,
        eventTitle: `Pendadaran ${kegiatan?.nama || ''}`,
        location: kegiatan?.lokasi || '',
        finalScore: finalSkor,
        predicate: this.predicateFromScore(finalSkor),
        aspects,
      });
    }

    this.logger.log(`Generated KTA + sertifikat + anggota for calon ${candidate.id} (pendadaran ${kegiatanId})`);
  }

  private predicateFromScore(skor: number): string {
    if (skor >= 90) return 'Dengan Pujian';
    if (skor >= 60) return 'Lulus';
    return 'Lulus';
  }

  private async buildAspectScores(kegiatanId: string, calonAnggotaId: string): Promise<AspectScore[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nilai: any[] = await this.prisma.nilaiPendadaran.findMany({
      where: { kegiatanId, calonAnggotaId },
      include: { itemPenilaian: { include: { aspek: true } } },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = new Map<string, { name: string; total: number; max: number; items: string[] }>();
    for (const n of nilai) {
      const a = n.itemPenilaian.aspek;
      const key = a.id;
      const cur = map.get(key) || { name: a.namaAspek, total: 0, max: 0, items: [] as string[] };
      cur.total += Number(n.skor);
      cur.max += Number(n.itemPenilaian.skorMaksimal);
      cur.items.push(`${n.itemPenilaian.namaItem}: ${Number(n.skor)}`);
      map.set(key, cur);
    }
    return Array.from(map.values()).map((v) => ({
      name: v.name,
      score: `${v.total}/${v.max}`,
      items: v.items,
    }));
  }

  // ═══════════════════════════════════════════════════════════
  //  RESULTS (HasilPendadaran + status validasi — untuk UI validasi)
  // ═══════════════════════════════════════════════════════════

  /**
   * Daftar HasilPendadaran beserta status validasi (pending/approved/rejected).
   * Dipakai UI web & mobile untuk tombol Setujui/Tolak dan Generate Sertifikat.
   */
  async getResults(graduationId: string, scope?: UserScope) {
    await this.getGraduationOrThrow(graduationId, scope);

    return this.prisma.hasilPendadaran.findMany({
      where: { kegiatanId: graduationId },
      include: {
        calonAnggota: {
          select: {
            id: true,
            namaLengkap: true,
            email: true,
            ranting: { select: { nama: true } },
          },
        },
      },
      orderBy: [{ ranking: { sort: 'asc', nulls: 'last' } }, { totalSkor: 'desc' }],
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  WORKFLOW: PENGAJUAN & PERSETUJUAN PENGUJI
  // ═══════════════════════════════════════════════════════════

  /** Daftar penguji yang ditugaskan ke pendadaran beserta status persetujuannya. */
  async getExaminers(graduationId: string, scope?: UserScope) {
    await this.getGraduationOrThrow(graduationId, scope);

    const assignments = await this.prisma.penugasanPenguji.findMany({
      where: { kegiatanId: graduationId },
      include: {
        pengujiUser: { select: { id: true, namaLengkap: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return assignments;
  }

  /**
   * Kandidat penguji untuk satu pendadaran: (1) penguji terdaftar di
   * manajemen penguji dengan status aktif, atau (2) anggota yang tercatat
   * HADIR pada kegiatan ini (konfirmasi kehadiran via aplikasi / scan QR /
   * absen manual oleh admin kegiatan).
   */
  async getExaminerCandidates(graduationId: string, scope?: UserScope) {
    await this.getGraduationOrThrow(graduationId, scope);

    // 1. Manajemen penguji aktif (role='penguji' + isActive)
    const registered = await this.prisma.user.findMany({
      where: { role: 'penguji', isActive: true },
      select: { id: true, namaLengkap: true, email: true },
      orderBy: { namaLengkap: 'asc' },
    });

    // 2. Anggota hadir (undangan status='hadir') yang punya akun login (User via email)
    const hadir = await this.prisma.undanganPendadaran.findMany({
      where: { kegiatanId: graduationId, status: 'hadir' },
      include: {
        anggota: { select: { id: true, namaLengkap: true, email: true, nomorAnggota: true } },
      },
    });

    const registeredIds = new Set(registered.map((r) => r.id));

    // Resolve User untuk anggota hadir via email (batch — hindari N+1)
    const attendeeEmails = hadir
      .map((inv) => inv.anggota.email)
      .filter((e): e is string => !!e);
    const usersByEmail = new Map<string, string>();
    if (attendeeEmails.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { email: { in: attendeeEmails } },
        select: { id: true, email: true },
      });
      for (const u of users) usersByEmail.set(u.email, u.id);
    }

    const fromAttendance: Array<{
      id: string;
      namaLengkap: string;
      email: string | null;
      nomorAnggota: string | null;
      sumber: 'daftar_hadir';
    }> = [];
    for (const inv of hadir) {
      const userId = inv.anggota.email ? usersByEmail.get(inv.anggota.email) : undefined;
      if (!userId || registeredIds.has(userId)) continue;
      fromAttendance.push({
        id: userId,
        namaLengkap: inv.anggota.namaLengkap,
        email: inv.anggota.email,
        nomorAnggota: inv.anggota.nomorAnggota,
        sumber: 'daftar_hadir',
      });
    }

    return {
      manajemenPenguji: registered.map((r) => ({ ...r, sumber: 'manajemen_penguji' })),
      daftarHadir: fromAttendance,
    };
  }

  /**
   * Admin kegiatan mengajukan penguji untuk pendadaran (status pending).
   * Penguji yang diajukan akan menunggu persetujuan admin distrik.
   * Calon penguji sah bila: terdaftar di manajemen penguji (aktif) ATAU
   * tercatat HADIR pada kegiatan ini (undangan status='hadir').
   */
  async proposeExaminer(
    graduationId: string,
    dto: { pengujiUserId: string; peran?: string; catatan?: string },
    scope?: UserScope,
  ) {
    const grad = await this.getGraduationOrThrow(graduationId, scope);
    if (grad.status === 'closed' || grad.status === 'cancelled') {
      throw new BadRequestException('Pendadaran sudah ditutup/dibatalkan. Tidak dapat mengajukan penguji.');
    }

    const penguji = await this.prisma.user.findUnique({
      where: { id: dto.pengujiUserId },
      select: { id: true, role: true, isActive: true, email: true },
    });
    if (!penguji) throw new BadRequestException('User yang dipilih tidak ditemukan');

    // Syarat 1: manajemen penguji dengan status aktif
    const isRegisteredPenguji = penguji.role === 'penguji' && penguji.isActive !== false;

    // Syarat 2: anggota yang tercatat HADIR pada pendadaran ini
    let isAttendee = false;
    if (!isRegisteredPenguji && penguji.email) {
      const anggota = await this.prisma.anggota.findFirst({
        where: { email: penguji.email, deletedAt: null },
        select: { id: true },
      });
      if (anggota) {
        const inv = await this.prisma.undanganPendadaran.findFirst({
          where: { kegiatanId: graduationId, anggotaId: anggota.id, status: 'hadir' },
          select: { id: true },
        });
        isAttendee = !!inv;
      }
    }

    if (!isRegisteredPenguji && !isAttendee) {
      throw new BadRequestException(
        'Calon penguji harus terdaftar di manajemen penguji (status aktif) atau tercatat HADIR pada pendadaran ini',
      );
    }

    const existing = await this.prisma.penugasanPenguji.findFirst({
      where: { kegiatanId: graduationId, pengujiUserId: dto.pengujiUserId },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('Penguji ini sudah diajukan untuk pendadaran ini');
    }

    const assignment = await this.prisma.penugasanPenguji.create({
      data: {
        kegiatanId: graduationId,
        pengujiUserId: dto.pengujiUserId,
        peran: dto.peran || 'penguji',
        catatan: dto.catatan,
        status: 'pending',
      },
      include: { pengujiUser: { select: { id: true, namaLengkap: true, email: true } } },
    });
    this.invalidateCache();

    // Notify all admin_distrik that a new penguji proposal needs review
    this.notificationsService
      .sendToRole({
        role: 'admin_distrik',
        judul: 'Pengajuan Penguji Baru',
        isi: `${assignment.pengujiUser.namaLengkap} diajukan sebagai penguji untuk pendadaran "${grad.nama}". Menunggu persetujuan Anda.`,
        tipe: 'approval_request',
        data: { kegiatanId: graduationId, penugasanId: assignment.id },
      })
      .catch(() => {});

    return assignment;
  }

  /**
   * Admin distrik menyetujui / menolak pengajuan penguji.
   * Hanya penugasan ber-status pending yang dapat direview.
   */
  async reviewExaminer(
    graduationId: string,
    penugasanId: string,
    dto: { approved: boolean; catatan?: string },
    userId?: string,
    scope?: UserScope,
  ) {
    await this.getGraduationOrThrow(graduationId, scope);

    const assignment = await this.prisma.penugasanPenguji.findUnique({
      where: { id: penugasanId },
    });
    if (!assignment || assignment.kegiatanId !== graduationId) {
      throw new NotFoundException('Penugasan penguji tidak ditemukan');
    }
    if (assignment.status !== 'pending') {
      throw new BadRequestException('Pengajuan ini sudah diproses');
    }

    const updated = await this.prisma.penugasanPenguji.update({
      where: { id: penugasanId },
      data: {
        status: dto.approved ? 'approved' : 'rejected',
        disetujuiOleh: userId || null,
        disetujuiAt: new Date(),
        catatan: dto.catatan ?? assignment.catatan,
      },
      include: { pengujiUser: { select: { id: true, namaLengkap: true, email: true } } },
    });
    this.invalidateCache();

    // Notify the penguji about the decision
    const grad2 = await this.prisma.kegiatan.findUnique({
      where: { id: graduationId },
      select: { nama: true },
    });
    const gradName = grad2?.nama || 'Pendadaran';
    if (dto.approved) {
      this.notificationsService
        .send(updated.pengujiUserId, {
          judul: 'Anda Ditugaskan sebagai Penguji',
          isi: `Anda telah disetujui sebagai penguji untuk pendadaran "${gradName}". Silakan buka menu Pendadaran untuk mulai menilai.`,
          tipe: 'approval_request',
          data: { kegiatanId: graduationId, penugasanId: updated.id },
        })
        .catch(() => {});
    } else {
      this.notificationsService
        .send(updated.pengujiUserId, {
          judul: 'Pengajuan Penguji Ditolak',
          isi: `Pengajuan Anda sebagai penguji untuk pendadaran "${gradName}" ditolak.${dto.catatan ? ` Alasan: ${dto.catatan}` : ''}`,
          tipe: 'approval_request',
          data: { kegiatanId: graduationId, penugasanId: updated.id },
        })
        .catch(() => {});
    }

    return updated;
  }

  /**
   * Admin kegiatan menyetujui seluruh nilai yang dimasukkan penguji
   * (statusValidasi nilai: pending → approved). Hanya nilai dengan status
   * pending yang diubah; nilai yang sudah diputuskan tidak disentuh.
   */
  async approveScores(graduationId: string, userId?: string, scope?: UserScope) {
    const grad = await this.getGraduationOrThrow(graduationId, scope);
    if (grad.status === 'cancelled') {
      throw new BadRequestException('Pendadaran dibatalkan. Tidak dapat menyetujui nilai.');
    }

    // 1. Approve all pending scores
    const result = await this.prisma.nilaiPendadaran.updateMany({
      where: { kegiatanId: graduationId, statusValidasi: 'pending' },
      data: {
        statusValidasi: 'approved',
        divalidasiOleh: userId || null,
        divalidasiAt: new Date(),
      },
    });

    // 2. Auto-compute results: totalSkor, ranking, statusKelulusan, isTopTen
    await this.autoComputeAndSaveResults(graduationId);

    this.invalidateCache();
    return { approved: result.count };
  }

  /**
   * Step 12: System auto-validates after admin_distrik approves scores.
   * Computes totalSkor, ranking, statusKelulusan, isTopTen (top 10).
   * Creates HasilPendadaran records for all candidates with approved scores.
   */
  private async autoComputeAndSaveResults(graduationId: string) {
    // Get all approved scores grouped by candidate
    const nilai = await this.prisma.nilaiPendadaran.findMany({
      where: { kegiatanId: graduationId, statusValidasi: 'approved' },
      select: {
        calonAnggotaId: true,
        skor: true,
        itemPenilaian: { select: { skorMaksimal: true } },
      },
    });
    if (nilai.length === 0) return;

    // Compute totalSkor and totalMax per candidate
    const scoreMap = new Map<string, number>();
    const maxMap = new Map<string, number>();
    for (const n of nilai) {
      scoreMap.set(n.calonAnggotaId, (scoreMap.get(n.calonAnggotaId) ?? 0) + Number(n.skor));
      maxMap.set(
        n.calonAnggotaId,
        (maxMap.get(n.calonAnggotaId) ?? 0) + Number(n.itemPenilaian?.skorMaksimal ?? 100),
      );
    }

    // Compute ranking and kelulusan
    const totals: Array<{ calonAnggotaId: string; totalSkor: number; ranking: number; lulus: boolean }> = [];
    for (const [calonAnggotaId, totalSkor] of scoreMap.entries()) {
      const max = maxMap.get(calonAnggotaId) ?? 0;
      const pct = max > 0 ? (totalSkor / max) * 100 : 0;
      totals.push({ calonAnggotaId, totalSkor, ranking: 0, lulus: pct >= 60 });
    }

    // Rank: highest score = #1
    totals.sort((a, b) => b.totalSkor - a.totalSkor);
    totals.forEach((t, i) => (t.ranking = i + 1));

    // Top 10
    const topTenIds = new Set(totals.slice(0, 10).map((t) => t.calonAnggotaId));

    // Upsert HasilPendadaran for each candidate
    for (const t of totals) {
      await this.prisma.hasilPendadaran.upsert({
        where: {
          kegiatanId_calonAnggotaId: {
            kegiatanId: graduationId,
            calonAnggotaId: t.calonAnggotaId,
          },
        },
        update: {
          totalSkor: t.totalSkor,
          ranking: t.ranking,
          statusKelulusan: t.lulus ? 'lulus' : 'gagal',
          isTopTen: topTenIds.has(t.calonAnggotaId),
          statusValidasi: 'approved',
        },
        create: {
          kegiatanId: graduationId,
          calonAnggotaId: t.calonAnggotaId,
          totalSkor: t.totalSkor,
          ranking: t.ranking,
          statusKelulusan: t.lulus ? 'lulus' : 'gagal',
          isTopTen: topTenIds.has(t.calonAnggotaId),
          statusValidasi: 'approved',
        },
      });

      // Update candidate status
      await this.prisma.calonAnggota.update({
        where: { id: t.calonAnggotaId },
        data: { status: t.lulus ? 'lulus' : 'gagal' },
      });
    }
  }

  /**
   * Admin kegiatan mengajukan seluruh nilai ke admin distrik untuk review
   * & persetujuan (langkah 10 alur pendadaran). Mencatat waktu & user pengaju.
   */
  async submitResults(graduationId: string, userId?: string, scope?: UserScope) {
    const grad = await this.getGraduationOrThrow(graduationId, scope);
    if (grad.status === 'cancelled') {
      throw new BadRequestException('Pendadaran dibatalkan. Tidak dapat mengajukan nilai.');
    }
    if (grad.pengajuanNilaiAt) {
      throw new BadRequestException('Nilai sudah diajukan ke admin distrik');
    }

    // Pastikan ada nilai yang sudah disetujui admin kegiatan
    const approvedCount = await this.prisma.nilaiPendadaran.count({
      where: { kegiatanId: graduationId, statusValidasi: 'approved' },
    });
    if (approvedCount === 0) {
      throw new BadRequestException('Belum ada nilai yang disetujui. Setujui nilai penguji terlebih dahulu.');
    }

    const updated = await this.prisma.kegiatan.update({
      where: { id: graduationId },
      data: {
        pengajuanNilaiOleh: userId || null,
        pengajuanNilaiAt: new Date(),
        // Tetap 'published' — admin distrik masih harus review & approve.
        // status 'closed' hanya dipakai saat seluruh proses selesai.
        status: grad.status === 'draft' ? 'published' : grad.status,
      },
    });
    this.invalidateCache();
    return {
      success: true,
      status: updated.status,
      pengajuanNilaiAt: updated.pengajuanNilaiAt,
    };
  }

  /**
   * Saat admin distrik menyetujui hasil (validate-result), hitung otomatis
   * kelulusan & peringkat dari total skor, lalu buat anggota + KTA + sertifikat.
   * - Kelulusan: persentase totalSkor terhadap total skorMaksimal seluruh item
   *   yang dinilai (normalisasi ke skala 100) dengan ambang ≥ 60.
   */
  private async autoComputeResults(
    graduationId: string,
  ): Promise<Array<{ calonAnggotaId: string; totalSkor: number; ranking?: number; lulus: boolean }>> {
    const nilai = await this.prisma.nilaiPendadaran.findMany({
      where: { kegiatanId: graduationId, statusValidasi: 'approved' },
      select: {
        calonAnggotaId: true,
        skor: true,
        itemPenilaian: { select: { skorMaksimal: true } },
      },
    });
    if (nilai.length === 0) return [];

    // Total skor & total maksimal per calon
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scoreMap = new Map<string, number>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maxMap = new Map<string, number>();
    for (const n of nilai) {
      scoreMap.set(n.calonAnggotaId, (scoreMap.get(n.calonAnggotaId) ?? 0) + Number(n.skor));
      maxMap.set(
        n.calonAnggotaId,
        (maxMap.get(n.calonAnggotaId) ?? 0) + Number(n.itemPenilaian?.skorMaksimal ?? 100),
      );
    }
    const totals: Array<{ calonAnggotaId: string; totalSkor: number; ranking?: number; lulus: boolean }> =
      Array.from(scoreMap.entries()).map(([calonAnggotaId, totalSkor]) => {
        const max = maxMap.get(calonAnggotaId) ?? 0;
        const pct = max > 0 ? (totalSkor / max) * 100 : 0;
        return { calonAnggotaId, totalSkor, lulus: pct >= 60 };
      });

    // Ranking: skor tertinggi = #1
    totals.sort((a, b) => b.totalSkor - a.totalSkor);
    totals.forEach((t, i) => (t.ranking = i + 1));

    return totals;
  }

  // ═══════════════════════════════════════════════════════════
  //  UNDANGAN PENDADARAN (H-7) & KONFIRMASI KEHADIRAN
  // ═══════════════════════════════════════════════════════════

  /**
   * Daftar undangan untuk satu pendadaran (semua status).
   * Dipakai UI admin (web/mobile) untuk melihat & mencatat konfirmasi manual.
   */
  async getInvitations(graduationId: string, scope?: UserScope) {
    await this.getGraduationOrThrow(graduationId, scope);

    const invitations = await this.prisma.undanganPendadaran.findMany({
      where: { kegiatanId: graduationId },
      include: {
        anggota: {
          select: { id: true, namaLengkap: true, nomorAnggota: true, tingkat: true, tahunDadar: true, email: true, noHp: true },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    });
    return invitations;
  }

  /**
   * Generate undangan secara manual (juga dipakai cron H-7).
   * Kriteria anggota: masa anggota >2 tahun (dari tahun dadar) ATAU tingkat Pratama.
   * Idempotent: anggota yang sudah diundang dilewati (unique kegiatanId+anggotaId).
   */
  async generateInvitations(graduationId: string, scope?: UserScope) {
    const grad = await this.getGraduationOrThrow(graduationId, scope);
    if (grad.status === 'cancelled' || grad.status === 'closed') {
      throw new BadRequestException('Pendadaran sudah ditutup/dibatalkan. Tidak dapat membuat undangan.');
    }

    const currentYear = new Date().getFullYear();

    // Anggota dalam scope pendadaran (ranting/wilayah/distrik/nasional)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scopeFilter: any = this.buildAnggotaScopeFilter(grad.scopeType, grad.scopeId);

    const eligible = await this.prisma.anggota.findMany({
      where: {
        statusKeanggotaan: 'aktif',
        deletedAt: null,
        ...scopeFilter,
        OR: [
          // Masa anggota > 2 tahun (terhitung dari tahun dadar)
          { tahunDadar: { not: null } },
          // Tingkat Pratama (biru 1)
          { tingkat: 'Pratama' },
        ],
      },
      select: { id: true, namaLengkap: true, email: true, tingkat: true, tahunDadar: true },
    });

    // Filter yang benar-benar memenuhi kriteria (tahunDadar valid & >2 tahun)
    const targets = eligible.filter((m) => {
      const dadarYear = m.tahunDadar ? parseInt(String(m.tahunDadar).slice(0, 4), 10) : NaN;
      const senior = !isNaN(dadarYear) && currentYear - dadarYear > 2;
      return senior || m.tingkat === 'Pratama';
    });

    let created = 0;
    let skipped = 0;
    for (const m of targets) {
      try {
        await this.prisma.undanganPendadaran.create({
          data: { kegiatanId: graduationId, anggotaId: m.id, status: 'dikirim' },
        });
        created++;
        // Kirim email + in-app notification
        await this.sendInvitationNotifications(m, grad);
      } catch (error) {
        // Unique violation (sudah diundang) → skip; error lain → log
        if ((error as { code?: string }).code === 'P2002') {
          skipped++;
        } else {
          this.logger.warn(
            `Invitation create failed for ${m.id} (${grad.nama}): ${(error as Error).message}`,
          );
          skipped++;
        }
      }
    }

    this.invalidateCache();
    return { generated: created, skipped, total: targets.length };
  }

  /**
   * Konfirmasi kehadiran oleh anggota sendiri (self — via email match) ATAU
   * pencatatan manual oleh admin kegiatan.
   * - Self: verifikasi undangan milik user yang login (via email → Anggota.id).
   * - Manual: `manualOleh` diisi controller hanya untuk role admin.
   */
  async confirmInvitation(
    graduationId: string,
    invitationId: string,
    dto: { hadir: boolean; catatan?: string; manualOleh?: string },
    userId?: string,
    scope?: UserScope,
  ) {
    await this.getGraduationOrThrow(graduationId, scope);

    const inv = await this.prisma.undanganPendadaran.findUnique({
      where: { id: invitationId },
    });
    if (!inv || inv.kegiatanId !== graduationId) {
      throw new NotFoundException('Undangan tidak ditemukan');
    }

    // Self-confirm: pastikan undangan milik anggota yang login
    if (!dto.manualOleh) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId || '' },
        select: { email: true },
      });
      const anggota = user?.email
        ? await this.prisma.anggota.findFirst({
            where: { email: user.email, deletedAt: null },
            select: { id: true },
          })
        : null;
      if (!anggota || anggota.id !== inv.anggotaId) {
        throw new ForbiddenException('Anda hanya dapat mengkonfirmasi undangan Anda sendiri');
      }
    }

    const updated = await this.prisma.undanganPendadaran.update({
      where: { id: invitationId },
      data: {
        status: dto.hadir ? 'hadir' : 'tidak_hadir',
        konfirmasiAt: new Date(),
        konfirmasiOleh: dto.manualOleh || userId || null,
        catatan: dto.catatan ?? inv.catatan,
      },
    });
    this.invalidateCache();
    return updated;
  }

  /**
   * QR code (data URL) untuk absensi pendadaran. Dipakai admin web/mobile
   * untuk menampilkan QR yang dipindai anggota (self check-in).
   */
  async getQrDataUrl(graduationId: string, scope?: UserScope) {
    await this.getGraduationOrThrow(graduationId, scope);
    const payload = JSON.stringify({ id: graduationId, type: 'graduation' });
    const qrDataUrl = await QRCode.toDataURL(payload, { width: 240, margin: 2 });
    return { qrDataUrl, payload };
  }

  /**
   * QR absensi (self check-in) untuk kegiatan pendadaran.
   * Anggota yang login memindai QR pendadaran → catat kehadiran:
   * - Undangan miliknya (jika ada) di-update menjadi 'hadir'.
   * - Jika belum diundang (mis. admin catat manual), undangan dibuat dengan
   *   status 'hadir' agar tercatat di daftar hadir kegiatan.
   */
  async checkInByQr(graduationId: string, userId: string, scope?: UserScope) {
    const grad = await this.getGraduationOrThrow(graduationId, scope);
    if (grad.status === 'cancelled' || grad.status === 'closed') {
      throw new BadRequestException('Pendadaran sudah ditutup/dibatalkan');
    }

    // Resolve Anggota via email (pola sama seperti forum/self-service)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user?.email) {
      throw new ForbiddenException('Akun Anda tidak memiliki email terdaftar');
    }
    const anggota = await this.prisma.anggota.findFirst({
      where: { email: user.email, deletedAt: null },
      select: { id: true },
    });
    if (!anggota) {
      throw new ForbiddenException('Data keanggotaan Anda tidak ditemukan');
    }

    // Upsert undangan → 'hadir'
    const existing = await this.prisma.undanganPendadaran.findFirst({
      where: { kegiatanId: graduationId, anggotaId: anggota.id },
      select: { id: true },
    });

    let invitation;
    if (existing) {
      invitation = await this.prisma.undanganPendadaran.update({
        where: { id: existing.id },
        data: { status: 'hadir', konfirmasiAt: new Date(), konfirmasiOleh: userId },
      });
    } else {
      invitation = await this.prisma.undanganPendadaran.create({
        data: { kegiatanId: graduationId, anggotaId: anggota.id, status: 'hadir', konfirmasiAt: new Date(), konfirmasiOleh: userId },
      });
    }

    this.invalidateCache();
    return {
      success: true,
      status: 'hadir',
      anggotaId: anggota.id,
      undanganId: invitation.id,
    };
  }

  /**
   * Undangan untuk anggota yang sedang login (self-scope).
   * Dipakai layar "Pendadaran" di mobile/web anggota untuk konfirmasi kehadiran.
   */
  async getMyInvitations(userId: string) {
    // Resolve Anggota via email (pola sama seperti forum/anggota self)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user?.email) return [];

    const anggota = await this.prisma.anggota.findFirst({
      where: { email: user.email, deletedAt: null },
      select: { id: true },
    });
    if (!anggota) return [];

    const invitations = await this.prisma.undanganPendadaran.findMany({
      where: { anggotaId: anggota.id },
      include: {
        kegiatan: {
          select: { id: true, nama: true, lokasi: true, tanggalMulai: true, tanggalSelesai: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return invitations;
  }

  /** Kirim email undangan + in-app notification ke anggota. */
  private async sendInvitationNotifications(
    member: { id: string; namaLengkap: string; email: string | null },
    grad: { nama: string; lokasi: string | null; tanggalMulai: Date },
  ): Promise<void> {
    const tanggal = grad.tanggalMulai.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: '2-digit',
    });
    const lokasi = grad.lokasi || 'lokasi pendadaran';
    const judul = '📩 Undangan Pendadaran';
    const isi = `Anda diundang mengikuti pendadaran "${grad.nama}" pada ${tanggal} di ${lokasi}. Konfirmasi kehadiran Anda melalui menu Pendadaran di aplikasi.`;

    // In-app notification (fallback ke direct create jika service error)
    try {
      await this.notificationsService.send(member.id, {
        userId: member.id,
        judul,
        isi,
        tipe: 'umum',
      });
    } catch (error) {
      this.logger.warn(`Invitation in-app notif failed for ${member.id}: ${(error as Error).message}`);
      try {
        await this.prisma.notifikasi.create({
          data: { userId: member.id, tipe: 'umum', judul, isi },
        });
      } catch { /* ignore */ }
    }

    // Email undangan
    if (member.email) {
      try {
        await this.sendGraduationInvitationEmail(member, grad, tanggal, lokasi);
      } catch (error) {
        this.logger.warn(`Invitation email failed for ${member.email}: ${(error as Error).message}`);
      }
    }
  }

  private async sendGraduationInvitationEmail(
    member: { namaLengkap: string; email: string | null },
    grad: { nama: string },
    tanggal: string,
    lokasi: string,
  ): Promise<void> {
    if (!member.email) return;
    const tpl = await this.mailService.renderWithOverride(
      'graduationInvitationEmail',
      () => ({
        subject: `Undangan Pendadaran: ${grad.nama}`,
        html: `<h2>Undangan Pendadaran</h2><p>Halo <strong>${member.namaLengkap}</strong>,</p><p>Anda diundang untuk mengikuti pendadaran <strong>${grad.nama}</strong> pada <strong>${tanggal}</strong> di <strong>${lokasi}</strong>.</p><p>Mohon konfirmasi kehadiran melalui aplikasi (menu Pendadaran) atau hubungi admin kegiatan.</p><p>Salam,<br/>Sekretariat THS-THM</p>`,
        text: `Undangan Pendadaran: ${grad.nama}\n\nHalo ${member.namaLengkap},\n\nAnda diundang untuk mengikuti pendadaran ${grad.nama} pada ${tanggal} di ${lokasi}.\n\nMohon konfirmasi kehadiran melalui aplikasi (menu Pendadaran) atau hubungi admin kegiatan.`,
      }),
      { nama: member.namaLengkap, gradNama: grad.nama, tanggal, lokasi },
    );
    await this.mailService.sendMail({
      to: member.email,
      subject: tpl.subject,
      html: tpl.html,
      metadata: { module: 'graduations', template: 'graduationInvitationEmail' },
    });
  }

  /**
   * Scope filter untuk anggota berdasar scope kegiatan pendadaran.
   * - nasional → tanpa filter
   * - distrik → anggota yang ranting-nya di dalam distrik
   * - wilayah → anggota yang ranting-nya di dalam wilayah
   * - ranting → anggota ranting tsb
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildAnggotaScopeFilter(scopeType: string, scopeId: string): any {
    if (!scopeId || scopeId === 'national') return {};
    if (scopeType === 'ranting') return { rantingId: scopeId };
    if (scopeType === 'wilayah') {
      return { ranting: { wilayahId: scopeId } };
    }
    if (scopeType === 'distrik') {
      return { ranting: { wilayah: { distrikId: scopeId } } };
    }
    return {};
  }

  // ═══════════════════════════════════════════════════════════
  //  SCORE PROGRESS — real-time progress of penguji scoring
  // ═══════════════════════════════════════════════════════════

  async getScoreProgress(graduationId: string, scope?: UserScope) {
    await this.getGraduationOrThrow(graduationId, scope);

    // 1. Total peserta (calon anggota) — unique calonAnggota from nilaiPendadaran + undangan
    const scoredParticipants = await this.prisma.nilaiPendadaran.findMany({
      where: { kegiatanId: graduationId },
      select: { calonAnggotaId: true },
      distinct: ['calonAnggotaId'],
    });
    const invitedParticipants = await this.prisma.undanganPendadaran.findMany({
      where: { kegiatanId: graduationId },
      select: { anggotaId: true },
    });
    const participantIds = new Set([
      ...scoredParticipants.map((p) => p.calonAnggotaId),
      ...invitedParticipants.map((p) => p.anggotaId),
    ]);
    const totalParticipants = participantIds.size || 1; // avoid division by zero

    // 2. Total items across all ujian
    const ujianList = await this.prisma.ujianPraktek.findMany({
      where: { kegiatanId: graduationId },
      select: { id: true, items: { select: { id: true } } },
    });
    const totalItemsPerUjian = ujianList.map((u) => ({ id: u.id, itemCount: u.items.length }));
    const totalExpectedScores = totalParticipants * totalItemsPerUjian.reduce((s, u) => s + u.itemCount, 0);

    // 3. Actual scores entered
    const scores = await this.prisma.nilaiPendadaran.findMany({
      where: { kegiatanId: graduationId },
      select: {
        pengujiUserId: true,
        calonAnggotaId: true,
        ujianPraktekId: true,
        penguji: { select: { id: true, namaLengkap: true } },
      },
    });
    const totalEntered = scores.length;

    // 4. Per-penguji progress
    const pengujiMap = new Map<string, { id: string; nama: string; entered: number; expected: number }>();
    // Initialize all approved penguji with 0
    const approvedExaminers = await this.prisma.penugasanPenguji.findMany({
      where: { kegiatanId: graduationId, status: 'approved' },
      select: { pengujiUser: { select: { id: true, namaLengkap: true } } },
    });
    for (const ex of approvedExaminers) {
      pengujiMap.set(ex.pengujiUser.id, {
        id: ex.pengujiUser.id,
        nama: ex.pengujiUser.namaLengkap,
        entered: 0,
        expected: totalParticipants * totalItemsPerUjian.reduce((s, u) => s + u.itemCount, 0),
      });
    }
    // Count entered scores per penguji
    for (const s of scores) {
      const entry = pengujiMap.get(s.pengujiUserId);
      if (entry) {
        entry.entered += 1;
      } else {
        // Penguji not in approved list but has scores (edge case)
        pengujiMap.set(s.pengujiUserId, {
          id: s.penguji.id,
          nama: s.penguji.namaLengkap,
          entered: 1,
          expected: totalParticipants * totalItemsPerUjian.reduce((sum, u) => sum + u.itemCount, 0),
        });
      }
    }

    const perPenguji = Array.from(pengujiMap.values()).map((p) => ({
      ...p,
      percentage: p.expected > 0 ? Math.round((p.entered / p.expected) * 100) : 0,
    }));

    return {
      totalParticipants,
      totalItems: totalItemsPerUjian.reduce((s, u) => s + u.itemCount, 0),
      totalExpectedScores,
      totalEntered,
      percentage: totalExpectedScores > 0 ? Math.round((totalEntered / totalExpectedScores) * 100) : 0,
      perPenguji,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  EVALUATIONS (Nilai evaluasi pendadaran — didokumentasikan di API.md)
  // ═══════════════════════════════════════════════════════════

  async getEvaluations(graduationId: string, scope?: UserScope) {
    await this.getGraduationOrThrow(graduationId, scope);

    // Semua penilaian aspek/item untuk peserta pendadaran ini
    const results = await this.prisma.nilaiPendadaran.findMany({
      where: { kegiatanId: graduationId },
      include: {
        calonAnggota: { select: { id: true, namaLengkap: true, ranting: { select: { nama: true } } } },
        itemPenilaian: {
          select: {
            namaItem: true,
            skorMaksimal: true,
            bobot: true,
            aspek: { select: { namaAspek: true, bobot: true } },
          },
        },
        penguji: { select: { id: true, namaLengkap: true } },
        ujianPraktek: { select: { id: true, nama: true } },
      },
      orderBy: [{ calonAnggotaId: 'asc' }, { createdAt: 'asc' }],
    });

    // Aggregate total skor per candidate for convenience
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totals: Record<string, { nama: string; skor: number; items: number }> = {};
    for (const r of results) {
      const key = r.calonAnggotaId;
      if (!totals[key]) {
        totals[key] = {
          nama: r.calonAnggota?.namaLengkap ?? '',
          skor: 0,
          items: 0,
        };
      }
      totals[key].skor += Number(r.skor);
      totals[key].items += 1;
    }

    return {
      scores: results,
      summary: totals,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════

  /** Verify the pendadaran exists & the caller has scope access */
  private async getGraduationOrThrow(id: string, scope?: UserScope) {
    const grad = await this.prisma.kegiatan.findUnique({
      where: { id },
    });
    if (!grad) throw new NotFoundException('Pendadaran tidak ditemukan');
    this.scopeHelper.verifyKegiatanScope(scope, grad.scopeType, grad.scopeId);
    return grad;
  }

  private async sendGraduationRegisteredEmail(
    nama: string,
    email: string,
    graduationId: string,
  ): Promise<void> {
    try {
      const graduation = await this.prisma.kegiatan.findUnique({
        where: { id: graduationId },
        select: { nama: true, tanggalMulai: true },
      });
      const namaPendadaran = graduation?.nama || 'Pendadaran';
      const tanggal = graduation?.tanggalMulai
        ? graduation.tanggalMulai.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: '2-digit',
          })
        : '-';
      const tpl = await this.mailService.renderWithOverride(
        'graduationRegisteredEmail',
        () => graduationRegisteredEmail(nama, namaPendadaran, tanggal),
        { nama, namaPendadaran, tanggal },
      );
      await this.mailService.sendMail({
        to: email,
        subject: tpl.subject,
        html: tpl.html,
        metadata: { module: 'graduations', template: 'graduationRegisteredEmail' },
      });
    } catch (error) {
      this.logger.error(`sendGraduationRegisteredEmail failed: ${(error as Error).message}`);
    }
  }

  private async sendGraduationResultEmail(
    nama: string,
    email: string,
    lulus: boolean,
    skor?: number,
  ): Promise<void> {
    try {
      const tpl = await this.mailService.renderWithOverride(
        'graduationResultEmail',
        () => graduationResultEmail(nama, lulus, skor),
        { nama, lulus: lulus ? 'Lulus' : 'Gagal', skor: String(skor || 0) },
      );
      await this.mailService.sendMail({
        to: email,
        subject: tpl.subject,
        html: tpl.html,
        metadata: { module: 'graduations', template: 'graduationResultEmail' },
      });
    } catch (error) {
      this.logger.error(
        `sendGraduationResultEmail failed for ${email}: ${(error as Error).message}`,
      );
    }
  }
}
