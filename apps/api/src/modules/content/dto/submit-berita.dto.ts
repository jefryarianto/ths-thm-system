import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitBeritaDto {
  @ApiProperty({ description: 'Judul berita' })
  @IsString()
  @IsNotEmpty()
  judul: string;

  @ApiProperty({ description: 'Ringkasan singkat berita' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  ringkasan: string;

  @ApiProperty({ description: 'Isi/konten berita' })
  @IsString()
  @IsNotEmpty()
  konten: string;

  @ApiPropertyOptional({ description: 'Path gambar sampul (opsional)' })
  @IsOptional()
  @IsString()
  gambar?: string;

  @ApiProperty({ description: 'Slug URL unik untuk berita' })
  @IsString()
  @IsNotEmpty()
  slug: string;
}
