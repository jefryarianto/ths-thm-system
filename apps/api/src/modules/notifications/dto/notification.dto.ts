import { IsString, IsOptional, IsInt, Min, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SendNotificationDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  judul: string;

  @ApiProperty()
  @IsString()
  isi: string;

  @ApiPropertyOptional({ enum: ['welcome', 'data_incomplete', 'reminder_latihan', 'reminder_pendadaran', 'reminder_iuran', 'status_klaim', 'dokumen_ready', 'umum'] })
  @IsOptional()
  @IsString()
  tipe?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export class BroadcastNotificationDto {
  @ApiProperty()
  @IsString()
  judul: string;

  @ApiProperty()
  @IsString()
  isi: string;

  @ApiPropertyOptional({ enum: ['welcome', 'data_incomplete', 'reminder_latihan', 'reminder_pendadaran', 'reminder_iuran', 'status_klaim', 'dokumen_ready', 'umum'] })
  @IsOptional()
  @IsString()
  tipe?: string;
}

export class SendToRoleDto {
  @ApiProperty({ enum: ['superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', 'anggota'] })
  @IsString()
  role: string;

  @ApiProperty()
  @IsString()
  judul: string;

  @ApiProperty()
  @IsString()
  isi: string;

  @ApiPropertyOptional({ enum: ['welcome', 'data_incomplete', 'reminder_latihan', 'reminder_pendadaran', 'reminder_iuran', 'status_klaim', 'dokumen_ready', 'umum'] })
  @IsOptional()
  @IsString()
  tipe?: string;
}

export class NotificationFilterDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tipe?: string;
}

export class RegisterDeviceTokenDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty()
  @IsString()
  platform: string;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ example: { welcome: true, data_incomplete: true, reminder_latihan: false } })
  @IsObject()
  preferences!: Record<string, boolean>;
}
