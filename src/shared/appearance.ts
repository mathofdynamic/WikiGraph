/**
 * WikiGraph Appearance & Typography Preferences
 * Pure logic module: validation, parsing, WCAG contrast, CSS variable mapping.
 */

export type ThemeMode = 'system' | 'light' | 'dark';
export type LatinFont = 'inter' | 'system';
export type PersianFont = 'default' | 'fanum';
export type LeadingOption = 'compact' | 'comfortable' | 'relaxed';
export type RadiusOption = 'sharp' | 'default' | 'round';
export type MotionOption = 'system' | 'full' | 'reduced';

export interface AppearanceConfig {
  theme: ThemeMode;
  accent: string; // 6-digit hex: #rrggbb
  glassBlur: number; // 0 to 32px
  surfaceAlpha: number; // 0.50 to 1.00
  backdropGlow: boolean; // false = none, true = soft accent glow
  fontLatin: LatinFont;
  fontPersian: PersianFont;
  fontScale: number; // 0.875 to 1.25 (87.5% - 125%)
  leading: LeadingOption;
  radius: RadiusOption;
  motion: MotionOption;
}

export const DEFAULTS: AppearanceConfig = {
  theme: 'system',
  accent: '#006fee',
  glassBlur: 0,
  surfaceAlpha: 1.0,
  backdropGlow: false,
  fontLatin: 'inter',
  fontPersian: 'default',
  fontScale: 1.0,
  leading: 'comfortable',
  radius: 'default',
  motion: 'system',
};

export const ACCENT_PRESETS = [
  { id: 'blue', name: 'Electric Blue', hex: '#006fee', fa: 'آبی اقیانوسی' },
  { id: 'emerald', name: 'Emerald', hex: '#10b981', fa: 'زمردی' },
  { id: 'indigo', name: 'Indigo', hex: '#6366f1', fa: 'نیلی' },
  { id: 'violet', name: 'Violet', hex: '#8b5cf6', fa: 'بنفش' },
  { id: 'rose', name: 'Rose', hex: '#f43f5e', fa: 'رز' },
  { id: 'amber', name: 'Amber', hex: '#f59e0b', fa: 'کهربایی' },
  { id: 'cyan', name: 'Cyan', hex: '#06b6d4', fa: 'فیروزه‌ای' },
  { id: 'slate', name: 'Slate', hex: '#64748b', fa: 'خاکستری' },
] as const;

export const HEX_REGEX = /^#[0-9a-f]{6}$/i;

export function isValidHex(hex: string): boolean {
  return HEX_REGEX.test(hex.trim());
}

/**
 * Normalizes 3-char or 6-char hex to standard 6-digit lowercase #rrggbb string.
 */
export function normalizeHex(hex: string): string | null {
  const clean = hex.trim();
  if (HEX_REGEX.test(clean)) {
    return clean.toLowerCase();
  }
  const match3 = /^#([0-9a-f]{3})$/i.exec(clean);
  if (match3) {
    const chars = match3[1].split('').map((c) => c + c).join('');
    return `#${chars.toLowerCase()}`;
  }
  return null;
}

/**
 * Computes relative luminance according to WCAG 2.1 specifications.
 */
export function relativeLuminance(hex: string): number {
  const norm = normalizeHex(hex);
  if (!norm) return 0;
  const raw = norm.slice(1);
  const r = parseInt(raw.substring(0, 2), 16) / 255;
  const g = parseInt(raw.substring(2, 4), 16) / 255;
  const b = parseInt(raw.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Calculates WCAG contrast ratio between two colors (ranging from 1 to 21).
 */
export function contrastRatio(colorA: string, colorB: string): number {
  const l1 = relativeLuminance(colorA);
  const l2 = relativeLuminance(colorB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Number(ratio.toFixed(2));
}

/**
 * Returns readable foreground color (#000000 or #ffffff) that maximizes contrast.
 */
export function readableForeground(hex: string): string {
  const crBlack = contrastRatio(hex, '#000000');
  const crWhite = contrastRatio(hex, '#ffffff');
  return crBlack >= crWhite ? '#000000' : '#ffffff';
}

/**
 * Clamps numeric values strictly between min and max.
 */
function clamp(val: number, min: number, max: number): number {
  if (Number.isNaN(val) || !Number.isFinite(val)) return min;
  return Math.min(max, Math.max(min, val));
}

/**
 * Parses raw configuration (from JSON or localStorage).
 * Never throws on corrupt or missing JSON; clamps and falls back per field.
 */
export function parseAppearance(raw: unknown): AppearanceConfig {
  let parsed: Record<string, unknown> = {};

  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object' && !Array.isArray(p)) {
        parsed = p as Record<string, unknown>;
      }
    } catch {
      // Corrupt JSON string: fall back gracefully to empty object
      parsed = {};
    }
  } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    parsed = raw as Record<string, unknown>;
  }

  // 1. Theme Mode
  let theme: ThemeMode = DEFAULTS.theme;
  if (parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system') {
    theme = parsed.theme;
  } else if (parsed.themeMode === 'light' || parsed.themeMode === 'dark' || parsed.themeMode === 'system') {
    theme = parsed.themeMode as ThemeMode;
  }

  // 2. Accent Color
  let accent = DEFAULTS.accent;
  const rawAccent = typeof parsed.accent === 'string' ? parsed.accent : typeof parsed.primaryColor === 'string' ? parsed.primaryColor : '';
  if (rawAccent && isValidHex(rawAccent)) {
    accent = rawAccent.trim().toLowerCase();
  }

  // 3. Glass Blur (0-32px)
  let glassBlur = DEFAULTS.glassBlur;
  const rawBlur = parsed.glassBlur !== undefined ? Number(parsed.glassBlur) : parsed.backdropBlur !== undefined ? Number(parsed.backdropBlur) : NaN;
  if (!Number.isNaN(rawBlur)) {
    glassBlur = Math.round(clamp(rawBlur, 0, 32));
  }

  // 4. Surface Opacity (0.50 - 1.00)
  let surfaceAlpha = DEFAULTS.surfaceAlpha;
  const rawAlpha = parsed.surfaceAlpha !== undefined ? Number(parsed.surfaceAlpha) : parsed.moduleOpacity !== undefined ? Number(parsed.moduleOpacity) : NaN;
  if (!Number.isNaN(rawAlpha)) {
    surfaceAlpha = Number(clamp(rawAlpha, 0.5, 1.0).toFixed(2));
  }

  // 5. Backdrop Glow (boolean)
  let backdropGlow = DEFAULTS.backdropGlow;
  if (typeof parsed.backdropGlow === 'boolean') {
    backdropGlow = parsed.backdropGlow;
  } else if (parsed.backdropGlow === 'soft' || parsed.backdrop === 'soft') {
    backdropGlow = true;
  } else if (parsed.backdropGlow === 'none' || parsed.backdrop === 'none') {
    backdropGlow = false;
  }

  // 6. Typography: Latin
  let fontLatin: LatinFont = DEFAULTS.fontLatin;
  if (parsed.fontLatin === 'inter' || parsed.fontLatin === 'system') {
    fontLatin = parsed.fontLatin;
  } else if (parsed.fontFamily === 'system') {
    fontLatin = 'system';
  } else if (parsed.fontFamily === 'inter') {
    fontLatin = 'inter';
  }

  // 7. Typography: Persian
  let fontPersian: PersianFont = DEFAULTS.fontPersian;
  if (parsed.fontPersian === 'default' || parsed.fontPersian === 'fanum') {
    fontPersian = parsed.fontPersian;
  }

  // 8. Typography: Font Scale (0.875 to 1.25)
  let fontScale = DEFAULTS.fontScale;
  const rawScale = parsed.fontScale !== undefined ? Number(parsed.fontScale) : parsed.uiFontScale !== undefined ? Number(parsed.uiFontScale) : NaN;
  if (!Number.isNaN(rawScale)) {
    fontScale = Number(clamp(rawScale, 0.875, 1.25).toFixed(3));
  }

  // 9. Line Height (compact / comfortable / relaxed)
  let leading: LeadingOption = DEFAULTS.leading;
  if (parsed.leading === 'compact' || parsed.leading === 'comfortable' || parsed.leading === 'relaxed') {
    leading = parsed.leading;
  }

  // 10. Corner Radius (sharp / default / round)
  let radius: RadiusOption = DEFAULTS.radius;
  if (parsed.radius === 'sharp' || parsed.radius === 'default' || parsed.radius === 'round') {
    radius = parsed.radius;
  }

  // 11. Motion (system / full / reduced)
  let motion: MotionOption = DEFAULTS.motion;
  if (parsed.motion === 'system' || parsed.motion === 'full' || parsed.motion === 'reduced') {
    motion = parsed.motion;
  } else if (parsed.motion === 'off') {
    motion = 'reduced';
  }

  return {
    theme,
    accent,
    glassBlur,
    surfaceAlpha,
    backdropGlow,
    fontLatin,
    fontPersian,
    fontScale,
    leading,
    radius,
    motion,
  };
}

/**
 * Maps an AppearanceConfig to a map of CSS variable names and values.
 */
export function toCssVariables(appearance: AppearanceConfig): Record<string, string> {
  const normAccent = normalizeHex(appearance.accent) || DEFAULTS.accent;
  const accentFg = readableForeground(normAccent);

  const radiusBaseMap: Record<RadiusOption, string> = {
    sharp: '2px',
    default: '8px',
    round: '16px',
  };

  const fontLatinMap: Record<LatinFont, string> = {
    inter: 'Inter',
    system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const fontPersianMap: Record<PersianFont, string> = {
    default: '"IRANYekanX NoEn"',
    fanum: '"IRANYekanX FaNum"',
  };

  const leadingMap: Record<LeadingOption, string> = {
    compact: '1.5',
    comfortable: '1.8',
    relaxed: '2.0',
  };

  const radiusBase = radiusBaseMap[appearance.radius] || radiusBaseMap.default;
  const fontLatin = fontLatinMap[appearance.fontLatin] || fontLatinMap.inter;
  const fontPersian = fontPersianMap[appearance.fontPersian] || fontPersianMap.default;
  const leading = leadingMap[appearance.leading] || leadingMap.comfortable;

  return {
    '--accent': normAccent,
    '--accent-foreground': accentFg,
    '--glass-blur': `${appearance.glassBlur}px`,
    '--surface-alpha': `${appearance.surfaceAlpha}`,
    '--radius-base': radiusBase,
    '--font-latin': fontLatin,
    '--font-persian': fontPersian,
    '--font-scale': `${appearance.fontScale}`,
    '--leading': leading,
    // Supporting and backward-compatible bridge tokens
    '--radius': radiusBase,
    '--field-radius': appearance.radius === 'sharp' ? '2px' : appearance.radius === 'round' ? '10px' : '6px',
    '--ui-font-scale': `${appearance.fontScale}`,
    '--ui-backdrop-blur': `${appearance.glassBlur}px`,
    '--ui-module-opacity': `${appearance.surfaceAlpha}`,
  };
}
