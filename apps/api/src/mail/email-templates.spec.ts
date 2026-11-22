import { claimStatusEmail, credentialEmail } from './email-templates';

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

describe('credentialEmail', () => {
  it('renders a clickable absolute download link when appUrl is provided', () => {
    const appUrl = 'https://cdn.ths-thm.cloud/apk/ths-thm-mobile-latest.apk';

    const template = credentialEmail('Budi', 'budi@test.com', 'rahasia123', appUrl);

    expect(template.html).toContain(`href="${appUrl}"`);
    expect(template.html).toMatch(
      /<a\s+href="https:\/\/[^"]+\.apk"[^>]*>\s*Unduh Aplikasi THS-THM\s*<\/a>/,
    );
  });

  it('omits the download link when appUrl is absent', () => {
    const template = credentialEmail('Budi', 'budi@test.com', 'rahasia123');

    expect(template.html).not.toContain('<a href=');
  });
});
