import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

import { BulkUpdateDto, UpdatePermissionDto } from './role-menu-permissions.dto';

/**
 * Mirror ValidationPipe global (lihat config/bootstrap-config.ts):
 * whitelist + forbidNonWhitelisted + transform/enableImplicitConversion.
 *
 * Dulu kedua endpoint ini memakai interface/type-only di @Body() — metatype
 * ter-erase menjadi Object, sehingga pipe melewatkannya tanpa validasi sama
 * sekali (body apa pun diterima). Spec ini mengunci kontrak DTO-nya.
 */
describe('Role menu permissions DTO validation', () => {
  const validateDto = async (
    Dto: new () => object,
    body: Record<string, unknown>,
  ): Promise<ValidationError[]> => {
    const dto = plainToInstance(Dto, body, { enableImplicitConversion: true });
    return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  };

  const props = (errors: ValidationError[]): string[] => errors.map((e) => e.property).sort();

  describe('UpdatePermissionDto', () => {
    it('menerima payload valid', async () => {
      const errors = await validateDto(UpdatePermissionDto, {
        role: 'admin_ranting',
        menuKey: 'members',
        isEnabled: true,
      });
      expect(errors).toHaveLength(0);
    });

    it('menolak role di luar ROLE_VALUES (bukan baris role sampah)', async () => {
      const errors = await validateDto(UpdatePermissionDto, {
        role: 'root',
        menuKey: 'members',
        isEnabled: true,
      });
      expect(props(errors)).toEqual(['role']);
    });

    it('menolak payload tanpa isEnabled', async () => {
      const errors = await validateDto(UpdatePermissionDto, {
        role: 'anggota',
        menuKey: 'members',
      });
      expect(props(errors)).toEqual(['isEnabled']);
    });

    it('menolak properti asing (whitelist + forbidNonWhitelisted)', async () => {
      const errors = await validateDto(UpdatePermissionDto, {
        role: 'anggota',
        menuKey: 'members',
        isEnabled: true,
        hantu: 'boo',
      });
      expect(props(errors)).toEqual(['hantu']);
    });
  });

  describe('BulkUpdateDto', () => {
    it('menerima record menuKey → boolean yang valid', async () => {
      const errors = await validateDto(BulkUpdateDto, {
        permissions: { members: true, reports: false },
      });
      expect(errors).toHaveLength(0);
    });

    it('menolak nilai non-boolean (dulu lolos lalu baru error di Prisma)', async () => {
      const errors = await validateDto(BulkUpdateDto, {
        permissions: { members: 'yes' },
      });
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('permissions');
    });

    it('menolak permissions berupa array', async () => {
      const errors = await validateDto(BulkUpdateDto, { permissions: [true, false] });
      expect(props(errors)).toEqual(['permissions']);
    });

    it('menolak permissions null / string', async () => {
      for (const bad of [null, 'members=true']) {
        const errors = await validateDto(BulkUpdateDto, { permissions: bad });
        expect(props(errors)).toEqual(['permissions']);
      }
    });

    it('menolak properti asing di level body', async () => {
      const errors = await validateDto(BulkUpdateDto, {
        permissions: { members: true },
        role: 'superadmin', // role datang dari :role, bukan body
      });
      expect(props(errors)).toEqual(['role']);
    });
  });
});
