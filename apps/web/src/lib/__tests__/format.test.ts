import { describe, it, expect } from 'vitest';
import { formatDate, formatPeriode, formatRupiah } from '../format';

describe('formatRupiah', () => {
  it('formats number with grouping', () => {
    expect(formatRupiah(1500000)).toBe('Rp 1.500.000');
  });

  it('formats Prisma DECIMAL string (mis. "50000.00")', () => {
    expect(formatRupiah('50000.00')).toBe('Rp 50.000');
  });

  it('formats without decimals', () => {
    expect(formatRupiah(50000.75)).toBe('Rp 50.001');
  });

  it('handles zero', () => {
    expect(formatRupiah(0)).toBe('Rp 0');
  });

  it('falls back to raw value for invalid input', () => {
    expect(formatRupiah('abc')).toBe('Rp abc');
  });
});

describe('formatPeriode', () => {
  it('converts YYYY-MM to long month + year', () => {
    expect(formatPeriode('2026-01')).toBe('Januari 2026');
    expect(formatPeriode('2026-09')).toBe('September 2026');
  });

  it('converts YYYY-M without zero padding', () => {
    expect(formatPeriode('2026-5')).toBe('Mei 2026');
  });

  it('runs on YYYY-MM-DD timestamps', () => {
    expect(formatPeriode('2026-09-01T00:00:00.000Z')).toBe('September 2026');
  });

  it('returns raw value when input does not match', () => {
    expect(formatPeriode('lunas')).toBe('lunas');
    expect(formatPeriode('')).toBe('');
  });
});

describe('formatDate', () => {
  it('produces 2-digit day + long month name', () => {
    expect(formatDate('2026-09-01')).toBe('01 September 2026');
  });
});