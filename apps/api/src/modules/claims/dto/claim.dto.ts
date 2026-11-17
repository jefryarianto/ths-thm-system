import { IsString, IsOptional, IsInt, Min, IsEmail, IsIn, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { StatusKlaim, TipeKlaim } from '@prisma/client';

export class BuktiFileDto {
  @ApiProperty({ enum: ['sertifikat', 'kartu_anggota'], description: 'Tipe bukti' })
  @IsString()
  @IsIn(['sertifikat', 'kartu_anggota'])
  tipe: 'sertifikat' | 'kartu_anggota';

  @ApiProperty({ description: 'Path file di storage' })
  @IsString()
  filePath: string;

  @ApiProperty({ description: 'Nama file asli' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: 'MIME type' })
  @IsString()
  mimeType: string;

  @ApiProperty({ description: 'Ukuran file (bytes)' })
  @IsInt()
  size: number;
}

export class DokumenPendukungDto {
  @ApiProperty({ description: 'Path file di storage' })
  @IsString()
  filePath: string;

  @ApiProperty({ description: 'Nama file asli' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: 'MIME type' })
  @IsString()
  mimeType: string;

  @ApiProperty({ description: 'Ukuran file (bytes)' })
  @IsInt()
  size: number;

  @ApiPropertyOptional({ description: 'Deskripsi dokumen' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateClaimDto {
  @ApiPropertyOptional({ description: 'ID anggota (opsional, ada jika klaim dokumen)' })
  @IsOptional()
  @IsString()
  anggotaId?: string;

  @ApiProperty({ enum: ['keanggotaan', 'dokumen'], description: 'Tipe klaim' })
  @IsString()
  @IsIn(['keanggotaan', 'dokumen'])
  tipe: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  catatan?: string;

  // ── Data diri pelapor (untuk klaim keanggotaan baru) ──

  @ApiPropertyOptional({ description: 'Nama lengkap pelapor' })
  @IsOptional()
  @IsString()
  namaLengkap?: string;

  @ApiPropertyOptional({ enum: ['L', 'P'], description: 'Jenis kelamin' })
  @IsOptional()
  @IsString()
  @IsIn(['L', 'P'])
  jenisKelamin?: string;

  @ApiPropertyOptional({ description: 'Tempat lahir' })
  @IsOptional()
  @IsString()
  tempatLahir?: string;

  @ApiPropertyOptional({ description: 'Tanggal lahir (ISO string)' })
  @IsOptional()
  @IsString()
  tanggalLahir?: string;

  @ApiPropertyOptional({ description: 'Tempat pendadaran (dadar)' })
  @IsOptional()
  @IsString()
  tempatDadar?: string;

  @ApiPropertyOptional({ description: 'Tahun pendadaran (dadar)' })
  @IsOptional()
  @IsString()
  tahunDadar?: string;

  @ApiPropertyOptional({ description: 'Alamat lengkap' })
  @IsOptional()
  @IsString()
  alamat?: string;

  @ApiPropertyOptional({ description: 'Nomor HP' })
  @IsOptional()
  @IsString()
  noHp?: string;

  @ApiPropertyOptional({ description: 'Email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'ID ranting asal keanggotaan' })
  @IsOptional()
  @IsString()
  rantingId?: string;

  // File upload fields (handled via multipart/form-data)
  @ApiPropertyOptional({ 
    description: 'Bukti keanggotaan (max 3 files, image/PDF, 5MB each)',
    type: 'array',
    items: { type: 'string', format: 'binary' }
  })
  @IsOptional()
  buktiFiles?: Express.Multer.File[];

  @ApiPropertyOptional({ 
    description: 'Dokumen pendukung lain (max 3 files, image/PDF, 5MB each)',
    type: 'array',
    items: { type: 'string', format: 'binary' }
  })
  @IsOptional()
  dokumenPendukungFiles?: Express.Multer.File[];
}

export class UpdateClaimDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  catatan?: string;

  @ApiPropertyOptional({
    description:
      'Versi data saat dibaca client (optimistic locking). Wajib dikirim bila ingin mencegah konflik update bersamaan.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number;
}

export class ClaimFilterDto {
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

  @ApiPropertyOptional({ enum: Object.values(StatusKlaim) })
  @IsOptional()
  @IsEnum(StatusKlaim)
  status?: StatusKlaim;

  @ApiPropertyOptional({ enum: Object.values(TipeKlaim) })
  @IsOptional()
  @IsEnum(TipeKlaim)
  tipe?: TipeKlaim;
}

export class RejectClaimDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
