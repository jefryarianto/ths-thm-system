import { IsString, IsOptional, IsInt, Min, IsEmail, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateExaminerDto {
  @ApiPropertyOptional({ description: 'Email anggota (dipakai sebagai akun login penguji)' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty()
  @IsString()
  namaLengkap: string;

  @ApiPropertyOptional({ description: 'Diabaikan di sini — peran ditentukan saat penugasan pada pendadaran' })
  @IsOptional()
  @IsString()
  peran?: string;

  @ApiPropertyOptional({ description: 'Diabaikan di sini — catatan diisi saat penugasan pada pendadaran' })
  @IsOptional()
  @IsString()
  catatan?: string;
}

export class UpdateExaminerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  namaLengkap?: string;

  @ApiPropertyOptional({ description: 'Status aktif penguji (false = nonaktif)' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ExaminerFilterDto {
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

  @ApiPropertyOptional({ description: 'Sertakan penguji nonaktif (true = tampilkan semua)' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeInactive?: boolean;
}

export class AssignExaminerDto {
  @ApiProperty()
  @IsString()
  kegiatanId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  graduationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  peran?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  catatan?: string;
}
