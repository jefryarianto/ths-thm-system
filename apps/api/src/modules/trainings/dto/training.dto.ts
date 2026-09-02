import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  IsNumber,
  IsDateString,
  IsArray,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateMateriDto {
  @ApiProperty()
  @IsString()
  @IsIn(['pencak_silat', 'organisasi', 'mental_spiritual', 'rekreasi'])
  kategori: string;

  @ApiProperty()
  @IsString()
  detail: string;
}

export class CreateTrainingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rantingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  kegiatanId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pelatihId?: string;

  @ApiProperty()
  @IsDateString()
  hariTanggal: string;

  @ApiProperty()
  @IsString()
  lokasi: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jenisMateri?: string; // Kept for backward compatibility if needed, or deprecate

  @ApiPropertyOptional({ type: [CreateMateriDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMateriDto)
  materi?: CreateMateriDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hasilLatihanGlobal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rekomendasiBerikutnya?: string;
}

export class UpdateTrainingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lokasi?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jenisMateri?: string;

  @ApiPropertyOptional({ type: [CreateMateriDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMateriDto)
  materi?: CreateMateriDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hasilLatihanGlobal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rekomendasiBerikutnya?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  hariTanggal?: string;
}

export class TrainingFilterDto {
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
  rantingId?: string;
}

export class RecordAttendanceDto {
  @ApiProperty()
  @IsString()
  anggotaId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  hadir?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  catatan?: string;
}

export class CreateEvaluationDto {
  @ApiProperty()
  @IsString()
  anggotaId: string;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  nilai: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  catatan?: string;
}

export class UpdateEvaluationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  nilai?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  catatan?: string;
}

export class ImportAttendanceDto {
  @ApiProperty({ type: [Object] })
  @IsArray()
  data: Array<{
    anggotaId?: string;
    memberId?: string;
    hadir?: boolean;
    catatan?: string;
  }>;
}
