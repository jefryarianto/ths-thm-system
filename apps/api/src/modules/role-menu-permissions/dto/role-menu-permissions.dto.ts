import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsString,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ROLE_VALUES } from '@ths-thm/shared-types';

/**
 * Validator khusus untuk record `menuKey → boolean`.
 *
 * class-validator tidak punya aturan bawaan untuk objek berindeks, dan
 * `@IsObject()` saja akan menerima `{ members: "yes" }` — nilai non-boolean
 * itu baru melempar error Prisma saat upsert, bukan 400 di perbatasan API.
 */
@ValidatorConstraint({ name: 'isBooleanRecord', async: false })
class IsBooleanRecordConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    return Object.entries(value as Record<string, unknown>).every(
      ([key, v]) => key.trim().length > 0 && typeof v === 'boolean',
    );
  }

  defaultMessage(): string {
    return 'permissions harus berupa objek { menuKey: boolean }';
  }
}

/** PUT /role-menu-permissions — simpan satu sel matriks. */
export class UpdatePermissionDto {
  @ApiProperty({ enum: ROLE_VALUES, example: 'admin_ranting' })
  @IsIn(ROLE_VALUES)
  role!: string;

  @ApiProperty({ example: 'members' })
  @IsString()
  @IsNotEmpty()
  menuKey!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isEnabled!: boolean;
}

/** PUT /role-menu-permissions/bulk/:role — simpan banyak sel untuk satu role. */
export class BulkUpdateDto {
  @ApiProperty({
    description: 'Objek menuKey → isEnabled yang disimpan untuk role ini',
    example: { members: true, reports: false },
    type: 'object',
    additionalProperties: { type: 'boolean' },
  })
  @IsObject()
  @Validate(IsBooleanRecordConstraint)
  permissions!: Record<string, boolean>;
}
