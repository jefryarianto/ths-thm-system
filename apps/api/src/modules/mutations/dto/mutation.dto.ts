import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateMutationDto {
  @ApiProperty({ description: 'ID anggota yang dimutasi' })
  @IsUUID()
  @IsNotEmpty()
  anggotaId: string;

  @ApiProperty({ description: 'ID ranting tujuan' })
  @IsUUID()
  @IsNotEmpty()
  toRantingId: string;

  @ApiPropertyOptional({ description: 'Alasan mutasi' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class MutationActionDto {
  @ApiPropertyOptional({ description: 'Catatan persetujuan/penolakan' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}