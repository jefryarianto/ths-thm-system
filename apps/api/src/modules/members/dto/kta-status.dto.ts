import { ApiProperty } from '@nestjs/swagger';
import { KtaAppStatus } from '@prisma/client';

export class KtaStatusDto {
  @ApiProperty()
  hasApplication: boolean;

  @ApiProperty({ enum: KtaAppStatus, nullable: true })
  status: KtaAppStatus | null;

  @ApiProperty({ required: false, nullable: true })
  nomorAnggota?: string | null;

  @ApiProperty({ required: false, nullable: true })
  diterbitkanAt?: Date | null;

  @ApiProperty({ required: false, nullable: true })
  appliedAt?: Date | null;
}
