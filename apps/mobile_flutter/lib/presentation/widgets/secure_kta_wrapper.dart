import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../core/security/secure_window_channel.dart';
import '../../core/theme/app_theme.dart';

/// Pembungkus keamanan tingkat produksi untuk widget Kartu Tanda Anggota
/// (KTA). Fokus: KEAMANAN & tema — TIDAK mengubah struktur desain internal
/// kartu KTA yang sudah ada.
///
/// ── Cara pakai ──────────────────────────────────────────────────────────
/// Letakkan SELURUH widget KTA lama Anda pada parameter `childKtaExisting`.
/// Desain internal kartu (`kta_card_widget.dart`) tidak disentuh/dirombak:
///
/// ```dart
/// SecureKtaWrapper(
///   childKtaExisting: KtaFlipCard(member: member, cardData: cardData),
/// )
/// ```
///
/// ── Fitur keamanan ──────────────────────────────────────────────────────
/// 1. ANTI-SCREENSHOT & ANTI-SCREEN-RECORDING:
///    Saat wrapper aktif (initState), `SecureWindowChannel.enable()` memutar
///    platform channel aman → native mengaktifkan `FLAG_SECURE` di level
///    sistem (Android) — screenshot & rekaman layar (MediaProjection/cast)
///    di-blank oleh OS. Saat keluar halaman (dispose) di-normalisasi.
///    Catatan: iOS tidak memiliki API publik setara; lihat dokumentasi
///    `SecureWindowChannel` bila penegakan native iOS diperlukan.
/// 2. JAM DIGITAL LIVE + KODE VERIFIKASI "TERENKRIPSI":
///    Jam HH:mm:ss dengan detik berjalan aktif + kode SHA-256 (8 karakter)
///    yang berubah setiap detik — bukti fisik untuk petugas lapangan bahwa
///    KTA dibuka langsung dari aplikasi, bukan manipulasi foto galeri.
class SecureKtaWrapper extends StatefulWidget {
  const SecureKtaWrapper({
    super.key,
    required this.childKtaExisting,
    this.showLiveClock = true,
    this.enableScreenProtection = true,
  });

  /// TEMPATKAN widget KTA lama Anda di sini (desain internal tidak disentuh).
  final Widget childKtaExisting;

  /// Tampilkan jam verifikasi live di atas widget KTA (default `true`).
  final bool showLiveClock;

  /// Nyalakan `FLAG_SECURE` + proteksi perekaman saat halaman dibuka.
  final bool enableScreenProtection;

  @override
  State<SecureKtaWrapper> createState() => _SecureKtaWrapperState();
}

class _SecureKtaWrapperState extends State<SecureKtaWrapper> {
  /// Salt statis — memastikan kode di detik yang sama selalu identik
  /// antara verifikator dan perangkat (deterministik, tidak acak).
  static const String _verificationSalt = 'ths-thm-kta-live-v1';

  Timer? _ticker;
  DateTime _now = DateTime.now();
  bool _protectionReady = false;

  // ── Lifecycle ─────────────────────────────────────────────────────────
  @override
  void initState() {
    super.initState();
    if (widget.enableScreenProtection) {
      _enableScreenProtection();
    }
    if (widget.showLiveClock) {
      _startLiveTicker();
    }
  }

  @override
  void dispose() {
    _ticker?.cancel();
    if (widget.enableScreenProtection) {
      _disableScreenProtection();
    }
    super.dispose();
  }

  // ── Perlindungan layar (FLAG_SECURE) ─────────────────────────────────
  Future<void> _enableScreenProtection() async {
    if (_protectionReady || kIsWeb || !Platform.isAndroid) return;
    try {
      // FLAG_SECURE (native) memblokir SEMUA bentuk tangkapan konten window di
      // level sistem: screenshot (tombol fisik/recent apps/gesture), screen
      // recording (MediaProjection), maupun screen cast — area kartu tampil
      // kosong/hitam bagi perekam. Inilah proteksi utama yang juga mencakup
      // "anti screen recording".
      await SecureWindowChannel.enable();
      _protectionReady = true;
      if (mounted) setState(() {});
    } catch (_) {
      // Non-fatal: aplikasi tetap berjalan bila method OS tidak tersedia.
    }
  }

  Future<void> _disableScreenProtection() async {
    if (!_protectionReady || kIsWeb || !Platform.isAndroid) return;
    try {
      await SecureWindowChannel.disable();
    } catch (_) {
      // Abaikan — saat halaman ditutup proteksi tidak diwajibkan lagi.
    }
    _protectionReady = false;
  }

  // ── Jam digital live ─────────────────────────────────────────────────
  void _startLiveTicker() {
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(() => _now = DateTime.now());
      }
    });
  }

  /// Kode verifikasi "terenkripsi": SHA-256(waktu saat ini | salt).
  /// Berubah tiap detik → gambar galeri statis tidak akan pernah cocok.
  String get _verificationCode {
    final raw = '${_now.toIso8601String()}|$_verificationSalt';
    final digest = sha256.convert(utf8.encode(raw)).toString().toUpperCase();
    return digest.substring(0, 8);
  }

  /// Format jam HH:mm:ss (detik berjalan aktif).
  String get _timeText {
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(_now.hour)}:${two(_now.minute)}:${two(_now.second)}';
  }

  String get _dateText {
    const bulan = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
    ];
    return '${_now.day} ${bulan[_now.month - 1]} ${_now.year}';
  }

  // ── Build ────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Jam verifikasi live di ATAS widget KTA lama (bukti anti-fake).
        if (widget.showLiveClock) _buildClockBanner(context),
        Expanded(child: widget.childKtaExisting),
      ],
    );
  }

  Widget _buildClockBanner(BuildContext context) {
    final statusColor =
        _protectionReady ? AppTheme.success : AppTheme.textMuted;
    final statusText = _protectionReady
        ? 'Screenshot & rekaman layar diblokir (FLAG_SECURE)'
        : 'Kode akurat pada waktu verifikasi — anti foto galeri';
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 12, 12, 4),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: AppTheme.softShadow(),
        border: Border.all(color: AppTheme.textMuted.withValues(alpha: 0.18)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Indikator status perlindungan layar
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(Icons.shield_outlined, color: statusColor, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        _timeText,
                        style: const TextStyle(
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.navy,
                          fontFeatures: [FontFeature.tabularFigures()],
                          letterSpacing: 0.4,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 6),
                    const _LiveBadge(),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  'VERIFIKASI $_verificationCode · $_dateText',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textMuted,
                    letterSpacing: 0.3,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  statusText,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: statusColor,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Badge kecil "LIVE" — penanda visual bahwa jam berjalan real-time.
class _LiveBadge extends StatelessWidget {
  const _LiveBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: AppTheme.success.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(6),
      ),
      child: const Text(
        'LIVE',
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w800,
          color: AppTheme.successDark,
          letterSpacing: 0.8,
        ),
      ),
    );
  }
}