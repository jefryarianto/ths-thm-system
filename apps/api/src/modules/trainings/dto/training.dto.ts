import { IsString, IsOptional, IsBoolean, IsInt, Min, IsNumber, IsDateString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateTrainingDto {
  @ApiProperty()
  @IsString()
  rantingId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  kegiatanId?: string;

  @ApiProperty()
  @IsString()
  pelatihId: string;

  @ApiProperty()
  @IsDateString()
  hariTanggal: string;

  @ApiProperty()
  @IsString()
  lokasi: string;

  @ApiProperty()
  @IsString()
  jenisMateri: string;

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
