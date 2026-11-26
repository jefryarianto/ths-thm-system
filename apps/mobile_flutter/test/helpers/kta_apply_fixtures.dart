import 'package:mobile_flutter/data/models/card_data.dart';
import 'package:mobile_flutter/data/models/kta_application.dart';
import 'package:mobile_flutter/data/models/member.dart';
import 'package:mobile_flutter/logic/member/member_bloc.dart';

KtaApplication ktaApplication({
  KtaAppStatus status = KtaAppStatus.submitted,
}) {
  return KtaApplication(
    id: 'kta-1',
    anggotaId: 'member-1',
    status: status,
    biaya: 250000,
    rekeningTujuan: 'BCA 1234567890 a.n. THS THM',
    buktiBayarPath: status == KtaAppStatus.paymentPending
        ? '/api/uploads/kta-proofs/bukti.png'
        : null,
    statusPembayaran: status == KtaAppStatus.paymentPending
        ? 'MENUNGGU_VERIFIKASI'
        : 'BELUM_BAYAR',
    catatanAdmin: 'Transfer sebelum batas waktu',
    submittedByRole: 'member',
    createdAt: DateTime.utc(2026, 11, 25),
    updatedAt: DateTime.utc(2026, 11, 25),
  );
}

MemberLoaded memberLoaded({bool? generated, bool adminIssued = false}) {
  return MemberLoaded(
    member: const Member(
      id: 'member-1',
      email: 'member@example.com',
      nomorAnggota: '001',
      namaLengkap: 'Anggota Contoh',
      jenisKelamin: 'L',
      tingkat: 'Pemuda',
      statusKeanggotaan: 'aktif',
      statusValidasi: 'valid',
      statusData: 'lengkap',
      tempatLahir: 'Jakarta',
      tanggalLahir: '2000-01-01',
      tempatDadar: 'Jakarta',
      tahunDadar: '2018',
      alamat: 'Jalan Contoh',
      noHp: '081234567890',
      fotoPath: '',
      rantingId: 'ranting-1',
      namaRanting: 'Ranting Contoh',
      namaWilayah: 'Wilayah Contoh',
      namaDistrik: 'Distrik Contoh',
    ),
    cardData: generated == null
        ? null
        : CardData(
            signers: const [],
            signerName: 'Penandatangan',
            signerTitle: 'Ketua',
            signatureImage: '',
            stampImage: '',
            generated: generated,
            adminIssued: adminIssued,
          ),
  );
}
