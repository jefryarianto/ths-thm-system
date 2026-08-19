'use client';

import { useEffect, useMemo, useState } from 'react';
import apiClient from '@/lib/api-client';
import Modal from '@/components/ui/modal';
import Select from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { ArrowLeftRight, Loader2 } from 'lucide-react';

interface OrgNode {
  id: string;
  name: string;
  children?: OrgNode[];
}
interface OrgResp {
  data?: { tree?: OrgNode[] };
}

interface MutationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  member: {
    id: string;
    namaLengkap: string;
    nomorAnggota: string;
    rantingId: string;
    ranting?: {
      nama?: string;
      wilayah?: { nama?: string; distrik?: { id?: string; nama?: string } };
    };
  } | null;
}

const chainText = (scope?: string) => {
  // Informasi rantai persetujuan — ringkas untuk preview di modal
  if (scope === 'distrik') return 'Wilayah → Distrik';
  if (scope === 'nasional') return 'Ranting Asal → Wilayah → Distrik → Ranting Tujuan → Wilayah → Distrik';
  return undefined;
};

export default function MutationModal({ open, onClose, onSuccess, member }: MutationModalProps) {
  const toast = useToast();
  const [tree, setTree] = useState<OrgNode[]>([]);
  const [distrikId, setDistrikId] = useState('');
  const [wilayahId, setWilayahId] = useState('');
  const [rantingId, setRantingId] = useState('');
  const [reason, setReason] = useState('');
  const [scopePreview, setScopePreview] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const { data: res } = await apiClient.get<OrgResp>('/org-chart');
        setTree((res?.data?.tree ?? []).flatMap((n) => n.children ?? []));
      } catch {
        /* abaikan */
      }
    })();
  }, [open]);

  const distrikOptions = useMemo(
    () => tree.map((d) => ({ value: d.id, label: d.name })),
    [tree],
  );
  const wilayahOptions = useMemo(
    () => (tree.find((d) => d.id === distrikId)?.children ?? []).map((w) => ({ value: w.id, label: w.name })),
    [tree, distrikId],
  );
  const rantingOptions = useMemo(
    () => (tree.find((d) => d.id === distrikId)?.children?.find((w) => w.id === wilayahId)?.children ?? []).map((r) => ({ value: r.id, label: r.name })),
    [tree, distrikId, wilayahId],
  );

  const isSameDistrik = useMemo(() => {
    const dx = distrikId;
    const originDistrik = member?.ranting?.wilayah?.distrik?.id;
    return originDistrik ? dx === originDistrik : undefined;
  }, [distrikId, member?.ranting]);

  useEffect(() => {
    if (isSameDistrik === false) setScopePreview('nasional');
    else if (isSameDistrik === true) setScopePreview('distrik');
    else setScopePreview(undefined);
  }, [isSameDistrik]);

  const reset = () => {
    setDistrikId('');
    setWilayahId('');
    setRantingId('');
    setReason('');
    setScopePreview(undefined);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!member) return;
    if (!rantingId) {
      toast('error', 'Pilih ranting tujuan terlebih dahulu');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await apiClient.post('/mutations', {
        anggotaId: member.id,
        toRantingId: rantingId,
        reason,
      });
      toast('success', data?.message || 'Permintaan mutasi diajukan');
      reset();
      onSuccess();
      onClose();
    } catch (err) {
      const msg = (err as { message?: string })?.message || 'Gagal mengajukan mutasi';
      toast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Mutasi Anggota" size="md">
      <div className="space-y-4">
        <div className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 text-sm">
          <p className="font-medium text-gray-900 dark:text-white">{member?.namaLengkap}</p>
          <p className="text-xs text-gray-500">{member?.nomorAnggota}</p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Ranting saat ini: {member?.ranting?.nama || '—'}
            {member?.ranting?.wilayah ? ` · ${member.ranting.wilayah.nama}` : ''}
            {member?.ranting?.wilayah?.distrik ? ` · ${member.ranting.wilayah.distrik.nama}` : ''}
          </p>
        </div>

        <Select
          label="Distrik Tujuan"
          placeholder="Pilih Distrik"
          value={distrikId}
          onChange={(e) => {
            setDistrikId(e.target.value);
            setWilayahId('');
            setRantingId('');
          }}
          options={distrikOptions}
        />
        <Select
          label="Wilayah Tujuan"
          placeholder={distrikId ? 'Pilih Wilayah' : 'Pilih Distrik dahulu'}
          value={wilayahId}
          onChange={(e) => {
            setWilayahId(e.target.value);
            setRantingId('');
          }}
          options={wilayahOptions}
          disabled={!distrikId}
        />
        <Select
          label="Ranting Tujuan"
          placeholder={wilayahId ? 'Pilih Ranting' : 'Pilih Wilayah dahulu'}
          value={rantingId}
          onChange={(e) => setRantingId(e.target.value)}
          options={rantingOptions}
          disabled={!wilayahId}
        />

        {scopePreview && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-300">
            <span className="font-medium inline-flex items-center gap-1">
              <ArrowLeftRight size={12} /> Rantai persetujuan:
            </span>{' '}
            {chainText(scopePreview)} {scopePreview === 'nasional' && '(antar distrik)'}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alasan Mutasi</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Contoh: pindah tempat tinggal, tugas pekerjaan..."
            className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !rantingId}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <ArrowLeftRight size={14} />}
            Ajukan Mutasi
          </button>
        </div>
      </div>
    </Modal>
  );
}