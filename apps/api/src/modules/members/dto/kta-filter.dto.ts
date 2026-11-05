import { Type } from 'class-transformer';
import { IsOptional, IsEnum, IsString, IsInt, Min, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { KtaAppStatus } from '@prisma/client';

export class KtaAppFilterDto {
  @ApiPropertyOptional({ enum: KtaAppStatus })
  @IsOptional()
  @IsEnum(KtaAppStatus)
  status?: KtaAppStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  anggotaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  batchId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
