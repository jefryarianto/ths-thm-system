import { generateTotpSecret, generateTotpCode, verifyTotpCode, buildOtpauthUrl, base32Decode } from './totp.util';

describe('totp.util', () => {
  it('should generate a base32 secret of valid length', () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret.length).toBeGreaterThanOrEqual(32);
  });

  it('should generate a 6-digit code that changes with time', () => {
    const secret = generateTotpSecret();
    const c1 = generateTotpCode(secret, 1700000000000);
    const c2 = generateTotpCode(secret, 1700000030000);
    expect(c1).toMatch(/^\d{6}$/);
    // 30 detik berbeda = 1 langkah, kode beda kecuali kebetulan
    expect(c1).not.toBe(c2);
  });

  it('should verify a code within the time window', () => {
    const secret = generateTotpSecret();
    const t = 1700000000000;
    const code = generateTotpCode(secret, t);
    expect(verifyTotpCode(secret, code, t)).toBe(true);
    // ±1 langkah (±30 detik) masih diterima
    expect(verifyTotpCode(secret, code, t + 30000)).toBe(true);
    expect(verifyTotpCode(secret, code, t - 30000)).toBe(true);
  });

  it('should reject wrong or malformed codes', () => {
    const secret = generateTotpSecret();
    const t = 1700000000000;
    expect(verifyTotpCode(secret, '000000', t)).toBe(false);
    expect(verifyTotpCode(secret, 'abc', t)).toBe(false);
    expect(verifyTotpCode(secret, '', t)).toBe(false);
    expect(verifyTotpCode(secret, '123456', t + 5 * 30000)).toBe(false);
  });

  it('should build a valid otpauth URL with params', () => {
    const secret = generateTotpSecret();
    const url = buildOtpauthUrl(secret, 'user@example.com', 'THS-THM');
    expect(url.startsWith('otpauth://totp/')).toBe(true);
    expect(url).toContain('secret=' + secret);
    expect(url).toContain('issuer=THS-THM');
    expect(url).toContain('period=30');
  });

  it('should round-trip base32 encoding/decoding for HMAC', () => {
    const secret = generateTotpSecret();
    const t = 1700000000000;
    const code = generateTotpCode(secret, t);
    // base32Decode digunakan internal oleh generateTotpCode; pastikan deterministik
    expect(base32Decode(secret)).toBeInstanceOf(Buffer);
    expect(base32Decode(secret).length).toBe(20);
    expect(generateTotpCode(secret, t)).toBe(code);
  });
});