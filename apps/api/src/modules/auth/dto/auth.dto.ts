import { IsEmail, IsString, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Kebijakan password: min 8 karakter, wajib kombinasi huruf & angka.
 */
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const PASSWORD_MESSAGE = 'Password minimal 8 karakter dan harus mengandung huruf serta angka';

export class LoginDto {
  @ApiProperty({ example: 'admin@ths-thm.org atau 081234567890' })
  @IsString()
  identifier: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password: string;

  @ApiPropertyOptional({
    description: 'Kode TOTP 6 digit — wajib bila user sudah mengaktifkan 2FA',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Kode 2FA harus 6 digit angka' })
  totpCode?: string;
}

export class TotpCodeDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Kode 2FA harus 6 digit angka' })
  code: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'admin@ths-thm.org' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  password: string;

  @ApiProperty({ example: 'Ahmad Fauzi' })
  @IsString()
  namaLengkap: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  rantingId?: string;
}

export class RefreshDto {
  // Opsional: mobile mengirim refreshToken via body, web via httpOnly cookie.
  // Body kosong TIDAK boleh ditolak validasi (whitelist+forbidNonWhitelisted),
  // jika tidak path refresh cookie di controller tidak pernah tercapai.
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty()
  @IsString()
  @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  newPassword: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  namaLengkap?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  noHp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alamat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tempatLahir?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tanggalLahir?: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  newPassword: string;
}

export class ForceChangePasswordDto {
  @ApiProperty({ description: 'Token sementara dari response login (mustChangePassword)' })
  @IsString()
  token: string;

  @ApiProperty()
  @IsString()
  @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  newPassword: string;
}

export class MagicLinkDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}

export class MagicLinkVerifyDto {
  @ApiProperty()
  @IsString()
  token: string;
}

/**
 * Response DTO for GET /auth/scope.
 * Contains the user's effective scope (district/region/branch) and human-readable names.
 */
export class AuthScopeResponseDto {
  @ApiProperty({ description: 'User role', example: 'admin_distrik' })
  @IsString()
  role: string;

  @ApiPropertyOptional({ description: 'District ID (if scoped)', example: 'distrik-1', nullable: true })
  @IsOptional()
  @IsString()
  distrikId: string | null;

  @ApiPropertyOptional({ description: 'District name (for display)', example: 'Distrik A', nullable: true })
  @IsOptional()
  @IsString()
  distrikNama: string | null;

  @ApiPropertyOptional({ description: 'Region ID (if scoped)', example: 'wilayah-1', nullable: true })
  @IsOptional()
  @IsString()
  wilayahId: string | null;

  @ApiPropertyOptional({ description: 'Region name (for display)', example: 'Wilayah Utara', nullable: true })
  @IsOptional()
  @IsString()
  wilayahNama: string | null;

  @ApiPropertyOptional({ description: 'Branch ID (if scoped)', example: 'ranting-1', nullable: true })
  @IsOptional()
  @IsString()
  rantingId: string | null;

  @ApiPropertyOptional({ description: 'Branch name (for display)', example: 'Ranting Utama', nullable: true })
  @IsOptional()
  @IsString()
  rantingNama: string | null;
}
