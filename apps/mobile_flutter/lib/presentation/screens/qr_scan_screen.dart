import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../core/api/api_client.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../widgets/app_loading_spinner.dart';

enum ScanMode { verify, checkin, lookup }

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

class _QrScanScreenState extends State<QrScanScreen> {
  final MobileScannerController _scanner =
      MobileScannerController(formats: const [BarcodeFormat.qrCode]);
  final ApiClient _api = ApiClient();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  ScanMode _mode = ScanMode.verify;
  String? _scanningKey;
  List<ScanHistoryItem> _history = [];
  List<KegiatanItem> _kegiatan = [];
  String? _selectedKegiatanId;
  bool _loadingKegiatan = true;
  ScanResultData? _result;

  @override
  void initState() {
    super.initState();
    _loadHistory();
    _fetchKegiatan();
  }

  @override
  void dispose() {
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
    setState(() => _loadingKegiatan = true);
    final items = <KegiatanItem>[];
    try {
      // Untuk anggota, yang paling relevan adalah daftar undangan pendadaran (Graduations)
      // karena mereka bisa self check-in di sana.
      final response = await _api.dio.get(AppConstants.graduationsMe);
      final List<dynamic> list = response.data['data'] ?? [];

      for (final item in list) {
        final grad = item['kegiatan'];
        if (grad != null) {
          items.add(KegiatanItem(
            id: grad['id'].toString(),
            nama: grad['nama'].toString(),
            lokasi: grad['lokasi']?.toString(),
            tanggalMulai: grad['tanggalMulai']?.toString() ?? '',
            type: 'graduation',
          ));
        }
      }
    } catch (e) {
      debugPrint('Error fetching invitations: $e');
    }

    if (mounted) {
      setState(() {
        _kegiatan = items;
        _loadingKegiatan = false;
        if (items.isNotEmpty) {
          _selectedKegiatanId = items.first.id;
        }
      });
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
      final statusLabel = _statusLabel(m?['statusKeanggotaan']?.toString() ?? '');
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
        message: status == 404 ? 'Dokumen/Kartu Tidak Valid' : 'Verifikasi Gagal',
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
    final kegiatanId = _selectedKegiatanId;
    final kegiatan = _kegiatan.where((k) => k.id == kegiatanId).firstOrNull;
    if (kegiatan == null) {
      return const ScanResultData(
          success: false,
          message: 'Pilih kegiatan terlebih dahulu',
          detail: '');
    }

    try {
      // Hanya Graduation yang didukung untuk self check-in oleh anggota di backend saat ini.
      if (kegiatan.type == 'graduation') {
        final res =
            await _api.dio.post(AppConstants.graduationCheckIn(kegiatan.id));
        final success = res.data?['success'] == true;
        return ScanResultData(
          success: success,
          message: success
              ? 'Check-in Berhasil ✓'
              : (res.data['message']?.toString() ?? 'Check-in Gagal'),
          detail:
              '${kegiatan.nama}\nLokasi: ${kegiatan.lokasi ?? '-'}\nTanggal: ${Formatters.dateLong(kegiatan.tanggalMulai)}',
        );
      } else {
        return const ScanResultData(
          success: false,
          message: 'Fitur Tidak Tersedia',
          detail: 'Self check-in saat ini hanya tersedia untuk Pendadaran.',
        );
      }
    } catch (e) {
      return ScanResultData(
        success: false,
        message: 'Check-in Gagal',
        detail: _api.messageFromError(e),
      );
    }
  }

  Future<ScanResultData> _lookupMember(String qrData) async {
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
                onPressed: () => _scanner.toggleTorch(),
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
                onPressed: () => _scanner.switchCamera(),
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
        if (_mode == ScanMode.checkin) _kegiatanPicker(),
        _cameraArea(),
        if (_result != null) _resultCard(),
        Expanded(child: _historySection()),
      ],
    );
  }

  Widget _modeSelector() {
    return Container(
      color: Colors.white,
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
            color: active ? color : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon,
                  size: 16,
                  color: active ? Colors.white : Colors.grey.shade600),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: active ? Colors.white : Colors.grey.shade600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _kegiatanPicker() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
      child: _loadingKegiatan
          ? const Center(
              child: Padding(
                padding: EdgeInsets.all(8),
                child: AppLoadingSpinner.small(),
              ),
            )
          : _kegiatan.isEmpty
              ? Padding(
                  padding: const EdgeInsets.all(8),
                  child: Text(
                    'Tidak ada kegiatan aktif. Scan dibatasi verifikasi.',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                )
              : DropdownButtonFormField<String>(
                  initialValue: _selectedKegiatanId,
                  isExpanded: true,
                  decoration: InputDecoration(
                    labelText: 'Pilih Kegiatan',
                    prefixIcon: const Icon(Icons.event, size: 18),
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  items: _kegiatan
                      .map((k) => DropdownMenuItem<String>(
                            value: k.id,
                            child: Text(
                              k.nama,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 13),
                            ),
                          ))
                      .toList(),
                  onChanged: (v) => setState(() => _selectedKegiatanId = v),
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
          MobileScanner(
            controller: _scanner,
            onDetect: _onDetect,
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
    return Card(
      margin: const EdgeInsets.all(12),
      color: color.withValues(alpha: 0.06),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: color, width: 1.2),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(r.success ? Icons.check_circle : Icons.cancel,
                    color: color),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    r.message,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: color,
                    ),
                  ),
                ),
                IconButton(
                  visualDensity: VisualDensity.compact,
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
                  color: Colors.grey.shade700,
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
          style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
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
                child: const Text(
                  'Hapus Riwayat',
                  style: TextStyle(fontSize: 12, color: AppTheme.danger),
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
                  color: ok ? AppTheme.success : AppTheme.danger,
                ),
                title: Text(h.result,
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w600)),
                subtitle: Text(
                  '${h.detail}\n${Formatters.relative(h.timestamp)}',
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
