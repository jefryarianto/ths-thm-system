import { IsString, IsOptional, IsInt, Min, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateExaminerDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty()
  @IsString()
  namaLengkap: string;
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
