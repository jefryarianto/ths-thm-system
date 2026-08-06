'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getHomePathForRole } from '@/lib/role-redirect';

export default function HomePage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      let role: string | null = null;
      try {
        const raw = localStorage.getItem('user');
        if (raw) role = (JSON.parse(raw) as { role?: string })?.role ?? null;
      } catch {
        /* ignore */
      }
      router.replace(getHomePathForRole(role));
    } else {
      router.replace('/login');
    }
    setChecked(true);
  }, [router]);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Mengalihkan...</p>
      </div>
    );
  }

  return null;
}
