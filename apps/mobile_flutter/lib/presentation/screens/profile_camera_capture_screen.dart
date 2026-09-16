import 'package:camera/camera.dart';
import 'package:flutter/material.dart';

/// Layar kamera untuk foto profil (item 8) — frame panduan pas foto di tengah
/// (sudut tegas + area luar digelapkan) agar wajah terposisi benar.
/// Saat rana ditekan, foto disimpan ke cache lalu `Navigator.pop(String?)`
/// mengembalikan path gambar lokal.
class ProfileCameraCaptureScreen extends StatefulWidget {
  const ProfileCameraCaptureScreen({super.key});

  @override
  State<ProfileCameraCaptureScreen> createState() =>
      _ProfileCameraCaptureScreenState();
}

class _ProfileCameraCaptureScreenState extends State<ProfileCameraCaptureScreen> {
  CameraController? _controller;
  List<CameraDescription> _cameras = const [];
  int _cameraIndex = 0;
  String? _error;
  bool _switching = false;
  bool _capturing = false;

  @override
  void initState() {
    super.initState();
    _setup();
  }

  Future<void> _setup() async {
    try {
      final cameras = await availableCameras();
      if (!mounted) return;
      if (cameras.isEmpty) {
        setState(() => _error = 'Tidak ada kamera yang tersedia.');
        return;
      }
      setState(() => _cameras = cameras);
      // Prioritas kamera depan (foto diri); fallback ke kamera pertama.
      final front = cameras.indexWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
      );
      final index = front >= 0 ? front : 0;
      await _attach(cameras[index]);
      if (mounted) setState(() => _cameraIndex = index);
    } catch (e) {
      if (mounted) setState(() => _error = 'Gagal membuka kamera: $e');
    }
  }

  /// Pasang controller baru (sekali pakai — ganti kamera = controller baru).
  Future<void> _attach(CameraDescription cam) async {
    final controller = CameraController(
      cam,
      ResolutionPreset.high,
      enableAudio: false,
      imageFormatGroup: ImageFormatGroup.jpeg,
    );
    try {
      await controller.initialize();
    } catch (e) {
      await controller.dispose();
      if (mounted) setState(() => _error = 'Gagal menginisialisasi kamera: $e');
      return;
    }
    if (!mounted) {
      controller.dispose();
      return;
    }
    setState(() {
      _controller?.dispose();
      _controller = controller;
      _error = null;
    });
  }

  Future<void> _switchCamera() async {
    if (_cameras.length < 2 || _switching) return;
    _switching = true;
    try {
      final next = (_cameraIndex + 1) % _cameras.length;
      await _attach(_cameras[next]);
      if (mounted) setState(() => _cameraIndex = next);
    } finally {
      _switching = false;
    }
  }

  Future<void> _capture() async {
    final controller = _controller;
    if (controller == null ||
        !controller.value.isInitialized ||
        _capturing) {
      return;
    }
    _capturing = true;
    try {
      final file = await controller.takePicture();
      if (mounted && file.path.isNotEmpty) {
        Navigator.of(context).pop(file.path);
        return;
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Gagal mengambil foto. Coba lagi.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal mengambil foto: $e')),
        );
      }
    } finally {
      _capturing = false;
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

@override
  Widget build(BuildContext context) {
    final controller = _controller;
    final ready = controller != null && controller.value.isInitialized;
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text('Ambil Foto Profil'),
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          if (ready)
            CameraPreview(controller)
          else
            Center(
              child: _error != null
                  ? Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        _error!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.white70),
                      ),
                    )
                  : const CircularProgressIndicator(color: Colors.white),
            ),
          // Frame panduan + petunjuk (tetap tampil, tidak menangkap gesture).
          const IgnorePointer(child: _GuideFrameOverlay()),
          // Kontrol bawah: ganti kamera | rana | (spacer simetris).
          Positioned(
            left: 0,
            right: 0,
            bottom: 32,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                IconButton(
                  onPressed: _cameras.length > 1 && ready
                      ? _switchCamera
                      : null,
                  icon: const Icon(Icons.cameraswitch_outlined,
                      color: Colors.white, size: 28),
                  tooltip: 'Ganti kamera',
                ),
                GestureDetector(
                  onTap: _capture,
                  child: Container(
                    width: 72,
                    height: 72,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white,
                    ),
                    child: Center(
                      child: Container(
                        width: 58,
                        height: 58,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.black12, width: 2),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 48),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Overlay bingkai panduan pas foto: masker gelap di luar bingkai, garis tipis
/// mengelilingi bingkai, empat sudut tegas, dan teks petunjuk di atas.
class _GuideFrameOverlay extends StatelessWidget {
  const _GuideFrameOverlay();

  @override
  Widget build(BuildContext context) {
    return const Stack(
      fit: StackFit.expand,
      children: [
        CustomPaint(painter: _GuideFramePainter()),
        Positioned(
          left: 32,
          right: 32,
          top: 36,
          child: Text(
            'Posisikan wajah di dalam bingkai\nPastikan pencahayaan cukup dan foto tajam',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w600,
              height: 1.4,
              shadows: [
                Shadow(color: Colors.black87, blurRadius: 8),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _GuideFramePainter extends CustomPainter {
  const _GuideFramePainter();

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    final frameW = w * 0.78;
    final frameH = frameW * 1.25; // proporsi pas foto (dekat 4:5)
    final left = (w - frameW) / 2;
    final top = ((h - frameH) / 2) - 30; // geser ke atas agar tak tertutup tombol
    final frame = Rect.fromLTWH(left, top, frameW, frameH);

    // Masker gelap di luar bingkai (bingkai dibiarkan transparan).
    final hole = Path()
      ..addRRect(RRect.fromRectAndRadius(frame, const Radius.circular(24)));
    final mask = Path.combine(
      PathOperation.difference,
      Path()..addRect(Offset.zero & size),
      hole,
    );
    canvas.drawPath(mask, Paint()..color = Colors.black.withValues(alpha: 0.45));

    // Garis tipis mengelilingi bingkai.
    canvas.drawRRect(
      RRect.fromRectAndRadius(frame, const Radius.circular(24)),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.4
        ..color = Colors.white.withValues(alpha: 0.55),
    );

    // Empat sudut tegas (bracket).
    const bracket = 26.0;
    const stroke = 4.0;
    final paint = Paint()
      ..color = Colors.white
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;
    // kiri-atas
    canvas.drawLine(Offset(frame.left, frame.top + bracket), frame.topLeft,
        paint);
    canvas.drawLine(
        Offset(frame.left + bracket, frame.top), frame.topLeft, paint);
    // kanan-atas
    canvas.drawLine(
        Offset(frame.right - bracket, frame.top), frame.topRight, paint);
    canvas.drawLine(
        Offset(frame.right, frame.top + bracket), frame.topRight, paint);
    // kiri-bawah
    canvas.drawLine(
        Offset(frame.left, frame.bottom - bracket), frame.bottomLeft, paint);
    canvas.drawLine(
        Offset(frame.left + bracket, frame.bottom), frame.bottomLeft, paint);
    // kanan-bawah
    canvas.drawLine(
        Offset(frame.right - bracket, frame.bottom), frame.bottomRight, paint);
    canvas.drawLine(
        Offset(frame.right, frame.bottom - bracket), frame.bottomRight, paint);
  }

  @override
  bool shouldRepaint(covariant _GuideFramePainter oldDelegate) => false;
}