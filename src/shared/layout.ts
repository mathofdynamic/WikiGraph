/**
 * Canonical layout tokens for WikiGraph.
 * Single source of truth for container dimensions and the 12-column page grid.
 */
export const LAYOUT_TOKENS = {
  containerMaxWidth: '72rem',
  containerCssVar: '--container',
  gridColumns: 12,
  gapMobile: '16px',
  gapDesktop: '24px',
  paddingMobile: '16px',
  paddingDesktop: '24px',
  maxReadingLineLength: '70ch',
} as const;

export type LayoutTokens = typeof LAYOUT_TOKENS;
