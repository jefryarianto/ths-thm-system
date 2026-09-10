import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient, { unwrap } from '../../lib/api-client';
import { LoadingSpinner } from './shared';
import { theme } from '../../theme';

interface RantingNode {
  id: string;
  nama: string;
}
interface WilayahNode {
  id: string;
  nama: string;
  rantings: RantingNode[];
}
interface DistrikNode {
  id: string;
  nama: string;
  wilayahs: WilayahNode[];
}

type PickerLevel = 'distrik' | 'wilayah' | 'ranting' | null;

interface OrgCascaderProps {
  rantingId: string;
  onChange: (rantingId: string, label: string) => void;
  error?: boolean;
}

/**
 * Picker berjenjang Distrik → Wilayah → Ranting untuk formulir publik
 * (klaim keanggotaan & pendaftaran calon). Data diambil dari endpoint
 * publik /org-structure/public-tree sehingga bisa dipakai sebelum login.
 */
export function OrgCascader({ rantingId, onChange, error }: OrgCascaderProps) {
  const [distriks, setDistriks] = useState<DistrikNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);

  const [selDistrik, setSelDistrik] = useState<DistrikNode | null>(null);
  const [selWilayah, setSelWilayah] = useState<WilayahNode | null>(null);
  const [selRanting, setSelRanting] = useState<RantingNode | null>(null);

  const [modalLevel, setModalLevel] = useState<PickerLevel>(null);
  const [pickList, setPickList] = useState<{ id: string; nama: string }[]>([]);
  const [pickTitle, setPickTitle] = useState('');

  useEffect(() => {
    apiClient
      .get('/org-structure/public-tree')
      .then((resp) => setDistriks(unwrap<DistrikNode[]>(resp) || []))
      .catch(() => {})
      .finally(() => setLoadingTree(false));
  }, []);

  const openDistrik = () => {
    setPickTitle('Pilih Distrik');
    setPickList(distriks.map((d) => ({ id: d.id, nama: d.nama })));
    setModalLevel('distrik');
  };

  const openWilayah = () => {
    if (!selDistrik) return;
    setPickTitle('Pilih Wilayah');
    setPickList(selDistrik.wilayahs.map((w) => ({ id: w.id, nama: w.nama })));
    setModalLevel('wilayah');
  };

  const openRanting = () => {
    if (!selWilayah) return;
    setPickTitle('Pilih Ranting');
    setPickList(selWilayah.rantings.map((r) => ({ id: r.id, nama: r.nama })));
    setModalLevel('ranting');
  };

  const handleSelect = (item: { id: string; nama: string }) => {
    if (modalLevel === 'distrik') {
      const d = distriks.find((x) => x.id === item.id) || null;
      setSelDistrik(d);
      setSelWilayah(null);
      setSelRanting(null);
      if (d && d.wilayahs.length > 0) {
        setModalLevel(null);
        setPickList(d.wilayahs.map((w) => ({ id: w.id, nama: w.nama })));
        setPickTitle('Pilih Wilayah');
        setTimeout(() => setModalLevel('wilayah'), 0);
      } else {
        setModalLevel(null);
      }
    } else if (modalLevel === 'wilayah') {
      const w = selDistrik?.wilayahs.find((x) => x.id === item.id) || null;
      setSelWilayah(w);
      setSelRanting(null);
      if (w && w.rantings.length > 0) {
        setModalLevel(null);
        setPickList(w.rantings.map((r) => ({ id: r.id, nama: r.nama })));
        setPickTitle('Pilih Ranting');
        setTimeout(() => setModalLevel('ranting'), 0);
      } else {
        setModalLevel(null);
      }
    } else if (modalLevel === 'ranting') {
      const r = selWilayah?.rantings.find((x) => x.id === item.id) || null;
      setSelRanting(r);
      setModalLevel(null);
      if (r) {
        const label = [`${selDistrik?.nama || ''}`, `${selWilayah?.nama || ''}`, r.nama]
          .filter(Boolean)
          .join(' / ');
        onChange(r.id, label);
      }
    }
  };

  const label =
    selRanting !== null && selRanting !== undefined
      ? [`${selDistrik?.nama || ''}`, `${selWilayah?.nama || ''}`, selRanting.nama]
          .filter(Boolean)
          .join(' / ')
      : '';

  return (
    <>
      <TouchableOpacity
        style={[styles.field, error && styles.fieldError]}
        onPress={openDistrik}
        disabled={loadingTree}
        activeOpacity={0.7}
      >
        {loadingTree ? (
          <LoadingSpinner size="small" color={theme.colors.primary} />
        ) : (
          <>
            <Text style={[styles.fieldText, !label && styles.fieldPlaceholder]}>
              {label || 'Pilih Ranting Asal'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={theme.colors.textMuted} />
          </>
        )}
      </TouchableOpacity>

      {!loadingTree && label && (
        <View style={styles.breadcrumbRow}>
          {selDistrik && (
            <TouchableOpacity onPress={openDistrik}>
              <Text style={styles.breadcrumbText}>{selDistrik.nama}</Text>
            </TouchableOpacity>
          )}
          {selDistrik && selWilayah && (
            <>
              <Text style={styles.breadcrumbSep}>/</Text>
              <TouchableOpacity onPress={openWilayah}>
                <Text style={styles.breadcrumbText}>{selWilayah.nama}</Text>
              </TouchableOpacity>
            </>
          )}
          {selDistrik && selWilayah && selRanting && (
            <>
              <Text style={styles.breadcrumbSep}>/</Text>
              <TouchableOpacity onPress={openRanting}>
                <Text style={styles.breadcrumbText}>{selRanting.nama}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Tidak perlu state rantingId terlihat — onChange mengirim id */}
      <Modal visible={modalLevel !== null} transparent animationType="slide" onRequestClose={() => setModalLevel(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{pickTitle}</Text>
              <TouchableOpacity onPress={() => setModalLevel(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={pickList}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.optionRow} onPress={() => handleSelect(item)}>
                  <Text style={styles.optionText}>{item.nama}</Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Tidak ada data</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderRadius: 8,
    padding: 12,
    backgroundColor: theme.colors.surfaceMuted,
    minHeight: 48,
  },
  fieldError: { borderColor: theme.colors.danger },
  fieldText: { fontSize: 15, color: theme.colors.text, flex: 1 },
  fieldPlaceholder: { color: theme.colors.textMuted },
  breadcrumbRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 6, gap: 4 },
  breadcrumbText: { fontSize: 12, color: theme.colors.primary, fontWeight: '600' },
  breadcrumbSep: { fontSize: 12, color: theme.colors.textMuted },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  optionText: { fontSize: 15, color: theme.colors.text },
  emptyText: { textAlign: 'center', padding: 20, color: theme.colors.textMuted, fontSize: 14 },
});