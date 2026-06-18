import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateDistrikDto {
  @IsString()
  kodeDistrik: string;

  @IsString()
  nama: string;

  @IsOptional()
  @IsString()
  alamat?: string;

  @IsOptional()
  @IsUUID()
  nasionalId?: string;
}

export class UpdateDistrikDto {
  @IsOptional()
  @IsString()
  kodeDistrik?: string;

  @IsOptional()
  @IsString()
  nama?: string;

  @IsOptional()
  @IsString()
  alamat?: string;
}

export class CreateWilayahDto {
  @IsString()
  kodeWilayah: string;

  @IsString()
  nama: string;

  @IsUUID()
  distrikId: string;
}

export class UpdateWilayahDto {
  @IsOptional()
  @IsString()
  kodeWilayah?: string;

  @IsOptional()
  @IsString()
  nama?: string;
}

export class CreateRantingDto {
  @IsString()
  kodeRanting: string;

  @IsString()
  nama: string;

  @IsOptional()
  @IsString()
  lokasiLatihan?: string;

  @IsUUID()
  wilayahId: string;
}

export class UpdateRantingDto {
  @IsOptional()
  @IsString()
  kodeRanting?: string;

  @IsOptional()
  @IsString()
  nama?: string;

  @IsOptional()
  @IsString()
  lokasiLatihan?: string;
}
