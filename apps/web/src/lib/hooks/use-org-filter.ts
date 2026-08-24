'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient, { unwrap } from '@/lib/api-client';

/**
 * A node in the organization hierarchy tree.
 */
export interface OrgNode {
  id: string;
  nama: string;
  wilayahs?: OrgNode[];
  rantings?: { id: string; nama: string }[];
}

export interface OrgFilterState {
  distrikId: string;
  wilayahId: string;
  rantingId: string;
  isActive: boolean;
}

export interface OrgFilterActions {
  setDistrik: (id: string) => void;
  setWilayah: (id: string) => void;
  setRanting: (id: string) => void;
  clearFilters: () => void;
}

export interface OrgFilterDerived {
  availableWilayahs: OrgNode[];
  availableRantings: { id: string; nama: string }[];
  orgTree: OrgNode[];
  loading: boolean;
}

export type UseOrgFilterReturn = OrgFilterState & OrgFilterActions & OrgFilterDerived;

/**
 * Hook for cascading org hierarchy filtering (Distrik → Wilayah → Ranting).
 *
 * Automatically fetches org structure from /gamification/org-structure.
 * When a higher-level filter changes, lower-level filters are reset.
 *
 * @example
 * ```tsx
 * const { distrikId, setDistrik, wilayahId, setWilayah, rantingId,
 *   setRanting, clearFilters, isActive, availableWilayahs, availableRantings,
 *   orgTree, loading } = useOrgFilter();
 *
 * <select value={distrikId} onChange={e => setDistrik(e.target.value)}>
 *   <option value="">Semua Distrik</option>
 *   {orgTree.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
 * </select>
 * ```
 */
export function useOrgFilter(): UseOrgFilterReturn {
  const [orgTree, setOrgTree] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [distrikId, setDistrikId] = useState('');
  const [wilayahId, setWilayahId] = useState('');
  const [rantingId, setRantingId] = useState('');

  useEffect(() => {
    fetchOrgStructure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOrgStructure = useCallback(async () => {
    try {
      const res = await apiClient.get('/gamification/org-structure');
      setOrgTree(unwrap<OrgNode[]>(res) || []);
    } catch {
      // Ignore errors - tree remains empty
    }
    setLoading(false);
  }, []);

  const setDistrik = useCallback((id: string) => {
    setDistrikId(id);
    setWilayahId('');
    setRantingId('');
  }, []);

  const setWilayah = useCallback((id: string) => {
    setWilayahId(id);
    setRantingId('');
  }, []);

  const setRanting = useCallback((id: string) => {
    setRantingId(id);
  }, []);

  const clearFilters = useCallback(() => {
    setDistrikId('');
    setWilayahId('');
    setRantingId('');
  }, []);

  const isActive = distrikId !== '' || wilayahId !== '' || rantingId !== '';

  const availableWilayahs = useMemo(
    () => (distrikId ? orgTree.find((d) => d.id === distrikId)?.wilayahs || [] : []),
    [distrikId, orgTree],
  );

  const availableRantings = useMemo(() => {
    if (!wilayahId) return [];
    return availableWilayahs.find((w) => w.id === wilayahId)?.rantings || [];
  }, [wilayahId, availableWilayahs]);

  return {
    distrikId,
    wilayahId,
    rantingId,
    isActive,
    setDistrik,
    setWilayah,
    setRanting,
    clearFilters,
    availableWilayahs,
    availableRantings,
    orgTree,
    loading,
  };
}
