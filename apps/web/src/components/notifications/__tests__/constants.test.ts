import { describe, expect, it } from 'vitest';
import { NOTIF_TYPES, TIPE_OPTIONS, tipeColors } from '../constants';

const KTA_TYPES = [
  'kta_submitted',
  'kta_rejected',
  'kta_approved',
  'kta_fee_notification',
  'kta_payment_verified',
  'kta_generated',
  'kta_approval_request',
  'kta_payment_setup',
  'kta_escalation',
  'kta_escalation_upper',
];

describe('notification constants', () => {
  it.each(KTA_TYPES)('has a human label and color for %s', (tipe) => {
    const option = TIPE_OPTIONS.find((item) => item.value === tipe);
    expect(option).toBeDefined();
    expect(option?.label).toBeTruthy();
    expect(option?.label).not.toBe(tipe);
    expect(NOTIF_TYPES.some((item) => item.value === tipe)).toBe(true);
    expect(tipeColors[tipe]).toBeTruthy();
  });

  it('keeps the existing status_klaim label', () => {
    expect(TIPE_OPTIONS.find((item) => item.value === 'status_klaim')?.label).toBe('Status Klaim');
  });
});
