import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Layers,
  Network,
  Cpu,
  CheckCircle2,
  KeyRound,
  Settings,
  Search,
  Languages,
  Menu,
  X,
  UploadCloud,
  FileCode2,
  Sparkles,
  Bot,
  ExternalLink,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import { useLocale } from '../../locales/useLocale';
import { useTheme } from '../../context/ThemeContext';
import { useRepository } from '../../services/RepositoryContext';
import { SearchModal } from '../common/SearchModal';

export const AppLayout: React.FC = () => {
  const { t, locale, toggleLocale } = useLocale();
  const { repository } = useRepository();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [copiedFeed, setCopiedFeed] = useState(false);
  const [agentFeedJson, setAgentFeedJson] = useState('');

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Global Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenExportFeed = async () => {
    try {
      const [knowledge, sources, relations] = await Promise.all([
        repository.listKnowledge(),
        repository.listSources(),
        repository.listRelationships(),
      ]);
      const feed = {
        $schema: 'https://wikigraph.agent/schema/v1.json',
        generatedAt: new Date().toISOString(),
        totalUnits: knowledge.length,
        totalSources: sources.length,
        graphTopology: {
          nodes: knowledge.map((k) => ({
            id: k.id,
            title: k.title,
            type: k.type,
            evidenceLevel: k.evidenceLevel,
            reviewStatus: k.reviewStatus,
            summary: k.summary,
            applicability: k.applicability,
            exclusions: k.exclusions,
            requirements: k.requirements,
            sourceExcerpt: k.sourceExcerpt,
            sourceId: k.sourceId,
          })),
          edges: relations,
        },
      };
      setAgentFeedJson(JSON.stringify(feed, null, 2));
      setExportModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyAgentFeed = () => {
    navigator.clipboard.writeText(agentFeedJson);
    setCopiedFeed(true);
    setTimeout(() => setCopiedFeed(false), 2000);
  };

  const navItems = [
    { to: '/library', label: t('nav.library'), icon: Layers, badge: '18' },
    { to: '/graph', label: t('nav.graph'), icon: Network },
    { to: '/context', label: t('nav.context'), icon: Cpu },
    { to: '/outcomes', label: t('nav.outcomes'), icon: CheckCircle2 },
    { to: '/connections', label: t('nav.connections'), icon: KeyRound },
    { to: '/import', label: t('nav.import'), icon: UploadCloud },
  ];

  // SVG Brand Mark with HeroUI Blue
  const BrandMark = () => (
    <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30">
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 text-[#006FEE]"
      >
        <circle cx="8" cy="8" r="3.5" fill="currentColor" />
        <circle cx="24" cy="10" r="3" fill="currentColor" fillOpacity="0.8" />
        <circle cx="16" cy="24" r="4" fill="currentColor" />
        <line x1="8" y1="8" x2="16" y2="24" stroke="currentColor" strokeWidth="2" strokeOpacity="0.6" />
        <line x1="24" y1="10" x2="16" y2="24" stroke="currentColor" strokeWidth="2" strokeOpacity="0.6" />
        <line x1="8" y1="8" x2="24" y2="10" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="2 2" />
      </svg>
      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#09090b]" />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100 font-sans antialiased selection:bg-blue-500/25 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 w-full border-b border-zinc-800 bg-[#09090b]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-4">
            
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-6 shrink-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 md:hidden cursor-pointer"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <NavLink to="/library" className="flex items-center gap-2.5 group">
                <BrandMark />
                <div className="text-left rtl:text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tracking-tight text-zinc-100 group-hover:text-blue-400 transition-colors">
                      WikiGraph
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <span>Agent-First</span>
                    </span>
                  </div>
                </div>
              </NavLink>
            </div>

            {/* Middle: Horizontal Nav Items */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-xs'
                          : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40 border border-transparent'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-400' : 'text-zinc-400'}`} />
                        <span>{item.label}</span>
                        {item.badge && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                              isActive
                                ? 'bg-blue-600 text-white'
                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* Right: Quick Search, Agent Feed, Language & Settings */}
            <div className="flex items-center gap-2">
              {/* Quick Search Button (⌘K) */}
              <button
                type="button"
                onClick={() => setSearchModalOpen(true)}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 text-xs border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer w-32 sm:w-44 lg:w-52 justify-between"
                aria-label="Search knowledge base"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Search className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                  <span className="truncate">{t('common.search')}</span>
                </span>
                <kbd className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] font-mono rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  ⌘K
                </kbd>
              </button>

              {/* Agent Feed (JSON API Export) */}
              <button
                type="button"
                onClick={handleOpenExportFeed}
                title={locale === 'fa' ? 'دریافت ساختار داده برای عامل‌ها' : 'Export Agent JSON-LD Feed'}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
              >
                <FileCode2 className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden lg:inline">{locale === 'fa' ? 'API عامل‌ها' : 'Agent JSON'}</span>
              </button>

              {/* Language Switcher */}
              <button
                type="button"
                onClick={toggleLocale}
                title={locale === 'en' ? 'تغییر زبان به فارسی' : 'Switch to English'}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
              >
                <Languages className="w-3.5 h-3.5 text-zinc-400" />
                <span>{locale === 'en' ? 'FA' : 'EN'}</span>
              </button>

              {/* Settings Link */}
              <NavLink
                to="/settings"
                title={t('nav.settings')}
                className={({ isActive }) =>
                  `p-1.5 rounded-lg text-xs border transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-zinc-800 text-blue-400 border-zinc-700'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border-zinc-800'
                  }`
                }
              >
                <Settings className="w-4 h-4" />
              </NavLink>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside
        className={`fixed top-0 bottom-0 start-0 z-50 w-72 bg-[#18181b] border-e border-zinc-800 flex flex-col transform transition-transform duration-200 ease-in-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'
        }`}
      >
        <div className="h-14 flex items-center justify-between px-5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <BrandMark />
            <span className="text-sm font-bold text-zinc-100">WikiGraph</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-zinc-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800 space-y-2">
          <button
            type="button"
            onClick={handleOpenExportFeed}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-200 border border-zinc-700"
          >
            <FileCode2 className="w-3.5 h-3.5 text-blue-400" />
            <span>{locale === 'fa' ? 'خروجی JSON عامل‌ها' : 'Export Agent Feed'}</span>
          </button>
        </div>
      </aside>

      {/* Main Dynamic Viewport */}
      <main className="flex-1 overflow-y-auto bg-[#09090b]">
        <Outlet />
      </main>

      {/* Agent JSON-LD Feed Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#18181b] border border-zinc-800 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-zinc-100">
                  {locale === 'fa' ? 'اسکیمای کامل دانش برای عامل‌های هوشمند' : 'Agent Knowledge & Skill Feed (JSON)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs text-zinc-300 bg-zinc-950">
              <pre className="whitespace-pre-wrap">{agentFeedJson}</pre>
            </div>
            <div className="p-4 border-t border-zinc-800 flex items-center justify-between bg-[#18181b]">
              <p className="text-xs text-zinc-500">
                {locale === 'fa' ? 'فرمت بهینه‌سازی‌شده برای کانتکست RAG و ابزارهای Function Calling' : 'Standard schema formatted for RAG context and Agent tool calling.'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyAgentFeed}
                  className="heroui-btn-primary"
                >
                  {copiedFeed ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFeed ? t('common.copied') : t('common.copy')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Cmd+K Search Modal */}
      <SearchModal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} />
    </div>
  );
};
