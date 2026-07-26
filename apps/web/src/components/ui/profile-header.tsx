'use client';

import { ReactNode } from 'react';
import { RefreshCw, Upload } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────

export interface ProfileAvatar {
  src?: string | null;
  /** Fallback image (defaults to /logo.png) */
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
  /** Refresh callback — shows a refresh button when provided */
  onRefresh?: () => void;
  /** Whether the component is in a loading state */
  loading?: boolean;
}

// ─── Component ──────────────────────────────────────────────────

export default function ProfileHeader({
  name,
  subtitle,
  meta,
  avatar,
  badges,
  actions,
  gradient = 'from-blue-600 via-blue-700 to-indigo-700',
  onRefresh,
}: ProfileHeaderProps) {
  const avatarShape = avatar?.shape || 'circle';
  const avatarRadius = avatarShape === 'rounded' ? 'rounded-xl' : 'rounded-full';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Gradient Bar */}
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

      {/* Content — pulled up to overlap the gradient bar */}
      <div className="px-6 pb-6 -mt-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          {/* Avatar */}
          {avatar && (
            <div className="relative group shrink-0">
              <div
                className={`w-20 h-20 ${avatarRadius} bg-white dark:bg-gray-800 flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-gray-800 overflow-hidden`}
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
                  src={avatar.fallback || '/logo.png'}
                  alt=""
                  className={`w-full h-full object-cover ${avatar.src ? 'hidden' : ''}`}
                />
              </div>
              {avatar.onUpload && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition">
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
              <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                {name}
              </h1>
              {badges?.map((badge, i) => (
                <span key={i} className="shrink-0">
                  {badge}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
              {subtitle && (
                <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {subtitle}
                </span>
              )}
              {meta && (
                <span className="font-mono text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">
                  {meta}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {actions && (
            <div className="flex items-center gap-2 mt-4 sm:mt-0 shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
