import React, { useState, useEffect, useMemo } from 'react';
import {
  Sliders,
  Sparkles,
  RotateCcw,
  Check,
  Copy,
  X,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  ExternalLink,
  Clock,
  Eye,
  Layers,
  Code
} from 'lucide-react';

export interface GlassTunerConfig {
  gradEnabled: boolean;
  gradAngle: number;
  gradTop: number;
  gradMid: number;
  gradBot: number;
  specularEnabled: boolean;
  specularOpacity: number;
  specularSize: number;
  borderOpacity: number;
  radius: number;
  bgOpacity: number;
  bgDarkness: number;
  blur: number;
  shadowOpacity: number;
  hoverLift: number;
  hoverBorderOpacity: number;
  hoverGradTop: number;
  hoverSpecular: number;
  hoverBgOpacity: number;
  ambientBgEnabled: boolean;
  ambientBgOpacity: number;
}

const DEFAULT_CONFIG: GlassTunerConfig = {
  gradEnabled: true,
  gradAngle: 135,
  gradTop: 0.14,
  gradMid: 0.02,
  gradBot: 0.06,
  specularEnabled: true,
  specularOpacity: 0.40,
  specularSize: 1.5,
  borderOpacity: 0.18,
  radius: 16,
  bgOpacity: 0.65,
  bgDarkness: 16,
  blur: 28,
  shadowOpacity: 0.55,
  hoverLift: -2,
  hoverBorderOpacity: 0.28,
  hoverGradTop: 0.15,
  hoverSpecular: 0.35,
  hoverBgOpacity: 0.72,
  ambientBgEnabled: true,
  ambientBgOpacity: 1.0,
};

const PRESETS: { name: string; desc: string; config: Partial<GlassTunerConfig> }[] = [
  {
    name: 'Pure Flat Dark (Zero Shine)',
    desc: 'Completely disables the shine gradient & specular edge line. Matte neutral card.',
    config: {
      gradEnabled: false,
      gradTop: 0.0,
      specularEnabled: false,
      specularOpacity: 0.0,
      bgOpacity: 0.88,
      bgDarkness: 14,
      borderOpacity: 0.12,
      blur: 0,
      radius: 14,
      shadowOpacity: 0.4,
      hoverLift: -1,
      hoverBorderOpacity: 0.22,
      hoverGradTop: 0.0,
      hoverSpecular: 0.0,
      hoverBgOpacity: 0.92,
    },
  },
  {
    name: 'Subtle Soft Glass (Minimal Glare)',
    desc: 'Very gentle 4% highlight gradient and faint specular rim. Calm and clean.',
    config: {
      gradEnabled: true,
      gradAngle: 135,
      gradTop: 0.05,
      gradMid: 0.01,
      gradBot: 0.03,
      specularEnabled: true,
      specularOpacity: 0.15,
      specularSize: 1.0,
      bgOpacity: 0.70,
      bgDarkness: 16,
      borderOpacity: 0.14,
      blur: 20,
      radius: 16,
      shadowOpacity: 0.45,
      hoverLift: -1.5,
      hoverBorderOpacity: 0.22,
      hoverGradTop: 0.07,
      hoverSpecular: 0.20,
      hoverBgOpacity: 0.75,
    },
  },
  {
    name: 'Default Specular Glass',
    desc: 'Original standard with 14% diagonal white gradient and 40% top specular highlight.',
    config: { ...DEFAULT_CONFIG },
  },
  {
    name: 'High Contrast Tech (Crisp Border Only)',
    desc: 'No diagonal surface gradient, crisp thin border, solid backdrop with subtle top edge.',
    config: {
      gradEnabled: false,
      gradTop: 0.0,
      specularEnabled: true,
      specularOpacity: 0.20,
      specularSize: 1.0,
      bgOpacity: 0.92,
      bgDarkness: 12,
      borderOpacity: 0.24,
      blur: 16,
      radius: 12,
      shadowOpacity: 0.5,
      hoverLift: -2,
      hoverBorderOpacity: 0.36,
      hoverGradTop: 0.0,
      hoverSpecular: 0.25,
      hoverBgOpacity: 0.95,
    },
  },
  {
    name: 'Deep Smoked Acrylic',
    desc: 'High blur, velvety dense backdrop, no top rim shine, gentle 5% diffuse glow.',
    config: {
      gradEnabled: true,
      gradAngle: 135,
      gradTop: 0.06,
      gradMid: 0.00,
      gradBot: 0.03,
      specularEnabled: false,
      specularOpacity: 0.0,
      bgOpacity: 0.82,
      bgDarkness: 15,
      borderOpacity: 0.15,
      blur: 36,
      radius: 16,
      shadowOpacity: 0.6,
      hoverLift: -2,
      hoverBorderOpacity: 0.24,
      hoverGradTop: 0.08,
      hoverSpecular: 0.0,
      hoverBgOpacity: 0.86,
    },
  },
  {
    name: 'Ultra Glass Luxury',
    desc: 'Bright specular highlight, translucent frosted backdrop for high-aesthetic contrast.',
    config: {
      gradEnabled: true,
      gradAngle: 135,
      gradTop: 0.22,
      gradMid: 0.04,
      gradBot: 0.10,
      specularEnabled: true,
      specularOpacity: 0.55,
      specularSize: 2.0,
      bgOpacity: 0.52,
      bgDarkness: 16,
      borderOpacity: 0.26,
      blur: 32,
      radius: 18,
      shadowOpacity: 0.65,
      hoverLift: -3,
      hoverBorderOpacity: 0.38,
      hoverGradTop: 0.25,
      hoverSpecular: 0.60,
      hoverBgOpacity: 0.62,
    },
  },
];

const STORAGE_KEY = 'knowledge_glass_tuner_settings';

export const GlassTunerPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    // Keep open by default so the user sees it immediately after this request
    const saved = localStorage.getItem('knowledge_glass_tuner_open');
    return saved !== null ? saved === 'true' : true;
  });

  const [activeTab, setActiveTab] = useState<'presets' | 'shine' | 'specular' | 'material' | 'code'>('presets');
  const [copied, setCopied] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(true);

  const [config, setConfig] = useState<GlassTunerConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_CONFIG;
  });

  // Apply CSS Custom Properties in real-time to the root document
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--card-grad-enabled', config.gradEnabled ? '1' : '0');
    root.style.setProperty('--card-grad-angle', `${config.gradAngle}deg`);
    root.style.setProperty('--card-grad-top', `${config.gradTop}`);
    root.style.setProperty('--card-grad-mid', `${config.gradMid}`);
    root.style.setProperty('--card-grad-bot', `${config.gradBot}`);

    root.style.setProperty('--card-specular-enabled', config.specularEnabled ? '1' : '0');
    root.style.setProperty('--card-specular-opacity', `${config.specularOpacity}`);
    root.style.setProperty('--card-specular-size', `${config.specularSize}px`);

    root.style.setProperty('--card-border-opacity', `${config.borderOpacity}`);
    root.style.setProperty('--card-radius', `${config.radius}px`);

    root.style.setProperty('--card-bg-opacity', `${config.bgOpacity}`);
    root.style.setProperty('--card-bg-r', `${config.bgDarkness}`);
    root.style.setProperty('--card-bg-g', `${Math.min(255, config.bgDarkness + 1)}`);
    root.style.setProperty('--card-bg-b', `${Math.min(255, config.bgDarkness + 4)}`);

    root.style.setProperty('--card-blur', `${config.blur}px`);
    root.style.setProperty('--card-shadow-opacity', `${config.shadowOpacity}`);

    root.style.setProperty('--card-hover-lift', `${config.hoverLift}px`);
    root.style.setProperty('--card-hover-border-opacity', `${config.hoverBorderOpacity}`);
    root.style.setProperty('--card-hover-grad-top', `${config.hoverGradTop}`);
    root.style.setProperty('--card-hover-specular', `${config.hoverSpecular}`);
    root.style.setProperty('--card-hover-bg-opacity', `${config.hoverBgOpacity}`);

    root.style.setProperty('--ambient-bg-opacity', `${config.ambientBgOpacity}`);
    root.style.setProperty('--ambient-bg-display', config.ambientBgEnabled ? 'block' : 'none');

    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const updateParam = <K extends keyof GlassTunerConfig>(key: K, val: GlassTunerConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: val }));
  };

  const applyPreset = (presetConfig: Partial<GlassTunerConfig>) => {
    setConfig((prev) => ({ ...prev, ...presetConfig }));
  };

  const resetToDefault = () => {
    setConfig(DEFAULT_CONFIG);
  };

  const generatedSummary = useMemo(() => {
    return {
      description: 'Glass Tuner Selected Parameters',
      shineGradient: config.gradEnabled
        ? {
            enabled: true,
            angle: `${config.gradAngle}deg`,
            topWhiteOpacity: config.gradTop,
            midWhiteOpacity: config.gradMid,
            bottomWhiteOpacity: config.gradBot,
          }
        : { enabled: false, reason: 'Zero shine / pure flat surface' },
      topSpecularRim: config.specularEnabled
        ? {
            enabled: true,
            opacity: config.specularOpacity,
            size: `${config.specularSize}px`,
          }
        : { enabled: false, reason: 'Zero specular edge line' },
      material: {
        baseOpacity: config.bgOpacity,
        backgroundRgb: `${config.bgDarkness}, ${config.bgDarkness + 1}, ${config.bgDarkness + 4}`,
        blur: `${config.blur}px`,
        borderOpacity: config.borderOpacity,
        radius: `${config.radius}px`,
        shadowOpacity: config.shadowOpacity,
      },
      ambientBackground: {
        enabled: config.ambientBgEnabled,
        opacity: `${Math.round(config.ambientBgOpacity * 100)}%`,
      },
      hover: {
        lift: `${config.hoverLift}px`,
        borderOpacity: config.hoverBorderOpacity,
        topShine: config.hoverGradTop,
        specularRim: config.hoverSpecular,
      },
    };
  }, [config]);

  const handleCopyConfig = () => {
    const text = `Please apply these Glass Tuner values as the permanent card parameters:\n\n${JSON.stringify(
      generatedSummary,
      null,
      2
    )}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    localStorage.setItem('knowledge_glass_tuner_open', String(next));
  };

  return (
    <>
      {/* Floating Launcher Pill (always visible at bottom-right) */}
      <div className="fixed bottom-5 end-5 z-40 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleOpen}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#141620] hover:bg-[#1c1f30] border border-white/20 text-[#f7f8f8] text-xs font-semibold shadow-xl shadow-black/60 hover:border-[#828fff] transition-all cursor-pointer group"
          title="Toggle Card Glass & Shine Tuner"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#828fff] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5e6ad2]" />
          </span>
          <Sliders className="w-3.5 h-3.5 text-[#828fff] group-hover:rotate-45 transition-transform" />
          <span>{isOpen ? 'Close Glass Tuner' : '🎛️ Tune Card Glass & Shine'}</span>
        </button>
      </div>

      {/* Floating Control Panel */}
      {isOpen && (
        <div
          dir="ltr"
          className="fixed bottom-16 end-5 z-50 w-[420px] max-w-[calc(100vw-2.5rem)] max-h-[82vh] flex flex-col rounded-2xl bg-[#0e1017]/95 backdrop-blur-2xl border border-white/20 shadow-2xl shadow-black/90 overflow-hidden font-sans text-[#f7f8f8] animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-[#f7f8f8] flex items-center gap-1.5">
                  <span>Card Glass & Shine Tuner</span>
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                    Temporary
                  </span>
                </h2>
                <p className="text-[11px] text-[#8a8f98]">Live tune highlights & glass parameters</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetToDefault}
                title="Reset to default settings"
                className="p-1.5 rounded-lg text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/10 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={toggleOpen}
                className="p-1.5 rounded-lg text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Action Top Bar: Copy Config */}
          <div className="px-4 py-2 bg-indigo-950/40 border-b border-indigo-500/20 flex items-center justify-between gap-2">
            <span className="text-[11px] text-indigo-200 truncate">
              Like a look? Copy and tell me in chat:
            </span>
            <button
              type="button"
              onClick={handleCopyConfig}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#5e6ad2] hover:bg-[#6e7ae2] text-white shadow-sm'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Config!' : 'Copy Config for Agent'}</span>
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="px-3 pt-2 pb-1 border-b border-white/10 flex items-center gap-1 overflow-x-auto text-[11px] font-medium scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'presets'
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-[#8a8f98] hover:text-white hover:bg-white/5'
              }`}
            >
              Presets
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('shine')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'shine'
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-[#8a8f98] hover:text-white hover:bg-white/5'
              }`}
            >
              Shine / Gradient
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('specular')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'specular'
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-[#8a8f98] hover:text-white hover:bg-white/5'
              }`}
            >
              Specular Edge
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('material')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'material'
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-[#8a8f98] hover:text-white hover:bg-white/5'
              }`}
            >
              Darkness & Blur
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-[#8a8f98] hover:text-white hover:bg-white/5'
              }`}
            >
              Raw Config
            </button>
          </div>

          {/* Interactive Live Preview Box */}
          <div className="p-3 border-b border-white/10 bg-black/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-[#8a8f98] font-bold flex items-center gap-1">
                <Eye className="w-3 h-3" /> Live Sample Card (Hover to test)
              </span>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-[11px] text-[#828fff] hover:underline"
              >
                {showPreview ? 'Hide' : 'Show'}
              </button>
            </div>

            {showPreview && (
              <div className="liquid-glass-card p-4 transition-all group">
                <div className="flex items-center gap-1.5 text-[10px] text-[#f59e0b] font-semibold mb-2 px-2 py-0.5 rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/10 backdrop-blur-md w-fit">
                  <Clock className="w-2.5 h-2.5" />
                  <span>Review Recommended Warning</span>
                </div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className="text-xs font-semibold text-[#f7f8f8] group-hover:text-[#828fff] transition-colors leading-tight">
                    Legacy Regex-based Cell Splitting
                  </h4>
                  <ExternalLink className="w-3 h-3 text-[#8a8f98] shrink-0" />
                </div>
                <p className="text-[11px] text-[#8a8f98] line-clamp-1 mb-2">
                  Splits raw text lines into columns on double or triple spaces...
                </p>
                <div className="flex items-center gap-1 pt-2 border-t border-white/10 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium">
                    Procedure
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                    Deprecated
                  </span>
                  <span className="text-[#8a8f98] ms-auto">Data Extraction</span>
                </div>
              </div>
            )}
          </div>

          {/* Tab Content Body */}
          <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
            {/* TAB: PRESETS */}
            {activeTab === 'presets' && (
              <div className="space-y-2.5">
                <p className="text-[#8a8f98] text-[11px]">
                  Click any preset below to instantly see how the cards on the entire screen transform:
                </p>

                <div className="grid grid-cols-1 gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset.config)}
                      className="w-full text-start p-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/25 transition-all flex flex-col gap-1 cursor-pointer group"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-semibold text-xs text-[#f7f8f8] group-hover:text-[#828fff] transition-colors">
                          {preset.name}
                        </span>
                        <span className="text-[10px] text-[#8a8f98] font-mono group-hover:text-white">
                          Apply →
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8a8f98] leading-relaxed">{preset.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: SHINE & GRADIENT */}
            {activeTab === 'shine' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <div>
                    <div className="font-medium text-xs">Enable Surface Shine Gradient</div>
                    <div className="text-[11px] text-[#8a8f98]">
                      Controls the diagonal white glare / sheen across the card surface
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.gradEnabled}
                    onChange={(e) => updateParam('gradEnabled', e.target.checked)}
                    className="w-4 h-4 rounded text-[#5e6ad2] cursor-pointer"
                  />
                </div>

                <div className={`space-y-3.5 ${!config.gradEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                  {/* Top White Opacity (The Main Shine) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-medium text-[#f7f8f8]">Top White Highlight Opacity</span>
                      <span className="text-[#828fff] font-mono">{Math.round(config.gradTop * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={0.35}
                      step={0.01}
                      value={config.gradTop}
                      onChange={(e) => updateParam('gradTop', parseFloat(e.target.value))}
                      className="w-full accent-[#5e6ad2] cursor-pointer"
                    />
                    <div className="text-[10px] text-[#8a8f98]">
                      Set to 0% to completely eliminate top surface glare. Default is 14%.
                    </div>
                  </div>

                  {/* Gradient Angle */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-medium text-[#f7f8f8]">Gradient Angle</span>
                      <span className="text-[#828fff] font-mono">{config.gradAngle}°</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={5}
                      value={config.gradAngle}
                      onChange={(e) => updateParam('gradAngle', parseInt(e.target.value, 10))}
                      className="w-full accent-[#5e6ad2] cursor-pointer"
                    />
                  </div>

                  {/* Mid Opacity */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-medium text-[#f7f8f8]">Mid Opacity (At 45%)</span>
                      <span className="text-[#828fff] font-mono">{Math.round(config.gradMid * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={0.15}
                      step={0.005}
                      value={config.gradMid}
                      onChange={(e) => updateParam('gradMid', parseFloat(e.target.value))}
                      className="w-full accent-[#5e6ad2] cursor-pointer"
                    />
                  </div>

                  {/* Bottom Opacity */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-medium text-[#f7f8f8]">Bottom Edge White Opacity</span>
                      <span className="text-[#828fff] font-mono">{Math.round(config.gradBot * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={0.20}
                      step={0.01}
                      value={config.gradBot}
                      onChange={(e) => updateParam('gradBot', parseFloat(e.target.value))}
                      className="w-full accent-[#5e6ad2] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SPECULAR EDGE */}
            {activeTab === 'specular' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <div>
                    <div className="font-medium text-xs">Enable Top Specular Edge Line</div>
                    <div className="text-[11px] text-[#8a8f98]">
                      Controls the thin bright white inset reflection line along the top border
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.specularEnabled}
                    onChange={(e) => updateParam('specularEnabled', e.target.checked)}
                    className="w-4 h-4 rounded text-[#5e6ad2] cursor-pointer"
                  />
                </div>

                <div className={`space-y-3.5 ${!config.specularEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                  {/* Specular Opacity */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-medium text-[#f7f8f8]">Edge Reflection Opacity</span>
                      <span className="text-[#828fff] font-mono">{Math.round(config.specularOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={0.80}
                      step={0.02}
                      value={config.specularOpacity}
                      onChange={(e) => updateParam('specularOpacity', parseFloat(e.target.value))}
                      className="w-full accent-[#5e6ad2] cursor-pointer"
                    />
                    <div className="text-[10px] text-[#8a8f98]">
                      Notice the thin white line on the top rim in your screenshot. Turn down to soften or remove.
                    </div>
                  </div>

                  {/* Specular Thickness */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-medium text-[#f7f8f8]">Edge Line Thickness</span>
                      <span className="text-[#828fff] font-mono">{config.specularSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={3.5}
                      step={0.5}
                      value={config.specularSize}
                      onChange={(e) => updateParam('specularSize', parseFloat(e.target.value))}
                      className="w-full accent-[#5e6ad2] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: DARKNESS & MATERIAL */}
            {activeTab === 'material' && (
              <div className="space-y-3.5">
                {/* Ambient Color Background Toggle */}
                <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-xs text-indigo-200">
                        Temporary Colorful Ambient Background
                      </div>
                      <div className="text-[10px] text-indigo-300/80">
                        Purple & cyan glow pools behind the cards for glass refraction testing
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.ambientBgEnabled}
                      onChange={(e) => updateParam('ambientBgEnabled', e.target.checked)}
                      className="w-4 h-4 rounded text-[#5e6ad2] cursor-pointer"
                    />
                  </div>

                  {config.ambientBgEnabled && (
                    <div className="space-y-1 pt-1 border-t border-indigo-500/20">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-indigo-200">Ambient Background Glow Opacity</span>
                        <span className="text-[#828fff] font-mono">{Math.round(config.ambientBgOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0.10}
                        max={1.00}
                        step={0.05}
                        value={config.ambientBgOpacity}
                        onChange={(e) => updateParam('ambientBgOpacity', parseFloat(e.target.value))}
                        className="w-full accent-[#5e6ad2] cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Base Card Darkness */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-medium text-[#f7f8f8]">Card Background Darkness</span>
                    <span className="text-[#828fff] font-mono">RGB({config.bgDarkness}, {config.bgDarkness+1}, {config.bgDarkness+4})</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={36}
                    step={1}
                    value={config.bgDarkness}
                    onChange={(e) => updateParam('bgDarkness', parseInt(e.target.value, 10))}
                    className="w-full accent-[#5e6ad2] cursor-pointer"
                  />
                  <div className="text-[10px] text-[#8a8f98]">
                    0 = Pitch Black (#000000), 16 = Graphite (#101114), 30 = Dark Slate
                  </div>
                </div>

                {/* Base Opacity */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-medium text-[#f7f8f8]">Card Background Opacity</span>
                    <span className="text-[#828fff] font-mono">{Math.round(config.bgOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.20}
                    max={1.00}
                    step={0.02}
                    value={config.bgOpacity}
                    onChange={(e) => updateParam('bgOpacity', parseFloat(e.target.value))}
                    className="w-full accent-[#5e6ad2] cursor-pointer"
                  />
                </div>

                {/* Blur */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-medium text-[#f7f8f8]">Backdrop Blur Filter</span>
                    <span className="text-[#828fff] font-mono">{config.blur}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={48}
                    step={2}
                    value={config.blur}
                    onChange={(e) => updateParam('blur', parseInt(e.target.value, 10))}
                    className="w-full accent-[#5e6ad2] cursor-pointer"
                  />
                </div>

                {/* Border Opacity */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-medium text-[#f7f8f8]">Outer Border Opacity</span>
                    <span className="text-[#828fff] font-mono">{Math.round(config.borderOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.45}
                    step={0.01}
                    value={config.borderOpacity}
                    onChange={(e) => updateParam('borderOpacity', parseFloat(e.target.value))}
                    className="w-full accent-[#5e6ad2] cursor-pointer"
                  />
                </div>

                {/* Corner Radius */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-medium text-[#f7f8f8]">Corner Radius</span>
                    <span className="text-[#828fff] font-mono">{config.radius}px</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={26}
                    step={1}
                    value={config.radius}
                    onChange={(e) => updateParam('radius', parseInt(e.target.value, 10))}
                    className="w-full accent-[#5e6ad2] cursor-pointer"
                  />
                </div>

                {/* Drop Shadow */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-medium text-[#f7f8f8]">Drop Shadow Depth</span>
                    <span className="text-[#828fff] font-mono">{Math.round(config.shadowOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.90}
                    step={0.05}
                    value={config.shadowOpacity}
                    onChange={(e) => updateParam('shadowOpacity', parseFloat(e.target.value))}
                    className="w-full accent-[#5e6ad2] cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB: CODE / CONFIG */}
            {activeTab === 'code' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#8a8f98]">Generated config JSON:</span>
                  <button
                    type="button"
                    onClick={handleCopyConfig}
                    className="text-[11px] text-[#828fff] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-black/60 border border-white/10 text-[10.5px] font-mono text-emerald-400 overflow-x-auto max-h-52 select-all">
                  {JSON.stringify(generatedSummary, null, 2)}
                </pre>
                <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-indigo-200">
                  💡 Send this JSON to me or let me know the preset name, and I will hardcode it permanently!
                </div>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="px-4 py-3 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={resetToDefault}
              className="text-xs text-[#8a8f98] hover:text-[#f7f8f8] transition-colors cursor-pointer"
            >
              Reset Defaults
            </button>

            <button
              type="button"
              onClick={handleCopyConfig}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#5e6ad2] hover:bg-[#6e7ae2] text-white shadow-md'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Config!' : 'Copy Config for Agent'}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
