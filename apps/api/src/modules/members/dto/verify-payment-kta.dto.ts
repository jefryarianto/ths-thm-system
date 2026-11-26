import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class VerifyPaymentKtaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buktiPath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  catatan?: string;
}
