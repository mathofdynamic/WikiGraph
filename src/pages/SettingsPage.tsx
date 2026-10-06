import React, { useEffect, useState } from 'react';
import {
  Palette,
  FolderOpen,
  Database,
  Download,
  RotateCcw,
  Languages,
  Check,
  Sparkles,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import {
  useTheme,
  ThemeMode,
  FontFamilyOption,
  InterfaceContrast,
  MotionSpeed,
} from '../context/ThemeContext';
import { Collection } from '../types';
import { ConfirmModal } from '../components/common/ConfirmModal';

type SettingsCategory = 'appearance' | 'general' | 'data';

export const SettingsPage: React.FC = () => {
  const { repository } = useRepository();
  const { t, locale, setLocale } = useLocale();
  const { appearance, updateAppearance, resetAppearance } = useTheme();

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('appearance');

  // Collections state (read-only view)
  const [collections, setCollections] = useState<Collection[]>([]);

  // Reset appearance modal
  const [resetAppearanceModalOpen, setResetAppearanceModalOpen] = useState(false);

  // Custom primary color input state
  const [customHexInput, setCustomHexInput] = useState(appearance.primaryColor);

  useEffect(() => {
    setCustomHexInput(appearance.primaryColor);
  }, [appearance.primaryColor]);

  useEffect(() => {
    repository.listCollections().then(setCollections);
  }, [repository]);

  const handleHexChange = (val: string) => {
    setCustomHexInput(val);
    const cleaned = val.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(cleaned) || /^#[0-9A-Fa-f]{3}$/.test(cleaned)) {
      updateAppearance({ primaryColor: cleaned });
    }
  };

  const handleExportBackup = async () => {
    try {
      const [sources, knowledge, cols, outcomes] = await Promise.all([
        repository.listSources(),
        repository.listKnowledge(),
        repository.listCollections(),
        repository.listOutcomes(),
      ]);

      const backup = {
        app: 'WikiGraph',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        collections: cols,
        sources,
        knowledge,
        outcomes,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wikigraph_snapshot_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmResetAppearance = () => {
    resetAppearance();
    setResetAppearanceModalOpen(false);
  };

  // Primary color preset palette
  const PRIMARY_COLOR_PRESETS = [
    { label: 'WikiGraph Blue (Default)', hex: '#006FEE' },
    { label: 'Indigo', hex: '#6366F1' },
    { label: 'Purple', hex: '#8B5CF6' },
    { label: 'Emerald', hex: '#059669' },
    { label: 'Amber', hex: '#D97706' },
    { label: 'Crimson', hex: '#DC2626' },
    { label: 'Sky', hex: '#0284C7' },
    { label: 'Slate', hex: '#475569' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-[var(--separator)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-[var(--foreground)] leading-snug">
            {t('settings.title')}
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">
            Global appearance customization, viewer preferences, and public dataset export.
          </p>
        </div>

        {activeCategory === 'appearance' && (
          <button
            type="button"
            onClick={() => setResetAppearanceModalOpen(true)}
            className="ui-button ui-button-secondary text-xs"
            title="Restore default appearance"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Appearance</span>
          </button>
        )}
      </div>

      {/* Main Two-Column Settings Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Categories Navigation (~25%) */}
        <div className="lg:col-span-3 space-y-2">
          <div className="ui-panel p-2 space-y-1">
            <button
              type="button"
              onClick={() => setActiveCategory('appearance')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer text-start ${
                activeCategory === 'appearance'
                  ? 'bg-[var(--surface-secondary)] text-[var(--foreground)] font-semibold border border-[var(--border)]'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)]/50'
              }`}
            >
              <Palette className="w-4 h-4 text-[var(--muted)] shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="block truncate">Appearance</span>
                <span className="text-[10px] text-[var(--muted)] font-normal block truncate">
                  Theme, fonts, blur & colors
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('general')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer text-start ${
                activeCategory === 'general'
                  ? 'bg-[var(--surface-secondary)] text-[var(--foreground)] font-semibold border border-[var(--border)]'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)]/50'
              }`}
            >
              <Languages className="w-4 h-4 text-[var(--muted)] shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="block truncate">General</span>
                <span className="text-[10px] text-[var(--muted)] font-normal block truncate">
                  Language & text direction
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('data')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer text-start ${
                activeCategory === 'data'
                  ? 'bg-[var(--surface-secondary)] text-[var(--foreground)] font-semibold border border-[var(--border)]'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)]/50'
              }`}
            >
              <Database className="w-4 h-4 text-[var(--muted)] shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="block truncate">Public Dataset & Export</span>
                <span className="text-[10px] text-[var(--muted)] font-normal block truncate">
                  Taxonomy & JSON snapshot
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Right Content: Selected Category Settings (~75%) */}
        <div className="lg:col-span-9 space-y-6">
          {/* CATEGORY 1: APPEARANCE SYSTEM */}
          {activeCategory === 'appearance' && (
            <div className="ui-panel p-5 sm:p-6 space-y-6 shadow-xs">
              <div className="border-b border-[var(--separator)] pb-3">
                <h2 className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight">
                  Global Appearance System
                </h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Configure visual parameters applied dynamically across all WikiGraph modules.
                </p>
              </div>

              <div className="space-y-6 divide-y divide-[var(--separator)]">
                {/* Setting 1: Theme Mode */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-4 first:pt-0">
                  <div className="space-y-0.5 max-w-sm">
                    <span className="text-xs font-semibold text-[var(--foreground)] block">
                      Theme Mode
                    </span>
                    <span className="text-[11px] text-[var(--muted)] block leading-relaxed">
                      Select how WikiGraph adapts to light and dark illumination or your OS preference.
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] flex-wrap">
                      {(['system', 'light', 'dark', 'custom'] as ThemeMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => updateAppearance({ themeMode: mode })}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer capitalize flex items-center gap-1.5 ${
                            appearance.themeMode === mode
                              ? 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-xs'
                              : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                          }`}
                        >
                          {mode === 'system' && <Monitor className="w-3.5 h-3.5" />}
                          {mode === 'light' && <Sun className="w-3.5 h-3.5" />}
                          {mode === 'dark' && <Moon className="w-3.5 h-3.5" />}
                          {mode === 'custom' && <Sparkles className="w-3.5 h-3.5" />}
                          <span>{mode}</span>
                        </button>
                      ))}
                    </div>

                    {/* Custom Theme Sub-options */}
                    {appearance.themeMode === 'custom' && (
                      <div className="p-3 rounded-lg bg-[var(--surface-secondary)]/50 border border-[var(--border)] space-y-2">
                        <span className="text-[11px] font-medium text-[var(--foreground)] block">
                          Custom Theme Base Illumination
                        </span>
                        <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)]">
                          <button
                            type="button"
                            onClick={() => updateAppearance({ customBaseTheme: 'dark' })}
                            className={`px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                              appearance.customBaseTheme === 'dark'
                                ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-xs'
                                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                            }`}
                          >
                            Dark Base
                          </button>
                          <button
                            type="button"
                            onClick={() => updateAppearance({ customBaseTheme: 'light' })}
                            className={`px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                              appearance.customBaseTheme === 'light'
                                ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-xs'
                                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                            }`}
                          >
                            Light Base
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Setting 2: Primary / Accent Color */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-6">
                  <div className="space-y-0.5 max-w-sm">
                    <span className="text-xs font-semibold text-[var(--foreground)] block">
                      Primary Accent Color
                    </span>
                    <span className="text-[11px] text-[var(--muted)] block leading-relaxed">
                      Replaces the default blue globally. All buttons, active indicators, focus rings, and links inherit this chromatic accent.
                    </span>
                  </div>

                  <div className="space-y-3 sm:text-end">
                    {/* Controls row */}
                    <div className="flex items-center gap-2 justify-start sm:justify-end">
                      {/* Color Picker input */}
                      <label
                        className="w-8 h-8 rounded-lg border border-[var(--border)] overflow-hidden cursor-pointer relative shrink-0 flex items-center justify-center shadow-xs"
                        style={{ backgroundColor: appearance.primaryColor }}
                        title="Pick custom primary color"
                      >
                        <input
                          type="color"
                          value={appearance.primaryColor}
                          onChange={(e) => updateAppearance({ primaryColor: e.target.value })}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        />
                      </label>

                      {/* Hex Text Input */}
                      <input
                        type="text"
                        dir="ltr"
                        value={customHexInput}
                        onChange={(e) => handleHexChange(e.target.value)}
                        placeholder="#006FEE"
                        className="ui-input w-28 text-xs font-mono text-center uppercase"
                        maxLength={7}
                      />

                      {/* Reset to default button */}
                      {appearance.primaryColor.toUpperCase() !== '#006FEE' && (
                        <button
                          type="button"
                          onClick={() => updateAppearance({ primaryColor: '#006FEE' })}
                          className="ui-button ui-button-secondary text-xs px-2.5 py-1"
                          title="Reset to default WikiGraph blue (#006FEE)"
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    {/* Presets palette */}
                    <div className="flex items-center gap-1.5 flex-wrap justify-start sm:justify-end">
                      {PRIMARY_COLOR_PRESETS.map((preset) => {
                        const isCurrent =
                          appearance.primaryColor.toUpperCase() === preset.hex.toUpperCase();
                        return (
                          <button
                            key={preset.hex}
                            type="button"
                            onClick={() => updateAppearance({ primaryColor: preset.hex })}
                            className={`w-5 h-5 rounded-full border transition-transform cursor-pointer flex items-center justify-center ${
                              isCurrent
                                ? 'scale-110 border-[var(--foreground)] shadow-xs'
                                : 'border-black/20 hover:scale-105'
                            }`}
                            style={{ backgroundColor: preset.hex }}
                            title={preset.label}
                          >
                            {isCurrent && <Check className="w-3 h-3 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Setting 3: Font Family */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-6">
                  <div className="space-y-0.5 max-w-sm">
                    <span className="text-xs font-semibold text-[var(--foreground)] block">
                      Interface Font Family
                    </span>
                    <span className="text-[11px] text-[var(--muted)] block leading-relaxed">
                      Select typography hierarchy. Persian fallback (Vazirmatn) is automatically preserved for bilingual compatibility.
                    </span>
                  </div>

                  <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)]">
                    {(
                      [
                        { id: 'inter', label: 'Inter (Default)' },
                        { id: 'system', label: 'System UI' },
                        { id: 'mono', label: 'Monospace' },
                      ] as { id: FontFamilyOption; label: string }[]
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => updateAppearance({ fontFamily: f.id })}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                          appearance.fontFamily === f.id
                            ? 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-xs'
                            : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Setting 4: Interface Font Size Scale */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-6">
                  <div className="space-y-0.5 max-w-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--foreground)]">
                        Interface Font Scale
                      </span>
                      <span className="text-xs font-mono text-[var(--accent)] font-semibold">
                        {Math.round(appearance.fontScale * 100)}%
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--muted)] block leading-relaxed">
                      Scales application typography smoothly without disrupting layouts.
                    </span>
                  </div>

                  <div className="space-y-2 w-full sm:w-64">
                    <input
                      type="range"
                      min="0.85"
                      max="1.20"
                      step="0.05"
                      value={appearance.fontScale}
                      onChange={(e) =>
                        updateAppearance({ fontScale: parseFloat(e.target.value) })
                      }
                      className="w-full accent-[var(--accent)] cursor-pointer"
                    />

                    <div className="flex items-center justify-between text-[10px] font-mono text-[var(--muted)]">
                      <span>85% (Compact)</span>
                      <span>100% (Default)</span>
                      <span>120% (Large)</span>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1 justify-end">
                      {[0.85, 0.95, 1.0, 1.1, 1.2].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => updateAppearance({ fontScale: s })}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                            Math.abs(appearance.fontScale - s) < 0.01
                              ? 'bg-[var(--surface)] border-[var(--foreground)] text-[var(--foreground)] font-semibold'
                              : 'bg-[var(--surface-secondary)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]'
                          }`}
                        >
                          {Math.round(s * 100)}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Setting 5: Interface Contrast */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-6">
                  <div className="space-y-0.5 max-w-sm">
                    <span className="text-xs font-semibold text-[var(--foreground)] block">
                      Interface Contrast
                    </span>
                    <span className="text-[11px] text-[var(--muted)] block leading-relaxed">
                      Calibrates border stroke clarity, separator prominence, and muted typography contrast.
                    </span>
                  </div>

                  <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)]">
                    {(
                      [
                        { id: 'low', label: 'Low (Soft)' },
                        { id: 'normal', label: 'Normal (Standard)' },
                        { id: 'high', label: 'High (Accessible)' },
                      ] as { id: InterfaceContrast; label: string }[]
                    ).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => updateAppearance({ contrast: c.id })}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                          appearance.contrast === c.id
                            ? 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-xs'
                            : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Setting 6: Global Background Blur */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-6">
                  <div className="space-y-0.5 max-w-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--foreground)]">
                        Background Blur
                      </span>
                      <span className="text-xs font-mono text-[var(--accent)] font-semibold">
                        {appearance.backdropBlur}px
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--muted)] block leading-relaxed">
                      Controls backdrop blur applied behind application modules, panels, and floating controls.
                    </span>
                  </div>

                  <div className="space-y-2 w-full sm:w-64">
                    <input
                      type="range"
                      min="0"
                      max="32"
                      step="2"
                      value={appearance.backdropBlur}
                      onChange={(e) =>
                        updateAppearance({ backdropBlur: parseInt(e.target.value, 10) })
                      }
                      className="w-full accent-[var(--accent)] cursor-pointer"
                    />

                    <div className="flex items-center justify-between text-[10px] font-mono text-[var(--muted)]">
                      <span>0px (Sharp)</span>
                      <span>8px (Default)</span>
                      <span>32px (Max)</span>
                    </div>
                  </div>
                </div>

                {/* Setting 7: Module Opacity */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-6">
                  <div className="space-y-0.5 max-w-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--foreground)]">
                        Module Opacity
                      </span>
                      <span className="text-xs font-mono text-[var(--accent)] font-semibold">
                        {Math.round(appearance.moduleOpacity * 100)}%
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--muted)] block leading-relaxed">
                      Controls background translucency of application surfaces while text, icons, and borders remain fully opaque.
                    </span>
                  </div>

                  <div className="space-y-2 w-full sm:w-64">
                    <input
                      type="range"
                      min="0.60"
                      max="1.0"
                      step="0.02"
                      value={appearance.moduleOpacity}
                      onChange={(e) =>
                        updateAppearance({ moduleOpacity: parseFloat(e.target.value) })
                      }
                      className="w-full accent-[var(--accent)] cursor-pointer"
                    />

                    <div className="flex items-center justify-between text-[10px] font-mono text-[var(--muted)]">
                      <span>60% (Translucent)</span>
                      <span>96% (Default)</span>
                      <span>100% (Solid)</span>
                    </div>
                  </div>
                </div>

                {/* Setting 8: Motion & Animation */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-6">
                  <div className="space-y-0.5 max-w-sm">
                    <span className="text-xs font-semibold text-[var(--foreground)] block">
                      Motion & Transition Speed
                    </span>
                    <span className="text-[11px] text-[var(--muted)] block leading-relaxed">
                      Controls transition durations. System reduced-motion preference (prefers-reduced-motion) is automatically honored.
                    </span>
                  </div>

                  <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)]">
                    {(
                      [
                        { id: 'off', label: 'Off (0ms)' },
                        { id: 'fast', label: 'Fast (100ms)' },
                        { id: 'normal', label: 'Normal (160ms)' },
                        { id: 'slow', label: 'Slow (260ms)' },
                      ] as { id: MotionSpeed; label: string }[]
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => updateAppearance({ motion: m.id })}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                          appearance.motion === m.id
                            ? 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-xs'
                            : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CATEGORY 2: GENERAL SETTINGS */}
          {activeCategory === 'general' && (
            <div className="ui-panel p-5 sm:p-6 space-y-6 shadow-xs">
              <div className="border-b border-[var(--separator)] pb-3">
                <h2 className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight">
                  {t('settings.languageSection')}
                </h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Workspace language and layout orientation settings.
                </p>
              </div>

              <div className="space-y-6 divide-y divide-[var(--separator)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 first:pt-0">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-[var(--foreground)] block">
                      Workspace Language
                    </span>
                    <span className="text-[11px] text-[var(--muted)] block">
                      Switches interface copy and toggles LTR / RTL direction automatically.
                    </span>
                  </div>

                  <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] shrink-0">
                    <button
                      type="button"
                      onClick={() => setLocale('en')}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                        locale === 'en'
                          ? 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-xs'
                          : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      English (LTR)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocale('fa')}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                        locale === 'fa'
                          ? 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-xs'
                          : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      فارسی (Persian / RTL)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CATEGORY 3: DATA & WORKSPACE (READ-ONLY TAXONOMY & SNAPSHOT EXPORT) */}
          {activeCategory === 'data' && (
            <div className="space-y-6">
              {/* Collections Taxonomy Overview (Read-Only) */}
              <div className="ui-panel p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="pb-3 border-b border-[var(--separator)]">
                  <h2 className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight">
                    Public Research Taxonomy
                  </h2>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Curated research domains organizing knowledge nodes and source documents across WikiGraph.
                  </p>
                </div>

                <div className="divide-y divide-[var(--separator)]">
                  {collections.map((col) => (
                    <div
                      key={col.id}
                      className="py-3 flex items-center justify-between gap-3 px-2 rounded-lg"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[var(--foreground)]">
                            {col.name}
                          </span>
                          {col.nameFa && col.nameFa !== col.name && (
                            <span className="text-xs text-[var(--muted)] font-normal">
                              ({col.nameFa})
                            </span>
                          )}
                        </div>
                        {col.description && (
                          <p className="text-[11px] text-[var(--muted)] truncate max-w-md mt-0.5">
                            {col.description}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-[var(--muted)] px-2 py-0.5 rounded bg-[var(--surface-secondary)] border border-[var(--border)]">
                        {col.id}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Public Snapshot Export */}
              <div className="ui-panel p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="pb-3 border-b border-[var(--separator)]">
                  <h2 className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight">
                    Public Dataset Snapshot
                  </h2>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Download complete repository data (collections, source documents, knowledge units, and evaluation outcomes) in open JSON format.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-[var(--foreground)] block">
                      Download Full Snapshot
                    </span>
                    <span className="text-[11px] text-[var(--muted)]">
                      Export complete read-only knowledge graph as a local JSON file.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="ui-button ui-button-secondary text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Snapshot (.json)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reset Appearance Confirmation Modal */}
      <ConfirmModal
        isOpen={resetAppearanceModalOpen}
        title="Reset Appearance Settings?"
        description="This will restore all visual customization (theme, primary color, font scale, contrast, blur, and opacity) back to official WikiGraph defaults."
        confirmLabel="Reset Appearance"
        cancelLabel={t('common.cancel')}
        isDestructive={false}
        onConfirm={handleConfirmResetAppearance}
        onCancel={() => setResetAppearanceModalOpen(false)}
      />
    </div>
  );
};
