import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateClaimDto {
  @ApiProperty()
  @IsString()
  anggotaId: string;

  @ApiProperty({ enum: ['sertifikat', 'piagam', 'kartu_anggota', 'dokumen_lainnya'] })
  @IsString()
  tipe: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  catatan?: string;
}

export class UpdateClaimDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  catatan?: string;

  @ApiPropertyOptional({
    description:
      'Versi data saat dibaca client (optimistic locking). Wajib dikirim bila ingin mencegah konflik update bersamaan.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number;
}

export class ClaimFilterDto {
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
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tipe?: string;
}

export class RejectClaimDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
