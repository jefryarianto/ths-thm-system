import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TestMailDto {
  @ApiProperty({ example: 'admin@ths-thm.org', description: 'Email tujuan test' })
  @IsEmail()
  email: string;
}
