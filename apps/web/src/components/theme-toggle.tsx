'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';

// Track the transition timeout to handle rapid clicks (clear previous timeout)
let themeTransitionTimer: ReturnType<typeof setTimeout> | null = null;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-9 h-9" />; // placeholder to avoid layout shift
  }

  const cycle = () => {
    // Enable smooth color transitions during theme switch
    if (themeTransitionTimer) clearTimeout(themeTransitionTimer);
    document.documentElement.classList.add('transitioning-theme');

    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');

    // Remove the transition class after the animation completes
    themeTransitionTimer = setTimeout(() => {
      document.documentElement.classList.remove('transitioning-theme');
      themeTransitionTimer = null;
    }, 350);
  };

  const Icon = theme === 'dark' ? Moon : theme === 'system' ? Monitor : Sun;
  const label = theme === 'dark' ? 'Gelap' : theme === 'system' ? 'Sistem' : 'Terang';

  return (
    <button
      onClick={cycle}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm"
      title={`Tema: ${label}`}
    >
      <Icon size={16} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
