import { IsString, IsOptional, IsEnum, IsEmail, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MemberSchema } from '@ths-thm/shared-types';
import { z } from 'zod';

export const CreateMemberSchema = MemberSchema.omit({
  id: true,
  statusData: true,
  statusValidasi: true,
  missingFields: true,
  createdAt: true,
  updatedAt: true,
  nomorAnggota: true, // Assuming this is generated on server
});

export class CreateMemberDto {
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
  tempatDadar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tahunDadar?: string;

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
  rantingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tingkat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fotoPath?: string;
}

export class UpdateMemberDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  namaLengkap?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['L', 'P'])
  jenisKelamin?: 'L' | 'P';

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
  tempatDadar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tahunDadar?: string;

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
  tingkat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rantingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fotoPath?: string;

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

export class MemberFilterDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rantingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  distrikId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wilayahId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statusKeanggotaan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statusValidasi?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statusData?: string;

  @ApiPropertyOptional({ description: 'Filter anggota tanpa foto (tanpaFoto=true)' })
  @IsOptional()
  @IsString()
  tanpaFoto?: string;
}
