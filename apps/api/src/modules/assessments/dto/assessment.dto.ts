import { IsString, IsOptional, IsInt, Min, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ─── Aspek Penilaian ───

export class CreateAspectDto {
  @ApiProperty()
  @IsString()
  kodeAspek: string;

  @ApiProperty()
  @IsString()
  namaAspek: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deskripsi?: string;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  bobot: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAspectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  namaAspek?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deskripsi?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bobot?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ─── Item Penilaian ───

export class CreateItemDto {
  @ApiProperty()
  @IsString()
  aspekId: string;

  @ApiProperty()
  @IsString()
  kodeItem: string;

  @ApiProperty()
  @IsString()
  namaItem: string;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  skorMaksimal: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  bobot: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  urutan?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  namaItem?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  skorMaksimal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bobot?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  urutan?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ─── Nilai / Skor ───

export class CreateScoreDto {
  @ApiProperty()
  @IsString()
  kegiatanId: string;

  @ApiProperty()
  @IsString()
  calonAnggotaId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  anggotaId?: string;

  @ApiProperty()
  @IsString()
  itemPenilaianId: string;

  @ApiProperty()
  @IsString()
  pengujiUserId: string;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  skor: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  komentar?: string;
}

export class ScoreFilterDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  kegiatanId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  calonAnggotaId?: string;
}

export class AssessmentFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  aspekId?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  // Filter aspek/item milik pendadaran tertentu. Tanpa parameter → hanya
  // template global (kegiatanId null). Bila pendadaran belum punya set sendiri,
  // otomatis fallback ke template (backward compatible).
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  kegiatanId?: string;

  // Sertakan aspek/item yang disembunyikan (isActive=false) — khusus admin web.
  // Alur scoring (mobile/penguji) TIDAK mengirim ini → hanya melihat yang aktif.
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeInactive?: boolean;
}
