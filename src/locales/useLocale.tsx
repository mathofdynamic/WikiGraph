import React, { createContext, useContext, useEffect, useState } from 'react';
import { en } from './en';
import { fa } from './fa';
import { AppLanguage } from '../types';
import { safeLocalStorageGet, safeLocalStorageSet } from '../lib/storage';

type LocaleDict = typeof en;

interface LocaleContextType {
  locale: AppLanguage;
  direction: 'ltr' | 'rtl';
  setLocale: (l: AppLanguage) => void;
  toggleLocale: () => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

const LOCALE_STORAGE_KEY = 'wikigraph_pref_locale';

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<AppLanguage>(() => {
    const saved = safeLocalStorageGet(LOCALE_STORAGE_KEY);
    return saved === 'fa' ? 'fa' : 'en';
  });

  const direction = locale === 'fa' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
    safeLocalStorageSet(LOCALE_STORAGE_KEY, locale);
  }, [locale, direction]);

  const setLocale = (newLocale: AppLanguage) => {
    setLocaleState(newLocale);
  };

  const toggleLocale = () => {
    setLocaleState((prev) => (prev === 'en' ? 'fa' : 'en'));
  };

  const dict: LocaleDict = locale === 'fa' ? (fa as unknown as LocaleDict) : en;

  const t = (path: string, params?: Record<string, string | number>): string => {
    const keys = path.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = dict;
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback to en
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let fallback: any = en;
        for (const fbKey of keys) {
          if (fallback && typeof fallback === 'object' && fbKey in fallback) {
            fallback = fallback[fbKey];
          } else {
            return path;
          }
        }
        current = fallback;
        break;
      }
    }

    if (typeof current !== 'string') {
      return path;
    }

    if (params) {
      return Object.entries(params).reduce(
        (acc, [k, v]) => acc.replace(new RegExp(`{${k}}`, 'g'), String(v)),
        current
      );
    }

    return current;
  };

  return (
    <LocaleContext.Provider value={{ locale, direction, setLocale, toggleLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
};

export function useLocale(): LocaleContextType {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return ctx;
}
