import { IsString, IsOptional, IsInt, Min, IsArray, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GenerateDocumentDto {
  @ApiProperty()
  @IsString()
  memberId: string;

  @ApiProperty({ enum: ['kartu_anggota', 'sertifikat_pendadaran', 'sertifikat_pelatihan', 'piagam_prestasi'] })
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
  @ApiProperty({ type: [String] })
  @IsArray()
  memberIds: string[];

  @ApiProperty({ enum: ['kartu_anggota', 'sertifikat_pendadaran', 'sertifikat_pelatihan', 'piagam_prestasi'] })
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
