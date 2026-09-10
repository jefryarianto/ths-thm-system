import { useCallback, useEffect, useState } from 'react';
import apiClient, { unwrap } from '../lib/api-client';
import type { CardData } from '../screens/digital-card/card';

/** Ambil data kartu digital (QR, penandatangan, signage, template) untuk satu anggota.
 *  Dipakai di tab Digital ID dan Beranda (KTA depan). */
export function useKtaCardData(anggotaId: string | null | undefined) {
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(!!anggotaId);

  const load = useCallback(async (id: string) => {
    try {
      const res = await apiClient.get(`/members/${id}/digital-card`);
      const data = unwrap<{
        qrCode: string;
        levelVisual?: { stripCount: number; color: string; label?: string } | null;
        signatureImage?: string | null;
        stampImage?: string | null;
        template?: {
          id?: string | null;
          name?: string | null;
          label?: string | null;
          frontImage?: string | null;
          backImage?: string | null;
          overlayConfig?: Record<string, unknown>;
        } | null;
        card?: { signerName?: string; signerTitle?: string; signers?: { signerName?: string; signerTitle?: string }[] };
      }>(res);
      setCardData({
        qrCode: data.qrCode || null,
        signerName: data.card?.signerName || 'Koordinator Distrik',
        signerTitle: data.card?.signerTitle || 'THS-THM',
        signers: data.card?.signers || [],
        levelVisual: data.levelVisual || null,
        signatureImage: data.signatureImage || null,
        stampImage: data.stampImage || null,
        template: data.template || null,
      });
    } catch {
      // QR/signer gagal dimuat — kartu tetap tampil (fallback nama default)
      setCardData({ qrCode: null, signerName: 'Koordinator Distrik', signerTitle: 'THS-THM', signers: [], levelVisual: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (anggotaId) {
      setLoading(true);
      load(anggotaId);
    } else {
      setCardData(null);
      setLoading(false);
    }
  }, [anggotaId, load]);

  return { cardData, loading };
}