'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';

interface OrgMember {
  id: string;
  nama: string;
  jabatan: string;
  jabatanUrutan: number;
  parentId: string | null;
  fotoPath?: string | null;
  status?: string;
}

interface OrgChartProps {
  members: OrgMember[];
  onMemberClick?: (member: OrgMember) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function MemberCard({
  member,
  onClick,
  isHighlighted,
}: {
  member: OrgMember;
  onClick?: () => void;
  isHighlighted?: boolean;
}) {
  const initials = getInitials(member.nama);
  const colors = [
    'bg-navy-800 text-white',
    'bg-navy-600 text-white',
    'bg-gold-500 text-navy-900',
    'bg-blue-500 text-white',
    'bg-emerald-500 text-white',
    'bg-purple-500 text-white',
  ];
  const colorIdx = Math.min(member.jabatanUrutan, colors.length - 1);

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all cursor-pointer hover:shadow-lg hover:-translate-y-0.5 min-w-[140px] max-w-[180px] ${
        isHighlighted
          ? 'border-gold-400 shadow-lg ring-2 ring-gold-200'
          : 'border-gray-200 dark:border-gray-600 hover:border-navy-300 dark:hover:border-navy-500'
      } bg-white dark:bg-gray-800`}
    >
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold ${colors[colorIdx]} shrink-0`}
      >
        {initials}
      </div>
      <span className="text-sm font-semibold text-navy-800 dark:text-navy-100 text-center leading-tight">
        {member.nama}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400 text-center leading-tight">
        {member.jabatan}
      </span>
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
        Aktif
      </span>
    </button>
  );
}

function OrgTreeNode({
  member,
  allMembers,
  depth,
  onMemberClick,
  highlightedId,
  collapsedNodes,
  toggleCollapse,
}: {
  member: OrgMember;
  allMembers: OrgMember[];
  depth: number;
  onMemberClick?: (m: OrgMember) => void;
  highlightedId?: string;
  collapsedNodes: Set<string>;
  toggleCollapse: (id: string) => void;
}) {
  const children = allMembers.filter((m) => m.parentId === member.id);
  const isCollapsed = collapsedNodes.has(member.id);
  const hasChildren = children.length > 0;

  return (
    <div className="flex flex-col items-center">
      <MemberCard
        member={member}
        onClick={() => onMemberClick?.(member)}
        isHighlighted={highlightedId === member.id}
      />

      {hasChildren && (
        <button
          onClick={() => toggleCollapse(member.id)}
          className="mt-1 p-1 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? (
            <ChevronDown size={14} className="text-gray-500" />
          ) : (
            <ChevronRight size={14} className="text-gray-500" />
          )}
        </button>
      )}

      {hasChildren && !isCollapsed && (
        <>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
          <div className="relative">
            {/* Horizontal connector */}
            {children.length > 1 && (
              <div
                className="absolute top-0 h-px bg-gray-300 dark:bg-gray-600"
                style={{
                  width: `${(children.length - 1) * 200}px`,
                  left: `calc(50% - ${(children.length - 1) * 100}px)`,
                }}
              />
            )}
            <div className="flex gap-4 pt-2 items-start flex-wrap justify-center">
              {children.map((child) => (
                <div key={child.id} className="flex flex-col items-center">
                  <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
                  <OrgTreeNode
                    member={child}
                    allMembers={allMembers}
                    depth={depth + 1}
                    onMemberClick={onMemberClick}
                    highlightedId={highlightedId}
                    collapsedNodes={collapsedNodes}
                    toggleCollapse={toggleCollapse}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function OrgChart({ members, onMemberClick }: OrgChartProps) {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [highlightedId, setHighlightedId] = useState<string | undefined>();

  const roots = useMemo(() => members.filter((m) => !m.parentId), [members]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.15, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.15, 0.3));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setHighlightedId(undefined);
  };
  const handleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: panStart.current.panX + (e.clientX - panStart.current.x),
      y: panStart.current.panY + (e.clientY - panStart.current.y),
    });
  };
  const handleMouseUp = () => setIsPanning(false);

  const touchStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, panX: pan.x, panY: pan.y };
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    setPan({
      x: touchStart.current.panX + (t.clientX - touchStart.current.x),
      y: touchStart.current.panY + (t.clientY - touchStart.current.y),
    });
  };

  const handleMemberClick = (member: OrgMember) => {
    setHighlightedId(member.id);
    onMemberClick?.(member);
  };

  if (members.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg">Struktur kepengurusan belum tersedia untuk unit ini.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Controls */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={handleZoomIn}
          className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          title="Zoom in"
        >
          <ZoomIn size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
        <button
          onClick={handleReset}
          className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          title="Reset"
        >
          <RotateCcw size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
        <button
          onClick={handleFullscreen}
          className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          title="Fullscreen"
        >
          <Maximize2 size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
        <span className="text-xs text-gray-400 ml-2">{Math.round(zoom * 100)}%</span>
      </div>

      {/* Chart area */}
      <div
        className="overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
        style={{
          minHeight: '400px',
          maxHeight: isFullscreen ? '80vh' : '600px',
          cursor: isPanning ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <div
          className="p-8 min-w-max"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: 'top center',
          }}
        >
          <div className="flex flex-col items-center gap-0">
            {roots.map((root) => (
              <OrgTreeNode
                key={root.id}
                member={root}
                allMembers={members}
                depth={0}
                onMemberClick={handleMemberClick}
                highlightedId={highlightedId}
                collapsedNodes={collapsedNodes}
                toggleCollapse={toggleCollapse}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
