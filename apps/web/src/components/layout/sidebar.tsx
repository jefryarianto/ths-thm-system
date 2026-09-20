'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronRight,
  GraduationCap,
  ClipboardCheck,
  MapPin,
  PanelLeft,
  PanelLeftClose,
  X,
} from 'lucide-react';
import type { AssignedKegiatan, MenuGroup, MenuItem } from './navigation';

/**
 * Sidebar THS-THM (Global Navigation — Tahap 2).
 *
 * - Warna 100% dari Design System (secondary-900 sebagai shell, active state
 *   Primary Container + teks primary, hover netral) — TIDAK rainbow.
 * - Desktop  : rail tetap, expanded (256px) / collapsed (64px).
 * - Tablet/Mobile (<1024px): drawer overlay + backdrop + tombol tutup.
 * - Semua menu, href, urutan grup, badge, dan tooltip dipertahankan.
 */

const SIDEBAR_EXPANDED = 256;
const SIDEBAR_COLLAPSED = 64;

interface SidebarProps {
  /** Mode rail icon-only (desktop). Mobile drawer selalu expanded. */
  collapsed: boolean;
  /** Drawer mobile terbuka */
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
  pathname: string | null;
  homeHref: string;
  /** Grup menu yang sudah difilter per-role (lihat navigation.ts) */
  visibleGroups: MenuGroup[];
  assignedKegiatan: AssignedKegiatan[];
  isActivityAdmin: boolean;
  unreadCount: number;
  queueStats: { waiting: number; active: number } | null;
  scopeName: string | null;
  scopeLevel: string | null;
  collapsedGroups: Set<string>;
  onToggleGroup: (label: string) => void;
  /** false sampai komponen ter-mount (hydration guard) */
  ready: boolean;
}

export default function Sidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapse,
  pathname,
  homeHref,
  visibleGroups,
  assignedKegiatan,
  isActivityAdmin,
  unreadCount,
  queueStats,
  scopeName,
  scopeLevel,
  collapsedGroups,
  onToggleGroup,
  ready,
}: SidebarProps) {
  // Tutup drawer dengan tombol Escape (a11y)
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMobile();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mobileOpen, onCloseMobile]);

  const width = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  // ── Desktop rail ────────────────────────────────────────────────
  const desktop = (
    <aside
      className="hidden lg:flex bg-secondary-900 text-secondary-100 border-r border-white/10 flex-col transition-[width] duration-300 ease-in-out motion-reduce:transition-none"
      style={{ width, minWidth: width }}
    >
      <SidebarBody
        collapsed={collapsed}
        pathname={pathname}
        homeHref={homeHref}
        visibleGroups={visibleGroups}
        assignedKegiatan={assignedKegiatan}
        isActivityAdmin={isActivityAdmin}
        unreadCount={unreadCount}
        queueStats={queueStats}
        scopeName={scopeName}
        scopeLevel={scopeLevel}
        collapsedGroups={collapsedGroups}
        onToggleGroup={onToggleGroup}
        onToggleCollapse={onToggleCollapse}
        ready={ready}
      />
    </aside>
  );

  // ── Mobile / tablet drawer (<1024px) ────────────────────────────
  const mobile = mobileOpen ? (
    <div
      className="lg:hidden fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-label="Navigasi utama"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCloseMobile}
        aria-hidden="true"
      />
      <aside className="relative flex flex-col w-64 max-w-[85vw] bg-secondary-900 text-secondary-100 border-r border-white/10 animate-sidebar-in">
        <SidebarBody
          collapsed={false}
          pathname={pathname}
          homeHref={homeHref}
          visibleGroups={visibleGroups}
          assignedKegiatan={assignedKegiatan}
          isActivityAdmin={isActivityAdmin}
          unreadCount={unreadCount}
          queueStats={queueStats}
          scopeName={scopeName}
          scopeLevel={scopeLevel}
          collapsedGroups={collapsedGroups}
          onToggleGroup={onToggleGroup}
          onToggleCollapse={onToggleCollapse}
          onToggleCollapseOverride={onCloseMobile}
          collapseIcon="close"
          onNavigate={onCloseMobile}
          ready={ready}
        />
      </aside>
    </div>
  ) : null;

  return (
    <>
      {desktop}
      {mobile}
    </>
  );
}

/* ── Inner body (dipakai desktop rail & mobile drawer) ─────────── */

interface SidebarBodyProps extends Omit<SidebarProps, 'mobileOpen' | 'onCloseMobile'> {
  onToggleCollapseOverride?: () => void;
  collapseIcon?: 'panel' | 'close';
  onNavigate?: () => void;
}

function SidebarBody({
  collapsed,
  onToggleCollapse,
  onToggleCollapseOverride,
  collapseIcon = 'panel',
  onNavigate,
  pathname,
  homeHref,
  visibleGroups,
  assignedKegiatan,
  isActivityAdmin,
  unreadCount,
  queueStats,
  scopeName,
  scopeLevel,
  collapsedGroups,
  onToggleGroup,
  ready,
}: SidebarBodyProps) {
  // Ukur tinggi konten tiap grup agar animasi max-height akordeon mulus
  // (item tetap ter-mount — grup tertutup di-clip via max-height: 0)
  const groupContentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [groupHeights, setGroupHeights] = useState<Record<string, number>>({});

  useEffect(() => {
    if (collapsed) return; // mode icon — wrapper tidak dibatasi
    const next: Record<string, number> = {};
    for (const group of visibleGroups) {
      const el = groupContentRefs.current[group.label];
      // scrollHeight melaporkan tinggi penuh walau max-height 0;
      // +4 buffer untuk margin/sub-pixel item terakhir
      if (el && el.scrollHeight > 0) next[group.label] = el.scrollHeight + 4;
    }
    setGroupHeights((prev) => {
      let changed = false;
      const merged = { ...prev };
      for (const [k, v] of Object.entries(next)) {
        if (merged[k] !== v) {
          merged[k] = v;
          changed = true;
        }
      }
      return changed ? merged : prev;
    });
    // `ready` penting: item admin-only (Antrean, WebSocket) hanya render setelah mount.
  }, [visibleGroups, collapsedGroups, collapsed, ready]);

  return (
    <>
      {/* Brand + toggle (h-14 — sejajar dengan header) */}
      <div className="flex items-center justify-between h-14 shrink-0 border-b border-white/10 px-3">
        <Link
          href={homeHref}
          onClick={onNavigate}
          className={`flex items-center gap-2 min-w-0 ${collapsed ? 'justify-center w-full' : ''}`}
        >
          <img
            src="/logo.svg"
            alt="THS-THM"
            className={`shrink-0 rounded-lg object-cover ring-1 ring-white/20 transition-all duration-300 ${
              collapsed ? 'h-7 w-7' : 'h-8 w-8'
            }`}
          />
          {!collapsed && (
            <span className="text-lg font-serif font-bold text-white truncate">THS-THM</span>
          )}
        </Link>
        <button
          type="button"
          onClick={onToggleCollapseOverride ?? onToggleCollapse}
          className={`shrink-0 rounded-lg text-secondary-200 hover:text-white hover:bg-white/10 transition-colors ${
            collapsed ? 'p-1' : 'p-1.5'
          }`}
          title={collapseIcon === 'close' ? 'Tutup navigasi' : collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          aria-label={collapseIcon === 'close' ? 'Tutup navigasi' : collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
        >
          {collapseIcon === 'close' ? (
            <X size={18} />
          ) : collapsed ? (
            <PanelLeft size={16} />
          ) : (
            <PanelLeftClose size={18} />
          )}
        </button>
      </div>

      {/* Navigasi */}
      <nav
        aria-label="Navigasi sidebar"
        className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1"
      >
        {/* Role activity-scoped: menu kegiatan dinamis */}
        {ready && assignedKegiatan.length > 0 && (
          <div>
            {!collapsed && (
              <div className="px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider text-secondary-200/70">
                {isActivityAdmin ? 'Kegiatan Saya' : 'Penilaian Saya'}
              </div>
            )}
            {assignedKegiatan.map((kegiatan) => {
              const href = isActivityAdmin
                ? `/graduations/${kegiatan.id}`
                : `/graduations/${kegiatan.id}/assessments`;
              const isActive = pathname?.startsWith(href) || false;
              return (
                <Link
                  key={kegiatan.id}
                  href={href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-primary-container text-primary-on-container font-semibold'
                      : 'text-secondary-200 hover:bg-white/10 hover:text-white'
                  } ${collapsed ? 'justify-center px-2' : ''}`}
                  title={collapsed ? kegiatan.nama : undefined}
                >
                  <span className="relative shrink-0">
                    {isActivityAdmin ? <GraduationCap size={18} /> : <ClipboardCheck size={18} />}
                  </span>
                  {!collapsed && <span className="truncate text-xs">{kegiatan.nama}</span>}
                </Link>
              );
            })}
          </div>
        )}

        {/* Expand button (mode collapsed — aksesibel, centered) */}
        {collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex w-full items-center justify-center px-2 py-2 rounded-lg text-secondary-200 hover:bg-white/10 hover:text-white transition-colors"
            title="Perluas sidebar"
            aria-label="Perluas sidebar"
          >
            <PanelLeft size={18} />
          </button>
        )}

        {/* Grup menu standar (sudah difilter per role) */}
        {ready &&
          visibleGroups.map((group) => {
            const isClosed = collapsedGroups.has(group.label);
            return (
              <div key={group.label}>
                {!collapsed && (
                  <button
                    type="button"
                    onClick={() => onToggleGroup(group.label)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider text-secondary-200/70 hover:text-white hover:bg-white/5 transition-colors"
                    title={isClosed ? `Buka grup ${group.label}` : `Ciutkan grup ${group.label}`}
                    aria-expanded={!isClosed}
                  >
                    <span className="truncate">{group.label}</span>
                    {isClosed ? (
                      <ChevronRight size={14} className="shrink-0" />
                    ) : (
                      <ChevronDown size={14} className="shrink-0" />
                    )}
                  </button>
                )}

                {/* Wrapper selalu ter-mount; visibilitas murni via maxHeight */}
                <div
                  ref={(el) => {
                    groupContentRefs.current[group.label] = el;
                  }}
                  className={
                    collapsed
                      ? undefined
                      : 'overflow-hidden transition-[max-height] duration-300 ease-in-out motion-reduce:transition-none'
                  }
                  style={
                    collapsed
                      ? undefined
                      : { maxHeight: isClosed ? 0 : groupHeights[group.label] }
                  }
                >
                  {group.items.map((item) => (
                    <SidebarItem
                      key={item.href}
                      item={item}
                      collapsed={collapsed}
                      active={pathname?.startsWith(item.href) || false}
                      unreadCount={unreadCount}
                      queueStats={queueStats}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              </div>
            );
          })}
      </nav>

      {/* Indikator scope (distrik/wilayah/ranting) */}
      {!collapsed && scopeName && scopeLevel && (
        <div className="px-3 pb-3 pt-2 border-t border-white/10">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
            <MapPin size={14} className="text-primary-300 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-secondary-100 text-xs font-medium truncate">{scopeName}</div>
              <div className="text-secondary-300 text-2xs">{scopeLevel}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Satu item menu ─────────────────────────────────────────────── */

function SidebarItem({
  item,
  collapsed,
  active,
  unreadCount,
  queueStats,
  onNavigate,
}: {
  item: MenuItem;
  collapsed: boolean;
  active: boolean;
  unreadCount: number;
  queueStats: { waiting: number; active: number } | null;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const showUnread = item.href === '/notifications' && unreadCount > 0;
  const showQueue =
    item.href === '/admin/queues' && !!queueStats && queueStats.waiting + queueStats.active > 0;

  // Active state = Primary Container + teks Primary (spesifikasi Tahap 2)
  const classes = `flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-sm transition-colors ${
    active
      ? 'bg-primary-container text-primary-on-container font-semibold shadow-elegant'
      : 'text-secondary-200 hover:bg-white/10 hover:text-white'
  } ${collapsed ? 'justify-center px-2' : ''}`;

  const content = (
    <>
      {/* Icon 18px konsisten + dot indikator saat collapsed */}
      <span className="relative shrink-0">
        <Icon size={18} aria-hidden="true" />
        {collapsed && showUnread && (
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-error-500 ring-2 ring-secondary-900" />
        )}
        {collapsed && showQueue && (
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-warning-500 ring-2 ring-secondary-900" />
        )}
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && (
        <span className="ml-auto flex items-center gap-1.5">
          {showUnread && (
            <span className="bg-error-500 text-white text-2xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          {showQueue && queueStats && (
            <span
              className={`text-2xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                queueStats.waiting > 0
                  ? 'bg-warning-100 text-warning-800'
                  : 'bg-success-100 text-success-800'
              }`}
            >
              {queueStats.waiting + queueStats.active}
            </span>
          )}
          {item.external && (
            <svg
              className="w-3.5 h-3.5 text-secondary-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          )}
        </span>
      )}
    </>
  );

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        title={collapsed ? item.label : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={classes}
      title={collapsed ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
    >
      {content}
    </Link>
  );
}
