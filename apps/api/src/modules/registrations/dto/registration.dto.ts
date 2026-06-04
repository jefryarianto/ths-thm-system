import { IsString, IsOptional, IsInt, Min, IsEmail, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateRegistrationDto {
  @ApiProperty()
  @IsString()
  namaLengkap: string;

  @ApiProperty({ enum: ['L', 'P'] })
  @IsString()
  jenisKelamin: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sumberInfo?: string;
}

export class UpdateRegistrationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  namaLengkap?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jenisKelamin?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sumberInfo?: string;
}

export class RegistrationFilterDto {
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
}

export class RejectRegistrationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
