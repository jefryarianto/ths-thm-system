import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ description: 'Human-readable description for this API key', example: 'Mobile app integration' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Role to assign when this key is used', enum: ['superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', 'anggota'] })
  @IsString()
  @IsIn(['superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', 'anggota'])
  role: string;

  @ApiPropertyOptional({ description: 'Scope overrides for the key' })
  @IsOptional()
  scope?: {
    rantingId?: string;
    wilayahId?: string;
    distrikId?: string;
  };
}

export class RevokeApiKeyDto {
  @ApiProperty({ description: 'The full API key to revoke' })
  @IsString()
  key: string;
}
