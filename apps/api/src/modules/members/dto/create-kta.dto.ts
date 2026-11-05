import { IsEnum } from "class-validator";
import { IsUUID, IsString, IsOptional, IsEmail, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateKtaDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCompliant?: boolean;
}