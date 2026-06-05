import { IsString, IsOptional, IsInt, Min, IsDateString, IsArray, ValidateNested, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateGraduationDto {
  @ApiProperty()
  @IsString()
  nama: string;

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
}

export class GraduationFilterDto {
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
}

export class RegisterParticipantDto {
  @ApiProperty()
  @IsString()
  candidateId: string;
}

export class ImportParticipantsDto {
  @ApiProperty({ type: [Object] })
  @IsArray()
  data: Array<{
    candidateId?: string;
    id?: string;
  }>;
}

export class GraduateResultDto {
  @ApiProperty()
  @IsString()
  candidateId: string;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  totalSkor: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  ranking?: number;

  @ApiProperty()
  @IsBoolean()
  lulus: boolean;
}

export class GraduateDto {
  @ApiProperty({ type: [GraduateResultDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GraduateResultDto)
  results: GraduateResultDto[];
}
