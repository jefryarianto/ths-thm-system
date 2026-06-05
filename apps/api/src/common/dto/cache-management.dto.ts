import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class InvalidateCacheDto {
  @ApiPropertyOptional({
    description: 'Cache prefix to invalidate (e.g. "members:", "activities:", "reports:"). Omit to clear all cache.',
    example: 'members:',
  })
  @IsOptional()
  @IsString()
  prefix?: string;
}
