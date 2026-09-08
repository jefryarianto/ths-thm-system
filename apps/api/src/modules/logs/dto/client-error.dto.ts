import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsObject,
  MaxLength,
} from 'class-validator';

/**
 * Laporan error dari aplikasi klien (mobile) untuk monitoring terpusat.
 * DTO ketat: hanya field yang dideklarasikan yang diterima (ValidationPipe global
 * memakai whitelist + forbidNonWhitelisted), ukuran dibatasi untuk mencegah abuse.
 */
export class ClientErrorDto {
  @ApiProperty({ example: 'Cannot read property of undefined' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  timestamp?: string;

  @ApiPropertyOptional({ example: 'error' })
  @IsOptional()
  @IsIn(['debug', 'info', 'warn', 'error'])
  level?: string;

  @ApiPropertyOptional({ example: 'android' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  platform?: string;

  @ApiPropertyOptional({ example: 'GlobalErrorBoundary' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  module?: string;

  @ApiPropertyOptional({ example: 'component-catch' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  action?: string;

  @ApiPropertyOptional({ example: 'TypeError' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  errorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  stack?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;
}
