import { IsString, IsOptional, IsInt, Min, IsDateString, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateSettingsDto {
  @ApiProperty({ example: { organization: { name: 'THS-THM' } } })
  @IsObject()
  settings!: Record<string, unknown>;
}

export class CreatePeriodDto {
  @ApiProperty()
  @IsString()
  nama: string;

  @ApiProperty()
  @IsDateString()
  tglMulai: string;

  @ApiProperty()
  @IsDateString()
  tglSelesai: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePeriodDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nama?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  tglMulai?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  tglSelesai?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateSignatureDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  nama: string;

  @ApiProperty()
  @IsString()
  jabatan: string;

  @ApiProperty()
  @IsString()
  imagePath: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateStampDto {
  @ApiProperty()
  @IsString()
  nama: string;

  @ApiProperty()
  @IsString()
  imagePath: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
