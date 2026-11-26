'use client';

import { useMemo } from 'react';
import KtaProofPreview from './KtaProofPreview';
import { KtaStatusBadge } from './KtaStatusBadge';
import { getKtaActionLabel, getKtaLevelLabel } from './constants';
import type { KtaReviewApplication, KtaReviewHistory } from './types';
import { formatDateTime, formatRupiah } from '@/lib/format';

interface KtaReviewPanelProps {
  application: KtaReviewApplication;
  canVerify?: boolean;
  catatan?: string;
  onCatatanChange?: (value: string) => void;
  onVerify?: (catatan: string) => void;
  verifying?: boolean;
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-muted">{label}</div>
      <div className="font-semibold break-words">{value || '-'}</div>
    </div>
  );
}

export default function KtaReviewPanel({
  application,
  canVerify = false,
  catatan = '',
  onCatatanChange,
  onVerify,
  verifying = false,
}: KtaReviewPanelProps) {
  const snapshot = application.submittedSnapshot;
  const ranting = application.anggota.ranting;
  const wilayah = ranting?.wilayah;

  const groupedHistories = useMemo(() => {
    const groups = new Map<string, KtaReviewHistory[]>();
    (application.histories || []).forEach((history) => {
      const level = history.level || 'LAINNYA';
      const items = groups.get(level) ?? [];
      items.push(history);
      groups.set(level, items);
    });
    return Array.from(groups.entries());
  }, [application.histories]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Tinjau Pengajuan KTA</h2>
          <KtaStatusBadge status={application.status} />
        </div>

        <h3 className="text-sm font-semibold mt-6 mb-3">Data Saat Pengajuan</h3>
        {snapshot ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <Field label="Nama" value={snapshot.anggota.namaLengkap} />
              <Field label="NRA" value={snapshot.anggota.nomorAnggota} />
              <Field label="Tingkat" value={snapshot.anggota.tingkat} />
              <Field label="Status Keanggotaan" value={snapshot.anggota.statusKeanggotaan} />
              <Field label="Ranting" value={snapshot.anggota.ranting?.nama} />
              <Field label="Wilayah" value={snapshot.anggota.wilayah?.nama} />
              <Field label="Distrik" value={snapshot.anggota.distrik?.nama} />
              <Field label="Alamat Distrik" value={snapshot.anggota.alamatDistrik} />
              <Field label="Tempat Dadar" value={snapshot.anggota.tempatDadar} />
              <Field label="Tahun Dadar" value={snapshot.anggota.tahunDadar} />
              <Field label="Pekerjaan" value={snapshot.anggota.pekerjaan} />
              <Field label="Pelantikan" value={snapshot.anggota.pelantikan} />
              <Field label="Email" value={snapshot.anggota.email} />
              <Field label="No HP" value={snapshot.anggota.noHp} />
              <Field label="Alamat" value={snapshot.anggota.alamat} />
              <Field label="Diajukan" value={formatDateTime(snapshot.submittedAt)} />
              <Field label="Diajukan Oleh" value={snapshot.submittedBy.role} />
            </div>
            {snapshot.missingFields.length > 0 && (
              <p className="mt-4 text-xs text-orange-600 dark:text-orange-400">
                Field kosong saat submit: {snapshot.missingFields.join(', ')}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-muted">Snapshot tidak tersedia</p>
            <p className="mt-1 text-xs text-muted">Menampilkan data anggota terkini.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
              <Field label="Nama" value={application.anggota.namaLengkap} />
              <Field label="NRA" value={application.anggota.nomorAnggota} />
              <Field label="Ranting" value={ranting?.nama} />
              <Field label="Wilayah" value={wilayah?.nama} />
              <Field label="Distrik" value={wilayah?.distrik?.nama} />
            </div>
          </>
        )}
      </div>

      <KtaProofPreview
        applicationId={application.id}
        buktiBayarPath={application.buktiBayarPath}
        anggotaName={application.anggota.namaLengkap}
      />

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border p-6">
        <h3 className="text-sm font-semibold mb-3">Data Pembayaran</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <Field
            label="Biaya"
            value={application.biaya === null ? '-' : formatRupiah(application.biaya)}
          />
          <Field label="Rekening Tujuan" value={application.rekeningTujuan} />
          <Field label="Status Pembayaran" value={application.statusPembayaran} />
          <Field label="Catatan Admin" value={application.catatanAdmin} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border p-6">
        <h3 className="text-lg font-semibold mb-4">Catatan Validasi</h3>
        {groupedHistories.length === 0 ? (
          <p className="text-sm text-muted">Belum ada riwayat validasi.</p>
        ) : (
          <div className="space-y-5">
            {groupedHistories.map(([level, items]) => (
              <section key={level}>
                <h4 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                  {getKtaLevelLabel(level)}
                </h4>
                <ul className="mt-3 space-y-3 border-l border-gray-200 dark:border-gray-700 ml-2">
                  {items.map((history) => (
                    <li key={history.id} className="ml-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {getKtaActionLabel(history.action)}
                        </span>
                        <span className="text-xs text-muted">oleh {history.actorRole}</span>
                        <span className="text-xs text-muted">
                          {formatDateTime(history.createdAt)}
                        </span>
                      </div>
                      {history.catatan && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {history.catatan}
                        </p>
                      )}
                      {history.isSkipped && (
                        <p className="mt-1 text-xs text-orange-600">
                          Di-skip: {history.skippedReason || 'Auto-skip'}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {onVerify && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border p-6">
          <label htmlFor="kta-catatan-verifikasi" className="block text-sm font-medium mb-2">
            Catatan verifikasi
          </label>
          <textarea
            id="kta-catatan-verifikasi"
            value={catatan}
            onChange={(event) => onCatatanChange?.(event.target.value)}
            rows={3}
            maxLength={500}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => onVerify(catatan)}
              disabled={!canVerify || verifying}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {verifying ? 'Memverifikasi...' : 'Verifikasi Pembayaran'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
