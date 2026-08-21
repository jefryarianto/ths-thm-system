'use client';

import { useState, useEffect, useCallback } from 'react';
import { PublicLayout } from '@/components';
import apiClient from '@/lib/api-client';
import { ChevronDown, ChevronRight, Building2, MapPin, Users, Loader2 } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import Link from 'next/link';

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
    'bg-navy-800 text-white font-bold',
    'bg-navy-50 text-navy-800 font-semibold border-l-4 border-navy-800',
    'bg-gold-50 text-gold-600 font-medium border-l-4 border-gold-400',
    'bg-[#F8F9FA] text-gray-700 border-l-4 border-gray-200',
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
      {/* Page Header */}
      <div className="bg-gradient-to-r from-navy-700 to-navy-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
            <Link href="/" className="hover:text-white transition-colors">Beranda</Link>
            <ChevronRight size={14} />
            <span className="text-gold-400">{t.nav.kepengurusan}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white font-serif">{t.kepengurusan.title}</h1>
          <div className="w-16 h-1 bg-gold-400 mt-4 rounded-full" />
        </div>
      </div>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-navy-800" />
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
                <div key={card.label} className="bg-white border border-gray-100 rounded-xl p-4 text-center hover:shadow-md transition-all">
                  <div className="text-2xl font-bold text-navy-800">{card.value}</div>
                  <div className="text-sm text-gray-500 mt-1">{card.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
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
