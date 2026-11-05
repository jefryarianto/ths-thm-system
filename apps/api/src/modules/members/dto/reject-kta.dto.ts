import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectKtaDto {
  @ApiProperty()
  @IsString()
  reason: string;
}
