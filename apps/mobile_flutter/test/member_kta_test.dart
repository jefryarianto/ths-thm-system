import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/data/models/card_data.dart';
import 'package:mobile_flutter/data/models/member.dart';
import 'package:mobile_flutter/data/models/member_kta.dart';

Member _member({String namaDistrik = 'Flores Timur'}) => Member(
      id: 'anggota-1',
      email: 'anggota@example.com',
      nomorAnggota: 'LRT-0103-001-1994',
      namaLengkap: 'Jefry Arianto Baba',
      jenisKelamin: 'L',
      tingkat: 'MUDA',
      statusKeanggotaan: 'AKTIF',
      statusValidasi: 'VALID',
      statusData: 'LENGKAP',
      tempatLahir: 'Rote',
      tanggalLahir: '1983-07-06',
      tempatDadar: 'Larantuka',
      tahunDadar: '1998',
      alamat: 'Jalan Ikan Tenggiri No. 40 Postoh, Larantuka, Flores Timur, NTT',
      noHp: '081234567890',
      fotoPath: '',
      rantingId: 'ranting-1',
      namaRanting: 'San Juan Lebao',
      namaWilayah: 'Larantuka',
      namaDistrik: namaDistrik,
    );

CardData _cardData() => CardData(
      signers: const [],
      signerName: 'YOSEPH PEHAN BETAN',
      signerTitle: 'KOORDINATOR DISTRIK FLORES TIMUR',
      signatureImage: '/api/uploads/tanda-tangan.png',
      stampImage: 'stempel.png',
      verificationUrl: 'https://ths-thm.cloud/verify/abc',
      qrCode: 'data:image/png;base64,QR',
    );

void main() {
  test('distrik dinormalisasi dari namaDistrik', () {
    final kta = MemberKta.from(_member(namaDistrik: 'Keuskupan Larantuka'), null);
    expect(kta.distrik, 'LARANTUKA');
  });

  test('distrik kosong memakai fallback THS-THM', () {
    final kta = MemberKta.from(_member(namaDistrik: '  '), null);
    expect(kta.distrik, 'THS-THM');
  });

  test('memetakan jabatan, ttd, stempel, QR, dan URL verifikasi dari CardData', () {
    final card = _cardData();
    final kta = MemberKta.from(_member(), card);

    expect(kta.signerTitle, 'KOORDINATOR DISTRIK FLORES TIMUR');
    expect(kta.tandaTanganUrl, card.signatureUrl);
    expect(kta.tandaTanganUrl, isNot('/api/uploads/tanda-tangan.png'));
    expect(kta.stampImageUrl, card.stampUrl);
    expect(kta.stampImageUrl, isNot('stempel.png'));
    expect(kta.qrImageUrl, card.qrCode);
    expect(kta.verificationUrl, card.verificationUrl);
  });

  test('tanpa CardData field penandatangan dan verifikasi kosong', () {
    final kta = MemberKta.from(_member(), null);

    expect(kta.signerTitle, '');
    expect(kta.verificationUrl, '');
    expect(kta.tandaTanganUrl, '');
    expect(kta.stampImageUrl, '');
    expect(kta.qrImageUrl, '');
  });
}
