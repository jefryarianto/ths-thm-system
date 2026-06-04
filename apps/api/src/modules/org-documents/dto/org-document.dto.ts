import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateOrgDocumentDto {
  @ApiProperty()
  @IsString()
  kategoriId: string;

  @ApiProperty()
  @IsString()
  judul: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deskripsi?: string;

  @ApiProperty()
  @IsString()
  filePath: string;

  @ApiProperty()
  @IsString()
  uploadedById: string;
}

export class UpdateOrgDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  judul?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deskripsi?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  filePath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  kategoriId?: string;
}

export class OrgDocumentFilterDto {
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
  kategoriId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  nama: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deskripsi?: string;
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
}
