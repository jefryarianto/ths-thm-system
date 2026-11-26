part of 'member_bloc.dart';

abstract class MemberEvent extends Equatable {
  const MemberEvent();

  @override
  List<Object> get props => [];
}

class MemberLoadRequested extends MemberEvent {
  const MemberLoadRequested();

  @override
  List<Object> get props => [];
}

/// Ambil PNG kartu anggota yang di-generate API
/// (`GET /members/:id/digital-card/image`) — desain identik dengan aplikasi
/// Expo (foto, watermark, stempel, tanda tangan, QR). `userId` = id User
/// (bukan id Anggota) karena endpoint memakai scope `'self'`.
class MemberCardImageRequested extends MemberEvent {
  final String userId;

  const MemberCardImageRequested({required this.userId});

  @override
  List<Object> get props => [userId];
}

/// Simpan profil anggota via `PATCH /auth/me` (paritas dengan layar edit
/// profil Expo). Email sengaja tidak ada — read-only, perubahan email
/// harus melalui admin.
class MemberUpdateRequested extends MemberEvent {
  final String namaLengkap;
  final String noHp;
  final String alamat;
  final String tempatLahir;
  final String tanggalLahir;

  const MemberUpdateRequested({
    required this.namaLengkap,
    required this.noHp,
    required this.alamat,
    required this.tempatLahir,
    required this.tanggalLahir,
  });

  @override
  List<Object> get props => [
        namaLengkap,
        noHp,
        alamat,
        tempatLahir,
        tanggalLahir,
      ];
}

/// Upload foto profil sendiri via `POST /auth/me/photo` (multipart/form-data).
/// Setelah upload berhasil, `/members/me` di-reload agar `fotoPath` terbaru
/// terbaca (termasuk `.bg.png` yang di-generate server).
class MemberPhotoUploadRequested extends MemberEvent {
  final String filePath;

  const MemberPhotoUploadRequested({required this.filePath});

  @override
  List<Object> get props => [filePath];
}

/// Ambil data kartu digital dari `GET /members/:id/digital-card` — JSON yang
/// berisi penandatangan, gambar stempel/tanda tangan, dan visual tingkatan.
/// Data ini dipakai oleh widget KTA flip card untuk menampilkan stempel & ttd
/// sesuai distrik (bukan hardcoded).
class MemberCardDataRequested extends MemberEvent {
  const MemberCardDataRequested();

  @override
  List<Object> get props => [];
}

class MemberLogoutRequested extends MemberEvent {
  const MemberLogoutRequested();

  @override
  List<Object> get props => [];
}
