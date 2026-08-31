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

  /** Cakupan distrik (NULL/absen = global). Non-superadmin dipaksa ke distriknya. */
  @IsOptional()
  @IsString()
  distrikId?: string | null;
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

  @IsOptional()
  @IsString()
  distrikId?: string | null;
}

/** Informasi scope pemanggil untuk penegakan hak akses per-distrik di service. */
export interface DistrikScopeInfo {
  role?: string;
  distrikId?: string;
}
