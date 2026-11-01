import { IsString, IsOptional, IsBoolean, IsNumber, Min, IsNotEmpty, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateThreadDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  judul: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  konten: string;

  @ApiPropertyOptional({ type: [String], description: 'Daftar URL gambar lampiran' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class CreatePostDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  konten: string;

  @ApiPropertyOptional({
    description:
      'ID post induk untuk membalas komentar tertentu (reply bersarang). Kosongkan untuk post biasa.',
  })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Daftar URL gambar lampiran' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class UpdateThreadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  judul?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  konten?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class UpdatePostDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  konten?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class ReactDto {
  @ApiProperty({ description: 'Emoji reaksi, mis. 👍, ❤️, 😂, 😮, 😢, 🙏' })
  @IsString()
  @IsNotEmpty()
  emoji: string;
}

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nama: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deskripsi?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nama?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deskripsi?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}

export class ThreadFilterDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorId?: string;
}

export class ThreadReactionResponseDto {
  @ApiProperty({ description: 'Jumlah reaksi per emoji' })
  @IsObject()
  reactions: Record<string, number>;

  @ApiProperty({ description: 'Emoji yang dipilih user saat ini', nullable: true })
  @IsOptional()
  @IsString()
  currentUserEmoji?: string | null;
}

export class PostReactionResponseDto {
  @ApiProperty({ description: 'Jumlah reaksi per emoji' })
  @IsObject()
  reactions: Record<string, number>;

  @ApiProperty({ description: 'Emoji yang dipilih user saat ini', nullable: true })
  @IsOptional()
  @IsString()
  currentUserEmoji?: string | null;
}
