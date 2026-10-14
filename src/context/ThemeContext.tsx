import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AppearanceConfig,
  DEFAULTS,
  ThemeMode,
  toCssVariables,
} from '../shared/appearance';
import {
  loadAppearance,
  saveAppearance,
  subscribeAppearance,
} from '../lib/appearanceStorage';

export type { AppearanceConfig, ThemeMode };

export interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  appearance: AppearanceConfig;
  updateAppearance: (partial: Partial<AppearanceConfig>) => void;
  resetAppearance: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appearance, setAppearance] = useState<AppearanceConfig>(() => loadAppearance());
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const initial = loadAppearance();
    if (initial.theme === 'dark') return true;
    if (initial.theme === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Sync across browser tabs via storage event
  useEffect(() => {
    const unsubscribe = subscribeAppearance((nextConfig) => {
      setAppearance(nextConfig);
    });
    return unsubscribe;
  }, []);

  // Apply appearance, CSS variables, theme class and data-motion attribute to DOM root
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const evaluateTheme = () => {
      let dark = false;
      if (appearance.theme === 'dark') {
        dark = true;
      } else if (appearance.theme === 'light') {
        dark = false;
      } else {
        // 'system'
        dark = mediaQuery.matches;
      }

      setIsDark(dark);
      if (dark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    };

    evaluateTheme();

    // Apply all computed CSS variables
    const cssVars = toCssVariables(appearance);
    for (const [key, value] of Object.entries(cssVars)) {
      root.style.setProperty(key, value);
    }

    // Motion attribute
    root.setAttribute('data-motion', appearance.motion);

    // Glow attribute
    root.setAttribute('data-glow', appearance.backdropGlow ? 'true' : 'false');

    // Persist configuration to localStorage and cache vars
    saveAppearance(appearance);

    const onMediaChange = () => {
      if (appearance.theme === 'system') {
        evaluateTheme();
      }
    };

    mediaQuery.addEventListener('change', onMediaChange);
    return () => mediaQuery.removeEventListener('change', onMediaChange);
  }, [appearance]);

  const updateAppearance = (partial: Partial<AppearanceConfig>) => {
    setAppearance((prev) => {
      const next = { ...prev, ...partial };
      return next;
    });
  };

  const resetAppearance = () => {
    setAppearance(DEFAULTS);
  };

  const setTheme = (t: ThemeMode) => {
    updateAppearance({ theme: t });
  };

  const toggleTheme = () => {
    const nextTheme: ThemeMode = isDark ? 'light' : 'dark';
    updateAppearance({ theme: nextTheme });
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: appearance.theme,
        isDark,
        setTheme,
        toggleTheme,
        appearance,
        updateAppearance,
        resetAppearance,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
