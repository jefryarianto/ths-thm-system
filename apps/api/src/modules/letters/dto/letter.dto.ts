import { IsString, IsOptional, IsInt, Min, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class LetterFilterDto {
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
}

// ─── Surat Masuk ───

export class CreateIncomingLetterDto {
  @ApiProperty()
  @IsString()
  nomorSurat: string;

  @ApiProperty()
  @IsDateString()
  tanggalSurat: string;

  @ApiProperty()
  @IsDateString()
  tanggalTerima: string;

  @ApiProperty()
  @IsString()
  pengirim: string;

  @ApiProperty()
  @IsString()
  perihal: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileScanPath?: string;
}

export class UpdateIncomingLetterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nomorSurat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  tanggalSurat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pengirim?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  perihal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileScanPath?: string;
}

// ─── Surat Keluar ───

export class CreateOutgoingLetterDto {
  @ApiProperty()
  @IsString()
  nomorSurat: string;

  @ApiProperty()
  @IsDateString()
  tanggalSurat: string;

  @ApiProperty()
  @IsString()
  tujuan: string;

  @ApiProperty()
  @IsString()
  perihal: string;

  @ApiProperty()
  @IsString()
  isi: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  filePath?: string;
}

export class UpdateOutgoingLetterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nomorSurat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  tanggalSurat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tujuan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  perihal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  isi?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

// ─── Disposisi ───

export class CreateDispositionDto {
  @ApiProperty()
  @IsString()
  dariUserId: string;

  @ApiProperty()
  @IsString()
  kepadaUserId: string;

  @ApiProperty()
  @IsString()
  isi: string;
}
