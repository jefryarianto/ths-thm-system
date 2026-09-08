'use client';

import { useEffect } from 'react';
import { getHomePathForRole } from '@/lib/role-redirect';

export default function HomePage() {
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
      window.location.replace(getHomePathForRole(role));
    } else {
      window.location.replace('/login');
    }
  }, []);

  return null;
}
