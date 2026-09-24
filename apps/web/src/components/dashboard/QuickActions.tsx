'use client';

import Link from 'next/link';
import { ChevronRight, MousePointerClick } from 'lucide-react';
import { Can } from '@/components/auth/can';
import { quickActions, type QuickActionConfig } from './constants';

/**
 * Quick Actions — Aksi Cepat.
 *
 * Peningkatan vs implementasi lama:
 *  - Terbagi 2 grup: "Aksi Cepat" (input harian, form langsung) dan
 *    "Operasional" (administratif/analitik) — sebelumnya bercampur flat.
 *  - `href` mengarah ke FORM/aksi nyata (mis. /members/new), bukan halaman
 *    list, sehingga benar-benar menghemat langkah.
 *  - Grup Operasional diciutkan secara default (progressive disclosure).
 *  - Empty state saat tak ada aksi yang diizinkan untuk role.
 */
export default function QuickActions() {
  const create = quickActions.filter((a) => a.group === 'create');
  const ops = quickActions.filter((a) => a.group === 'ops');

  const hasAny = create.length > 0 || ops.length > 0;
  if (!hasAny) {
    return (
      <div className="p-6 text-center text-sm text-muted">
        <MousePointerClick
          size={22}
          className="mx-auto mb-2 opacity-50"
          aria-hidden="true"
        />
        <p className="font-medium text-text/80">Tidak ada aksi tersedia</p>
        <p className="text-xs mt-1">Aksi akan muncul sesuai peran Anda.</p>
      </div>
    );
  }

  return (
    <div className="p-5">
      {create.length > 0 && (
        <div className="mb-4">
          <p className="text-2xs font-semibold uppercase tracking-wider text-muted mb-2">
            Aksi Cepat
          </p>
          <div className="space-y-1.5">
            {create.map((action) => (
              <QuickActionRow key={action.href} action={action} />
            ))}
          </div>
        </div>
      )}

      {ops.length > 0 && (
        <details className="group">
          <summary className="text-2xs font-semibold uppercase tracking-wider text-muted cursor-pointer list-none flex items-center gap-1.5 mb-2 select-none hover:text-text transition-colors">
            <ChevronRight
              size={12}
              className="transition-transform duration-200 group-open:rotate-90"
              aria-hidden="true"
            />
            Operasional
          </summary>
          <div className="space-y-1.5 mt-2">
            {ops.map((action) => (
              <QuickActionRow key={action.href} action={action} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function QuickActionRow({ action }: { action: QuickActionConfig }) {
  const Icon = action.icon;
  return (
    <Can module={action.module} action={action.action}>
      <Link
        href={action.href}
        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-variant transition group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="p-2 rounded-lg bg-primary-container group-hover:scale-105 transition-transform shrink-0">
          <Icon size={16} className="text-primary" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text">{action.label}</p>
          <p className="text-xs text-muted truncate">{action.desc}</p>
        </div>
        <ChevronRight
          size={14}
          className="text-muted group-hover:text-primary transition shrink-0"
          aria-hidden="true"
        />
      </Link>
    </Can>
  );
}
