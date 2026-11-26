import { Prisma } from '@prisma/client';

export type KtaSnapshotPayload = Prisma.InputJsonValue | object;

export type KtaSnapshotV1 = {
  version: 1;
  submittedAt: string;
  submittedBy: { id: string; role: string };
  payload: Prisma.InputJsonValue | null;
  anggota: {
    id: string;
    nomorAnggota: string | null;
    namaLengkap: string | null;
    jenisKelamin: string | null;
    tempatLahir: string | null;
    tanggalLahir: string | null;
    alamat: string | null;
    noHp: string | null;
    email: string | null;
    fotoPath: string | null;
    statusKeanggotaan: string | null;
    tingkat: string | null;
    tempatDadar: string | null;
    tahunDadar: string | null;
    pekerjaan: string | null;
    pelantikan?: string | null;
    ranting: { id: string; nama: string } | null;
    wilayah: { id: string; nama: string } | null;
    distrik: { id: string; nama: string } | null;
    alamatDistrik: string | null;
  };
  missingFields: string[];
};

type KtaSnapshotMember = {
  id: string;
  nomorAnggota?: string | null;
  namaLengkap?: string | null;
  jenisKelamin?: string | null;
  tempatLahir?: string | null;
  tanggalLahir?: Date | string | null;
  alamat?: string | null;
  noHp?: string | null;
  email?: string | null;
  fotoPath?: string | null;
  statusKeanggotaan?: string | null;
  tingkat?: string | null;
  tempatDadar?: string | null;
  tahunDadar?: string | null;
  pekerjaan?: string | null;
  pelantikan?: string | null;
  ranting?: {
    id: string;
    nama: string;
    wilayah?: {
      id: string;
      nama: string;
      distrik?: { id: string; nama: string; alamat?: string | null } | null;
    } | null;
  } | null;
};

function toIso(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function clonePayload(payload: KtaSnapshotPayload | null | undefined): Prisma.InputJsonValue | null {
  if (payload === null || payload === undefined) return null;
  return JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
}

export function buildKtaSnapshot(
  member: KtaSnapshotMember,
  submitter: { id: string; role: string },
  payload: KtaSnapshotPayload | null | undefined,
  missingFields: string[],
): Prisma.InputJsonValue {
  const ranting = member.ranting ?? null;
  const wilayah = ranting?.wilayah ?? null;
  const distrik = wilayah?.distrik ?? null;

  const snapshot: KtaSnapshotV1 = {
    version: 1,
    submittedAt: new Date().toISOString(),
    submittedBy: { id: submitter.id, role: submitter.role },
    payload: clonePayload(payload),
    anggota: {
      id: member.id,
      nomorAnggota: member.nomorAnggota ?? null,
      namaLengkap: member.namaLengkap ?? null,
      jenisKelamin: member.jenisKelamin ?? null,
      tempatLahir: member.tempatLahir ?? null,
      tanggalLahir: toIso(member.tanggalLahir),
      alamat: member.alamat ?? null,
      noHp: member.noHp ?? null,
      email: member.email ?? null,
      fotoPath: member.fotoPath ?? null,
      statusKeanggotaan: member.statusKeanggotaan ?? null,
      tingkat: member.tingkat ?? null,
      tempatDadar: member.tempatDadar ?? null,
      tahunDadar: member.tahunDadar ?? null,
      pekerjaan: member.pekerjaan ?? null,
      pelantikan: member.pelantikan ?? null,
      ranting: ranting ? { id: ranting.id, nama: ranting.nama } : null,
      wilayah: wilayah ? { id: wilayah.id, nama: wilayah.nama } : null,
      distrik: distrik ? { id: distrik.id, nama: distrik.nama } : null,
      alamatDistrik: distrik?.alamat ?? null,
    },
    missingFields: [...missingFields],
  };

  return snapshot as Prisma.InputJsonValue;
}
