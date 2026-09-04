import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  IsNumber,
  Min,
  Max,
  IsUUID,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ─── Create Ujian Praktek ─────────────────────────────

export class CreateUjianPraktekDto {

  @ApiProperty()
  @IsString()
  nama: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deskripsi?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  tanggal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  durasiMenit?: number;
}

export class UpdateUjianPraktekDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nama?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deskripsi?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  tanggal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  durasiMenit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

// ─── Examiner Assignment ─────────────────────────────

export class AssignExaminerDto {
  @ApiProperty()
  @IsUUID()
  @IsString()
  pengujiUserId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  catatan?: string;
}

export class RemoveExaminerDto {
  @ApiProperty()
  @IsUUID()
  @IsString()
  pengujiUserId: string;
}

// ─── Assessment Items ───────────────────────────────

export class AssignItemDto {
  @ApiProperty()
  @IsUUID()
  @IsString()
  itemPenilaianId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  urutan?: number;
}

// ─── Scoring ────────────────────────────────────────

export class CandidateScoreItemDto {
  @ApiProperty()
  @IsUUID()
  @IsString()
  itemPenilaianId: string;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  skor: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  komentar?: string;
}

export class ScoreCandidateDto {
  @ApiProperty()
  @IsUUID()
  @IsString()
  calonAnggotaId: string;

  @ApiProperty({ type: [CandidateScoreItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateScoreItemDto)
  items: CandidateScoreItemDto[];
}

export class BulkScoreDto {
  @ApiProperty({ type: [ScoreCandidateDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoreCandidateDto)
  scores: ScoreCandidateDto[];
}

/** Mulai sesi ujian peserta — durasi opsional (default: durasi ujian / 30 menit). */
export class StartSesiDto {
  @ApiPropertyOptional({ description: 'Durasi standar menit (default durasi ujian atau 30)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  durasiStandarMenit?: number;
}
