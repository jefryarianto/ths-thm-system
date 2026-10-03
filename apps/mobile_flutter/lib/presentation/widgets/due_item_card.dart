import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/due.dart';

/// Kartu satuan riwayat iuran — responsif terhadap tema kontras tinggi.
///
/// Skema warna diwarisi dari `Theme.of(context)` (lihat `textTheme` global
/// di `AppTheme`): judul Deep Navy, nominal Slate, keterangan Muted, badge
/// hijau sukses. Emas TIDAK dipakai di area daftar ini (hanya aksen kecil).
///
/// ── Tata letak ──────────────────────────────────────────────────────────
/// Kiri : ikon centang hijau lembut (penanda instan status lunas).
/// Tengah: judul bulan iuran, nominal rupiah, tanggal pembayaran.
/// Kanan : lencana "lunas" hijau sukses + ikon chevron abu-abu.
class DueItemCard extends StatelessWidget {
  const DueItemCard({
    super.key,
    required this.due,
    this.onTap,
  });

  /// Data iuran (periode, nominal, status, tanggal pembayaran).
  final Due due;

  /// Dipanggil saat kartu diketuk (mis. membuka detail / bukti pembayaran).
  final VoidCallback? onTap;

  /// Status "lunas" — dianggap lunas bila mengandung kata lunas/paid.
  bool get _isPaid =>
      due.status.toLowerCase().contains('lunas') ||
      due.status.toLowerCase() == 'paid';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // Warna ikon sadar tema — varian gelap lolos WCAG di atas surface gelap.
    final statusColor = _isPaid
        ? AppTheme.successOf(context)
        : AppTheme.statusColorFor(context, due.status);
    final paidDate = due.tanggalBayar == null
        ? '-'
        : Formatters.dateLong(due.tanggalBayar);

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.space16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Kiri: ikon centang hijau lembut (penanda status) ────
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _isPaid ? Icons.check_circle : Icons.schedule,
                  color: statusColor,
                  size: 26,
                ),
              ),
              const SizedBox(width: 14),
              // ── Tengah: informasi teks utama ─────────────────────────
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Iuran ${due.periode}',
                      style: theme.textTheme.titleMedium,
                    ),
                    const SizedBox(height: 3),
                    Text(
                      Formatters.rupiah(due.jumlah),
                      style: theme.textTheme.bodyMedium
                          ?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 3),
                    Text('Dibayar $paidDate', style: theme.textTheme.bodySmall),
                  ],
                ),
              ),
              const SizedBox(width: AppTheme.space8),
              // ── Kanan: badge status + chevron ────────────────────────
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  _StatusBadge(
                      label: _badgeLabel,
                      status: _isPaid ? 'lunas' : due.status),
                  const SizedBox(height: AppTheme.space8),
                  Icon(Icons.chevron_right,
                      color: theme.colorScheme.outline),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Badge pendek — "lunas" untuk status terbayar; status lain dirapikan
  /// (mis. "Menunggu verifikasi") agar tidak memanjang melebihi kartu.
  String get _badgeLabel {
    if (_isPaid) return 'lunas';
    final raw = due.status.trim();
    if (raw.isEmpty) return 'Belum lunas';
    final words = raw
        .replaceAll('_', ' ')
        .split(' ')
        .where((w) => w.isNotEmpty)
        .map((w) => w[0].toUpperCase() + w.substring(1))
        .join(' ');
    if (words.length > 14) return 'Belum lunas';
    return words;
  }
}

/// Lencana (badge) kecil — teks hijau sukses kontras ≥ 4.5:1 di atas putih.
class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.label, required this.status});

  final String label;

  /// Status mentah (mis. `lunas`, `menunggu_verifikasi`) — dipakai untuk
  /// mengambil pasangan container/teks status yang kontras di tema aktif.
  final String status;

  @override
  Widget build(BuildContext context) {
    // Pasangan container + on-container (bukan tint 12%) supaya teks badge
    // tetap ≥ 4.5:1 di tema terang maupun gelap.
    final bg = AppTheme.statusContainerColorFor(context, status);
    final fg = AppTheme.statusTextColorFor(context, status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: fg,
        ),
      ),
    );
  }
}