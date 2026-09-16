import { sign, verify, type JwtPayload } from 'jsonwebtoken';

export const QR_TOKEN_ISSUER = 'ths-thm-kta';
export const QR_TOKEN_ALGORITHM = 'HS256';

/**
 * Secret untuk menandatangani token QR. Gunakan env QR_SIGNING_SECRET
 * (fallback: JWT_SECRET) agar token bisa diverifikasi lintas proses.
 */
export function qrTokenSecret(): string {
  return (
    process.env.QR_SIGNING_SECRET ||
    process.env.JWT_SECRET ||
    'ths-thm-qr-insecure-dev-secret'
  );
}

export interface QrTokenClaims {
  /** ID (uuid) baris QRValidation di DB — dipakai untuk lookup. */
  ref: string;
  /** Tipe dokumen: 'kta' | tipe lainnya. */
  typ: string;
  /** Sumber penerbitan: 'digital' | 'printed'. */
  src: 'digital' | 'printed';
}

/** Tandatangani token QR (static, ttl panjang — masa berlaku dikontrol DB). */
export function signQrToken(claims: QrTokenClaims, ttlSeconds: number = 630720000): string {
  return sign({ typ: claims.typ, src: claims.src }, qrTokenSecret(), {
    subject: claims.ref,
    issuer: QR_TOKEN_ISSUER,
    algorithm: QR_TOKEN_ALGORITHM,
    expiresIn: ttlSeconds,
  });
}

/**
 * Verifikasi signature JWT token QR. Kembalikan `null` bila bukan JWT
 * valid (mis. token UUID legacy) — caller lalu memakai token langsung.
 */
export function resolveQrToken(
  token: string,
): { ref: string; typ: string; src: string } | null {
  try {
    const decoded = verify(token, qrTokenSecret(), {
      issuer: QR_TOKEN_ISSUER,
      algorithms: [QR_TOKEN_ALGORITHM],
    }) as JwtPayload;
    if (typeof decoded.sub !== 'string' || !decoded.sub) return null;
    return {
      ref: decoded.sub,
      typ: typeof decoded.typ === 'string' ? decoded.typ : '',
      src: decoded.src === 'printed' ? 'printed' : 'digital',
    };
  } catch {
    return null;
  }
}
/**
 * Bangun URL verifikasi publik `{FRONTEND_URL}/verify/<token>` — halaman HTML
 * yang aman dibuka di browser, BUKAN endpoint JSON `/api/documents/verify/<token>`.
 *
 * Bila `refToken` sudah berupa JWT QR yang valid → dipakai apa adanya;
 * bila UUID polos (format legacy) → ditandatangani dulu dengan `typ`/`src`.
 */
export function buildPublicVerifyUrl(
  refToken: string,
  opts: { typ?: string; src?: 'digital' | 'printed' } = {},
): string {
  const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
  if (resolveQrToken(refToken)) {
    return `${frontend}/verify/${refToken}`;
  }
  const signedToken = signQrToken({
    ref: refToken,
    typ: opts.typ || 'kta',
    src: opts.src || 'digital',
  });
  return `${frontend}/verify/${signedToken}`;
}

/**
 * Normalisasi on-read URL verifikasi legacy (format lama
 * `/api/documents/verify/<token>`) ke format publik `/verify/<token>`.
 * URL yang sudah berbentuk baru dikembalikan apa adanya — aman dipakai
 * sebagai "migrasi tanpa menulis DB".
 */
export function normalizeVerificationUrl(
  url: string | null | undefined,
  opts: { typ?: string; src?: 'digital' | 'printed' } = {},
): string {
  if (!url) return '';
  const match = /\/api\/documents\/verify\/([^/?#]+)/.exec(url);
  if (!match) return url;
  return buildPublicVerifyUrl(match[1], opts);
}