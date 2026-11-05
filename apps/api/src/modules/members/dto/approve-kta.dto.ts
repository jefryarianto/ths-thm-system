import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveKtaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  catatan?: string;
}
