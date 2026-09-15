part of 'member_bloc.dart';

abstract class MemberState extends Equatable {
  const MemberState();

  @override
  List<Object?> get props => [];
}

class MemberInitial extends MemberState {}

class MemberLoading extends MemberState {}

/// Sedang menyimpan profil (tombol Simpan disabled + spinner).
class MemberUpdating extends MemberState {}

/// Sedang upload foto profil (tombol foto disabled + overlay spinner).
class MemberPhotoUploading extends MemberLoaded {
  const MemberPhotoUploading({required super.member});

  @override
  List<Object?> get props => [member];
}

class MemberLoaded extends MemberState {
  final Member member;

  /// Bytes PNG kartu anggota dari `GET /members/:id/digital-card/image`
  /// (desain identik dengan aplikasi Expo). Null = belum dimuat.
  final Uint8List? cardImage;

  /// True ketika kartu gagal dimuat (Beranda menampilkan peringatan + retry).
  final bool cardImageFailed;

  /// Guard anti-fetch ganda pada kartu.
  final bool cardImageFetching;

  /// Data kartu digital dari `GET /members/:id/digital-card` — berisi
  /// penandatangan, gambar stempel/ttd, visual tingkatan. Null = belum dimuat.
  final CardData? cardData;

  const MemberLoaded({
    required this.member,
    this.cardImage,
    this.cardImageFailed = false,
    this.cardImageFetching = false,
    this.cardData,
  });

  MemberLoaded copyWith({
    Member? member,
    Uint8List? cardImage,
    bool? cardImageFailed,
    bool? cardImageFetching,
    CardData? cardData,
  }) {
    return MemberLoaded(
      member: member ?? this.member,
      cardImage: cardImage ?? this.cardImage,
      cardImageFailed: cardImageFailed ?? this.cardImageFailed,
      cardImageFetching: cardImageFetching ?? this.cardImageFetching,
      cardData: cardData ?? this.cardData,
    );
  }

  @override
  List<Object?> get props => [
        member,
        cardImage,
        cardImageFailed,
        cardImageFetching,
        cardData,
      ];
}

/// Profil tersimpan — diturunkan dari [MemberLoaded] agar layar yang hanya
/// mengecek `MemberLoaded` (Profil, Beranda, KTA) tetap menampilkan data.
class MemberUpdateSuccess extends MemberLoaded {
  final String message;

  const MemberUpdateSuccess({
    required super.member,
    this.message = 'Profil berhasil diperbarui',
  });

  @override
  List<Object?> get props => [member, message];
}

/// Foto profil berhasil diupload — diturunkan dari [MemberLoaded] agar
/// layar masih menampilkan data + path foto terbaru.
class MemberPhotoUploadSuccess extends MemberLoaded {
  final String message;

  const MemberPhotoUploadSuccess({
    required super.member,
    this.message = 'Foto profil berhasil diperbarui',
  });

  @override
  List<Object?> get props => [member, message];
}

class MemberError extends MemberState {
  final String message;

  const MemberError({required this.message});

  @override
  List<Object?> get props => [message];
}
