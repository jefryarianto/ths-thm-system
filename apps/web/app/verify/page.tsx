'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ScanLine, ArrowRight } from 'lucide-react';

/**
 * Halaman induk verifikasi (`/verify`).
 *
 * Verifikasi keaslian KTA/sertifikat/piagam dilakukan lewat URL bertoken
 * `/verify/<token>` yang tertanam di QR code dokumen. Halaman ini adalah
 * "landing" ramah bagi pengguna yang membuka `/verify` secara manual
 * (tanpa token) — daripada memuat 404 mentah, kami sediakan form untuk
 * menempelkan kode/token verifikasi, lalu mengarahkannya ke `/verify/<token>`.
 *
 * Menerima beberapa format masukan:
 *  - token polos            → "eyJhbGci..."
 *  - URL lengkap            → "https://ths-thm.cloud/verify/<token>"
 *  - URL API lama (legacy)  → ".../api/documents/verify/<token>"
 */
export default function VerifyIndexPage() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  /** Ekstrak token dari berbagai format masukan pengguna. */
  const extractToken = (raw: string): string | null => {
    const input = raw.trim();
    if (!input) return null;

    // URL API legacy: /api/documents/verify/<token>
    const legacy = /\/api\/documents\/verify\/([^/?#]+)/.exec(input);
    if (legacy) return legacy[1];

    // URL publik: /verify/<token>
    const pub = /\/verify\/([^/?#]+)/.exec(input);
    if (pub) return pub[1];

    // Token polos: buang spasi/whitespace internal yang tak relevan.
    // Token JWT hanya boleh [A-Za-z0-9-_=.], jadi kalau masih memuat
    // karakter ilegal setelah dibersihkan → anggap tidak valid.
    const token = input.replace(/\s+/g, '');
    return /^[A-Za-z0-9\-_.=]+$/.test(token) ? token : null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = extractToken(value);
    if (!token) {
      setError('Kode verifikasi tidak dikenali. Tempelkan token atau URL lengkap dari QR code.');
      return;
    }
    setError(null);
    router.push(`/verify/${encodeURIComponent(token)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo / Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-3">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Verifikasi Kartu &amp; Dokumen</h1>
          <p className="text-xs text-gray-500 mt-0.5">THS-THM Verification</p>
        </div>

        {/* Form Input Token */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8"
        >
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
              <ScanLine size={32} className="text-blue-500" />
            </div>
          </div>

          <h2 className="text-base font-semibold text-gray-900 text-center mb-1">
            Masukkan Kode Verifikasi
          </h2>
          <p className="text-xs text-gray-500 text-center mb-5">
            Pindai QR code pada KTA/sertifikat/piagam, atau tempelkan kode/link verifikasi di
            bawah ini.
          </p>

          <label htmlFor="verify-token" className="sr-only">
            Kode verifikasi
          </label>
          <input
            id="verify-token"
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Tempel token atau URL /verify/…"
            autoFocus
            className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition ${
              error
                ? 'border-red-300 focus:ring-red-200'
                : 'border-gray-200 focus:ring-blue-200 focus:border-blue-400'
            }`}
          />

          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

          <button
            type="submit"
            className="mt-5 w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-200"
          >
            Verifikasi Sekarang
            <ArrowRight size={16} />
          </button>
        </form>

        <p className="text-center text-2xs text-gray-400 mt-4">
          Keaslian dokumen diverifikasi langsung terhadap sistem THS-THM.
        </p>
      </div>
    </div>
  );
}
