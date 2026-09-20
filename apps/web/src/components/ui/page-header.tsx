'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Breadcrumbs from '@/components/ui/breadcrumbs';

// ─── Tab Config ──────────────────────────────────────

export interface PageTab {
  key: string;
  label: string;
  icon?: React.ComponentType<{ size?: number | string }>;
  count?: number;
}

// ─── Props ────────────────────────────────────────────

interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Refresh callback - shows a Refresh button when provided */
  onRefresh?: () => void;
  /** Back link href - when set, shows an ArrowLeft back link instead of Breadcrumbs */
  backHref?: string;
  /** Back link label (default: 'Kembali') */
  backLabel?: string;
  /** Action buttons rendered on the right side of the header */
  children?: ReactNode;
  /** Tab configuration - renders a tab bar below the header when set */
  tabs?: PageTab[];
  /** Currently active tab key */
  activeTab?: string;
  /** Tab change callback */
  onTabChange?: (key: string) => void;
  /** Optional breadcrumb suffix for detail pages (entity name) */
  breadcrumbSuffix?: { href: string; label: string };
  /** Custom className */
  className?: string;
}

// ─── Component ────────────────────────────────────────

export default function PageHeader({
  title,
  subtitle,
  onRefresh,
  backHref,
  backLabel = 'Kembali',
  children,
  tabs,
  activeTab,
  onTabChange,
  breadcrumbSuffix,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Breadcrumbs or Back Button */}
      {backHref ? (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text transition group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          {backLabel}
        </Link>
      ) : (
        <Breadcrumbs suffix={breadcrumbSuffix} />
      )}

      {/* Title + Actions Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-text truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onRefresh && (
            <button
              onClick={onRefresh}
              aria-label="Refresh data"
              className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-text hover:bg-surface-variant transition-colors"
            >
              <RefreshCw size={14} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}
          {children}
        </div>
      </div>

      {/* Tab Bar */}
      {tabs && tabs.length > 0 && (
        <div className="border-b border-border">
          <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => onTabChange?.(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted hover:text-text hover:border-border'
                  }`}
                >
                  {Icon && <Icon size={16} />}
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-primary-container text-primary-on-container'
                        : 'bg-surface-variant text-muted'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
