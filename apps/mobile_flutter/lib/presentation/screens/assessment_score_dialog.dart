import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../data/models/graduation.dart';
import '../../logic/assessments/assessment_bloc.dart';
import '../../logic/assessments/assessment_event.dart';
import '../../core/utils/snack_bar_helper.dart';

/// F4 - Dialog input skor bulk untuk satu peserta via ujian praktek.
/// Mengirim satu request POST ke
/// `/graduations/:id/ujian-praktek/:ujianId/score` dengan payload
/// `{scores: [{calonAnggotaId, items: [{itemPenilaianId, skor, komentar?}]}]}`.
///
/// HANYA item yang benar-benar diisi penguji yang dikirim dalam
/// satu [AssessmentBulkScoreSubmitRequested] — item kosong tidak ikut
/// terkirim (mencegah skor 0 tersimpan utk item yg belum dinilai).
/// Indikator progres menampilkan jumlah item terisi; simpan parsial
/// dikonfirmasi dulu. Backend mengekstrak `pengujiUserId` dari
/// authentication header.
class AssessmentScoreDialog extends StatefulWidget {
  final String pesertaNama;
  final List<AssessmentAspect> aspekList;
  final String kegiatanId;
  final String calonAnggotaId;
  final String ujianPraktekId;

  /// Skor milik penguji yang sudah tersimpan di server (dari my-score-card),
  /// key = itemPenilaianId. Dipakai utk prefill supaya penguji melanjutkan
  /// penilaian — bukan memulai dari nol — dan progres "x/y terisi" akurat.
  final Map<String, ({double skor, String? komentar})> existingScores;
  final VoidCallback? onScoreSaved;

  const AssessmentScoreDialog({
    required this.pesertaNama,
    required this.aspekList,
    required this.kegiatanId,
    required this.calonAnggotaId,
    required this.ujianPraktekId,
    this.existingScores = const {},
    this.onScoreSaved,
    super.key,
  });

  @override
  State<AssessmentScoreDialog> createState() => _AssessmentScoreDialogState();
}

class _AssessmentScoreDialogState extends State<AssessmentScoreDialog> {
  final _formKey = GlobalKey<FormState>();
  String? _aspekId;
  final _skorByItem = <String, double>{};
  final _catatanByItem = <String, String>{};

  @override
  void initState() {
    super.initState();
    _prefillFromExisting();
    if (_aspekId == null && widget.aspekList.isNotEmpty) {
      _aspekId = widget.aspekList.first.id;
    }
  }

  /// Prefill skor/komentar yang sudah tersimpan di server.
  void _prefillFromExisting() {
    for (final a in widget.aspekList) {
      for (final i in a.items) {
        final existing = widget.existingScores[i.id];
        if (existing == null) continue;
        _skorByItem[i.id] = existing.skor;
        final t = existing.komentar?.trim() ?? '';
        if (t.isNotEmpty) _catatanByItem[i.id] = t;
      }
    }
  }

  /// Total item penilaian di semua aspek (untuk indikator progres).
  int get _totalItems =>
      widget.aspekList.fold(0, (n, a) => n + a.items.length);

  List<AssessmentItem> get _itemsOfSelected {
    if (_aspekId == null) return const <AssessmentItem>[];
    for (final a in widget.aspekList) {
      if (a.id == _aspekId) return a.items;
    }
    return const <AssessmentItem>[];
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Input Nilai — ${widget.pesertaNama}'),
      content: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              const Text(
                'Isi skor item yang ingin dinilai. Skor minimal 0, '
                'maksimal sesuai definisi item. Item yang dikosongkan '
                'tidak dikirim.',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: _aspekId,
                decoration: const InputDecoration(
                  labelText: 'Aspek *',
                  border: UnderlineInputBorder(),
                ),
                items: widget.aspekList.map((a) => DropdownMenuItem<String>(
                      value: a.id,
                      child: Text(a.namaAspek),
                    )).toList(),
                onChanged: (v) {
                  setState(() {
                    _aspekId = v;
                    // Jangan hapus data — hanya tampilkan item aspek ini.
                  });
                },
              ),
              const SizedBox(height: 12),
              _buildProgressRow(),
              const SizedBox(height: 12),
              ..._buildItemScoreFields(),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Batal'),
        ),
        FilledButton(
          onPressed: _submitBulk,
          child: const Text('Simpan Semua'),
        ),
      ],
    );
  }

  /// Indikator progres: berapa item (dari semua aspek) yang sudah terisi.
  Widget _buildProgressRow() {
    final total = _totalItems;
    final filled = _skorByItem.length;
    return Row(
      children: [
        Expanded(
          child: LinearProgressIndicator(
            value: total == 0
                ? 0.0
                : (filled / total).clamp(0.0, 1.0).toDouble(),
            minHeight: 4,
          ),
        ),
        const SizedBox(width: 10),
        Text(
          '$filled/$total terisi',
          style: const TextStyle(fontSize: 12, color: Colors.grey),
        ),
      ],
    );
  }

  List<Widget> _buildItemScoreFields() {
    final items = _itemsOfSelected;
    if (items.isEmpty) {
      return const <Widget>[
        Text(
          'Belum ada item penilaian pada aspek ini.',
          style: TextStyle(fontSize: 12, color: Colors.grey),
        ),
      ];
    }
    final widgets = <Widget>[];
    for (final item in items) {
      final skorMax = item.skorMaksimal.toStringAsFixed(0);
      widgets.add(const SizedBox(height: 8));
      widgets.add(Text(
        '${item.namaItem} (maks $skorMax)',
        style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
      ));
      widgets.add(const SizedBox(height: 4));
      widgets.add(TextFormField(
        // Key per item: teks field mengikuti identitas item saat pindah aspek,
        // initialValue mengisi ulang dari map tiap State baru dibuat.
        key: ValueKey('skor-${item.id}'),
        initialValue: _skorByItem.containsKey(item.id)
            ? _skorByItem[item.id]!.toString()
            : null,
        decoration: InputDecoration(
          labelText: 'Skor *',
          hintText: '0 sampai $skorMax',
          border: const UnderlineInputBorder(),
        ),
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        inputFormatters: [
          FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
        ],
        validator: (v) {
          // Field kosong valid — item kosong tidak ikut dikirim.
          if (v == null || v.trim().isEmpty) return null;
          final double? d = double.tryParse(v.trim());
          if (d == null || d < 0) return 'Skor harus >= 0';
          if (d > item.skorMaksimal) {
            return 'Skor maksimal ${item.skorMaksimal}';
          }
          return null;
        },
        onChanged: (v) {
          final val = v.trim();
          setState(() {
            if (val.isEmpty) {
              // Dikosongkan -> item keluar dari daftar yang dikirim.
              _skorByItem.remove(item.id);
              return;
            }
            final double? d = double.tryParse(val);
            if (d == null || d < 0 || d > item.skorMaksimal) {
              // Input belum valid (mis. "1.2.3") -> tidak dianggap terisi.
              _skorByItem.remove(item.id);
              return;
            }
            _skorByItem[item.id] = d;
            if (d == 0) {
              _catatanByItem[item.id] = '';
            }
          });
        },
      ));
      widgets.add(const SizedBox(height: 4));
      widgets.add(TextFormField(
        key: ValueKey('catatan-${item.id}'),
        initialValue: _catatanByItem[item.id],
        decoration: const InputDecoration(
          labelText: 'Catatan (opsional)',
          hintText: 'Catatan tentang skor ini',
          border: UnderlineInputBorder(),
        ),
        onChanged: (v) {
          setState(() {
            final t = v.trim();
            if (t.isEmpty) {
              _catatanByItem.remove(item.id);
            } else {
              _catatanByItem[item.id] = t;
            }
          });
        },
      ));
    }
    return widgets;
  }

  Future<void> _submitBulk() async {
    if (!_formKey.currentState!.validate()) return;

    if (_skorByItem.isEmpty) {
      showCenteredSnackBar(context, 'Isi minimal satu skor sebelum menyimpan');
      return;
    }

    // Simpan parsial boleh (backend upsert per item), tapi konfirmasi dulu
    // supaya penguji sadar belum semua item terisi.
    final total = _totalItems;
    final filled = _skorByItem.length;
    if (filled < total) {
      final lanjut = await _confirmPartialSubmit(filled, total);
      if (lanjut != true || !mounted) return;
    }

    context.read<AssessmentBloc>().add(
          AssessmentBulkScoreSubmitRequested(
            kegiatanId: widget.kegiatanId,
            ujianPraktekId: widget.ujianPraktekId,
            calonAnggotaId: widget.calonAnggotaId,
            // Kirim HANYA item yang benar-benar diisi (skor 0 pun hanya
            // bila penguji memang mengetik 0).
            skorByItem: Map.unmodifiable(_skorByItem),
            catatanByItem: Map.unmodifiable(_catatanByItem),
          ),
        );
    Navigator.of(context).pop();
    widget.onScoreSaved?.call();
  }

  Future<bool?> _confirmPartialSubmit(int filled, int total) {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Simpan sebagian?'),
        content: Text(
          'Baru $filled dari $total item terisi. Item yang belum diisi '
          'tidak akan dikirim dan bisa dilengkapi nanti.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Simpan yang terisi'),
          ),
        ],
      ),
    );
  }
}
