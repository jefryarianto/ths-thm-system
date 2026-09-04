'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '@/lib/api-client';
import { GripVertical, ChevronDown, ChevronRight, Users, Building2, MapPin, RefreshCw, ArrowUpDown } from 'lucide-react';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';

interface OrgNode {
  id: string;
  userId: string;
  nama: string;
  jabatan: string;
  jabatanId: string;
  unitName: string;
  level: 'nasional' | 'distrik' | 'wilayah' | 'ranting';
  startDate?: string | null;
  endDate?: string | null;
  parentId: string | null;
  children: OrgNode[];
}

export default function OrgChartEditorPage() {
  const toast = useToast();
  const [tree, setTree] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [draggedNode, setDraggedNode] = useState<OrgNode | null>(null);
  const [dragOverNode, setDragOverNode] = useState<string | null>(null);

  // Filters
  const [level, setLevel] = useState<'distrik' | 'wilayah' | 'ranting'>('distrik');
  const [distrikId, setDistrikId] = useState('');
  const [wilayahId, setWilayahId] = useState('');
  const [rantingId, setRantingId] = useState('');
  const [periodeId, setPeriodeId] = useState('');
  
  // Role-based scope locking
  const { user } = useAuth();
  const userRole = user?.role || '';
  const isWilayahScoped = userRole === 'admin_wilayah';
  const isRantingScoped = userRole === 'admin_ranting';
  const isScoped = isWilayahScoped || isRantingScoped;
  const [scopeResolved, setScopeResolved] = useState(false);

  const [distriks, setDistriks] = useState<{ id: string; nama: string }[]>([]);
  const [wilayahs, setWilayahs] = useState<{ id: string; nama: string }[]>([]);
  const [rantings, setRantings] = useState<{ id: string; nama: string }[]>([]);
  const [periodes, setPeriodes] = useState<{ id: string; nama: string; isActive: boolean }[]>([]);

  // Load dropdowns
  useEffect(() => {
    apiClient.get('/org-structure/distrik').then(({ data }) => setDistriks(data.data || [])).catch(() => {});
    apiClient.get('/periode').then(({ data }) => {
      setPeriodes(data.data || []);
      const active = (data.data || []).find((p: any) => p.isActive);
      if (active) setPeriodeId(active.id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!distrikId) { setWilayahs([]); return; }
    apiClient.get(`/org-structure/wilayah?distrikId=${distrikId}`).then(({ data }) => setWilayahs(data.data || [])).catch(() => {});
  }, [distrikId]);

  useEffect(() => {
    if (!wilayahId) { setRantings([]); return; }
    apiClient.get(`/org-structure/ranting?wilayahId=${wilayahId}`).then(({ data }) => setRantings(data.data || [])).catch(() => {});
  }, [wilayahId]);

  // Resolve user scope on mount for scoped roles
  useEffect(() => {
    if (!isScoped || !user?.rantingId) {
      setScopeResolved(true);
      return;
    }
    // Fetch ranting → wilayah → distrik chain
    apiClient.get(`/org-structure/ranting/${user.rantingId}`).then(({ data }) => {
      const ranting = data.data || data;
      const wilayahId = ranting?.wilayahId || ranting?.wilayah?.id || '';
      const distrikId = ranting?.wilayah?.distrikId || ranting?.wilayah?.distrik?.id || '';
      
      if (isRantingScoped) {
        setLevel('ranting');
        if (distrikId) setDistrikId(distrikId);
        // Set wilayah after distrik loads
        if (wilayahId) {
          // Need to wait for distrik effect to load wilayahs
          setTimeout(() => setWilayahId(wilayahId), 100);
          setTimeout(() => setRantingId(user.rantingId!), 200);
        }
      } else if (isWilayahScoped) {
        setLevel('wilayah');
        if (distrikId) setDistrikId(distrikId);
        if (wilayahId) setTimeout(() => setWilayahId(wilayahId), 100);
      }
      setScopeResolved(true);
    }).catch(() => {
      setScopeResolved(true);
    });
  }, [isScoped, user?.rantingId, isRantingScoped, isWilayahScoped]);
  
  // Fetch kepengurusan and build tree
  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { level };
      const unitId = level === 'ranting' ? rantingId : level === 'wilayah' ? wilayahId : distrikId;
      if (unitId) params.unitId = unitId;
      if (periodeId) params.periodeId = periodeId;
      const { data: res } = await apiClient.get('/kepengurusan', { params });
      const items = (res.data || []) as any[];

      // Build tree from flat list
      const map = new Map<string, OrgNode>();
      const roots: OrgNode[] = [];

      for (const item of items) {
        map.set(item.id, {
          id: item.id,
          userId: item.userId,
          nama: item.user?.namaLengkap || '-',
          jabatan: item.jabatan?.nama || '-',
          jabatanId: item.jabatanId,
          unitName: item.ranting?.nama || item.wilayah?.nama || item.distrik?.nama || '-',
          level: item.rantingId ? 'ranting' : item.wilayahId ? 'wilayah' : item.distrikId ? 'distrik' : 'nasional',
          startDate: item.startDate,
          endDate: item.endDate,
          parentId: item.parentId,
          children: [],
        });
      }

      for (const node of map.values()) {
        if (node.parentId && map.has(node.parentId)) {
          map.get(node.parentId)!.children.push(node);
        } else if (!node.parentId) {
          roots.push(node);
        }
      }

      // Sort by jabatan urutan (approximate - use jabatan name as fallback)
      const sortNodes = (nodes: OrgNode[]) => {
        nodes.sort((a, b) => a.jabatan.localeCompare(b.jabatan));
        nodes.forEach((n) => sortNodes(n.children));
      };
      sortNodes(roots);

      setTree(roots);
      // Auto-expand roots
      setExpandedNodes(new Set(roots.map((r) => r.id)));
    } catch {
      toast('error', 'Gagal memuat data kepengurusan');
    }
    setLoading(false);
  }, [level, distrikId, wilayahId, rantingId, periodeId]);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  // Toggle expand/collapse
  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, node: OrgNode) => {
    setDraggedNode(node);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', node.id);
    // Add visual feedback
    (e.target as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
    setDraggedNode(null);
    setDragOverNode(null);
  };

  const handleDragOver = (e: React.DragEvent, nodeId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverNode(nodeId);
  };

  const handleDragLeave = () => {
    setDragOverNode(null);
  };

  const handleDrop = async (e: React.DragEvent, targetNode: OrgNode) => {
    e.preventDefault();
    setDragOverNode(null);

    if (!draggedNode || draggedNode.id === targetNode.id) return;

    // Prevent dropping parent onto own descendant
    const isDescendant = (parent: OrgNode, childId: string): boolean => {
      if (parent.id === childId) return true;
      return parent.children.some((c) => isDescendant(c, childId));
    };
    if (isDescendant(draggedNode, targetNode.id)) {
      toast('error', 'Tidak bisa memindahkan atasan ke bawahan');
      return;
    }

    try {
      await apiClient.patch(`/kepengurusan/${draggedNode.id}/reparent`, { parentId: targetNode.id });
      toast('success', `${draggedNode.nama} dipindahkan ke bawahan ${targetNode.nama}`);
      fetchTree();
    } catch (e: any) {
      toast('error', e?.response?.data?.message || 'Gagal memindahkan');
    }
  };

  // Drop to root (remove parent)
  const handleDropToRoot = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverNode(null);
    if (!draggedNode || !draggedNode.parentId) return;

    try {
      await apiClient.patch(`/kepengurusan/${draggedNode.id}/reparent`, { parentId: null });
      toast('success', `${draggedNode.nama} dipindahkan ke root`);
      fetchTree();
    } catch (e: any) {
      toast('error', e?.response?.data?.message || 'Gagal memindahkan');
    }
  };

  // Render tree node
  const renderNode = (node: OrgNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const isDragOver = dragOverNode === node.id;
    const isExpired = node.endDate && new Date(node.endDate) < new Date();

    const levelColors = [
      'bg-indigo-600 text-white',
      'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-200',
      'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-200',
      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    ];
    const levelIcons = [Building2, MapPin, MapPin, Users];
    const Icon = levelIcons[Math.min(depth, levelIcons.length - 1)];

    return (
      <div key={node.id} style={{ marginLeft: depth * 24 }}>
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, node)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, node.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node)}
          className={`flex items-center gap-2 p-3 mb-1 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
            isDragOver ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 ring-2 ring-indigo-300' :
            isExpired ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-60' :
            'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <GripVertical size={16} className="text-gray-400 flex-shrink-0" />
          {hasChildren && (
            <button onClick={() => toggleExpand(node.id)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
          {!hasChildren && <div className="w-4" />}
          <div className={`p-1 rounded ${levelColors[Math.min(depth, levelColors.length - 1)]}`}>
            <Icon size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{node.nama}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{node.jabatan}</span>
              {isExpired && <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">Selesai</span>}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{node.unitName}</div>
          </div>
          <div className="text-xs text-gray-400">{node.children.length > 0 && `${node.children.length} bawahan`}</div>
        </div>
        {isExpanded && hasChildren && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <PageContainer>
      <PageHeader
        title="Editor Org Chart"
        subtitle="Seret dan lepas untuk mengatur hierarchy kepengurusan"
      />

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Level</label>
            <select value={level} onChange={(e) => setLevel(e.target.value as any)}
              disabled={isScoped}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
              {(!isWilayahScoped) && <option value="distrik">Distrik</option>}
              <option value="wilayah">Wilayah</option>
              {(!isWilayahScoped) && <option value="ranting">Ranting</option>}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Distrik</label>
            <select value={distrikId} onChange={(e) => setDistrikId(e.target.value)}
              disabled={isScoped}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
              <option value="">Semua</option>
              {distriks.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
            </select>
          </div>
          {(level === 'wilayah' || level === 'ranting') && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Wilayah</label>
              <select value={wilayahId} onChange={(e) => setWilayahId(e.target.value)}
                disabled={isRantingScoped}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="">Semua</option>
                {wilayahs.map((w) => <option key={w.id} value={w.id}>{w.nama}</option>)}
              </select>
            </div>
          )}
          {level === 'ranting' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ranting</label>
              <select value={rantingId} onChange={(e) => setRantingId(e.target.value)}
                disabled={isRantingScoped}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="">Semua</option>
                {rantings.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Periode</label>
            <select value={periodeId} onChange={(e) => setPeriodeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="">Semua</option>
              {periodes.map((p) => <option key={p.id} value={p.id}>{p.nama} {p.isActive ? '(Aktif)' : ''}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 text-sm text-blue-800 dark:text-blue-200">
        <ArrowUpDown size={16} className="inline mr-2" />
        <strong>Cara menggunakan:</strong> Seret node ke node lain untuk menjadikan bawahan. Seret ke root area untuk memindahkan ke tingkat atas.
      </div>

      {/* Tree */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 min-h-[400px]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropToRoot}
      >
        {loading ? (
          <div className="text-center py-12 text-gray-500">Memuat data...</div>
        ) : tree.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Tidak ada data kepengurusan</div>
        ) : (
          <div>{tree.map((node) => renderNode(node, 0))}</div>
        )}
      </div>

      {/* Action bar */}
      <div className="flex justify-end gap-3 mt-4">
        <button onClick={fetchTree}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>
    </PageContainer>
  );
}
