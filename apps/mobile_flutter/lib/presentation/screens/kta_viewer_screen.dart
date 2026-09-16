import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:gal/gal.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/snack_bar_helper.dart';
import '../../data/models/card_data.dart';
import '../../data/models/member.dart';
import '../../logic/member/member_bloc.dart';
import '../widgets/app_loading_spinner.dart';
import '../widgets/kta_card_widget.dart';
import '../widgets/secure_kta_container.dart';

/// Viewer kartu KTA: pinch-zoom (InteractiveViewer), flip depan/belakang,
/// dan simpan kartu sebagai PNG ukuran asli 856×540 ke galeri.
class KtaViewerScreen extends StatefulWidget {
  const KtaViewerScreen({super.key});

  @override
  State<KtaViewerScreen> createState() => _KtaViewerScreenState();
}

class _KtaViewerScreenState extends State<KtaViewerScreen> {
  final _boundaryKey = GlobalKey();
  final _transformation = TransformationController();
  bool _showBack = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    // Kartu KTA berukuran landscape (856×540) — putar layar agar kartu
    // tampil penuh dalam orientasi landscape saat viewer dibuka.
    SystemChrome.setPreferredOrientations(const [
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
    final state = context.read<MemberBloc>().state;
    if (state is! MemberLoaded) {
      context.read<MemberBloc>().add(const MemberLoadRequested());
    }
    if (state is MemberLoaded && state.cardData == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          context.read<MemberBloc>().add(const MemberCardDataRequested());
        }
      });
    }
  }

  @override
  void dispose() {
    // Kembalikan orientasi portrait (default aplikasi) setelah viewer ditutup.
    SystemChrome.setPreferredOrientations(const [DeviceOrientation.portraitUp]);
    _transformation.dispose();
    super.dispose();
  }

  /// Gambar watermark diagonal "KARTU DIGITAL · nama · nomor" di atas PNG
  /// sebelum disimpan (konsisten dengan `?watermark=1` pada backend/web).
  Future<ui.Image> _applyDownloadWatermark(ui.Image src, String text) async {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    canvas.drawImage(src, Offset.zero, Paint());

    final w = src.width.toDouble();
    final h = src.height.toDouble();
    final textPainter = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(
          color: const Color(0x14263A5D),
          fontSize: math.max(22, w / 34),
          fontWeight: FontWeight.w600,
          letterSpacing: 1.2,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    canvas.save();
    canvas.translate(w / 2, h / 2);
    canvas.rotate(-0.49); // ≈ -28°, sama dengan backend
    final diag = math.sqrt(w * w + h * h);
    final stepX = textPainter.width * 1.7 + 30;
    final stepY = textPainter.height * 2.6 + 20;
    for (var y = -diag / 2; y <= diag / 2; y += stepY) {
      for (var x = -diag / 2; x <= diag / 2; x += stepX) {
        textPainter.paint(canvas, Offset(x, y));
      }
    }
    canvas.restore();

    final picture = recorder.endRecording();
    final out = await picture.toImage(src.width, src.height);
    picture.dispose();
    return out;
  }

  Future<void> _saveImage(Member member) async {
    setState(() => _saving = true);
    try {
      // Pastikan frame terakhir (stempel, ttd, foto dari server) selesai
      // dirender sebelum ditangkap.
      await Future<void>.delayed(const Duration(milliseconds: 350));
      await WidgetsBinding.instance.endOfFrame;
      if (!mounted) return;
      final boundary = _boundaryKey.currentContext?.findRenderObject()
          as RenderRepaintBoundary?;
      if (boundary == null) throw StateError('Target kartu belum siap');
      final image = await boundary.toImage(pixelRatio: 1.0);
      final noAnggota =
          member.nomorAnggota.isEmpty ? 'KTA' : member.nomorAnggota;
      final watermarked = await _applyDownloadWatermark(
        image,
        'KARTU DIGITAL · ${member.namaLengkap} · $noAnggota',
      );
      final byteData =
          await watermarked.toByteData(format: ui.ImageByteFormat.png);
      watermarked.dispose();
      image.dispose();
      if (byteData == null) throw StateError('Gagal meng-encode PNG');

      // Pastikan ada izin akses galeri (iOS & Android < 10)
      if (!await Gal.hasAccess()) {
        final granted = await Gal.requestAccess();
        if (!granted) throw StateError('Izin akses galeri ditolak');
      }

      final pngBytes = byteData.buffer.asUint8List();
      final fileName = 'kta_${noAnggota}_${_showBack ? 'belakang' : 'depan'}';
      await Gal.putImageBytes(
        pngBytes,
        name: fileName,
      );
      if (!mounted) return;
      showCenteredSnackBar(context, 'Kartu berhasil disimpan ke galeri');
    } catch (e) {
      if (!mounted) return;
      showCenteredSnackBar(context, 'Gagal menyimpan: ${e.toString()}');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _showSaveMenu(Member member) async {
    if (_saving) return;
    final action = await showModalBottomSheet<String>(
      context: context,
      builder: (sheetContext) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.download_outlined),
              title: const Text('Simpan ke Galeri (PNG)'),
              onTap: () => Navigator.pop(sheetContext, 'save'),
            ),
            ListTile(
              leading: const Icon(Icons.close),
              title: const Text('Batal'),
              onTap: () => Navigator.pop(sheetContext, 'cancel'),
            ),
          ],
        ),
      ),
    );
    if (action == 'save' && mounted) {
      await _saveImage(member);
    }
  }

  Future<void> _openVerification() async {
    final state = context.read<MemberBloc>().state;
    if (state is! MemberLoaded) return;
    final url = (state.cardData?.verificationUrl ?? '').trim();
    if (url.isEmpty) return;
    await launchUrl(
      Uri.parse(ApiClient.resolveAbsolute(url)),
      mode: LaunchMode.externalApplication,
    );
  }

  void _zoomBy(double factor) {
    final current = _transformation.value.getMaxScaleOnAxis();
    final next = (current * factor).clamp(1.0, 5.0);
    _transformation.value = Matrix4.diagonal3Values(
      next.toDouble(),
      next.toDouble(),
      1,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: const Text('Perbesar & Simpan'),
        actions: [
          if (_hasVerificationUrl(context))
            IconButton(
              tooltip: 'Verifikasi kartu',
              icon: const Icon(Icons.verified_outlined),
              onPressed: _openVerification,
            ),
          IconButton(
            tooltip: 'Balik kartu',
            icon: const Icon(Icons.flip),
            onPressed: () => setState(() => _showBack = !_showBack),
          ),
        ],
      ),
      body: SecureKtaContainer(
        // Proteksi anti-screenshot juga aktif di viewer — tanpa jam verifikasi
        // agar tampilan kartu full-screen tidak terganggu (jam utama ada di
        // halaman KTA Digital).
        showLiveClock: false,
        childKtaExisting: BlocBuilder<MemberBloc, MemberState>(
          builder: (context, state) {
            if (state is MemberLoading) {
              return const AppLoadingSpinner();
            }
            if (state is MemberError) {
              return Center(child: Text(state.message));
            }
            if (state is! MemberLoaded) {
              return const Center(child: Text('Belum ada data anggota'));
            }
            if (state.cardData == null) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (mounted) {
                  context
                      .read<MemberBloc>()
                      .add(const MemberCardDataRequested());
                }
              });
            }
            return _buildViewer(state.member, state.cardData);
          },
        ),
      ),
    );
  }

  Widget _buildViewer(Member member, CardData? cardData) {
    final card = KtaCardFullSize(
      member: member,
      cardData: cardData,
      showBack: _showBack,
    );
    return Stack(
      children: [
        // Area zoom/pan interaktif (pinch), tap-hold memunculkan menu simpan
        Positioned.fill(
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onLongPress: () => _showSaveMenu(member),
            child: ClipRect(
              child: InteractiveViewer(
                transformationController: _transformation,
                minScale: 1,
                maxScale: 5,
                boundaryMargin: const EdgeInsets.all(24),
                child: FittedBox(
                  fit: BoxFit.contain,
                  child: card,
                ),
              ),
            ),
          ),
        ),
        // Tombol zoom +/-
        Positioned(
          right: 12,
          bottom: 84,
          child: Column(
            children: [
              _zoomButton(Icons.add, () => _zoomBy(1.4)),
              const SizedBox(height: 8),
              _zoomButton(Icons.remove, () => _zoomBy(1 / 1.4)),
            ],
          ),
        ),
        // Petunjuk gesture
        Positioned(
          top: 8,
          left: 0,
          right: 0,
          child: Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Text(
                'Jepit untuk zoom • Tahan kartu untuk simpan',
                style: TextStyle(color: Colors.white, fontSize: 11),
              ),
            ),
          ),
        ),
        // Target ekspor ukuran penuh (di luar layar agar tetap ter-render)
        Positioned(
          left: -4000,
          top: -4000,
          child: RepaintBoundary(
            key: _boundaryKey,
            child: IgnorePointer(child: card),
          ),
        ),
      ],
    );
  }

  bool _hasVerificationUrl(BuildContext context) {
    final state = context.read<MemberBloc>().state;
    return state is MemberLoaded &&
        (state.cardData?.verificationUrl.isNotEmpty ?? false);
  }

  Widget _zoomButton(IconData icon, VoidCallback onTap) {
    return Material(
      color: AppTheme.primary,
      shape: const CircleBorder(),
      elevation: 2,
      child: IconButton(
        icon: Icon(icon, color: Colors.white),
        onPressed: onTap,
      ),
    );
  }
}
