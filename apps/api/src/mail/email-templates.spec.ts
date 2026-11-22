import { claimStatusEmail } from './email-templates';

describe('claimStatusEmail', () => {
  it('includes the tracking link when a tracking URL is provided', () => {
    const template = claimStatusEmail(
      'Budi',
      'pending',
      undefined,
      'https://ths-thm.cloud/klaim/token-123',
    );

    expect(template.html).toContain('https://ths-thm.cloud/klaim/token-123');
    expect(template.html).toContain('Lacak status klaim Anda');
  });
});
