import { IsString, IsOptional, IsInt, Min, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GenerateDocumentDto {
  @ApiProperty()
  @IsString()
  memberId: string;

  @ApiProperty({
    enum: ['kartu_anggota', 'sertifikat_pendadaran', 'sertifikat_pelatihan', 'piagam_prestasi'],
  })
  @IsString()
  type: string;

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

  @ApiProperty({
    enum: ['kartu_anggota', 'sertifikat_pendadaran', 'sertifikat_pelatihan', 'piagam_prestasi'],
  })
  @IsString()
  type: string;

  @ApiPropertyOptional({
    enum: ['all_active', 'by_ranting', 'by_ids', 'graduated_only'],
    description: 'Rentang anggota untuk resolve memberIds otomatis',
  })
  @IsOptional()
  @IsString()
  range?: string;

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
  @ApiProperty({
    enum: ['all_active', 'by_ranting', 'by_ids', 'graduated_only'],
  })
  @IsString()
  range: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tipe?: string;

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
