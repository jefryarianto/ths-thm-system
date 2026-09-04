import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateGraduationDto {
  @ApiProperty()
  @IsString()
  nama: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lokasi?: string;

  @ApiProperty()
  @IsDateString()
  tanggalMulai: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  tanggalSelesai?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scopeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scopeId?: string;

  @ApiPropertyOptional({ description: 'User ID yang ditunjuk sebagai admin kegiatan' })
  @IsOptional()
  @IsString()
  adminKegiatanId?: string;
}

export class GraduationFilterDto {
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
  tipe?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class RegisterParticipantDto {
  @ApiProperty()
  @IsString()
  candidateId: string;
}

/**
 * Tambah peserta manual: calon anggota BARU dibuat langsung dari konteks
 * pendadaran (tanpa harus lewat modul Candidates), lalu otomatis menjadi peserta.
 */
export class CreateParticipantDto {
  @ApiProperty()
  @IsString()
  namaLengkap: string;

  @ApiProperty()
  @IsString()
  rantingId: string;

  @ApiPropertyOptional({ enum: ['L', 'P'] })
  @IsOptional()
  @IsString()
  jenisKelamin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  noHp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alamat?: string;
}

/**
 * Import peserta pendadaran — dua pola baris:
 * - `candidateId`/`id` terisi → tautkan calon yang SUDAH terdaftar di sistem.
 * - Data lengkap (nama_lengkap + ranting_id, ...) → buat calon BARU hasil
 *   parse file Excel/CSV di sisi klien, dengan dedupe email/nama.
 */
export class ImportParticipantsDto {
  @ApiProperty({ type: [Object] })
  @IsArray()
  data: Array<{
    candidateId?: string;
    id?: string;
    nama_lengkap?: string;
    nama?: string;
    name?: string;
    ranting_id?: string;
    rantingId?: string;
    jenis_kelamin?: string;
    no_hp?: string;
    email?: string;
  }>;
}

export class GraduateResultDto {
  @ApiProperty()
  @IsString()
  candidateId: string;

  @ApiPropertyOptional({
    description: 'Jika diisi, dipakai; jika omit, dihitung otomatis dari NilaiPendadaran.',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalSkor?: number;

  @ApiPropertyOptional({
    description: 'Jika omit, dihitung otomatis berdasarkan skor (ranking tertinggi = 1).',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  ranking?: number;

  @ApiProperty()
  @IsBoolean()
  lulus: boolean;
}

/** Satu entri aksi validasi hasil pendadaran (untuk bulk). */
export class SingleValidateResultDto {
  @ApiProperty({ description: 'ID CalonAnggota yang hasilnya divalidasi' })
  @IsString()
  candidateId: string;

  @ApiProperty({ description: 'Setujui (true) atau tolak (false) hasil ini' })
  @IsBoolean()
  approved: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  catatan?: string;
}

/** Dto untuk validasi hasil pendadaran oleh admin (Approve/Reject). */
export class ValidateResultDto {
  @ApiProperty({
    description: 'Validasi satu peserta: isi candidateId + approved. Atau pakai `results` untuk bulk.',
  })
  @IsOptional()
  @IsString()
  candidateId?: string;

  @ApiPropertyOptional({
    description: 'Bulk: daftar aksi validasi hasil pendadaran.',
    type: [SingleValidateResultDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SingleValidateResultDto)
  @IsOptional()
  results?: SingleValidateResultDto[];

  @ApiProperty({ description: 'Setujui (true) atau tolak (false) hasil ini' })
  @IsBoolean()
  approved: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  catatan?: string;
}

/** Body opsional untuk generate-docs — jika kosong, generate untuk semua lulus+approved. */
export class GenerateDocsDto {
  @ApiPropertyOptional({
    description: 'Hanya generate dokumen untuk calon ID tertentu (opsional).',
  })
  @IsOptional()
  @IsString()
  candidateId?: string;
}

export class UpdateGraduationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nama?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lokasi?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  tanggalMulai?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  tanggalSelesai?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description:
      'User ID atau Anggota ID yang ditunjuk sebagai admin kegiatan. Bila diisi Anggota ID, akun login dibuat/diaktifkan otomatis. Kirim null/kosong untuk melepas penugasan.',
  })
  @IsOptional()
  @IsString()
  adminKegiatanId?: string | null;
}

export class GraduateDto {
  @ApiProperty({ type: [GraduateResultDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GraduateResultDto)
  results: GraduateResultDto[];
}
