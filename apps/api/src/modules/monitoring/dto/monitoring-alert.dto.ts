import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, Min, Max } from 'class-validator';

export class CreateMonitoringAlertDto {
  @IsString()
  name!: string;

  @IsString()
  metric!: string;

  @IsString()
  operator!: string;

  @IsNumber()
  threshold!: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  duration?: number;

  @IsArray()
  @IsString({ each: true })
  channels!: string[];

  @IsString()
  @IsOptional()
  telegramBotToken?: string;

  @IsString()
  @IsOptional()
  telegramChatId?: string;

  @IsString()
  @IsOptional()
  emailRecipients?: string;

  @IsNumber()
  @IsOptional()
  @Min(60)
  cooldown?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateMonitoringAlertDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  metric?: string;

  @IsString()
  @IsOptional()
  operator?: string;

  @IsNumber()
  @IsOptional()
  threshold?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  duration?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  channels?: string[];

  @IsString()
  @IsOptional()
  telegramBotToken?: string;

  @IsString()
  @IsOptional()
  telegramChatId?: string;

  @IsString()
  @IsOptional()
  emailRecipients?: string;

  @IsNumber()
  @IsOptional()
  @Min(60)
  cooldown?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
