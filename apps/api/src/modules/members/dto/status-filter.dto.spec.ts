import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

import { MemberFilterDto } from './member.dto';
import { CreateDueDto, DueFilterDto, UpdateDueDto } from '../../dues/dto/dues.dto';
import {
  BatchEstimateQueryDto,
  DocumentFilterDto,
  GenerateDocumentDto,
} from '../../documents/dto/document.dto';
import { CandidateFilterDto } from '../../candidates/dto/candidate.dto';
import { ClaimFilterDto } from '../../claims/dto/claim.dto';
import { GraduationFilterDto } from '../../graduations/dto/graduation.dto';

/**
 * Validasi DTO filter/write lintas modul (mirror ValidationPipe global:
 * whitelist + forbidNonWhitelisted + transform w/ implicit conversion).
 *
 * Field yang dipetakan ke kolom enum Prisma wajib pakai @IsEnum — nilai
 * di luar enum ditolak 400 di pipe, bukan diam-diam di-cast di service.
 */
describe('DTO enum validation (cross-module)', () => {
  const validateDto = async (
    Dto: new () => object,
    query: Record<string, unknown>,
  ): Promise<ValidationError[]> => {
    const dto = plainToInstance(Dto, query, { enableImplicitConversion: true });
    return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  };

  const props = (errors: ValidationError[]): string[] => errors.map((e) => e.property).sort();

  // ── Members ────────────────────────────────────────────────
  describe('MemberFilterDto', () => {
    it('rejects status di luar enum StatusKeanggotaan/StatusValidasi/StatusData', async () => {
      const errors = await validateDto(MemberFilterDto, {
        statusKeanggotaan: 'AKTIF_BANGET',
        statusValidasi: 'oke',
        statusData: 'bakso',
      });
      expect(props(errors)).toEqual(['statusData', 'statusKeanggotaan', 'statusValidasi']);
    });

    it('accepts nilai enum valid', async () => {
      const errors = await validateDto(MemberFilterDto, {
        statusKeanggotaan: 'aktif',
        statusValidasi: 'approved',
        statusData: 'incomplete',
      });
      expect(errors).toHaveLength(0);
    });
  });

  // ── Dues ───────────────────────────────────────────────────
  describe('DueFilterDto / CreateDueDto / UpdateDueDto', () => {
    it('rejects filter status di luar enum StatusIuran', async () => {
      const errors = await validateDto(DueFilterDto, { status: 'LUNAS' });
      expect(props(errors)).toEqual(['status']);
    });

    it('accepts filter status enum valid', async () => {
      const errors = await validateDto(DueFilterDto, { status: 'lunas', periode: '2026-01' });
      expect(errors).toHaveLength(0);
    });

    it('rejects create dengan metodeBayar/status di luar enum', async () => {
      const errors = await validateDto(CreateDueDto, {
        anggotaId: 'a1',
        periode: '2026-01',
        jumlah: 100000,
        metodeBayar: 'kartu_kredit',
        status: 'paid',
      });
      expect(props(errors)).toEqual(['metodeBayar', 'status']);
    });

    it('accepts create dengan enum valid', async () => {
      const errors = await validateDto(CreateDueDto, {
        anggotaId: 'a1',
        periode: '2026-01',
        jumlah: 100000,
        metodeBayar: 'manual',
        status: 'menunggak',
      });
      expect(errors).toHaveLength(0);
    });

    it('rejects update status di luar enum', async () => {
      const errors = await validateDto(UpdateDueDto, { status: 'settled' });
      expect(props(errors)).toEqual(['status']);
    });
  });

  // ── Documents ──────────────────────────────────────────────
  describe('DocumentFilterDto / GenerateDocumentDto / BatchEstimateQueryDto', () => {
    it('rejects filter tipe di luar enum TipeDokumen', async () => {
      const errors = await validateDto(DocumentFilterDto, { tipe: 'ktp' });
      expect(props(errors)).toEqual(['tipe']);
    });

    it('accepts filter tipe valid', async () => {
      const errors = await validateDto(DocumentFilterDto, { tipe: 'kartu_anggota' });
      expect(errors).toHaveLength(0);
    });

    it('rejects generate type di luar enum (dulu lolos lalu di-cast as never)', async () => {
      const errors = await validateDto(GenerateDocumentDto, { memberId: 'm1', type: 'kta' });
      expect(props(errors)).toEqual(['type']);
    });

    it('accepts generate type valid', async () => {
      const errors = await validateDto(GenerateDocumentDto, {
        memberId: 'm1',
        type: 'sertifikat_pendadaran',
      });
      expect(errors).toHaveLength(0);
    });

    it('rejects batch range di luar kontrak endpoint', async () => {
      const errors = await validateDto(BatchEstimateQueryDto, { range: 'everything' });
      expect(props(errors)).toEqual(['range']);
    });

    it('accepts batch range valid', async () => {
      const errors = await validateDto(BatchEstimateQueryDto, { range: 'graduated_only' });
      expect(errors).toHaveLength(0);
    });
  });

  // ── Candidates ─────────────────────────────────────────────
  describe('CandidateFilterDto', () => {
    it('rejects status di luar enum StatusCalon', async () => {
      const errors = await validateDto(CandidateFilterDto, { status: 'lulusss' });
      expect(props(errors)).toEqual(['status']);
    });

    it('accepts status valid', async () => {
      const errors = await validateDto(CandidateFilterDto, { status: 'mengikuti_pendadaran' });
      expect(errors).toHaveLength(0);
    });
  });

  // ── Claims ─────────────────────────────────────────────────
  describe('ClaimFilterDto', () => {
    it('rejects status English (disetujui ≠ approved) — guard drift bahasa', async () => {
      const errors = await validateDto(ClaimFilterDto, { status: 'approved' });
      expect(props(errors)).toEqual(['status']);
    });

    it('rejects tipe di luar enum TipeKlaim', async () => {
      const errors = await validateDto(ClaimFilterDto, { tipe: 'membership' });
      expect(props(errors)).toEqual(['tipe']);
    });

    it('accepts status & tipe valid', async () => {
      const errors = await validateDto(ClaimFilterDto, { status: 'disetujui', tipe: 'keanggotaan' });
      expect(errors).toHaveLength(0);
    });
  });

  // ── Graduations ────────────────────────────────────────────
  describe('GraduationFilterDto', () => {
    it('rejects status di luar enum StatusKegiatan', async () => {
      const errors = await validateDto(GraduationFilterDto, { status: 'ongoing' });
      expect(props(errors)).toEqual(['status']);
    });

    it('accepts status valid', async () => {
      const errors = await validateDto(GraduationFilterDto, { status: 'published' });
      expect(errors).toHaveLength(0);
    });
  });
});
