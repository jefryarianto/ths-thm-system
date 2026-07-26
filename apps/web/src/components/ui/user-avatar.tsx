'use client';

import { useState } from 'react';

interface UserAvatarProps {
  fotoPath?: string | null;
  namaLengkap: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function UserAvatar({ fotoPath, namaLengkap, size = 'md' }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = sizeMap[size];

  if (fotoPath && !imgError) {
    return (
      <img
        src={`/api/uploads/${fotoPath}`}
        alt={namaLengkap}
        className={`${sizeClass} rounded-full object-cover shrink-0 shadow-sm ring-2 ring-white dark:ring-gray-800`}
        onError={() => setImgError(true)}
      />
    );
  }

  // Gradient initials fallback
  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0 shadow-sm ring-2 ring-white dark:ring-gray-800`}
    >
      {getInitials(namaLengkap)}
    </div>
  );
}
