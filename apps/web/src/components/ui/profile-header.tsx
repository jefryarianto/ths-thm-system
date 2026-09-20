'use client';

import { ReactNode } from 'react';
import { RefreshCw, Upload } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────

export interface ProfileAvatar {
  src?: string | null;
  /** Fallback image (defaults to /logo.svg) */
  fallback?: string;
  /** If set, shows a hover overlay to upload a new photo */
  onUpload?: (file: File) => Promise<void>;
  /** Shape of the avatar: 'circle' (default) or 'rounded' */
  shape?: 'circle' | 'rounded';
}

export interface ProfileHeaderProps {
  /** The main name/title displayed as h1 */
  name: string;
  /** Subtitle text below the name (member number, org path, etc.) */
  subtitle?: string | null;
  /** Optional additional text besides subtitle (e.g., member ID) */
  meta?: string | null;
  /** Avatar configuration */
  avatar?: ProfileAvatar;
  /** Badges shown next to the name (e.g. StatusBadge components) */
  badges?: ReactNode[];
  /** Action buttons rendered on the right side */
  actions?: ReactNode;
  /** Tailwind gradient classes for the top bar */
  gradient?: string;
  /** If true, hides the colored gradient bar entirely (content starts at the top normally) */
  hideGradient?: boolean;
  /** Refresh callback - shows a refresh button when provided */
  onRefresh?: () => void;
}

// ─── Component ──────────────────────────────────────────────────

export default function ProfileHeader({
  name,
  subtitle,
  meta,
  avatar,
  badges,
  actions,
  gradient = 'from-primary via-primary-700 to-secondary',
  hideGradient = false,
  onRefresh,
}: ProfileHeaderProps) {
  const avatarShape = avatar?.shape || 'circle';
  const avatarRadius = avatarShape === 'rounded' ? 'rounded-xl' : 'rounded-full';
  const uploadRadius = avatarShape === 'rounded' ? 'rounded-xl' : 'rounded-full';

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Gradient Bar */}
      {!hideGradient && (
        <div className={`h-16 bg-gradient-to-r ${gradient} relative`}>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="absolute top-3 right-3 p-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm transition text-white"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      )}

      {/* Content - pulled up to overlap the gradient bar when present */}
      <div className={`relative px-6 pb-6 ${hideGradient ? 'pt-6' : '-mt-12'}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          {/* Avatar */}
          {avatar && (
            <div className="relative group shrink-0">
              <div
                className={`w-20 h-20 ${avatarRadius} bg-surface flex items-center justify-center shadow-lg ring-4 ring-surface overflow-hidden`}
              >
                {avatar.src ? (
                  <img
                    src={avatar.src}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                      const next = (e.currentTarget.nextElementSibling as HTMLElement | null);
                      if (next) next.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <img
                  src={avatar.fallback || '/logo.svg'}
                  alt=""
                  className={`w-full h-full object-cover ${avatar.src ? 'hidden' : ''}`}
                />
              </div>
              {avatar.onUpload && (
                <label className={`absolute inset-0 flex items-center justify-center bg-black/40 ${uploadRadius} opacity-0 group-hover:opacity-100 cursor-pointer transition`}>
                  <Upload size={20} className="text-white" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) await avatar.onUpload!(file);
                    }}
                  />
                </label>
              )}
            </div>
          )}

          {/* Name + Badges */}
          <div className="flex-1 mt-2 sm:mt-0 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-text truncate">
                {name}
              </h1>
              {badges}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
              {subtitle && (
                <span className="text-sm text-muted truncate">
                  {subtitle}
                </span>
              )}
              {meta && (
                <span className="font-mono text-xs text-muted bg-surface-variant px-2 py-0.5 rounded-md">
                  {meta}
                </span>
              )}
            </div>
          </div>

          {/* Right side - Refresh + Action Buttons */}
          {(hideGradient && onRefresh) || actions ? (
            <div className="flex items-center gap-2 mt-4 sm:mt-0 shrink-0">
              {hideGradient && onRefresh && (
                <button
                  onClick={onRefresh}
                  className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-text hover:bg-surface-variant transition-colors"
                  title="Refresh"
                >
                  <RefreshCw size={14} />
                </button>
              )}
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
