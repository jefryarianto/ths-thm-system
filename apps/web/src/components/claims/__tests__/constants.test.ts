import { describe, it, expect } from 'vitest';
import { STATUS_COLORS, STATUS_OPTIONS } from '../constants';

describe('claims constants', () => {
  describe('STATUS_COLORS', () => {
    it('has colors for all four statuses', () => {
      expect(STATUS_COLORS.pending).toContain('bg-yellow-100');
      expect(STATUS_COLORS.diproses).toContain('bg-blue-100');
      expect(STATUS_COLORS.disetujui).toContain('bg-green-100');
      expect(STATUS_COLORS.ditolak).toContain('bg-red-100');
    });

    it('has dark mode variants', () => {
      expect(STATUS_COLORS.pending).toContain('dark:bg-yellow-950');
      expect(STATUS_COLORS.diproses).toContain('dark:bg-blue-950');
    });
  });

  describe('STATUS_OPTIONS', () => {
    it('has all 5 options including "all"', () => {
      expect(STATUS_OPTIONS).toHaveLength(5);
    });

    it('starts with the "all" option', () => {
      expect(STATUS_OPTIONS[0]).toEqual({ value: '', label: 'Semua Status' });
    });

    it('has correct status entries', () => {
      expect(STATUS_OPTIONS[1]).toEqual({ value: 'pending', label: 'Pending' });
      expect(STATUS_OPTIONS[2]).toEqual({ value: 'diproses', label: 'Diproses' });
      expect(STATUS_OPTIONS[3]).toEqual({ value: 'disetujui', label: 'Disetujui' });
      expect(STATUS_OPTIONS[4]).toEqual({ value: 'ditolak', label: 'Ditolak' });
    });
  });
});
