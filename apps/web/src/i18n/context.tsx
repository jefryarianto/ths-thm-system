'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { translations, Locale, TranslationKeys } from './translations';

interface I18nContextType {
  locale: Locale;
  t: TranslationKeys;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('id');

  // Load persisted locale on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ths-thm-locale') as Locale;
      if (saved && (saved === 'id' || saved === 'en')) {
        setLocaleState(saved);
      }
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('ths-thm-locale', newLocale);
    }
  }, []);

  const value: I18nContextType = {
    locale,
    t: translations[locale],
    setLocale,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// Client-side initialization component
export function LocaleInitializer() {
  const { setLocale } = useI18n();
  
  useEffect(() => {
    const saved = localStorage.getItem('ths-thm-locale') as Locale;
    if (saved && (saved === 'id' || saved === 'en')) {
      setLocale(saved);
    }
  }, [setLocale]);
  
  return null;
}
