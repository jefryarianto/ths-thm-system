import { IsString, IsOptional, IsEnum, IsEmail, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCandidateDto {
  @ApiProperty()
  @IsString()
  namaLengkap: string;

  @ApiProperty({ enum: ['L', 'P'] })
  @IsEnum(['L', 'P'])
  jenisKelamin: 'L' | 'P';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tempatLahir?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tanggalLahir?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alamat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  noHp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty()
  @IsString()
  rantingId: string;

  @ApiProperty()
  @IsString()
  usulOlehId: string;
}

export class UpdateCandidateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  namaLengkap?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['L', 'P'])
  jenisKelamin?: 'L' | 'P';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tempatLahir?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tanggalLahir?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alamat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  noHp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class CandidateFilterDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rantingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}