import { IsString, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportAnggotaHistorisDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  no?: number;

  @ApiProperty()
  @IsString()
  nama: string;

  @ApiProperty()
  @IsString()
  nia: string;

  @ApiProperty()
  @IsString()
  ttl: string; // Tempat, Tanggal Bulan Tahun

  @ApiProperty()
  @IsString()
  dadar: string; // Ranting - Tahun

  @ApiProperty()
  @IsString()
  ranting: string; // Nama Ranting Lengkap (e.g., "Santo Arnoldus Jansen - Waikomo")

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  foto?: string;

  @ApiProperty()
  @IsString()
  tingkatan: string; // Nama tingkatan (e.g., "Muda", "Pratama")
}

export class BulkImportAnggotaDto {
  @ApiProperty({ type: [ImportAnggotaHistorisDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportAnggotaHistorisDto)
  data: ImportAnggotaHistorisDto[];
}
