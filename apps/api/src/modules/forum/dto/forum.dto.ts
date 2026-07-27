import { IsString, IsOptional, IsBoolean, IsNumber, Min, IsNotEmpty } from 'class-validator';
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
}

export class CreatePostDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  konten: string;
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
}

export class UpdatePostDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  konten?: string;
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
