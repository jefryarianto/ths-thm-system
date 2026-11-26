part of 'claim_bloc.dart';

Map<String, dynamic> buildClaimFields(ClaimCreateRequested event) {
  final body = <String, dynamic>{
    'tipe': event.tipe,
    'modeBukti': event.modeBukti,
  };
  if (event.tipe == 'keanggotaan') {
    if (event.namaLengkap != null) body['namaLengkap'] = event.namaLengkap;
    if (event.jenisKelamin != null) body['jenisKelamin'] = event.jenisKelamin;
    if (event.tempatLahir != null) body['tempatLahir'] = event.tempatLahir;
    if (event.tanggalLahir != null) body['tanggalLahir'] = event.tanggalLahir;
    if (event.tempatDadar != null) body['tempatDadar'] = event.tempatDadar;
    if (event.tahunDadar != null) body['tahunDadar'] = event.tahunDadar;
    if (event.alamat != null) body['alamat'] = event.alamat;
    if (event.noHp != null) body['noHp'] = event.noHp;
    if (event.email != null) body['email'] = event.email;
    if (event.rantingId != null) body['rantingId'] = event.rantingId;
  }
  if (event.anggotaId != null) body['anggotaId'] = event.anggotaId;
  if (event.catatan != null) body['catatan'] = event.catatan;
  if (event.modeBukti == 'cerita' && event.ceritaHistori != null) {
    body['ceritaHistori'] = event.ceritaHistori;
  }
  return body;
}

Future<FormData> buildClaimFormData(ClaimCreateRequested event) async {
  final paths = event.buktiFilePaths;
  if (paths.length > 3) {
    throw ArgumentError('Maksimal 3 berkas bukti');
  }

  final data = <String, dynamic>{...buildClaimFields(event)};
  final files = <MultipartFile>[];
  for (final path in paths) {
    final fileName = path.split(RegExp(r'[\/]')).last;
    files.add(await MultipartFile.fromFile(path, filename: fileName));
  }
  if (files.isNotEmpty) {
    data['buktiFiles'] = files;
  }
  return FormData.fromMap(data);
}
