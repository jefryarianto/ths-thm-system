// QR Scanner Widget - Camera and scanning logic
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';

import 'qr_scan_models.dart';

class QrScannerWidget extends StatefulWidget {
  final ScanMode mode;
  final Function(String) onScan;
  final VoidCallback? onPermissionDenied;
  final VoidCallback? onCameraError;

  const QrScannerWidget({
    super.key,
    required this.mode,
    required this.onScan,
    this.onPermissionDenied,
    this.onCameraError,
  });

  @override
  State<QrScannerWidget> createState() => _QrScannerWidgetState();
}

class _QrScannerWidgetState extends State<QrScannerWidget> {
  MobileScannerController? _controller;
  bool _isPermissionGranted = false;
  bool _isCameraError = false;

  @override
  void initState() {
    super.initState();
    _requestPermission();
  }

  Future<void> _requestPermission() async {
    final status = await Permission.camera.request();
    if (status.isGranted) {
      setState(() => _isPermissionGranted = true);
      _controller = MobileScannerController();
    } else {
      setState(() => _isPermissionGranted = false);
      widget.onPermissionDenied?.call();
    }
  }

  void _onDetect(BarcodeCapture capture) {
    final barcode = capture.barcodes.first;
    final code = barcode.rawValue;
    if (code != null) {
      widget.onScan(code);
    }
  }

  void _initCamera() {
    setState(() => _isCameraError = false);
    _requestPermission();
  }

  @override
  Widget build(BuildContext context) {
    if (_isCameraError) {
      return _buildCameraError();
    }

    if (!_isPermissionGranted) {
      return _buildPermissionDenied();
    }

    if (_controller == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Stack(
        children: [
          MobileScanner(
            controller: _controller!,
            onDetect: _onDetect,
            fit: BoxFit.cover,
          ),
          _buildScanOverlay(),
        ],
      ),
    );
  }

  Widget _buildPermissionDenied() {
    return Container(
      color: Colors.grey[100],
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.camera_alt_outlined, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'Izin Kamera Diperlukan',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Colors.grey[700],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Berikan izin akses kamera untuk memindai QR code',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[600]),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => _initCamera(),
              icon: const Icon(Icons.refresh),
              label: const Text('Coba Lagi'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.primary,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCameraError() {
    return Container(
      color: Colors.grey[100],
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.camera_alt_outlined, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'Kamera Tidak Dapat Diakses',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Colors.grey[700],
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => _initCamera(),
              icon: const Icon(Icons.refresh),
              label: const Text('Coba Lagi'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.primary,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScanOverlay() {
    return CustomPaint(
      painter: _ScanOverlayPainter(),
      child: Container(),
    );
  }
}

class _ScanOverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black.withValues(alpha: 0.5)
      ..style = PaintingStyle.fill;

    final rect = Rect.fromLTWH(
      size.width * 0.15,
      size.height * 0.3,
      size.width * 0.7,
      size.height * 0.4,
    );

    final path = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height))
      ..addRRect(RRect.fromRectAndRadius(rect, const Radius.circular(12)))
      ..fillType = PathFillType.evenOdd;

    canvas.drawPath(path, paint);

    // Corner brackets
    final bracketPaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    const bracketLength = 30.0;
    const cornerRadius = 12.0;

    // Top-left
    canvas.drawPath(
      Path()
        ..moveTo(rect.left, rect.top + bracketLength)
        ..lineTo(rect.left, rect.top + cornerRadius)
        ..arcToPoint(
          Offset(rect.left + cornerRadius, rect.top),
          radius: const Radius.circular(cornerRadius),
        )
        ..lineTo(rect.left + bracketLength, rect.top),
      bracketPaint,
    );

    // Top-right
    canvas.drawPath(
      Path()
        ..moveTo(rect.right - bracketLength, rect.top)
        ..lineTo(rect.right - cornerRadius, rect.top)
        ..arcToPoint(
          Offset(rect.right, rect.top + cornerRadius),
          radius: const Radius.circular(cornerRadius),
        )
        ..lineTo(rect.right, rect.top + bracketLength),
      bracketPaint,
    );

    // Bottom-left
    canvas.drawPath(
      Path()
        ..moveTo(rect.left, rect.bottom - bracketLength)
        ..lineTo(rect.left, rect.bottom - cornerRadius)
        ..arcToPoint(
          Offset(rect.left + cornerRadius, rect.bottom),
          radius: const Radius.circular(cornerRadius),
        )
        ..lineTo(rect.left + bracketLength, rect.bottom),
      bracketPaint,
    );

    // Bottom-right
    canvas.drawPath(
      Path()
        ..moveTo(rect.right - bracketLength, rect.bottom)
        ..lineTo(rect.right - cornerRadius, rect.bottom)
        ..arcToPoint(
          Offset(rect.right, rect.bottom - cornerRadius),
          radius: const Radius.circular(cornerRadius),
        )
        ..lineTo(rect.right, rect.bottom - bracketLength),
      bracketPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}