import { IsString, IsOptional, IsInt, Min, IsArray, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TipeDokumen } from '@prisma/client';

/** Rentang batch generate dokumen (bukan enum DB — kontrak endpoint). */
export const BATCH_RANGES = ['all_active', 'by_ranting', 'by_ids', 'graduated_only'] as const;
export type BatchRange = (typeof BATCH_RANGES)[number];

export class GenerateDocumentDto {
  @ApiProperty()
  @IsString()
  memberId: string;

  @ApiProperty({ enum: Object.values(TipeDokumen) })
  @IsEnum(TipeDokumen)
  type: TipeDokumen;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signatureId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stampId?: string;
}

export class BatchGenerateDocumentDto {
  @ApiPropertyOptional({ type: [String], description: 'Daftar ID anggota (opsional jika range dipakai)' })
  @IsOptional()
  @IsArray()
  memberIds?: string[];

  @ApiProperty({ enum: Object.values(TipeDokumen) })
  @IsEnum(TipeDokumen)
  type: TipeDokumen;

  @ApiPropertyOptional({ enum: BATCH_RANGES, description: 'Rentang anggota untuk resolve memberIds otomatis' })
  @IsOptional()
  @IsEnum(BATCH_RANGES)
  range?: BatchRange;

  @ApiPropertyOptional({ description: 'ID ranting jika range=by_ranting' })
  @IsOptional()
  @IsString()
  rantingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signatureId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stampId?: string;
}

export class BatchEstimateQueryDto {
  @ApiProperty({ enum: BATCH_RANGES })
  @IsEnum(BATCH_RANGES)
  range: BatchRange;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rantingId?: string;
}

export class BatchRetryDto {
  @ApiPropertyOptional({ type: [String], description: 'Opsional — retry hanya job tertentu' })
  @IsOptional()
  @IsArray()
  jobIds?: string[];
}

export class DocumentFilterDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ enum: Object.values(TipeDokumen) })
  @IsOptional()
  @IsEnum(TipeDokumen)
  tipe?: TipeDokumen;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  anggotaId?: string;
}

// ── Batch Endpoint DTOs ──

export class BatchListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
