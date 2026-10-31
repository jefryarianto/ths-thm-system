'use client';

import { MemberAvatar } from '@/components/ui/member-avatar';

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

export function UserAvatar({ fotoPath, namaLengkap, size = 'md' }: UserAvatarProps) {
  const sizeClass = sizeMap[size];
  return (
    <MemberAvatar
      src={fotoPath ? `/api/uploads/${fotoPath}` : null}
      name={namaLengkap}
      className={sizeClass}
    />
  );
}
