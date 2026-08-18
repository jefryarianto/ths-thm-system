'use client';

import { useState, useEffect, useCallback } from 'react';
import { PublicLayout } from '@/components';
import apiClient from '@/lib/api-client';
import { ChevronDown, ChevronRight, Building2, MapPin, Users, Loader2 } from 'lucide-react';
import { useI18n } from '@/i18n/context';

interface OrgNode {
  id: string;
  name: string;
  memberCount?: number;
  children?: OrgNode[];
  type: 'nasional' | 'distrik' | 'wilayah' | 'ranting';
}

interface OrgChartData {
  summary: {
    totalNasional: number;
    totalDistrik: number;
    totalWilayah: number;
    totalRanting: number;
    totalMembers: number;
  };
  tree: OrgNode[];
}

function TreeNode({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  const levelStyles = [
    'bg-blue-900 text-white font-bold',
    'bg-blue-50 text-blue-900 font-semibold',
    'bg-green-50 text-green-800 font-medium',
    'bg-white text-gray-700',
  ];

  const levelStyle = levelStyles[Math.min(depth, levelStyles.length - 1)];

  return (
    <div className="border-t first:border-t-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full px-4 py-3 text-left flex justify-between items-center transition-colors hover:opacity-90 ${levelStyle}`}
      >
        <div className="flex items-center gap-2">
          {node.type === 'nasional' && <Building2 size={16} />}
          {node.type === 'distrik' && <MapPin size={14} />}
          {node.type === 'wilayah' && <MapPin size={14} />}
          {node.type === 'ranting' && <Users size={14} />}
          <span>{node.name}</span>
          {node.memberCount !== undefined && (
            <span className="text-xs opacity-70 ml-2">({node.memberCount} {t.kepengurusan.anggota})</span>
          )}
        </div>
        {hasChildren && (
          <span className="text-current opacity-60">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        )}
      </button>
      {expanded && hasChildren && (
        <div className="pl-4">
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function KepengurusanPage() {
  const { t } = useI18n();
  const [data, setData] = useState<OrgChartData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get('/org-chart/public');
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
    <PublicLayout>
      <section className="max-w-4xl mx-auto px-4 py-8 sm:py-16">
        <h1 className="text-2xl sm:text-4xl font-black text-blue-900 mb-8 sm:mb-12 text-center">{t.kepengurusan.title}</h1>
        
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-blue-600" />
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: t.kepengurusan.distrik, value: data.summary.totalDistrik },
                { label: t.kepengurusan.wilayah, value: data.summary.totalWilayah },
                { label: t.kepengurusan.ranting, value: data.summary.totalRanting },
                { label: t.kepengurusan.anggota, value: data.summary.totalMembers },
              ].map((card) => (
                <div key={card.label} className="bg-blue-50 p-4 rounded-xl text-center">
                  <div className="text-2xl font-bold text-blue-900">{card.value}</div>
                  <div className="text-sm text-blue-700">{card.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              {data.tree.map((nasional) => (
                <TreeNode key={nasional.id} node={nasional} depth={0} />
              ))}
            </div>
          </>
        ) : (
          <p className="text-center text-gray-500">{t.kepengurusan.failed}</p>
        )}
      </section>
    </PublicLayout>
  );
}
