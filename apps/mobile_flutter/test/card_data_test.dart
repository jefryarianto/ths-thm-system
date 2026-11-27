import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/data/models/card_data.dart';

void main() {
  test('CardData.fromJson mem-parse generated=false + data KTA baru', () {
    final json = {
      'generated': false,
      'card': null,
      'qrCode': null,
      'fotoDataUrl': 'data:image/png;base64,PHOTO',
      'member': {
        'nomorAnggota': 'LRT-0103-001-1994',
        'pekerjaan': 'Pegawai',
        'tanggalTerbit': '2026-11-02T00:00:00.000Z',
        'tanggalBerlakuSampai': '2029-11-02T00:00:00.000Z',
        'pelantikanTahun': '1994',
      },
    };
    final cd = CardData.fromJson(json);
    expect(cd.generated, isFalse);
    expect(cd.qrCode, isEmpty);
    expect(cd.fotoDataUrl, 'data:image/png;base64,PHOTO');
    expect(cd.pekerjaan, 'Pegawai');
    expect(cd.tanggalTerbit, '2026-11-02T00:00:00.000Z');
    expect(cd.tanggalBerlakuSampai, '2029-11-02T00:00:00.000Z');
    expect(cd.pelantikanTahun, '1994');
  });

  test('falls closed when adminIssued is missing', () {
    final cd = CardData.fromJson({'generated': true});

    expect(cd.adminIssued, isFalse);
  });

  test('CardData.fromJson parses adminIssued=true', () {
    final cd = CardData.fromJson({
      'generated': true,
      'adminIssued': true,
    });

    expect(cd.adminIssued, isTrue);
  });

  test('data URL diteruskan apa adanya oleh resolver upload', () {
    const signature = 'data:image/png;base64,SIG';
    const stamp = 'data:image/png;base64,STAMP';
    final cd = CardData(
      signers: const [],
      signerName: 'YOSEPH PEHAN BETAN',
      signerTitle: 'KOORDINATOR DISTRIK',
      signatureImage: signature,
      stampImage: stamp,
    );

    expect(cd.signatureUrl, signature);
    expect(cd.stampUrl, stamp);
    expect(cd.signatureUrl, isNot(contains('/api/uploads/data:')));
    expect(cd.stampUrl, isNot(contains('/api/uploads/data:')));
  });

  test('CardData.fromJson meneruskan field penandatangan dan QR apa adanya', () {
    final cd = CardData.fromJson({
      'card': {
        'signerTitle': 'Ketua Distrik',
        'signatureImage': 'data:image/png;base64,SIG',
        'stampImage': 'data:image/png;base64,STAMP',
        'verificationUrl': 'https://ths-thm.cloud/verify/abc',
      },
      'qrCode': 'data:image/png;base64,QR',
    });

    expect(cd.signerTitle, 'Ketua Distrik');
    expect(cd.signatureUrl, 'data:image/png;base64,SIG');
    expect(cd.stampUrl, 'data:image/png;base64,STAMP');
    expect(cd.verificationUrl, 'https://ths-thm.cloud/verify/abc');
    expect(cd.qrCode, 'data:image/png;base64,QR');
  });

  test('CardData.fromJson kompatibel dengan respons lama (tanpa generated)', () {
    final json = {
      'card': {
        'signerName': 'Yoseph Pehan Betan',
        'signerTitle': 'Koordinator Distrik',
        'verificationUrl': 'https://ths-thm.cloud/verify/abc',
        'nomorDokumen': 'KTA-LRT-0103-001-1994',
        'status': 'generated',
      },
      'member': {},
      'qrCode': 'data:image/png;base64,QR',
    };
    final cd = CardData.fromJson(json);
    expect(cd.generated, isTrue); // default true untuk server lama
    expect(cd.signerName, 'Yoseph Pehan Betan');
    expect(cd.qrCode, 'data:image/png;base64,QR');
    expect(cd.pekerjaan, isEmpty);
  });
}
