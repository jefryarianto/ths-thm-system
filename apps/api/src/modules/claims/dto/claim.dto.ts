import { IsString, IsOptional, IsInt, Min, IsEmail, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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

  @ApiPropertyOptional({ description: 'Bukti dokumen [{tipe: string, url: string}]' })
  @IsOptional()
  buktiDokumen?: Array<{ tipe: string; url: string }>;
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tipe?: string;
}

export class RejectClaimDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
