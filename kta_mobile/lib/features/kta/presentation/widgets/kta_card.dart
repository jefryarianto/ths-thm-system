import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';

import '../../../../core/design/tokens.dart';
import '../../data/models/anggota.dart';
import '../painters/kta_back_painter.dart';
import '../painters/kta_front_painter.dart';
import 'kta_qr_code.dart';

class KtaCard extends StatefulWidget {
  final Anggota anggota;
  final VoidCallback? onExportFront;
  final VoidCallback? onExportBack;
  final VoidCallback? onPrintPdf;
  final ui.Image? bgFront;
  final ui.Image? bgBack;
  final ui.Image? logo;
  final ui.Image? photo;
  final ui.Image? qrCustom;
  final ui.Image? tandaTangan;

  const KtaCard({
    required this.anggota,
    this.onExportFront,
    this.onExportBack,
    this.onPrintPdf,
    this.bgFront,
    this.bgBack,
    this.logo,
    this.photo,
    this.qrCustom,
    this.tandaTangan,
    super.key,
  });

  @override
  State<KtaCard> createState() => _KtaCardState();
}

class _KtaCardState extends State<KtaCard> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final GlobalKey _frontKey = GlobalKey();
  final GlobalKey _backKey = GlobalKey();

  ui.Image? _bgFront;
  ui.Image? _bgBack;
  ui.Image? _logo;
  ui.Image? _photo;
  ui.Image? _qrCustom;
  ui.Image? _tandaTangan;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _bgFront = widget.bgFront;
    _bgBack = widget.bgBack;
    _logo = widget.logo;
    _photo = widget.photo;
    _qrCustom = widget.qrCustom;
    _tandaTangan = widget.tandaTangan;

    _loadAssets();
  }

  @override
  void didUpdateWidget(KtaCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.anggota != widget.anggota) {
      _loadAssets();
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAssets() async {
    _bgFront ??= await _loadAssetImage('assets/images/background/depan.png');
    _bgBack ??= await _loadAssetImage('assets/images/background/belakang.png');
    _logo ??= await _loadAssetImage('assets/images/logo.png');

    if (_photo == null &&
        widget.anggota.fotoUrl != null &&
        widget.anggota.fotoUrl!.trim().isNotEmpty) {
      _photo = await _loadNetworkImage(widget.anggota.fotoUrl!);
    }

    if (_qrCustom == null &&
        widget.anggota.qrImageUrl != null &&
        widget.anggota.qrImageUrl!.trim().isNotEmpty) {
      _qrCustom = await _loadNetworkImage(widget.anggota.qrImageUrl!);
    }

    if (_tandaTangan == null &&
        widget.anggota.tandaTanganUrl != null &&
        widget.anggota.tandaTanganUrl!.trim().isNotEmpty) {
      _tandaTangan = await _loadNetworkImage(widget.anggota.tandaTanganUrl!);
    }

    if (mounted) {
      setState(() {});
    }
  }

  Future<ui.Image?> _loadAssetImage(String path) async {
    try {
      final data = await rootBundle.load(path);
      final codec = await ui.instantiateImageCodec(data.buffer.asUint8List());
      final frame = await codec.getNextFrame();
      return frame.image;
    } catch (_) {
      return null;
    }
  }

  Future<ui.Image?> _loadNetworkImage(String url) async {
    try {
      final uri = Uri.parse(url);
      final response = await http.get(uri).timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        final codec = await ui.instantiateImageCodec(response.bodyBytes);
        final frame = await codec.getNextFrame();
        return frame.image;
      }
    } catch (_) {
      return null;
    }
    return null;
  }

  Future<Uint8List?> _capturePng(GlobalKey key, {required bool isFront}) async {
    try {
      final boundary =
          key.currentContext?.findRenderObject() as RenderRepaintBoundary?;
      if (boundary != null) {
        final image = await boundary.toImage(pixelRatio: 3.0);
        final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
        if (byteData != null) {
          return byteData.buffer.asUint8List();
        }
      }
    } catch (e) {
      debugPrint('Boundary capture failed, falling back to canvas: $e');
    }

    return _renderViaCanvas(isFront: isFront);
  }

  Future<Uint8List?> _renderViaCanvas({required bool isFront}) async {
    try {
      const width = KTALayout.cardWidth;
      const height = KTALayout.cardHeight;
      const scale = 3.0;

      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      canvas.scale(scale);

      final painter = isFront
          ? KtaFrontPainter(
              anggota: widget.anggota,
              backgroundImage: _bgFront,
              logoImage: _logo,
              photoImage: _photo,
              qrImage: _qrCustom,
            )
          : KtaBackPainter(
              anggota: widget.anggota,
              backgroundImage: _bgBack,
              tandaTanganImage: _tandaTangan,
            );

      painter.paint(canvas, const Size(width, height));

      if (isFront && _qrCustom == null) {
        canvas.save();
        canvas.translate(KTALayout.qrX, KTALayout.y(KTALayout.qrY));
        final qrPainter = KtaQrPainter(
          data: widget.anggota.verifyUrl ?? widget.anggota.nomor,
          logoImage: _logo,
          size: KTALayout.qrSize,
        );
        qrPainter.paint(canvas, const Size(KTALayout.qrSize, KTALayout.qrSize));
        canvas.restore();
      }

      final picture = recorder.endRecording();
      final img = await picture.toImage(
        (width * scale).round(),
        (height * scale).round(),
      );
      final byteData = await img.toByteData(format: ui.ImageByteFormat.png);
      return byteData?.buffer.asUint8List();
    } catch (e) {
      debugPrint('Render via canvas error: $e');
      return null;
    }
  }

  Future<void> _exportPng(
    GlobalKey key,
    String filename, {
    required bool isFront,
  }) async {
    final bytes = await _capturePng(key, isFront: isFront);
    if (bytes == null) return;

    try {
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/$filename');
      await file.writeAsBytes(bytes);
      await Share.shareXFiles([XFile(file.path)],
          text: 'KTA ${widget.anggota.nama}');
    } catch (e) {
      debugPrint('Export PNG error: $e');
    }
  }

  Future<void> _handleExportFront() async {
    widget.onExportFront?.call();
    await _exportPng(_frontKey, 'KTA-depan.png', isFront: true);
  }

  Future<void> _handleExportBack() async {
    widget.onExportBack?.call();
    await _exportPng(_backKey, 'KTA-belakang.png', isFront: false);
  }

  Future<void> _handlePrintPdf() async {
    widget.onPrintPdf?.call();
    await _printPdf();
  }

  Future<void> _printPdf() async {
    try {
      final pdf = pw.Document();

      final frontImg = await _capturePng(_frontKey, isFront: true);
      final backImg = await _capturePng(_backKey, isFront: false);
      if (frontImg == null || backImg == null) return;

      pdf.addPage(
        pw.Page(
          pageFormat: const PdfPageFormat(
            85.6 * PdfPageFormat.mm,
            53.98 * PdfPageFormat.mm,
          ),
          margin: const pw.EdgeInsets.all(2 * PdfPageFormat.mm),
          build: (ctx) => pw.Image(pw.MemoryImage(frontImg)),
        ),
      );
      pdf.addPage(
        pw.Page(
          pageFormat: const PdfPageFormat(
            85.6 * PdfPageFormat.mm,
            53.98 * PdfPageFormat.mm,
          ),
          margin: const pw.EdgeInsets.all(2 * PdfPageFormat.mm),
          build: (ctx) => pw.Image(pw.MemoryImage(backImg)),
        ),
      );

      await Printing.layoutPdf(onLayout: (format) => pdf.save());
    } catch (e) {
      debugPrint('Print PDF error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Depan'),
            Tab(text: 'Belakang'),
          ],
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildSide(_frontKey, true),
                _buildSide(_backKey, false),
              ],
            ),
          ),
        ),
        _buildActions(),
      ],
    );
  }

  Widget _buildSide(GlobalKey key, bool isFront) {
    return Center(
      child: FittedBox(
        fit: BoxFit.contain,
        child: RepaintBoundary(
          key: key,
          child: SizedBox(
            width: KTALayout.cardWidth,
            height: KTALayout.cardHeight,
            child: Stack(
              children: [
                CustomPaint(
                  size: const Size(KTALayout.cardWidth, KTALayout.cardHeight),
                  painter: isFront
                      ? KtaFrontPainter(
                          anggota: widget.anggota,
                          backgroundImage: _bgFront,
                          logoImage: _logo,
                          photoImage: _photo,
                          qrImage: _qrCustom,
                        )
                      : KtaBackPainter(
                          anggota: widget.anggota,
                          backgroundImage: _bgBack,
                          tandaTanganImage: _tandaTangan,
                        ),
                ),
                if (isFront)
                  Positioned(
                    left: KTALayout.qrX,
                    top: KTALayout.y(KTALayout.qrY),
                    width: KTALayout.qrSize,
                    height: KTALayout.qrSize,
                    child: widget.anggota.qrImageUrl != null &&
                            widget.anggota.qrImageUrl!.isNotEmpty
                        ? Image.network(
                            widget.anggota.qrImageUrl!,
                            width: KTALayout.qrSize,
                            height: KTALayout.qrSize,
                            fit: BoxFit.contain,
                            errorBuilder: (context, error, stackTrace) =>
                                KtaQrCode(
                              data: widget.anggota.verifyUrl ??
                                  widget.anggota.nomor,
                              logoImage: _logo,
                              size: KTALayout.qrSize,
                            ),
                          )
                        : KtaQrCode(
                            data: widget.anggota.verifyUrl ??
                                widget.anggota.nomor,
                            logoImage: _logo,
                            size: KTALayout.qrSize,
                          ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildActions() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            ElevatedButton.icon(
              icon: const Icon(Icons.download),
              label: const Text('Unduh Depan'),
              onPressed: _handleExportFront,
            ),
            const SizedBox(width: 8),
            ElevatedButton.icon(
              icon: const Icon(Icons.download),
              label: const Text('Unduh Belakang'),
              onPressed: _handleExportBack,
            ),
            const SizedBox(width: 8),
            ElevatedButton.icon(
              icon: const Icon(Icons.print),
              label: const Text('Cetak PDF'),
              onPressed: _handlePrintPdf,
            ),
          ],
        ),
      ),
    );
  }
}
