'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PublicLayout } from '@/components';
import {
  ScanLine,
  ArrowRight,
  Camera,
  X,
  Keyboard,
  AlertCircle,
} from 'lucide-react';

/**
 * Halaman induk verifikasi (`/verify`).
 *
 * Verifikasi keaslian KTA/sertifikat/piagam dilakukan lewat URL bertoken
 * `/verify/<token>` yang tertanam di QR code dokumen. Halaman ini adalah
 * "landing" ramah bagi pengguna yang membuka `/verify` secara manual
 * (tanpa token) — tersedia dua jalur:
 *   1. Scan QR code langsung lewat kamera perangkat (html5-qrcode).
 *   2. Input manual — tempelkan token atau URL verifikasi.
 *
 * Keduanya mengekstrak token yang sama lalu mengarahkan ke `/verify/<token>`.
 */
export default function VerifyIndexPage() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  // ── State scanner QR ──
  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanStarting, setScanStarting] = useState(false);
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null);
  const SCANNER_DIV_ID = 'verify-qr-scanner';

  /** Ekstrak token dari berbagai format masukan (dipakai manual & hasil scan). */
  const extractToken = (raw: string): string | null => {
    const input = raw.trim();
    if (!input) return null;

    // URL API legacy: /api/documents/verify/<token>
    const legacy = /\/api\/documents\/verify\/([^/?#]+)/.exec(input);
    if (legacy) return legacy[1];

    // URL publik: /verify/<token>
    const pub = /\/verify\/([^/?#]+)/.exec(input);
    if (pub) return pub[1];

    // Token polos: buang spasi/whitespace internal. Karakter ilegal
    // yang tersisa setelah dibersihkan → anggap tidak valid.
    const token = input.replace(/\s+/g, '');
    return /^[A-Za-z0-9\-_.=]+$/.test(token) ? token : null;
  };

  const goToToken = (token: string) => {
    setError(null);
    setScanError(null);
    router.push(`/verify/${encodeURIComponent(token)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = extractToken(value);
    if (!token) {
      setError('Kode verifikasi tidak dikenali. Tempelkan token atau URL lengkap dari QR code.');
      return;
    }
    goToToken(token);
  };

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch {
      // Scanner sudah berhenti / DOM sudah dibersihkan — abaikan.
    }
  };

  // Mulai/hentikan kamera mengikuti state scanOpen. html5-qrcode di-import
  // secara dinamis agar bundle halaman publik tetap ramping dan aman untuk
  // SSR (library membutuhkan window).
  useEffect(() => {
    if (!scanOpen) return;
    let disposed = false;

    (async () => {
      setScanStarting(true);
      setScanError(null);
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
        if (disposed) return;
        const scanner = new Html5Qrcode(SCANNER_DIV_ID, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' }, // kamera belakang (ponsel)
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText: string) => {
            const token = extractToken(decodedText);
            if (token) {
              void stopScanner();
              goToToken(token);
            } else {
              setScanError('QR terbaca, tetapi bukan kode verifikasi THS-THM.');
            }
          },
          () => {
            // Frame tanpa QR — abaikan (jangan spam console).
          },
        );
        if (disposed) await stopScanner();
      } catch {
        if (!disposed) {
          setScanError(
            'Kamera tidak dapat diakses. Izinkan akses kamera pada browser, atau gunakan input manual di bawah.',
          );
        }
      } finally {
        if (!disposed) setScanStarting(false);
      }
    })();

    return () => {
      disposed = true;
      void stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanOpen]);
  return (
    <PublicLayout>
      {/* Page Header — pola yang sama dengan /berita, /daftar, dsb. */}
      <div className="bg-gradient-to-r from-navy-700 to-navy-900 py-12 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
            <a href="/" className="hover:text-white transition-colors">
              Beranda
            </a>
            <span aria-hidden="true">›</span>
            <span className="text-gold-400">Verifikasi</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold">Verifikasi Kartu &amp; Dokumen</h1>
          <p className="text-white/70 text-sm sm:text-base mt-2 max-w-xl">
            Pindai QR code pada KTA/sertifikat/piagam, atau tempelkan kode/link verifikasi.
          </p>
          <div className="w-16 h-1 bg-gold-400 mt-4 rounded-full" />
        </div>
      </div>

      <section className="bg-gray-50 dark:bg-gray-950 py-10 sm:py-14">
        <div className="max-w-md w-full mx-auto px-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
          {/* ── Area Scanner (saat kamera aktif) ── */}
          {scanOpen && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900">Pindai QR Code</h2>
                <button
                  type="button"
                  onClick={() => setScanOpen(false)}
                  aria-label="Tutup kamera"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                >
                  <X size={18} />
                </button>
              </div>
              <div
                id={SCANNER_DIV_ID}
                className="rounded-2xl overflow-hidden bg-gray-950 min-h-[240px] flex items-center justify-center"
              />
              {scanStarting && (
                <p className="text-xs text-gray-500 text-center mt-3">
                  Memulai kamera… izinkan akses kamera bila diminta browser.
                </p>
              )}
              {scanError && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <AlertCircle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">{scanError}</p>
                </div>
              )}
              <p className="text-2xs text-gray-400 text-center mt-3">
                Arahkan kamera ke QR code pada KTA/sertifikat/piagam.
              </p>
              <div className="border-t border-gray-100 my-5" />
            </div>
          )}

          {/* ── Pilihan jalur: Scan (saat kamera tertutup) ── */}
          {!scanOpen && (
            <>
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 rounded-2xl bg-navy-100 dark:bg-navy-900/30 flex items-center justify-center">
                  <ScanLine size={32} className="text-navy-800 dark:text-gold-400" />
                </div>
              </div>
              <h2 className="text-base font-semibold text-navy-900 dark:text-white text-center mb-1">
                Masukkan Kode Verifikasi
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-5">
                Pindai QR code pada KTA/sertifikat/piagam, atau tempelkan kode/link verifikasi di
                bawah ini.
              </p>
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-navy-800 text-white rounded-xl text-sm font-medium hover:bg-navy-700 transition shadow-lg"
              >
                <Camera size={18} />
                Pindai QR Code
              </button>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 border-t border-gray-100" />
                <span className="text-2xs text-gray-400">atau masukkan kode manual</span>
                <div className="flex-1 border-t border-gray-100" />
              </div>
            </>
          )}

          {/* ── Form Input Token Manual ── */}
          <form onSubmit={handleSubmit}>
            <label htmlFor="verify-token" className="sr-only">
              Kode verifikasi
            </label>
            <div className="relative">
              <Keyboard
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                id="verify-token"
                type="text"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Tempel token atau URL /verify/…"
                className={
                  'w-full pl-10 pr-4 py-3 rounded-xl border text-sm text-navy-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition ' +
                  (error
                    ? 'border-red-300 focus:ring-red-200'
                    : 'border-gray-200 dark:border-gray-700 focus:ring-navy-200 focus:border-navy-400')
                }
              />
            </div>

            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

            <button
              type="submit"
              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-navy-800 text-white rounded-xl text-sm font-medium hover:bg-navy-700 transition shadow-lg"
            >
              Verifikasi Sekarang
              <ArrowRight size={16} />
            </button>
          </form>
        </div>

        <p className="text-center text-2xs text-gray-400 mt-4">
          Keaslian dokumen diverifikasi langsung terhadap sistem THS-THM.
        </p>
        </div>
      </section>
    </PublicLayout>
  );
}

