import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsNotEmpty()
  @IsString()
  iuranId: string; // ID of the iuran record to be paid

  @IsNotEmpty()
  @IsNumber()
  amount: number; // amount in smallest currency unit (e.g., cents)

  @IsNotEmpty()
  @IsString()
  currency: string = 'idr'; // default currency IDR
}
