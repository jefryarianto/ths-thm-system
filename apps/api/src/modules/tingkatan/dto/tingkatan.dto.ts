import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateTingkatanDto {
  @IsString()
  @IsNotEmpty()
  nama: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  stripCount?: number;

  @IsOptional()
  @IsString()
  stripWarna?: string;

  @IsOptional()
  @IsInt()
  urutan?: number;
}

export class UpdateTingkatanDto {
  @IsOptional()
  @IsString()
  nama?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  stripCount?: number;

  @IsOptional()
  @IsString()
  stripWarna?: string;

  @IsOptional()
  @IsInt()
  urutan?: number;
}
