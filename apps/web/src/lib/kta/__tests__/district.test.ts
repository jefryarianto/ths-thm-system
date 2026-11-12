import { describe, expect, it } from 'vitest';
import { DISTRICT_FALLBACK, normalizeDistrict } from '@/lib/kta/district';

describe('normalizeDistrict', () => {
  it('strips the Keuskupan prefix and uppercases', () => {
    expect(normalizeDistrict('Keuskupan Larantuka')).toBe('LARANTUKA');
    expect(normalizeDistrict('keuskupan larantuka')).toBe('LARANTUKA');
  });
  it('trims plain names', () => {
    expect(normalizeDistrict('  Flores Timur ')).toBe('FLORES TIMUR');
  });
  it('falls back when empty', () => {
    expect(normalizeDistrict(undefined)).toBe(DISTRICT_FALLBACK);
    expect(normalizeDistrict(null)).toBe(DISTRICT_FALLBACK);
    expect(normalizeDistrict('   ')).toBe(DISTRICT_FALLBACK);
  });
});
