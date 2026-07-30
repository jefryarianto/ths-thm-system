import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsBoolean, Min } from 'class-validator';

export class CreateTingkatanDto {
  @ApiProperty({ description: 'Kode tingkatan', example: 'YUNIOR' })
  @IsString()
  kodeTingkat: string;
  
  @ApiProperty({ description: 'Nama tingkatan', example: 'Anggota Yunior' })
  @IsString()
  namaTingkat: string;
  
  @ApiProperty({ description: 'Urutan kenaikan (semakin kecil semakin rendah)', example: 1 })
  @IsInt()
  @Min(0)
  urutan: number;
  
  @ApiProperty({ description: 'Warna sabuk', enum: ['putih', 'kuning', 'hijau', 'biru', 'merah', 'hitam', 'lainnya'] })
  @IsString()
  warnaSabuk: string;
  
  @ApiPropertyOptional({ description: 'Status aktif tingkatan', default: true })
  @IsBoolean()
  @IsOptional()
  statusAktif?: boolean;
}

export class UpdateTingkatanDto {
  @ApiPropertyOptional({ description: 'Kode tingkatan', example: 'YUNIOR' })
  @IsString()
  @IsOptional()
  kodeTingkat?: string;
  
  @ApiPropertyOptional({ description: 'Nama tingkatan', example: 'Anggota Yunior' })
  @IsString()
  @IsOptional()
  namaTingkat?: string;
  
  @ApiPropertyOptional({ description: 'Urutan kenaikan', example: 1 })
  @IsInt()
  @Min(0)
  @IsOptional()
  urutan?: number;
  
  @ApiPropertyOptional({ description: 'Warna sabuk', enum: ['putih', 'kuning', 'hijau', 'biru', 'merah', 'hitam', 'lainnya'] })
  @IsString()
  @IsOptional()
  warnaSabuk?: string;
  
  @ApiPropertyOptional({ description: 'Status aktif tingkatan', default: true })
  @IsBoolean()
  @IsOptional()
  statusAktif?: boolean;
}

export class TingkatanDto {
  @ApiProperty({ description: 'ID tingkatan' })
  id: string;
  
  @ApiProperty({ description: 'Kode tingkatan' })
  kodeTingkat: string;
  
  @ApiProperty({ description: 'Nama tingkatan' })
  namaTingkat: string;
  
  @ApiProperty({ description: 'Urutan kenaikan' })
  urutan: number;
  
  @ApiProperty({ description: 'Warna sabuk' })
  warnaSabuk: string;
  
  @ApiProperty({ description: 'Status aktif tingkatan' })
  statusAktif: boolean;
  
  @ApiProperty({ description: 'Tanggal dibuat' })
  createdAt: Date;
  
  @ApiProperty({ description: 'Tanggal terakhir diupdate' })
  updatedAt: Date;
}
