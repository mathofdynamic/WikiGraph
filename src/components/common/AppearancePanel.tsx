import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  RotateCcw,
  Sun,
  Moon,
  Laptop,
  Sparkles,
  Check,
  AlertTriangle,
  Type,
  Maximize2,
  Sliders,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../locales/useLocale';
import { useTransientSurface } from '../../lib/useTransientSurface';
import {
  ACCENT_PRESETS,
  contrastRatio,
  isValidHex,
  readableForeground,
  AppearanceConfig,
} from '../../shared/appearance';

interface AppearancePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppearancePanel: React.FC<AppearancePanelProps> = ({ isOpen, onClose }) => {
  const { appearance, updateAppearance, resetAppearance, isDark } = useTheme();
  const { t, locale } = useLocale();

  const [customHex, setCustomHex] = useState(appearance.accent);
  const [hexError, setHexError] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { isRendered, isClosing, requestClose } = useTransientSurface(isOpen, onClose);

  // Sync customHex state whenever appearance.accent changes externally
  useEffect(() => {
    setCustomHex(appearance.accent);
    setHexError(false);
  }, [appearance.accent]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isRendered) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        requestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRendered, requestClose]);

  // Focus trap / click outside
  useEffect(() => {
    if (!isRendered) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Ensure clicking the trigger button itself isn't immediately double-triggered
        const target = e.target as HTMLElement;
        if (!target.closest('[data-appearance-trigger]')) {
          requestClose();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isRendered, requestClose]);

  if (!isRendered) return null;

  // Background color calculation for contrast check
  const currentBg = isDark ? '#090a0c' : '#f8f9fa';
  const accentContrast = contrastRatio(appearance.accent, currentBg);
  const isContrastLow = accentContrast < 4.5;
  const accentFgColor = readableForeground(appearance.accent);

  const handleHexChange = (val: string) => {
    let clean = val.trim();
    if (!clean.startsWith('#') && clean.length > 0) {
      clean = '#' + clean;
    }
    setCustomHex(clean);
    if (isValidHex(clean)) {
      setHexError(false);
      updateAppearance({ accent: clean.toLowerCase() });
    } else {
      setHexError(clean.length >= 7 || (clean.length > 0 && !clean.startsWith('#')));
    }
  };

  const applyGlassPreset = () => {
    updateAppearance({
      glassBlur: 16,
      surfaceAlpha: 0.72,
      backdropGlow: true,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="appearance-panel-title"
      className={`fixed inset-0 z-50 flex items-start justify-end p-2 sm:p-4 bg-black/40 backdrop-blur-xs motion-transient-overlay ${
        isClosing ? 'closing' : ''
      }`}
    >
      <div
        ref={panelRef}
        className={`w-full max-w-md max-h-[92vh] flex flex-col ui-card shadow-2xl border border-[var(--border)] overflow-hidden mt-12 sm:mt-8 motion-transient-card ${
          isClosing ? 'closing' : 'entering'
        }`}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-[var(--surface-secondary)]/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--surface-secondary)] flex items-center justify-center text-[var(--accent)] border border-[var(--border)]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 id="appearance-panel-title" className="text-sm font-semibold text-[var(--foreground)]">
                {t('appearance.title')}
              </h2>
              <p className="text-[11px] text-[var(--muted)]">
                {t('appearance.subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Panel Body / Scrollable Controls */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          {/* 1. Theme Mode */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-medium text-[var(--foreground)]">
                {t('appearance.theme')}
              </label>
              <span className="text-[11px] text-[var(--muted)] capitalize">
                {appearance.theme}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => updateAppearance({ theme: 'system' })}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  appearance.theme === 'system'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] font-semibold shadow-xs'
                    : 'border-[var(--border)] bg-[var(--surface-secondary)]/50 text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
                aria-pressed={appearance.theme === 'system'}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>{t('appearance.themeSystem')}</span>
              </button>

              <button
                type="button"
                onClick={() => updateAppearance({ theme: 'light' })}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  appearance.theme === 'light'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] font-semibold shadow-xs'
                    : 'border-[var(--border)] bg-[var(--surface-secondary)]/50 text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
                aria-pressed={appearance.theme === 'light'}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>{t('appearance.themeLight')}</span>
              </button>

              <button
                type="button"
                onClick={() => updateAppearance({ theme: 'dark' })}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  appearance.theme === 'dark'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] font-semibold shadow-xs'
                    : 'border-[var(--border)] bg-[var(--surface-secondary)]/50 text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
                aria-pressed={appearance.theme === 'dark'}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>{t('appearance.themeDark')}</span>
              </button>
            </div>
          </section>

          {/* 2. Accent Color */}
          <section className="space-y-3 pt-3 border-t border-[var(--separator)]">
            <div className="flex items-center justify-between">
              <label className="font-medium text-[var(--foreground)]">
                {t('appearance.accent')}
              </label>
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block shadow-2xs"
                  style={{ backgroundColor: appearance.accent }}
                />
                <span className="uppercase text-[var(--foreground)]">{appearance.accent}</span>
              </div>
            </div>

            {/* 8 Preset Swatches */}
            <div className="grid grid-cols-8 gap-2">
              {ACCENT_PRESETS.map((preset) => {
                const isSelected = appearance.accent.toLowerCase() === preset.hex.toLowerCase();
                const fg = readableForeground(preset.hex);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      updateAppearance({ accent: preset.hex });
                      setCustomHex(preset.hex);
                      setHexError(false);
                    }}
                    title={`${preset.name} (${preset.hex})`}
                    className={`group relative aspect-square rounded-full flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 shadow-xs ${
                      isSelected ? 'ring-2 ring-offset-2 ring-[var(--foreground)] scale-105' : ''
                    }`}
                    style={{ backgroundColor: preset.hex }}
                    aria-label={preset.name}
                  >
                    {isSelected && (
                      <Check
                        className="w-3.5 h-3.5 transition-transform"
                        style={{ color: fg }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Hex Input & Contrast Checker */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[11px] text-[var(--muted)] block mb-1">
                  {t('appearance.customHex')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customHex}
                    onChange={(e) => handleHexChange(e.target.value)}
                    placeholder="#006fee"
                    maxLength={7}
                    className={`w-full py-1.5 px-2.5 text-xs font-mono rounded-md bg-[var(--surface-secondary)] border text-[var(--foreground)] focus:outline-none ${
                      hexError
                        ? 'border-rose-500 focus:border-rose-500'
                        : 'border-[var(--border)] focus:border-[var(--accent)]'
                    }`}
                  />
                  <div
                    className="absolute end-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded border border-black/10 shadow-2xs pointer-events-none"
                    style={{ backgroundColor: isValidHex(customHex) ? customHex : appearance.accent }}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[var(--muted)] block mb-1">
                  {t('appearance.contrast')}
                </label>
                <div
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border text-xs font-mono ${
                    isContrastLow
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  <span className="font-semibold">{accentContrast}:1</span>
                  {isContrastLow ? (
                    <span className="text-[10px] uppercase font-sans font-medium text-amber-600 dark:text-amber-400">
                      &lt; 4.5
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-sans font-medium text-emerald-600 dark:text-emerald-400">
                      AA PASS
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Contrast Warning if below 4.5:1 */}
            {isContrastLow && (
              <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 flex items-start gap-2 text-[11px] leading-relaxed">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>{t('appearance.contrastWarn')}</span>
              </div>
            )}
          </section>

          {/* 3. Glass Effect */}
          <section className="space-y-3.5 pt-3 border-t border-[var(--separator)]">
            <div className="flex items-center justify-between">
              <label className="font-medium text-[var(--foreground)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>{t('appearance.glassEffect')}</span>
              </label>
              <button
                type="button"
                onClick={applyGlassPreset}
                className="px-2.5 py-1 rounded text-[11px] font-medium bg-[var(--surface-secondary)] text-[var(--foreground)] hover:bg-[var(--surface-tertiary)] border border-[var(--border)] transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>{t('appearance.glassPreset')}</span>
              </button>
            </div>

            {/* Surface Blur (0-32px) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--muted)]">{t('appearance.blur')}</span>
                <span className="font-mono text-[var(--foreground)] font-medium">
                  {appearance.glassBlur}px
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="32"
                step="1"
                value={appearance.glassBlur}
                onChange={(e) => updateAppearance({ glassBlur: Number(e.target.value) })}
                className="w-full accent-[var(--accent)] cursor-pointer"
              />
            </div>

            {/* Surface Opacity (50-100%) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--muted)]">{t('appearance.opacity')}</span>
                <span className="font-mono text-[var(--foreground)] font-medium">
                  {Math.round(appearance.surfaceAlpha * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.0"
                step="0.01"
                value={appearance.surfaceAlpha}
                onChange={(e) => updateAppearance({ surfaceAlpha: Number(e.target.value) })}
                className="w-full accent-[var(--accent)] cursor-pointer"
              />
            </div>

            {/* Backdrop: none / soft accent glow */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[var(--muted)]">
                {t('appearance.backdropGlow')}
              </span>
              <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]/50 p-0.5">
                <button
                  type="button"
                  onClick={() => updateAppearance({ backdropGlow: false })}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                    !appearance.backdropGlow
                      ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {t('appearance.backdropNone')}
                </button>
                <button
                  type="button"
                  onClick={() => updateAppearance({ backdropGlow: true })}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                    appearance.backdropGlow
                      ? 'bg-[var(--accent)] text-[var(--accent-foreground)] shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{t('appearance.backdropSoft')}</span>
                </button>
              </div>
            </div>
          </section>

          {/* 4. Typography */}
          <section className="space-y-3 pt-3 border-t border-[var(--separator)]">
            <div className="flex items-center justify-between">
              <label className="font-medium text-[var(--foreground)] flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>{t('appearance.typography')}</span>
              </label>
            </div>

            {/* Latin Font */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-[var(--muted)] block">
                {t('appearance.latinFont')}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateAppearance({ fontLatin: 'inter' })}
                  className={`py-1.5 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                    appearance.fontLatin === 'inter'
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] font-semibold'
                      : 'border-[var(--border)] bg-[var(--surface-secondary)]/50 text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  Inter
                </button>
                <button
                  type="button"
                  onClick={() => updateAppearance({ fontLatin: 'system' })}
                  className={`py-1.5 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                    appearance.fontLatin === 'system'
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] font-semibold'
                      : 'border-[var(--border)] bg-[var(--surface-secondary)]/50 text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  System UI
                </button>
              </div>
            </div>

            {/* Persian Font */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-[var(--muted)] block">
                {t('appearance.persianFont')}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateAppearance({ fontPersian: 'default' })}
                  className={`py-1.5 px-2.5 rounded-lg border text-[11px] font-medium transition-all cursor-pointer text-center ${
                    appearance.fontPersian === 'default'
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] font-semibold'
                      : 'border-[var(--border)] bg-[var(--surface-secondary)]/50 text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {t('appearance.fontPersianDefault')}
                </button>
                <button
                  type="button"
                  onClick={() => updateAppearance({ fontPersian: 'fanum' })}
                  className={`py-1.5 px-2.5 rounded-lg border text-[11px] font-medium transition-all cursor-pointer text-center ${
                    appearance.fontPersian === 'fanum'
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] font-semibold'
                      : 'border-[var(--border)] bg-[var(--surface-secondary)]/50 text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {t('appearance.fontPersianFaNum')}
                </button>
              </div>
            </div>

            {/* Base Font Size (87.5% - 125% in 4 steps) */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--muted)]">{t('appearance.fontSize')}</span>
                <span className="font-mono text-[var(--foreground)] font-medium">
                  {Math.round(appearance.fontScale * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0.875, 1.0, 1.125, 1.25].map((scale) => {
                  const pct = Math.round(scale * 100);
                  const isSelected = Math.abs(appearance.fontScale - scale) < 0.01;
                  return (
                    <button
                      key={scale}
                      type="button"
                      onClick={() => updateAppearance({ fontScale: scale })}
                      className={`py-1 px-1.5 rounded border text-[11px] font-mono transition-colors cursor-pointer text-center ${
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold'
                          : 'border-[var(--border)] bg-[var(--surface-secondary)]/50 text-[var(--muted)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {pct}%
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Line Height (compact / comfortable / relaxed) */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-[var(--muted)] block">
                {t('appearance.lineHeight')}
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['compact', 'comfortable', 'relaxed'] as const).map((lh) => {
                  const isSelected = appearance.leading === lh;
                  const labelMap = {
                    compact: t('appearance.lhCompact'),
                    comfortable: t('appearance.lhComfortable'),
                    relaxed: t('appearance.lhRelaxed'),
                  };
                  return (
                    <button
                      key={lh}
                      type="button"
                      onClick={() => updateAppearance({ leading: lh })}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all cursor-pointer text-center capitalize ${
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] font-semibold'
                          : 'border-[var(--border)] bg-[var(--surface-secondary)]/50 text-[var(--muted)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {labelMap[lh]}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 5. Shape / Corner Radius */}
          <section className="space-y-2.5 pt-3 border-t border-[var(--separator)]">
            <label className="font-medium text-[var(--foreground)] flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>{t('appearance.shape')}</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['sharp', 'default', 'round'] as const).map((rad) => {
                const isSelected = appearance.radius === rad;
                const labelMap = {
                  sharp: t('appearance.shapeSharp'),
                  default: t('appearance.shapeDefault'),
                  round: t('appearance.shapeRound'),
                };
                return (
                  <button
                    key={rad}
                    type="button"
                    onClick={() => updateAppearance({ radius: rad })}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all cursor-pointer text-center capitalize ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] font-semibold'
                        : 'border-[var(--border)] bg-[var(--surface-secondary)]/50 text-[var(--muted)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {labelMap[rad]}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 6. Motion */}
          <section className="space-y-2.5 pt-3 border-t border-[var(--separator)]">
            <label className="font-medium text-[var(--foreground)]">
              {t('appearance.motion')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['system', 'full', 'reduced'] as const).map((mot) => {
                const isSelected = appearance.motion === mot;
                const labelMap = {
                  system: t('appearance.motionSystem'),
                  full: t('appearance.motionFull'),
                  reduced: t('appearance.motionReduced'),
                };
                return (
                  <button
                    key={mot}
                    type="button"
                    onClick={() => updateAppearance({ motion: mot })}
                    className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] font-semibold'
                        : 'border-[var(--border)] bg-[var(--surface-secondary)]/50 text-[var(--muted)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {labelMap[mot]}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Panel Footer */}
        <div className="px-5 py-3.5 border-t border-[var(--border)] bg-[var(--surface-secondary)]/40 flex items-center justify-between">
          <p className="text-[11px] text-[var(--muted)] italic">
            {t('appearance.savedNotice')}
          </p>
          <button
            type="button"
            onClick={resetAppearance}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-secondary)] text-xs font-medium transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('appearance.reset')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
