import React, { createContext, useContext, useEffect, useState } from 'react';
import { safeLocalStorageGet, safeLocalStorageSet } from '../lib/storage';

export type ThemeMode = 'light' | 'dark' | 'system' | 'custom';
export type InterfaceContrast = 'low' | 'normal' | 'high';
export type MotionSpeed = 'off' | 'fast' | 'normal' | 'slow';
export type FontFamilyOption = 'inter' | 'system' | 'mono';

export interface AppearanceConfig {
  themeMode: ThemeMode;
  customBaseTheme: 'dark' | 'light';
  primaryColor: string;
  fontFamily: FontFamilyOption;
  fontScale: number; // 0.85 to 1.20
  contrast: InterfaceContrast;
  backdropBlur: number; // 0 to 32px
  moduleOpacity: number; // 0.60 to 1.0
  motion: MotionSpeed;
}

export const DEFAULT_APPEARANCE: AppearanceConfig = {
  themeMode: 'dark',
  customBaseTheme: 'dark',
  primaryColor: '#006FEE',
  fontFamily: 'inter',
  fontScale: 1.0,
  contrast: 'normal',
  backdropBlur: 8,
  moduleOpacity: 0.96,
  motion: 'normal',
};

export interface ThemeContextType {
  // Backwards compatibility
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;

  // Global Appearance System
  appearance: AppearanceConfig;
  updateAppearance: (partial: Partial<AppearanceConfig>) => void;
  resetAppearance: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const APPEARANCE_STORAGE_KEY = 'wikigraph_appearance_v1';
const LEGACY_THEME_STORAGE_KEY = 'wikigraph_pref_theme';

const FONT_MAP: Record<FontFamilyOption, string> = {
  inter: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Vazirmatn", sans-serif',
  system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Vazirmatn", sans-serif',
  mono: '"JetBrains Mono", "SF Mono", Menlo, Consolas, "Vazirmatn", monospace',
};

const MOTION_MAP: Record<MotionSpeed, number> = {
  off: 0,
  fast: 100,
  normal: 160,
  slow: 260,
};

export function getContrastColor(hex: string): string {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  if (cleanHex.length !== 6) return '#ffffff';

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lR = toLinear(r);
  const lG = toLinear(g);
  const lB = toLinear(b);

  const luminance = 0.2126 * lR + 0.7152 * lG + 0.0722 * lB;
  return luminance > 0.45 ? '#090a0c' : '#ffffff';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appearance, setAppearanceState] = useState<AppearanceConfig>(() => {
    try {
      const saved = safeLocalStorageGet(APPEARANCE_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_APPEARANCE, ...JSON.parse(saved) };
      }
      // Migrate legacy theme if present
      const legacy = safeLocalStorageGet(LEGACY_THEME_STORAGE_KEY) as ThemeMode | null;
      if (legacy && (legacy === 'light' || legacy === 'dark' || legacy === 'system')) {
        return { ...DEFAULT_APPEARANCE, themeMode: legacy };
      }
    } catch (e) {
      console.warn('Failed to load appearance config, using defaults:', e);
    }
    return DEFAULT_APPEARANCE;
  });

  const [isDark, setIsDark] = useState<boolean>(true);

  // Apply appearance configuration directly to DOM root
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyConfiguration = () => {
      // 1. Determine dark vs light mode
      let dark = false;
      if (appearance.themeMode === 'dark') {
        dark = true;
      } else if (appearance.themeMode === 'light') {
        dark = false;
      } else if (appearance.themeMode === 'system') {
        dark = mediaQuery.matches;
      } else if (appearance.themeMode === 'custom') {
        dark = appearance.customBaseTheme === 'dark';
      }

      setIsDark(dark);
      if (dark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }

      // 2. Primary / Accent Color
      const primary = appearance.primaryColor || '#006FEE';
      root.style.setProperty('--accent', primary);
      root.style.setProperty('--accent-foreground', getContrastColor(primary));

      // 3. Font Family & Scale
      const font = FONT_MAP[appearance.fontFamily] || FONT_MAP.inter;
      root.style.setProperty('--font-sans', font);
      root.style.setProperty('--ui-font-scale', String(appearance.fontScale || 1.0));

      // 4. Contrast Settings
      const contrast = appearance.contrast || 'normal';
      root.setAttribute('data-contrast', contrast);
      if (contrast === 'low') {
        if (dark) {
          root.style.setProperty('--border', 'rgba(255, 255, 255, 0.04)');
          root.style.setProperty('--separator', 'rgba(255, 255, 255, 0.03)');
          root.style.setProperty('--muted', '#787880');
          root.style.setProperty('--surface-secondary', '#16171a');
          root.style.setProperty('--surface-tertiary', '#1e1f24');
        } else {
          root.style.setProperty('--border', 'rgba(0, 0, 0, 0.05)');
          root.style.setProperty('--separator', 'rgba(0, 0, 0, 0.03)');
          root.style.setProperty('--muted', '#788596');
          root.style.setProperty('--surface-secondary', '#f4f5f7');
          root.style.setProperty('--surface-tertiary', '#eaecee');
        }
      } else if (contrast === 'high') {
        if (dark) {
          root.style.setProperty('--border', 'rgba(255, 255, 255, 0.18)');
          root.style.setProperty('--separator', 'rgba(255, 255, 255, 0.14)');
          root.style.setProperty('--muted', '#b0b0b8');
          root.style.setProperty('--surface-secondary', '#202227');
          root.style.setProperty('--surface-tertiary', '#2c2e36');
        } else {
          root.style.setProperty('--border', 'rgba(0, 0, 0, 0.18)');
          root.style.setProperty('--separator', 'rgba(0, 0, 0, 0.12)');
          root.style.setProperty('--muted', '#475569');
          root.style.setProperty('--surface-secondary', '#e6e9ee');
          root.style.setProperty('--surface-tertiary', '#dadde3');
        }
      } else {
        // Normal contrast: clear custom overrides so default CSS rules apply
        root.style.removeProperty('--border');
        root.style.removeProperty('--separator');
        root.style.removeProperty('--muted');
        root.style.removeProperty('--surface-secondary');
        root.style.removeProperty('--surface-tertiary');
      }

      // 5. Global Background Blur & Module Opacity
      const blurPx = Math.max(0, Math.min(32, appearance.backdropBlur ?? 8));
      root.style.setProperty('--ui-backdrop-blur', `${blurPx}px`);

      const opacity = Math.max(0.6, Math.min(1.0, appearance.moduleOpacity ?? 0.96));
      root.style.setProperty('--ui-module-opacity', String(opacity));

      // 6. Motion Speed
      const motionMs = MOTION_MAP[appearance.motion] ?? 160;
      root.style.setProperty('--ui-motion-duration', `${motionMs}ms`);
    };

    applyConfiguration();

    // Persist to storage
    safeLocalStorageSet(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
    safeLocalStorageSet(LEGACY_THEME_STORAGE_KEY, appearance.themeMode);

    const listener = () => {
      if (appearance.themeMode === 'system') applyConfiguration();
    };
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [appearance]);

  const updateAppearance = (partial: Partial<AppearanceConfig>) => {
    setAppearanceState((prev) => ({ ...prev, ...partial }));
  };

  const resetAppearance = () => {
    setAppearanceState(DEFAULT_APPEARANCE);
  };

  // Backwards compatible methods
  const setTheme = (t: ThemeMode) => {
    updateAppearance({ themeMode: t });
  };

  const toggleTheme = () => {
    const nextMode: ThemeMode = isDark ? 'light' : 'dark';
    updateAppearance({ themeMode: nextMode });
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: appearance.themeMode,
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
