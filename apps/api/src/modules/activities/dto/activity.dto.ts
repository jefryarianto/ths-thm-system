import { IsString, IsOptional, IsInt, Min, IsDateString, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateActivityDto {
  @ApiProperty()
  @IsString()
  nama: string;

  @ApiPropertyOptional({ enum: ['latihan', 'pendadaran', 'ujian_tingkat', 'rapat', 'retret', 'pelantikan', 'lainnya'] })
  @IsOptional()
  @IsString()
  tipe?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lokasi?: string;

  @ApiProperty()
  @IsDateString()
  tanggalMulai: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  tanggalSelesai?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scopeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scopeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdById?: string;
}

export class UpdateActivityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nama?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lokasi?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  tanggalMulai?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  tanggalSelesai?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class ActivityFilterDto {
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
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scopeType?: string;
}

export class AddParticipantDto {
  @ApiProperty()
  @IsString()
  anggotaId: string;
}

export class RecordPresenceDto {
  @ApiProperty()
  @IsString()
  anggotaId: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  hadir?: boolean;
}

export class UploadActivityDocumentDto {
  @ApiProperty()
  @IsString()
  nama: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  filePath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tipe?: string;
}
