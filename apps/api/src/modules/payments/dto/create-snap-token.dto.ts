import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSnapTokenDto {
  @IsNotEmpty()
  @IsString()
  iuranId: string;
}