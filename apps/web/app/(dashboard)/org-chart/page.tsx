'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { ChevronDown, ChevronRight, Building2, MapPin, Users, Loader2 } from 'lucide-react';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';

interface OrgNode {
  id: string;
  name: string;
  memberCount?: number;
  children?: OrgNode[];
}

interface OrgSummary {
  totalDistrik: number;
  totalWilayah: number;
  totalRanting: number;
  totalMembers: number;
}

interface OrgChartData {
  summary: OrgSummary;
  tree: OrgNode[];
}

function TreeNode({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  const levelStyles = [
    'bg-blue-900 text-white font-bold',
    'bg-blue-50 text-blue-900 font-semibold',
    'bg-green-50 text-green-800 font-medium',
    'bg-white text-gray-700',
  ];

  const paddingLeft = 4 + depth * 2;
  const levelStyle = levelStyles[Math.min(depth, levelStyles.length - 1)];

  return (
    <div className="border-t first:border-t-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full px-${paddingLeft} py-2.5 text-left flex justify-between items-center transition-colors hover:opacity-90 ${levelStyle}`}
      >
        <div className="flex items-center gap-2">
          {depth === 0 && <Building2 size={16} />}
          {depth === 1 && <MapPin size={14} />}
          {depth === 2 && <MapPin size={14} />}
          {depth >= 3 && <Users size={14} />}
          <span>{node.name}</span>
          {node.memberCount !== undefined && depth >= 3 && (
            <span className="text-xs text-gray-400 ml-2">({node.memberCount} anggota)</span>
          )}
        </div>
        {hasChildren && (
          <span className="text-current opacity-60">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        )}
      </button>
      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  const [data, setData] = useState<OrgChartData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get('/org-chart');
      if (res.success) setData(res.data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <PageContainer>
      <PageHeader title="Peta Organisasi" onRefresh={fetchData} />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-blue-600" />
          <span className="ml-3 text-gray-500">Memuat struktur organisasi...</span>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {data?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Distrik', value: data.summary.totalDistrik, color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
                { label: 'Wilayah', value: data.summary.totalWilayah, color: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
                { label: 'Ranting', value: data.summary.totalRanting, color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
                { label: 'Anggota', value: data.summary.totalMembers, color: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
              ].map((card) => (
                <div
                  key={card.label}
                  className={`p-4 rounded-xl text-center ${card.color}`}
                >
                  <div className="text-3xl font-bold">{card.value}</div>
                  <div className="text-sm mt-1 opacity-80">{card.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Org Tree */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            {data?.tree?.map((nasional) => (
              <TreeNode key={nasional.id} node={nasional} depth={0} />
            ))}
            {(!data?.tree || data.tree.length === 0) && (
              <div className="text-center py-16 text-gray-400">
                <Building2 size={48} className="mx-auto mb-4 opacity-30" />
                <p>Belum ada data organisasi</p>
              </div>
            )}
          </div>
        </>
      )}
    </PageContainer>
  );
}