/**
 * Pure utility to generate stable, human-readable slugs from titles.
 * Works uniformly across English and Persian typography without DOM or React dependencies.
 */
export function slugify(text: string): string {
  if (!text || typeof text !== 'string') return 'entry';

  // Normalize Unicode
  const normalized = text.normalize('NFC').trim().toLowerCase();

  // Replace ZWNJ and punctuation / whitespace with hyphens
  const cleaned = normalized
    .replace(/[\u200C\u200D\s_]+/g, '-') // ZWNJ, ZWJ, whitespace, underscore -> hyphen
    .replace(/[^\p{L}\p{N}\-]+/gu, '') // Keep letters, digits, hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Trim hyphens

  return cleaned || 'item';
}
