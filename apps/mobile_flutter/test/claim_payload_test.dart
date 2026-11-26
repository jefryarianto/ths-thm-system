import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/logic/claim/claim_bloc.dart';

void main() {
  const story = 'Saya menjadi anggota sejak 2019 dan aktif hingga sekarang.';
  late Directory tempDir;
  late List<String> paths;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('claim_payload_test');
    paths = [];
    for (final name in ['a.jpg', 'b.png', 'c.pdf']) {
      final file = File('${tempDir.path}${Platform.pathSeparator}$name');
      await file.writeAsBytes(<int>[0]);
      paths.add(file.path);
    }
  });

  tearDown(() {
    if (tempDir.existsSync()) tempDir.deleteSync(recursive: true);
  });

  test('buildClaimFields sends modeBukti cerita and ceritaHistori', () {
    final event = ClaimCreateRequested(
      tipe: 'keanggotaan',
      modeBukti: 'cerita',
      ceritaHistori: story,
    );

    final fields = buildClaimFields(event);

    expect(fields['modeBukti'], 'cerita');
    expect(fields['ceritaHistori'], story);
  });

  test('buildClaimFormData sends buktiFiles for 3 paths', () async {
    final event = ClaimCreateRequested(
      tipe: 'keanggotaan',
      modeBukti: 'unggah',
      buktiFilePaths: paths,
    );

    final formData = await buildClaimFormData(event);

    expect(
      formData.fields.any((e) => e.key == 'modeBukti' && e.value == 'unggah'),
      isTrue,
    );
    expect(
      formData.files.where((e) => e.key == 'buktiFiles').length,
      3,
    );
  });

  test('buildClaimFormData rejects more than 3 paths', () async {
    final event = ClaimCreateRequested(
      tipe: 'keanggotaan',
      modeBukti: 'unggah',
      buktiFilePaths: [...paths, '${paths.first}.extra'],
    );

    try {
      await buildClaimFormData(event);
      fail('Expected ArgumentError');
    } on ArgumentError catch (e) {
      expect(e.message.toString(), contains('Maksimal 3 berkas bukti'));
    }
  });
}
