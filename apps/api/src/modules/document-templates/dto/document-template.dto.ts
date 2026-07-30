import { IsString, IsOptional, IsBoolean, IsArray, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DocumentTemplateType {
  KARTU_ANGGOTA = 'kartu_anggota',
  KARTU_CALON_ANGGOTA = 'kartu_calon_anggota',
  PIAGAM = 'piagam',
  SERTIFIKAT = 'sertifikat',
  SURAT_KELUAR = 'surat_keluar',
}

export class CreateDocumentTemplateDto {
  @ApiProperty({ description: 'Nama template' })
  @IsString()
  name: string;

  @ApiProperty({ enum: DocumentTemplateType, description: 'Tipe dokumen' })
  @IsEnum(DocumentTemplateType)
  type: DocumentTemplateType;

  @ApiPropertyOptional({ description: 'Deskripsi template' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Path file template (PDF/PNG)' })
  @IsString()
  filePath: string;

  @ApiPropertyOptional({ description: 'Path thumbnail preview' })
  @IsOptional()
  @IsString()
  thumbnailPath?: string;

  @ApiPropertyOptional({ description: 'Variabel yang digunakan dalam template', example: ['nama', 'nomor_anggota'] })
  @IsOptional()
  @IsArray()
  variables?: string[];

  @ApiPropertyOptional({ default: true, description: 'Status aktif template' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: false, description: 'Apakah ini template default untuk tipe ini' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateDocumentTemplateDto {
  @ApiPropertyOptional({ description: 'Nama template' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Deskripsi template' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Path file template (PDF/PNG)' })
  @IsOptional()
  @IsString()
  filePath?: string;

  @ApiPropertyOptional({ description: 'Path thumbnail preview' })
  @IsOptional()
  @IsString()
  thumbnailPath?: string;

  @ApiPropertyOptional({ description: 'Variabel yang digunakan dalam template' })
  @IsOptional()
  @IsArray()
  variables?: string[];

  @ApiPropertyOptional({ description: 'Status aktif template' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Apakah ini template default untuk tipe ini' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class DocumentTemplateFilterDto {
  @ApiPropertyOptional({ enum: DocumentTemplateType, description: 'Filter berdasarkan tipe dokumen' })
  @IsOptional()
  @IsEnum(DocumentTemplateType)
  type?: DocumentTemplateType;

  @ApiPropertyOptional({ default: 1, description: 'Halaman' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ default: 20, description: 'Limit per halaman' })
  @IsOptional()
  @IsString()
  limit?: string;
}
