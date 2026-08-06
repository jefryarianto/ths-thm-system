import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreatePenandatanganDto {
  @IsString()
  @IsNotEmpty()
  nama: string;

  @IsString()
  @IsNotEmpty()
  jabatan: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePenandatanganDto {
  @IsOptional()
  @IsString()
  nama?: string;

  @IsOptional()
  @IsString()
  jabatan?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
