'use client';

import { useState } from 'react';
import { getInitials } from '@/lib/initials';

interface MemberAvatarProps {
  src?: string | null;
  name: string;
  className?: string;
  textClassName?: string;
  alt?: string;
}

export function MemberAvatar({ src, name, className = 'w-10 h-10', textClassName, alt }: MemberAvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = !!src && !failed;

  if (showImage) {
    return (
      <img
        src={src}
        alt={alt || name}
        className={`${className} rounded-full object-cover shrink-0 shadow-sm ring-2 ring-surface`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${className} rounded-full bg-gradient-to-br from-primary-500 to-primary-800 flex items-center justify-center text-white font-bold shrink-0 shadow-sm ring-2 ring-surface`}
      aria-label={name}
    >
      <span className={textClassName}>{getInitials(name)}</span>
    </div>
  );
}
