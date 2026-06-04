import { IsString, IsOptional, IsInt, Min, IsNumber, IsDateString, IsArray, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateDueDto {
  @ApiProperty()
  @IsString()
  anggotaId: string;

  @ApiProperty()
  @IsString()
  periode: string;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  jumlah: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  tanggalBayar?: string;

  @ApiPropertyOptional({ enum: ['manual', 'transfer', 'online'] })
  @IsOptional()
  @IsString()
  metodeBayar?: string;

  @ApiPropertyOptional({ enum: ['belum_dibayar', 'menunggu_verifikasi', 'lunas', 'menunggak'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buktiBayarPath?: string;
}

export class UpdateDueDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  periode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  jumlah?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  tanggalBayar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metodeBayar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buktiBayarPath?: string;
}

export class DueFilterDto {
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
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  periode?: string;
}

export class BatchPaymentDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  memberIds: string[];

  @ApiProperty()
  @IsString()
  periode: string;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  jumlah: number;
}
