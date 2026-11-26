import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProfileDto } from '../../auth/dto/auth.dto';
import { CreateMemberDto, UpdateMemberDto } from './member.dto';

const validateDto = async (Dto: new () => object, payload: Record<string, unknown>) => {
  const dto = plainToInstance(Dto, payload);
  return validate(dto, { whitelist: true });
};

const withRequired = (Dto: new () => object, fields: Record<string, unknown>) => ({
  ...fields,
  ...(Dto === CreateMemberDto ? { namaLengkap: 'Budi', jenisKelamin: 'L' } : {}),
});

describe('DTO pekerjaan/pelantikan validation', () => {
  it.each([UpdateProfileDto, CreateMemberDto, UpdateMemberDto])(
    '%s membatasi panjang dan memangkas pekerjaan/pelantikan',
    async (Dto) => {
      const validFields = { pekerjaan: '  Guru  ', pelantikan: '  12 JULI 2020  ' };
      const trimmed = await validateDto(Dto, withRequired(Dto, validFields));
      expect(trimmed).toEqual([]);
      const dto = plainToInstance(Dto, withRequired(Dto, validFields)) as {
        pekerjaan?: string;
        pelantikan?: string;
      };
      expect(dto.pekerjaan).toBe('Guru');
      expect(dto.pelantikan).toBe('12 JULI 2020');

      const errors = await validateDto(
        Dto,
        withRequired(Dto, { pekerjaan: 'a'.repeat(121), pelantikan: 'b'.repeat(161) }),
      );
      expect(errors.map((error) => error.property).sort()).toEqual(['pekerjaan', 'pelantikan']);
    },
  );
});
