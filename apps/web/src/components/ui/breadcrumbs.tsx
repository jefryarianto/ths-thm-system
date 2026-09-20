'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { buildBreadcrumbs, type BreadcrumbSegment } from '@/config/breadcrumbs';

interface BreadcrumbsProps {
  /** Optional: override the auto-detected pathname */
  pathname?: string;
  /** Optional: override the breadcrumb segments (disables auto-detection) */
  segments?: BreadcrumbSegment[];
  /** Optional: add a custom suffix segment (e.g. for detail pages to show member name) */
  suffix?: BreadcrumbSegment;
  /** Whether to show on mobile (default: true, shows abbreviated on small screens) */
  responsive?: boolean;
}

export default function Breadcrumbs({
  pathname: overridePathname,
  segments: overrideSegments,
  suffix,
  responsive = true,
}: BreadcrumbsProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const autoPathname = usePathname();
  const pathname = overridePathname || autoPathname;

  const segments = overrideSegments || buildBreadcrumbs(pathname);

  // Add suffix if provided (e.g. member name on detail page)
  const allSegments = suffix ? [...segments, suffix] : segments;

  // On mobile, only show the last 2 segments + Dashboard
  const displaySegments = responsive
    ? allSegments.length > 3
      ? [
          allSegments[0],
          { href: '#', label: '...' },
          allSegments[allSegments.length - 2],
          allSegments[allSegments.length - 1],
        ]
      : allSegments
    : allSegments;

  // Wait for hydration to avoid SSR flash
  if (!mounted) return <div className="mb-4 h-5" />;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1 text-sm flex-wrap">
        {displaySegments.map((segment, index) => {
          const isLast = index === displaySegments.length - 1;
          const isEllipsis = segment.label === '...';

          return (
            <li key={segment.href + segment.label} className="flex items-center gap-1">
              {/* Chevron separator (skip for first item) */}
              {index > 0 && (
                <ChevronRight
                  size={14}
                  className="text-muted shrink-0 mx-0.5"
                  aria-hidden="true"
                />
              )}

              {isLast ? (
                // Current page - not clickable, greyed out
                <span className="text-muted font-medium truncate max-w-[200px]" aria-current="page">
                  {index === 0 ? (
                    <span className="flex items-center gap-1">
                      <Home size={14} className="shrink-0" aria-hidden="true" />
                      <span className="hidden sm:inline">{segment.label}</span>
                    </span>
                  ) : (
                    segment.label
                  )}
                </span>
              ) : isEllipsis ? (
                <span className="text-muted px-1" aria-hidden="true">...</span>
              ) : (
                <Link
                  href={segment.href}
                  className={`text-muted hover:text-primary transition-colors truncate max-w-[180px] ${
                    index === 0 ? 'hidden sm:flex sm:items-center sm:gap-1' : ''
                  }`}
                >
                  {index === 0 ? (
                    <>
                      <Home size={14} className="shrink-0" aria-hidden="true" />
                      <span>{segment.label}</span>
                    </>
                  ) : (
                    segment.label
                  )}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
