"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemberSchema = exports.DistrikSchema = exports.WilayahSchema = exports.RantingSchema = exports.UserSchema = exports.ROLE_VALUES = exports.ROLE = void 0;
const zod_1 = require("zod");
exports.ROLE = {
    SUPERADMIN: 'superadmin',
    ADMIN_DISTRIK: 'admin_distrik',
    ADMIN_WILAYAH: 'admin_wilayah',
    ADMIN_RANTING: 'admin_ranting',
    ADMIN_KEGIATAN: 'admin_kegiatan',
    PENGUJI: 'penguji',
    ANGGOTA: 'anggota',
};
exports.ROLE_VALUES = Object.values(exports.ROLE);
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string(),
    email: zod_1.z.string().email(),
    namaLengkap: zod_1.z.string(),
    role: zod_1.z.nativeEnum(exports.ROLE),
    rantingId: zod_1.z.string().nullable(),
    isActive: zod_1.z.boolean(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
    fotoPath: zod_1.z.string().nullable().optional(),
});
exports.RantingSchema = zod_1.z.object({
    id: zod_1.z.string(),
    kodeRanting: zod_1.z.string(),
    nama: zod_1.z.string(),
    lokasiLatihan: zod_1.z.string().nullable(),
});
exports.WilayahSchema = zod_1.z.object({
    id: zod_1.z.string(),
    kodeWilayah: zod_1.z.string(),
    nama: zod_1.z.string(),
});
exports.DistrikSchema = zod_1.z.object({
    id: zod_1.z.string(),
    kodeDistrik: zod_1.z.string(),
    nama: zod_1.z.string(),
});
exports.MemberSchema = zod_1.z.object({
    id: zod_1.z.string(),
    nomorAnggota: zod_1.z.string(),
    namaLengkap: zod_1.z.string(),
    jenisKelamin: zod_1.z.enum(['L', 'P']),
    tempatLahir: zod_1.z.string().nullable(),
    tanggalLahir: zod_1.z.string().nullable(),
    tempatDadar: zod_1.z.string().nullable(),
    tahunDadar: zod_1.z.string().nullable(),
    alamat: zod_1.z.string().nullable(),
    noHp: zod_1.z.string().nullable(),
    email: zod_1.z.string().nullable(),
    fotoPath: zod_1.z.string().nullable(),
    statusKeanggotaan: zod_1.z.enum(['aktif', 'nonaktif', 'pindah', 'keluar', 'meninggal']),
    tingkat: zod_1.z.string().nullable(),
    statusData: zod_1.z.enum(['complete', 'incomplete']),
    statusValidasi: zod_1.z.enum(['pending', 'approved', 'rejected']),
    missingFields: zod_1.z.array(zod_1.z.string()).nullable(),
    rantingId: zod_1.z.string(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
//# sourceMappingURL=index.js.map