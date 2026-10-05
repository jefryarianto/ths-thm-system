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
 */
export function useOrgFilter(): UseOrgFilterReturn {
  const [orgTree, setOrgTree] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [distrikId, setDistrikId] = useState('');
  const [wilayahId, setWilayahId] = useState('');
  const [rantingId, setRantingId] = useState('');

  const fetchOrgStructure = useCallback(async () => {
    try {
      const res = await apiClient.get('/gamification/org-structure');
      const tree = unwrap<OrgNode[]>(res) || [];
      setOrgTree(tree);

      // Auto-select if user only has 1 scoped option at any level
      if (tree.length === 1) {
        const d = tree[0];
        setDistrikId(d.id);
        const wils = d.wilayahs || [];
        if (wils.length === 1) {
          const w = wils[0];
          setWilayahId(w.id);
          const rants = w.rantings || [];
          if (rants.length === 1) {
            setRantingId(rants[0].id);
          }
        }
      }
    } catch {
      // Ignore errors - tree remains empty
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrgStructure();
  }, [fetchOrgStructure]);

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
    if (orgTree.length === 1) {
      setDistrikId(orgTree[0].id);
      const wils = orgTree[0].wilayahs || [];
      if (wils.length === 1) {
        setWilayahId(wils[0].id);
        const rants = wils[0].rantings || [];
        if (rants.length === 1) {
          setRantingId(rants[0].id);
        } else {
          setRantingId('');
        }
      } else {
        setWilayahId('');
        setRantingId('');
      }
    } else {
      setDistrikId('');
      setWilayahId('');
      setRantingId('');
    }
  }, [orgTree]);

  const availableWilayahs = useMemo(
    () => (distrikId ? orgTree.find((d) => d.id === distrikId)?.wilayahs || [] : []),
    [distrikId, orgTree],
  );

  const availableRantings = useMemo(() => {
    if (!wilayahId) return [];
    return availableWilayahs.find((w) => w.id === wilayahId)?.rantings || [];
  }, [wilayahId, availableWilayahs]);

  const isActive = useMemo(() => {
    // Active if filters differ from default scoped state
    if (orgTree.length === 1) {
      if (availableWilayahs.length === 1) {
        return availableRantings.length > 1 && rantingId !== '';
      }
      return wilayahId !== '' || rantingId !== '';
    }
    return distrikId !== '' || wilayahId !== '' || rantingId !== '';
  }, [distrikId, wilayahId, rantingId, orgTree.length, availableWilayahs.length, availableRantings.length]);

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
