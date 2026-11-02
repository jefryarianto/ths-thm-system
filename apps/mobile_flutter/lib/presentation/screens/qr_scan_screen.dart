import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../core/api/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../logic/auth/auth_bloc.dart';
import '../widgets/app_loading_spinner.dart';

enum ScanMode { verify, checkin, lookup }

/// Sub-mode pencarian anggota: via scan QR atau input manual (nama/nomor).
enum LookupSearchType { qrCode, manual }

class KegiatanItem {
  final String id;
  final String nama;
  final String? lokasi;
  final String tanggalMulai;
  final String type; // activity | training | graduation

  const KegiatanItem({
    required this.id,
    required this.nama,
    this.lokasi,
    required this.tanggalMulai,
    required this.type,
  });

  factory KegiatanItem.fromJson(String type, Map<String, dynamic> json) {
    return KegiatanItem(
      id: json['id'].toString(),
      nama: json['nama'].toString(),
      lokasi: json['lokasi']?.toString(),
      tanggalMulai: json['tanggalMulai']?.toString() ?? '',
      type: type,
    );
  }
}

class ScanHistoryItem {
  final String id;
  final String type; // document_verify | check_in | member_lookup
  final String result;
  final String detail;
  final String timestamp;

  const ScanHistoryItem({
    required this.id,
    required this.type,
    required this.result,
    required this.detail,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'result': result,
        'detail': detail,
        'timestamp': timestamp,
      };

  factory ScanHistoryItem.fromJson(Map<String, dynamic> json) =>
      ScanHistoryItem(
        id: json['id']?.toString() ??
            DateTime.now().millisecondsSinceEpoch.toString(),
        type: json['type']?.toString() ?? '',
        result: json['result']?.toString() ?? '',
        detail: json['detail']?.toString() ?? '',
        timestamp: json['timestamp']?.toString() ?? '',
      );
}

class ScanResultData {
  final bool success;
  final String message;
  final String detail;

  const ScanResultData({
    required this.success,
    required this.message,
    required this.detail,
  });
}

class QrScanScreen extends StatefulWidget {
  const QrScanScreen({super.key});

  @override
  State<QrScanScreen> createState() => _QrScanScreenState();
}

class _QrScanScreenState extends State<QrScanScreen>
    with WidgetsBindingObserver {
  late MobileScannerController _scanner;
  final ApiClient _api = ApiClient();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  ScanMode _mode = ScanMode.checkin; // default Check-In
  LookupSearchType _lookupSearchType = LookupSearchType.qrCode;
  final TextEditingController _manualSearchController =
      TextEditingController();
  final ImagePicker _imagePicker = ImagePicker();
  String? _scanningKey;
  List<ScanHistoryItem> _history = [];
  String? _selectedKegiatanId;
  ScanResultData? _result;
  bool _cameraPermissionGranted = false;
  bool _isCheckingPermission = true;
  String? _cameraErrorMessage;
  bool _permissionCheckInFlight = false;
  bool _startInFlight = false;
  bool _cameraPermanentlyDenied = false;
  bool _isAdmin = false;
  Timer? _cameraWatchdog;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Sejak mobile_scanner 7.x `start()` menolak dipanggil sebelum controller
    // ter-attach ke widget `MobileScanner` (error `controllerNotAttached`).
    // Jadi biarkan `autoStart` default (true): widget yang menyalakan kamera
    // saat mount, layar ini hanya mengurus izin & lifecycle.
    _scanner = MobileScannerController(
      formats: const [BarcodeFormat.qrCode],
    );
    _scanner.addListener(_onScannerStateChanged);
    _checkAdminRole();
    _checkCameraPermission();
    _loadHistory();
    _fetchKegiatan();
  }

  /// Cek role user saat ini untuk menentukan akses fitur Cari Anggota.
  void _checkAdminRole() {
    final authState = context.read<AuthBloc>().state;
    final role = authState is AuthAuthenticated ? authState.user.role : '';
    // Role yang diizinkan akses pencarian anggota (sesuai home_screen.dart).
    const adminRoles = {
      'admin_ranting',
      'admin_wilayah',
      'admin_distrik',
      'superadmin',
    };
    _isAdmin = adminRoles.contains(role);
  }

  /// Pantau state controller: jika kamera tidak pernah `isRunning` dalam
  /// waktu wajar setelah izin diberikan, tampilkan pesan yang bisa ditindak-
  /// lanjuti pengguna (bukan layar hitam tanpa keterangan).
  void _onScannerStateChanged() {
    final state = _scanner.value;
    if (state.isRunning) {
      _cameraWatchdog?.cancel();
      _cameraWatchdog = null;
      // Kamera hidup — bersihkan pesan watchdog agar tidak memblokir render.
      if (_cameraErrorMessage != null && mounted) {
        setState(() => _cameraErrorMessage = null);
      }
      return;
    }
    if (!_cameraPermissionGranted || state.isStarting) return;
    // Izin sudah diberikan tetapi kamera tidak berjalan dan tidak sedang
    // proses start — mulai watchdog agar pengguna tidak melihat layar hitam
    // tanpa petunjuk.
    if (_cameraWatchdog == null && state.error == null) {
      _cameraWatchdog = Timer(const Duration(seconds: 6), () {
        if (!mounted) return;
        final s = _scanner.value;
        if (s.isRunning || s.isStarting) return;
        setState(() {
          _cameraErrorMessage =
              'Kamera tidak berhasil dinyalakan. Coba muat ulang atau buka pengaturan.';
        });
        _cameraWatchdog = null;
      });
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      if (_cameraPermissionGranted) {
        _startScanner();
      } else {
        _checkCameraPermission();
      }
    } else if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused) {
      try {
        _scanner.stop();
      } catch (_) {}
    }
  }

  /// Nyalakan kamera.
  ///
  /// Kegagalan nyata dilaporkan controller lewat `value.error` dan dirender
  /// oleh `errorBuilder` pada widget `MobileScanner`; exception yang dilempar
  /// hanya untuk pemakaian yang tidak valid (mis. `start()` sebelum widget
  /// ter-attach), jadi dicatat ke log agar mudah didiagnosis, bukan ditelan
  /// diam-diam.
  Future<void> _startScanner() async {
    if (_startInFlight) return;
    _startInFlight = true;
    _cameraWatchdog?.cancel();
    _cameraWatchdog = null;
    try {
      await _scanner.start();
    } on MobileScannerException catch (e) {
      // controllerInitializing / controllerNotAttached: start sudah berjalan
      // atau widget belum attach — biarkan autoStart yang menanganinya.
      debugPrint('MobileScanner.start() menolak: ${e.errorCode}');
    } catch (e, st) {
      debugPrint('MobileScanner.start() gagal: $e\n$st');
    } finally {
      _startInFlight = false;
    }
  }

  /// Pesan error kamera yang ramah pengguna; kode plugin berbahasa Inggris.
  static String _scannerErrorMessage(MobileScannerException error) {
    switch (error.errorCode) {
      case MobileScannerErrorCode.permissionDenied:
        return 'Izin kamera ditolak. Aktifkan lewat pengaturan aplikasi.';
      case MobileScannerErrorCode.unsupported:
        return 'Perangkat ini tidak mendukung pemindaian kamera.';
      case MobileScannerErrorCode.genericError:
        return error.errorDetails?.message ??
            'Kamera gagal dibuka. Pastikan tidak sedang dipakai aplikasi lain.';
      default:
        return error.errorDetails?.message ?? error.errorCode.message;
    }
  }

  Future<void> _checkCameraPermission() async {
    // Cegah dua alur izin berjalan bersamaan: dialog izin memicu lifecycle
    // `inactive` lalu `resumed`, sehingga `_checkCameraPermission()` bisa
    // terpanggil dua kali. Dua `start()` yang tumpang tindih memicu error
    // native CameraX ("Attempt to invoke virtual method ... on a null object
    // reference") di Android 14.
    if (_permissionCheckInFlight) return;
    _permissionCheckInFlight = true;

    setState(() {
      _isCheckingPermission = true;
      _cameraErrorMessage = null;
    });

    try {
      final currentStatus = await Permission.camera.status;
      PermissionStatus status = currentStatus;
      if (!currentStatus.isGranted) {
        // Beberapa ROM (MIUI/EMUI) bisa menggantung pada dialog izin.
        // Beri batas waktu agar pengguna tidak terjebak di spinner.
        status = await Permission.camera
            .request()
            .timeout(const Duration(seconds: 30), onTimeout: () {
          debugPrint('Permission.camera.request() timeout — memakai status terakhir');
          return PermissionStatus.denied;
        });
      }

      if (!mounted) return;

      if (status.isGranted) {
        // Kamera dinyalakan oleh widget `MobileScanner` (autoStart) begitu
        // `_cameraPermissionGranted` menjadi true.
        setState(() {
          _cameraPermissionGranted = true;
          _isCheckingPermission = false;
          _cameraErrorMessage = null;
          _cameraPermanentlyDenied = false;
        });
      } else {
        setState(() {
          _cameraPermissionGranted = false;
          _isCheckingPermission = false;
          _cameraPermanentlyDenied = status.isPermanentlyDenied;
          _cameraErrorMessage = status.isPermanentlyDenied
              ? 'Izin kamera ditolak permanen. Buka pengaturan untuk mengaktifkan.'
              : 'Izin kamera dibutuhkan untuk memindai QR code.';
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isCheckingPermission = false;
        _cameraErrorMessage = 'Gagal mengakses izin kamera: $e';
      });
    } finally {
      _permissionCheckInFlight = false;
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _cameraWatchdog?.cancel();
    _manualSearchController.dispose();
    _scanner.removeListener(_onScannerStateChanged);
    _scanner.dispose();
    super.dispose();
  }

  Future<void> _loadHistory() async {
    try {
      final raw = await _storage.read(key: 'scanHistory');
      if (raw != null) {
        final list = (jsonDecode(raw) as List)
            .map((e) => ScanHistoryItem.fromJson(e as Map<String, dynamic>))
            .toList();
        if (mounted) setState(() => _history = list);
      }
    } catch (_) {}
  }

  Future<void> _saveHistory(ScanHistoryItem item) async {
    final updated = [item, ..._history].take(50).toList();
    if (mounted) setState(() => _history = updated);
    try {
      await _storage.write(
          key: 'scanHistory',
          value: jsonEncode(updated.map((e) => e.toJson()).toList()));
    } catch (_) {}
  }

  void _clearHistory() async {
    if (mounted) setState(() => _history = []);
    try {
      await _storage.delete(key: 'scanHistory');
    } catch (_) {}
  }

  Future<void> _fetchKegiatan() async {
    try {
      // Untuk anggota, yang paling relevan adalah daftar undangan pendadaran
      // (Graduations) karena mereka bisa self check-in di sana.
      final response = await _api.dio.get(AppConstants.graduationsMe);
      final List<dynamic> list = response.data['data'] ?? [];

      for (final item in list) {
        final grad = item['kegiatan'];
        if (grad != null) {
          // Simpan id pertama sebagai fallback jika QR bukan JSON.
          _selectedKegiatanId ??= grad['id'].toString();
          break;
        }
      }
    } catch (e) {
      debugPrint('Error fetching invitations: $e');
    }
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_scanningKey != null || !mounted) return;
    final raw =
        capture.barcodes.where((b) => b.rawValue != null).firstOrNull?.rawValue;
    if (raw == null) return;
    final key = DateTime.now().millisecondsSinceEpoch.toString();
    setState(() => _scanningKey = key);
    try {
      final result = await _handle(raw);
      if (!mounted) return;
      setState(() => _result = result);
      await _saveHistory(
        ScanHistoryItem(
          id: key,
          type: _mode == ScanMode.verify
              ? 'document_verify'
              : _mode == ScanMode.checkin
                  ? 'check_in'
                  : 'member_lookup',
          result: result.message,
          detail: result.detail,
          timestamp: DateTime.now().toIso8601String(),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(
        () => _result = ScanResultData(
          success: false,
          message: 'Terjadi kesalahan: ${_api.messageFromError(e)}',
          detail: 'QR: ${raw.length > 30 ? '${raw.substring(0, 30)}...' : raw}',
        ),
      );
    } finally {
      // Beri jeda agar kamera tidak langsung mendeteksi ulang.
      await Future<void>.delayed(const Duration(milliseconds: 1200));
      if (mounted && _scanningKey == key) setState(() => _scanningKey = null);
    }
  }

  Future<ScanResultData> _handle(String qrData) async {
    switch (_mode) {
      case ScanMode.verify:
        return _verifyDocument(qrData);
      case ScanMode.checkin:
        return _checkIn(qrData);
      case ScanMode.lookup:
        return _lookupMember(qrData);
    }
  }

  Future<ScanResultData> _verifyDocument(String qrData) async {
    final token = Formatters.extractQrToken(qrData);
    if (token.isEmpty) {
      return const ScanResultData(
          success: false, message: 'QR tidak valid: token kosong', detail: '');
    }
    try {
      final res =
          await _api.dio.get('/documents/verify/${Uri.encodeComponent(token)}');
      final doc = res.data['data'];
      if (doc == null) {
        return const ScanResultData(
            success: false,
            message: 'Dokumen Tidak Valid',
            detail: 'QR: tidak dikenal');
      }
      final isKta = doc['tipe'] == 'kartu_anggota';
      final rawMember = doc['member'];
      final m = rawMember is Map<String, dynamic> ? rawMember : null;

      final nama = m?['namaLengkap']?.toString() ??
          doc['namaAnggota']?.toString() ??
          '-';
      final no = m?['nomorAnggota']?.toString() ??
          doc['nomorAnggota']?.toString() ??
          '-';
      final statusLabel =
          _statusLabel(m?['statusKeanggotaan']?.toString() ?? '');
      final lokasi = [
        m?['ranting']?.toString() ?? '',
        m?['wilayah']?.toString() ?? '',
        m?['distrik']?.toString() ?? '',
      ].where((e) => e.isNotEmpty).join(' · ');
      final serial = doc['nomorDokumen']?.toString() ?? '-';
      final scanCount = doc['scanCount']?.toString() ?? '';

      final detail = <String>[
        'Nama: $nama',
        'No: $no',
        if (statusLabel.isNotEmpty) 'Status: $statusLabel',
        if (lokasi.isNotEmpty) 'Lokasi: $lokasi',
        'Seri: $serial',
        if (scanCount.isNotEmpty) 'Scan ke-$scanCount',
      ].join('\n');

      return ScanResultData(
        success: true,
        message: isKta ? 'Kartu Anggota Valid ✓' : 'Dokumen Valid ✓',
        detail: detail,
      );
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      final msg = e.response?.data?['message'];
      final detail = msg is String
          ? msg
          : msg is List && msg.isNotEmpty
              ? msg.first.toString()
              : 'QR: tidak dikenal';
      return ScanResultData(
        success: false,
        message:
            status == 404 ? 'Dokumen/Kartu Tidak Valid' : 'Verifikasi Gagal',
        detail: detail,
      );
    }
  }

  static String _statusLabel(String status) {
    switch (status) {
      case 'aktif':
        return 'Anggota Aktif';
      case 'nonaktif':
        return 'Nonaktif';
      case 'pindah':
        return 'Pindah';
      case 'keluar':
        return 'Keluar';
      case 'meninggal':
        return 'Meninggal';
      default:
        return status;
    }
  }

  Future<ScanResultData> _checkIn(String qrData) async {
    // QR check-in berformat: {"id":"<graduationId>","type":"graduation"}
    // — tidak perlu seleksi kegiatan manual.
    String? graduationId;
    try {
      final decoded = jsonDecode(qrData);
      if (decoded is Map<String, dynamic> &&
          decoded['type'] == 'graduation' &&
          decoded['id'] != null) {
        graduationId = decoded['id'].toString();
      }
    } catch (_) {
      // Bukan JSON — fallback ke kegiatan terpilih (kompatibilitas lama).
    }

    graduationId ??= _selectedKegiatanId;
    if (graduationId == null || graduationId.isEmpty) {
      return const ScanResultData(
          success: false,
          message: 'QR tidak dikenali',
          detail: 'Scan QR absensi pendadaran yang ditampilkan panitia.');
    }

    try {
      final res =
          await _api.dio.post(AppConstants.graduationCheckIn(graduationId));
      final success = res.data?['success'] == true;
      final nama = res.data?['data']?['kegiatan']?['nama']?.toString() ??
          'Pendadaran';
      return ScanResultData(
        success: success,
        message: success
            ? 'Check-in Berhasil ✓'
            : (res.data['message']?.toString() ?? 'Check-in Gagal'),
        detail: nama,
      );
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      final msg = e.response?.data?['message'];
      final detail = msg is String
          ? msg
          : msg is List && msg.isNotEmpty
              ? msg.first.toString()
              : _api.messageFromError(e);
      if (status == 403 || status == 401) {
        return ScanResultData(
            success: false, message: 'Akses Terbatas', detail: detail);
      }
      return ScanResultData(
          success: false, message: 'Check-in Gagal', detail: detail);
    } catch (e) {
      return ScanResultData(
        success: false,
        message: 'Check-in Gagal',
        detail: _api.messageFromError(e),
      );
    }
  }

  Future<ScanResultData> _lookupMember(String qrData) async {
    if (!_isAdmin) {
      return const ScanResultData(
        success: false,
        message: 'Akses Terbatas',
        detail: 'Pencarian anggota hanya tersedia untuk admin.',
      );
    }
    try {
      final res = await _api.dio
          .get('/members', queryParameters: {'search': qrData, 'limit': 1});
      final list = res.data['data'];
      if (list is List && list.isNotEmpty) {
        final m = list.first as Map<String, dynamic>;
        return ScanResultData(
          success: true,
          message: 'Anggota Ditemukan',
          detail:
              'Nama: ${m['namaLengkap'] ?? m['nama'] ?? '-'}\nNo: ${m['nomorAnggota'] ?? m['noAnggota'] ?? '-'}\nStatus: ${m['statusKeanggotaan'] ?? m['status'] ?? '-'}',
        );
      }
      return const ScanResultData(
          success: false, message: 'Anggota tidak ditemukan', detail: '');
    } on DioException catch (e) {
      if (e.response?.statusCode == 403 || e.response?.statusCode == 401) {
        return const ScanResultData(
          success: false,
          message: 'Akses Terbatas',
          detail: 'Pencarian anggota hanya tersedia untuk admin.',
        );
      }
      return ScanResultData(
        success: false,
        message: 'Pencarian Gagal',
        detail: _api.messageFromError(e),
      );
    }
  }

  /// Pilih gambar dari galeri lalu decode QR dari file tersebut.
  Future<void> _pickImageFromGallery() async {
    try {
      final XFile? file =
          await _imagePicker.pickImage(source: ImageSource.gallery);
      if (file == null || !mounted) return;

      setState(() => _scanningKey = 'gallery');
      final capture = await _scanner.analyzeImage(file.path);
      if (!mounted) return;

      final raw = capture?.barcodes
          .where((b) => b.rawValue != null)
          .firstOrNull
          ?.rawValue;
      if (raw == null) {
        setState(() {
          _result = const ScanResultData(
            success: false,
            message: 'QR Tidak Ditemukan',
            detail: 'Gambar tidak mengandung QR code yang valid.',
          );
          _scanningKey = null;
        });
        return;
      }

      final key = DateTime.now().millisecondsSinceEpoch.toString();
      setState(() => _scanningKey = key);
      try {
        final result = await _handle(raw);
        if (!mounted) return;
        setState(() => _result = result);
        await _saveHistory(ScanHistoryItem(
          id: key,
          type: _mode == ScanMode.verify
              ? 'document_verify'
              : _mode == ScanMode.checkin
                  ? 'check_in'
                  : 'member_lookup',
          result: result.message,
          detail: result.detail,
          timestamp: DateTime.now().toIso8601String(),
        ));
      } catch (e) {
        if (!mounted) return;
        setState(() => _result = ScanResultData(
              success: false,
              message: 'Terjadi kesalahan: ${_api.messageFromError(e)}',
              detail: 'QR: ${raw.length > 30 ? '${raw.substring(0, 30)}...' : raw}',
            ));
      } finally {
        if (mounted && _scanningKey == key) {
          setState(() => _scanningKey = null);
        }
      }
    } catch (e) {
      debugPrint('Gagal memproses gambar galeri: $e');
      if (mounted) {
        setState(() {
          _result = const ScanResultData(
            success: false,
            message: 'Gagal Memproses Gambar',
            detail: 'Pilih gambar lain yang lebih jelas.',
          );
          _scanningKey = null;
        });
      }
    }
  }

  /// Lookup manual berdasarkan nama/nomor anggota yang diketik user.
  Future<void> _lookupManual() async {
    final query = _manualSearchController.text.trim();
    if (query.isEmpty) return;
    if (!_isAdmin) {
      setState(() => _result = const ScanResultData(
            success: false,
            message: 'Akses Terbatas',
            detail: 'Pencarian anggota hanya tersedia untuk admin.',
          ));
      return;
    }

    setState(() => _scanningKey = 'manual');
    try {
      final result = await _lookupMember(query);
      if (!mounted) return;
      setState(() => _result = result);
      await _saveHistory(ScanHistoryItem(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        type: 'member_lookup',
        result: result.message,
        detail: result.detail,
        timestamp: DateTime.now().toIso8601String(),
      ));
    } finally {
      if (mounted) setState(() => _scanningKey = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan QR'),
        actions: [
          ValueListenableBuilder<MobileScannerState>(
            valueListenable: _scanner,
            builder: (context, state, child) {
              return IconButton(
                icon: Icon(
                  state.torchState == TorchState.on
                      ? Icons.flash_on
                      : Icons.flash_off,
                  color: state.torchState == TorchState.on
                      ? Colors.yellow
                      : Colors.white,
                ),
                onPressed: () {
                  try {
                    _scanner.toggleTorch();
                  } catch (_) {
                    // Kamera belum siap; tombol aktif lagi setelah start.
                  }
                },
              );
            },
          ),
          ValueListenableBuilder<MobileScannerState>(
            valueListenable: _scanner,
            builder: (context, state, child) {
              return IconButton(
                icon: Icon(
                  state.cameraDirection == CameraFacing.front
                      ? Icons.camera_front
                      : Icons.camera_rear,
                ),
                onPressed: () {
                  try {
                    _scanner.switchCamera();
                  } catch (_) {
                    // Kamera belum siap; tombol aktif lagi setelah start.
                  }
                },
              );
            },
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    return Column(
      children: [
        _modeSelector(),
        if (_mode == ScanMode.lookup) ...[
          _lookupSearchTypeSelector(),
          if (!_isAdmin) _nonAdminBanner(),
          if (_lookupSearchType == LookupSearchType.manual) _manualSearchField(),
        ],
        _cameraArea(),
        if (_result != null) _resultCard(),
        Expanded(child: _historySection()),
      ],
    );
  }

  /// Selector sub-mode Cari Anggota: Scan QR vs Manual (Nama/Nomor).
  Widget _lookupSearchTypeSelector() {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
      child: Row(
        children: [
          _lookupTypeChip(LookupSearchType.qrCode, 'Scan QR', Icons.qr_code_2),
          const SizedBox(width: 6),
          _lookupTypeChip(LookupSearchType.manual, 'Nama/Nomor',
              Icons.person_search_outlined),
        ],
      ),
    );
  }

  Widget _lookupTypeChip(LookupSearchType type, String label, IconData icon) {
    final active = _lookupSearchType == type;
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: () => setState(() => _lookupSearchType = type),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: active
                ? AppTheme.primary
                : Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon,
                  size: 14,
                  color: active
                      ? Colors.white
                      : Theme.of(context).colorScheme.onSurfaceVariant),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: active
                      ? Colors.white
                      : Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Banner peringatan bila user non-admin mengakses Cari Anggota.
  Widget _nonAdminBanner() {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 8),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: AppTheme.danger.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.danger.withValues(alpha: 0.3)),
      ),
      child: const Row(
        children: [
          Icon(Icons.lock_outline, color: AppTheme.danger, size: 16),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              'Pencarian anggota hanya tersedia untuk admin.',
              style: TextStyle(
                color: AppTheme.danger,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Input manual untuk pencarian nama/nomor anggota.
  Widget _manualSearchField() {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _manualSearchController,
              enabled: _isAdmin,
              decoration: InputDecoration(
                hintText: _isAdmin
                    ? 'Ketik nama atau nomor anggota...'
                    : 'Tidak tersedia untuk non-admin',
                hintStyle: const TextStyle(fontSize: 13),
                prefixIcon: const Icon(Icons.search, size: 18),
                isDense: true,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              style: const TextStyle(fontSize: 13),
              onSubmitted: (_) => _lookupManual(),
            ),
          ),
          const SizedBox(width: 8),
          IconButton.filled(
            onPressed: _isAdmin ? _lookupManual : null,
            icon: const Icon(Icons.arrow_forward, size: 18),
            style: IconButton.styleFrom(backgroundColor: AppTheme.primary),
            tooltip: 'Cari',
          ),
        ],
      ),
    );
  }

  Widget _modeSelector() {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      padding: const EdgeInsets.all(10),
      child: Row(
        children: [
          _modeChip(ScanMode.verify, 'Verifikasi', Icons.verified_outlined),
          const SizedBox(width: 6),
          _modeChip(ScanMode.checkin, 'Check-in', Icons.location_on_outlined),
          const SizedBox(width: 6),
          _modeChip(
              ScanMode.lookup, 'Cari Anggota', Icons.person_search_outlined),
        ],
      ),
    );
  }

  Widget _modeChip(ScanMode mode, String label, IconData icon) {
    final active = _mode == mode;
    final color =
        mode == ScanMode.checkin ? AppTheme.success : AppTheme.primary;
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: () => setState(() => _mode = mode),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: active
                ? color
                : Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon,
                  size: 16,
                  color: active
                      ? Colors.white
                      : Theme.of(context).colorScheme.onSurfaceVariant),
              const SizedBox(width: AppTheme.space4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: active
                      ? Colors.white
                      : Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _cameraArea() {
    return Container(
      height: 280,
      margin: const EdgeInsets.symmetric(horizontal: 12),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Stack(
        children: [
          if (_isCheckingPermission)
            const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AppLoadingSpinner.small(color: Colors.white),
                  SizedBox(height: 12),
                  Text(
                    'Menyiapkan kamera...',
                    style: TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                ],
              ),
            )
          else if (!_cameraPermissionGranted || _cameraErrorMessage != null)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.camera_alt_outlined,
                        color: Colors.white70, size: 42),
                    const SizedBox(height: 10),
                    const Text(
                      'Kamera Tidak Aktif',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _cameraErrorMessage ??
                          'Aktifkan izin kamera untuk memindai QR code.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.75),
                          fontSize: 12),
                    ),
                    const SizedBox(height: 14),
                    if (_cameraPermanentlyDenied) ...[
                      // Izin ditolak permanen: "Coba Lagi" tidak akan memunculkan
                      // dialog lagi — arahkan langsung ke pengaturan aplikasi.
                      ElevatedButton.icon(
                        onPressed: openAppSettings,
                        icon: const Icon(Icons.settings, size: 16),
                        label: const Text('Buka Pengaturan HP'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          foregroundColor: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextButton.icon(
                        onPressed: _checkCameraPermission,
                        icon: const Icon(Icons.refresh, size: 14),
                        label: const Text('Periksa Lagi'),
                        style: TextButton.styleFrom(
                            foregroundColor: Colors.white70),
                      ),
                    ] else ...[
                      ElevatedButton.icon(
                        onPressed: _checkCameraPermission,
                        icon: const Icon(Icons.refresh, size: 16),
                        label: const Text('Izinkan / Coba Lagi'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          foregroundColor: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextButton.icon(
                        onPressed: openAppSettings,
                        icon: const Icon(Icons.settings, size: 14),
                        label: const Text('Buka Pengaturan HP'),
                        style: TextButton.styleFrom(
                            foregroundColor: Colors.white70),
                      ),
                    ],
                  ],
                ),
              ),
            )
          else
            MobileScanner(
              controller: _scanner,
              onDetect: _onDetect,
              errorBuilder: (context, error) {
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline,
                            color: Colors.white, size: 40),
                        const SizedBox(height: 10),
                        const Text(
                          'Kamera tidak dapat diakses',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _scannerErrorMessage(error),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.7),
                              fontSize: 11),
                        ),
                        const SizedBox(height: 12),
                        OutlinedButton.icon(
                          onPressed: _startScanner,
                          icon: const Icon(Icons.refresh, size: 16),
                          label: const Text('Muat Ulang Kamera'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            side: const BorderSide(color: Colors.white70),
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextButton.icon(
                          onPressed: openAppSettings,
                          icon: const Icon(Icons.settings, size: 14),
                          label: const Text('Buka Pengaturan'),
                          style: TextButton.styleFrom(
                              foregroundColor: Colors.white70),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          Center(
            child: Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white70, width: 2),
                borderRadius: BorderRadius.circular(24),
              ),
            ),
          ),
          // Tombol scan dari galeri — di pojok kiri bawah area kamera.
          Positioned(
            left: 12,
            bottom: 12,
            child: Material(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
              child: InkWell(
                borderRadius: BorderRadius.circular(10),
                onTap: _scanningKey != null ? null : _pickImageFromGallery,
                child: const Padding(
                  padding:
                      EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.photo_library_outlined,
                          color: Colors.white, size: 16),
                      SizedBox(width: 6),
                      Text(
                        'Galeri',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          if (_scanningKey != null)
            Container(
              color: Colors.black54,
              child: const Center(
                child: AppLoadingSpinner.small(color: Colors.white),
              ),
            ),
        ],
      ),
    );
  }

  Widget _resultCard() {
    final r = _result!;
    final color = r.success ? AppTheme.success : AppTheme.danger;
    // Aksen (ikon & teks) memakai varian yang kontras di tema aktif; warna
    // solid di atas hanya dipakai untuk tint latar & border kartu.
    final accent = r.success
        ? AppTheme.successOf(context)
        : Theme.of(context).colorScheme.error;
    return Card(
      margin: const EdgeInsets.all(AppTheme.space12),
      color: color.withValues(alpha: 0.06),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: color, width: 1.2),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.space12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(r.success ? Icons.check_circle : Icons.cancel,
                    color: accent),
                const SizedBox(width: AppTheme.space8),
                Expanded(
                  child: Text(
                    r.message,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: accent,
                    ),
                  ),
                ),
                IconButton(
                  // Target sentuh minimum 44 dp (a11y) — bukan compact.
                  constraints: const BoxConstraints(
                    minWidth: AppTheme.touchTargetCompact,
                    minHeight: AppTheme.touchTargetCompact,
                  ),
                  padding:
                      const EdgeInsets.all(AppTheme.touchTargetCompact / 6),
                  icon: const Icon(Icons.close, size: 18),
                  onPressed: () => setState(() => _result = null),
                ),
              ],
            ),
            if (r.detail.isNotEmpty)
              Text(
                r.detail,
                style: TextStyle(
                  fontSize: 12,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                  height: 1.45,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _historySection() {
    if (_history.isEmpty) {
      return Center(
        child: Text(
          'Belum ada riwayat scan',
          style: TextStyle(
              fontSize: 13,
              color: Theme.of(context).colorScheme.onSurfaceVariant),
        ),
      );
    }
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 12, 4),
          child: Row(
            children: [
              const Expanded(
                child: Text(
                  'Riwayat Scan',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                ),
              ),
              TextButton(
                onPressed: _clearHistory,
                child: Text(
                  'Hapus Riwayat',
                  style: TextStyle(
                      fontSize: 12, color: Theme.of(context).colorScheme.error),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: _history.length,
            itemBuilder: (context, i) {
              final h = _history[i];
              final ok = h.result.contains('✓') ||
                  h.result.contains('Berhasil') ||
                  h.result.contains('Ditemukan');
              return ListTile(
                dense: true,
                leading: Icon(
                  ok ? Icons.check_circle_outline : Icons.cancel_outlined,
                  color: ok
                      ? AppTheme.successOf(context)
                      : Theme.of(context).colorScheme.error,
                ),
                title: Text(h.result,
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w600)),
                subtitle: Text(
                  '${h.detail}\n${Formatters.relative(h.timestamp)}',
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                      fontSize: 11,
                      color: Theme.of(context).colorScheme.onSurfaceVariant),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
