import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/core/utils/kta_layout.dart';
import 'package:mobile_flutter/data/models/member_kta.dart';

MemberKta sample({String berlakuSampai = ''}) {
  return MemberKta(
    nomorAnggota: 'LRT-0103-001-1994',
    berlakuSampai: berlakuSampai,
    namaLengkap: 'JEFRY ARIANTO BABA',
    jenisKelamin: 'L',
    ranting: 'SAN JUAN LEBAO',
    fotoUrl: '/api/uploads/x.png',
    qrImageUrl: 'data:image/png;base64,abc',
    tingkat: 'MUDA',
    tempatLahir: 'ROTE',
    tanggalLahir: '6 JULI 1983',
    pekerjaan: '',
    status: 'AKTIF',
    pelantikanTanggal: '',
    pelantikanTahun: '',
    alamat:
        'JALAN IKAN TENGGIRI NO. 40 POSTOH, LARANTUKA, FLORES TIMUR, NTT',
    tanggalTerbit: '',
    tanggalBerlakuSampai: '',
    namaKoordinator: 'E. HENDRIKUS MASAN BEDA',
    tandaTanganUrl: '',
    stampImageUrl: '',
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('font KtaDejaVu termuat', () async {
    await KtaLayoutCalculator.ensureFonts();
    expect(KtaSpec.fontFamily, 'KtaDejaVu');
  });

  test('calculate memproduksi field yang dibutuhkan', () async {
    await KtaLayoutCalculator.ensureFonts();
    final layout = KtaLayoutCalculator().calculate(sample());
    expect(layout.fields.keys,
        containsAll(['nomor', 'depanNama', 'ranting', 'belakangNama', 'lahir',
            'pekerjaan', 'status', 'pelantikan', 'alamat', 'berlaku', 'terbit',
            'koordinator']));
  });

  test('teks pendek muat (ok=true) dan tidak melebihi area aman', () async {
    await KtaLayoutCalculator.ensureFonts();
    final layout = KtaLayoutCalculator().calculate(sample());
    for (final f in layout.fields.values) {
      expect(f.ok, isTrue, reason: 'seharusnya semua teks contoh muat');
    }
    expect(layout.fields['nomor']!.widthMm, lessThanOrEqualTo(22.7));
    expect(layout.fields['depanNama']!.widthMm, lessThanOrEqualTo(30.7));
  });

  test('noData dan placeholder untuk field kosong', () async {
    await KtaLayoutCalculator.ensureFonts();
    final layout = KtaLayoutCalculator().calculate(sample());
    expect(layout.fields['pekerjaan']!.lines.single,
        contains('[BELUM DIISI]'));
    expect(layout.fields['pelantikan']!.lines.single,
        contains('[TANGGAL / TAHUN BELUM DIISI]'));
    expect(layout.fields['berlaku']!.lines.single, contains('[TGGL_EXPIRE]'));
    expect(layout.fields['terbit']!.lines.single, contains('...............'));
  });

  test('peringatan untuk data wajib kosong, JK salah, tingkat salah', () async {
    await KtaLayoutCalculator.ensureFonts();
    const kta = MemberKta(
      nomorAnggota: '',
      namaLengkap: '',
      jenisKelamin: 'X',
      ranting: '',
      fotoUrl: '',
      qrImageUrl: '',
      tingkat: 'ANGOTA',
      tempatLahir: '',
      tanggalLahir: '',
      pekerjaan: '',
      status: '',
      pelantikanTanggal: '',
      pelantikanTahun: '',
      alamat: '',
      tanggalTerbit: '',
      tanggalBerlakuSampai: '',
      namaKoordinator: '',
      tandaTanganUrl: '',
      stampImageUrl: '',
    );
    final layout = KtaLayoutCalculator().calculate(kta);
    expect(layout.warnings,
        anyElement(contains('Data nomorAnggota belum diisi.')));
    expect(layout.warnings, anyElement(contains('Jenis kelamin harus L atau P.')));
    expect(layout.warnings, anyElement(contains('Tingkat tidak valid.')));
  });

  group('expiryShort (label "EXP: MM/YY" di atas QR)', () {
    test('kosong → MM/YY', () {
      expect(expiryShort(''), 'MM/YY');
      expect(expiryShort(null), 'MM/YY');
      expect(expiryShort('   '), 'MM/YY');
    });

    test('YYYY-MM dan timestamp ISO penuh → MM/YY', () {
      expect(expiryShort('2031-10'), '10/31');
      expect(expiryShort('2027-03'), '03/27');
      expect(expiryShort('2027-03-01T00:00:00.000Z'), '03/27');
    });

    test('format salah → FORMAT?', () {
      expect(expiryShort('2027-3'), 'FORMAT?');
      expect(expiryShort('2031-13'), 'FORMAT?');
      expect(expiryShort('invalid'), 'FORMAT?');
    });

    test('field layout exp memakai teks EXP: MM/YY', () async {
      await KtaLayoutCalculator.ensureFonts();
      final calc = KtaLayoutCalculator();
      expect(calc.calculate(sample()).fields['exp']!.lines.single, 'EXP: MM/YY');
      expect(
        calc
            .calculate(sample(berlakuSampai: '2027-03-01T00:00:00.000Z'))
            .fields['exp']!
            .lines
            .single,
        'EXP: 03/27',
      );
    });
  });

  test('KtaRank fallback ke MUDA untuk tingkat tak dikenal', () {
    expect(KtaRank.forLevel('PRATAMA').color.toARGB32(), 0xFF185AB5);
    expect(KtaRank.forLevel('PRATAMA').count, 1);
    expect(KtaRank.forLevel('Muda').color.toARGB32(), 0xFFE4B500);
    expect(KtaRank.forLevel('TAMTAMA').count, 2);
    expect(KtaRank.forLevel('UTAMA').count, 3);
    expect(KtaRank.forLevel('HIKMAH').count, 1); // fallback MUDA
    expect(KtaRank.forLevel('HIKMAH').color.toARGB32(), 0xFFE4B500);
  });
}
