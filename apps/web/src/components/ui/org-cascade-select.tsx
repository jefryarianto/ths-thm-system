'use client';

import { useEffect, useRef, useState } from 'react';
import apiClient from '@/lib/api-client';
import FormField from '@/components/ui/form-field';
import Select from '@/components/ui/select';

/** Nilai terpilih dari cascade Distrik → Wilayah → Ranting. */
export interface OrgSelection {
  distrikId: string;
  wilayahId: string;
  rantingId: string;
}

export const EMPTY_ORG_SELECTION: OrgSelection = {
  distrikId: '',
  wilayahId: '',
  rantingId: '',
};

interface OrgOption {
  id: string;
  nama: string;
}

interface OrgCascadeSelectProps {
  /** Nilai terpilih. Untuk prefill (edit), isi ketiga id sekaligus. */
  value: OrgSelection;
  onChange: (next: OrgSelection) => void;
  /** Tandai Ranting wajib (label + error). */
  required?: boolean;
  /** Pesan error untuk field Ranting. */
  error?: string;
  disabled?: boolean;
  /** Kunci pilihan distrik (admin_distrik & admin_wilayah). */
  lockDistrikId?: string;
  /** Kunci pilihan wilayah (admin_wilayah & admin_ranting). */
  lockWilayahId?: string;
  /** 1 = stack vertikal (di dalam modal), 3 = grid tiga kolom. */
  columns?: 1 | 3;
}

/**
 * Cascade selector Distrik → Wilayah → Ranting.
 *
 * Memakai endpoint `/org-structure/*` yang sama dengan halaman anggota/kandidat:
 * - `GET /org-structure/distrik`
 * - `GET /org-structure/wilayah?distrikId=`
 * - `GET /org-structure/ranting?wilayahId=`
 *
 * Daftar anak dimuat lewat effect berdasarkan nilai terpilih sehingga prefill
 * (mode edit) langsung terseleksi tanpa ter-reset. Reset anak dilakukan di
 * handler perubahan parent, bukan di effect.
 */
export default function OrgCascadeSelect({
  value,
  onChange,
  required = false,
  error,
  disabled = false,
  lockDistrikId,
  lockWilayahId,
  columns = 1,
}: OrgCascadeSelectProps) {
  const { distrikId, wilayahId, rantingId } = value;

  const [distriks, setDistriks] = useState<OrgOption[]>([]);
  const [wilayahs, setWilayahs] = useState<OrgOption[]>([]);
  const [rantings, setRantings] = useState<OrgOption[]>([]);

  // Guard respons basi: pengguna bisa berpindah parent lebih cepat dari respons.
  const wilayahSeq = useRef(0);
  const rantingSeq = useRef(0);

  // Daftar distrik (statis selama komponen hidup).
  useEffect(() => {
    let active = true;
    apiClient
      .get('/org-structure/distrik')
      .then(({ data }) => {
        if (active) setDistriks(data?.data ?? []);
      })
      .catch(() => {
        /* silent — pilihan tetap bisa diisi lewat lock */
      });
    return () => {
      active = false;
    };
  }, []);

  // Daftar wilayah mengikuti distrik terpilih (termasuk saat prefill).
  useEffect(() => {
    if (!distrikId) {
      setWilayahs([]);
      return;
    }
    const seq = ++wilayahSeq.current;
    apiClient
      .get(`/org-structure/wilayah?distrikId=${distrikId}`)
      .then(({ data }) => {
        if (seq === wilayahSeq.current) setWilayahs(data?.data ?? []);
      })
      .catch(() => {
        if (seq === wilayahSeq.current) setWilayahs([]);
      });
  }, [distrikId]);

  // Daftar ranting mengikuti wilayah terpilih (termasuk saat prefill).
  useEffect(() => {
    if (!wilayahId) {
      setRantings([]);
      return;
    }
    const seq = ++rantingSeq.current;
    apiClient
      .get(`/org-structure/ranting?wilayahId=${wilayahId}`)
      .then(({ data }) => {
        if (seq === rantingSeq.current) setRantings(data?.data ?? []);
      })
      .catch(() => {
        if (seq === rantingSeq.current) setRantings([]);
      });
  }, [wilayahId]);

  const toOptions = (list: OrgOption[], lockedId?: string, lockedLabel?: string) => {
    if (lockedId) {
      const found = list.find((o) => o.id === lockedId);
      return [{ value: lockedId, label: found?.nama ?? lockedLabel ?? lockedId }];
    }
    return list.map((o) => ({ value: o.id, label: o.nama }));
  };

  const handleDistrikChange = (nextDistrikId: string) => {
    onChange({ distrikId: nextDistrikId, wilayahId: '', rantingId: '' });
  };

  const handleWilayahChange = (nextWilayahId: string) => {
    onChange({ ...value, wilayahId: nextWilayahId, rantingId: '' });
  };

  const handleRantingChange = (nextRantingId: string) => {
    onChange({ ...value, rantingId: nextRantingId });
  };

  // Selaraskan nilai dengan kunci scope (admin_distrik/wilayah/ranting) agar
  // select yang disabled tidak pernah tampil kosong. Ranting dikosongkan karena
  // perubahan parent selalu membatalkan pilihan anak.
  useEffect(() => {
    const nextDistrikId = distrikId || lockDistrikId || '';
    const nextWilayahId = wilayahId || lockWilayahId || '';
    if (nextDistrikId !== distrikId || nextWilayahId !== wilayahId) {
      onChange({ distrikId: nextDistrikId, wilayahId: nextWilayahId, rantingId: '' });
    }
  }, [lockDistrikId, lockWilayahId, distrikId, wilayahId, onChange]);

  const layout = columns === 3 ? 'grid grid-cols-1 sm:grid-cols-3 gap-4' : 'space-y-4';

  return (
    <div className={layout}>
      <FormField label="Distrik" required>
        <Select
          data-testid="org-cascade-distrik"
          aria-label="Distrik"
          value={distrikId}
          onChange={(e) => handleDistrikChange(e.target.value)}
          options={toOptions(distriks, lockDistrikId, 'Distrik')}
          placeholder="Pilih Distrik..."
          disabled={disabled || !!lockDistrikId}
        />
      </FormField>

      <FormField label="Wilayah" required>
        <Select
          data-testid="org-cascade-wilayah"
          aria-label="Wilayah"
          value={wilayahId}
          onChange={(e) => handleWilayahChange(e.target.value)}
          options={toOptions(wilayahs, lockWilayahId, 'Wilayah')}
          placeholder="Pilih Wilayah..."
          disabled={disabled || !distrikId || !!lockWilayahId}
        />
      </FormField>

      <FormField label="Ranting" required={required}>
        <Select
          data-testid="org-cascade-ranting"
          aria-label="Ranting"
          value={rantingId}
          onChange={(e) => handleRantingChange(e.target.value)}
          options={rantings.map((o) => ({ value: o.id, label: o.nama }))}
          placeholder="Pilih Ranting..."
          disabled={disabled || !wilayahId}
          error={error}
        />
      </FormField>
    </div>
  );
}
