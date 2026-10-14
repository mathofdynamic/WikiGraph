/**
 * WikiGraph Appearance Storage & Multi-tab Synchronization
 * Persists user appearance preferences to localStorage and syncs live across browser tabs.
 */

import {
  AppearanceConfig,
  DEFAULTS,
  parseAppearance,
  toCssVariables,
} from '../shared/appearance';

export const APPEARANCE_STORAGE_KEY = 'wikigraph.appearance.v1';
export const APPEARANCE_VARS_KEY = 'wikigraph.appearance.vars.v1';

/**
 * Safely loads appearance preferences from localStorage.
 * Always returns a validated AppearanceConfig, falling back to DEFAULTS on error.
 */
export function loadAppearance(): AppearanceConfig {
  if (typeof window === 'undefined') {
    return DEFAULTS;
  }
  try {
    const raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return parseAppearance(raw);
  } catch (err) {
    console.warn('[WikiGraph] Error loading appearance from localStorage:', err);
    return DEFAULTS;
  }
}

/**
 * Safely writes appearance config and computed CSS variables to localStorage.
 */
export function saveAppearance(config: AppearanceConfig): void {
  if (typeof window === 'undefined') return;

  try {
    const validated = parseAppearance(config);
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(validated));

    // Also persist computed CSS variables to prevent flash of unstyled content on reload
    const cssVars = toCssVariables(validated);
    window.localStorage.setItem(APPEARANCE_VARS_KEY, JSON.stringify(cssVars));
  } catch (err) {
    console.warn('[WikiGraph] Error saving appearance to localStorage:', err);
  }
}

/**
 * Subscribes to storage events across browser tabs.
 * Calls callback with newly updated AppearanceConfig whenever another tab changes appearance.
 */
export function subscribeAppearance(
  callback: (config: AppearanceConfig) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === APPEARANCE_STORAGE_KEY) {
      try {
        const next = event.newValue ? parseAppearance(event.newValue) : DEFAULTS;
        callback(next);
      } catch (err) {
        console.warn('[WikiGraph] Error parsing storage event appearance:', err);
      }
    }
  };

  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener('storage', handleStorage);
  };
}
