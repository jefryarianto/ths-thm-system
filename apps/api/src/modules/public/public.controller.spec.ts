import 'reflect-metadata';
import { HEADERS_METADATA } from '@nestjs/common/constants';
import { PublicController } from './public.controller';

describe('PublicController', () => {
  it('disables caching for claim tracking responses', () => {
    const headers = Reflect.getMetadata(
      HEADERS_METADATA,
      PublicController.prototype.getClaimTracking,
    ) as Array<{ name: string; value: string }> | undefined;

    expect(headers).toEqual(
      expect.arrayContaining([{ name: 'Cache-Control', value: 'no-store' }]),
    );
  });
});
