import { createHmac, randomBytes } from 'crypto';

/**
 * Implementasi TOTP (RFC 6238) murni berbasis Node crypto — tanpa library
 * eksternal (speakeasy/otplib). Dipakai untuk autentikasi dua faktor.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW_STEPS = 1;

function base32Encode(input: Buffer): string {
  let bits = '';
  for (const byte of input) {
    bits += byte.toString(2).padStart(8, '0');
  }
  let output = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    output += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  const rem = bits.length % 5;
  if (rem > 0) {
    output += BASE32_ALPHABET[parseInt(bits.slice(-rem) + '0'.repeat(5 - rem), 2)];
  }
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/** Generate secret acak 20 byte (160-bit) dalam encoding Base32. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

function counterFromTime(time: number, periodSeconds: number): Buffer {
  const counter = Math.floor(time / 1000 / periodSeconds);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  return buf;
}

function hotp(secret: string, counter: Buffer, digits = TOTP_DIGITS): string {
  const key = base32Decode(secret);
  const hash = createHmac('sha1', key).update(counter).digest();
  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);
  const otp = binary % 10 ** digits;
  return otp.toString().padStart(digits, '0');
}

export function generateTotpCode(secret: string, time = Date.now()): string {
  return hotp(secret, counterFromTime(time, TOTP_PERIOD_SECONDS));
}

/**
 * Verifikasi kode TOTP dengan toleransi ±TOTP_WINDOW_STEPS langkah waktu.
 * Mengembalikan boolean (tanpa throw) agar bisa dipakai di alur login.
 */
export function verifyTotpCode(
  secret: string,
  code: string,
  time = Date.now(),
  windowSteps = TOTP_WINDOW_STEPS,
): boolean {
  if (!code || !/^\d{6}$/.test(code.trim())) return false;
  const trimmed = code.trim();
  const counter = counterFromTime(time, TOTP_PERIOD_SECONDS);
  const base = counter.readBigUInt64BE();
  for (let step = -windowSteps; step <= windowSteps; step++) {
    const candidate = Buffer.alloc(8);
    candidate.writeBigUInt64BE(base + BigInt(step));
    if (hotp(secret, candidate) === trimmed) return true;
  }
  return false;
}

export function buildOtpauthUrl(secret: string, accountName: string, issuer = 'THS-THM'): string {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

export async function totpQrDataUrl(otpauthUrl: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const QRCode = require('qrcode');
  return QRCode.toDataURL(otpauthUrl, { width: 240, margin: 2 });
}