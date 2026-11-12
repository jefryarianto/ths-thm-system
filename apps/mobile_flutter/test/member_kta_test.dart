import 'package:flutter_test/flutter_test.dart';
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

void main() {
  test('distrik dinormalisasi dari namaDistrik', () {
    final kta = MemberKta.from(_member(namaDistrik: 'Keuskupan Larantuka'), null);
    expect(kta.distrik, 'LARANTUKA');
  });

  test('distrik kosong memakai fallback THS-THM', () {
    final kta = MemberKta.from(_member(namaDistrik: '  '), null);
    expect(kta.distrik, 'THS-THM');
  });
}
