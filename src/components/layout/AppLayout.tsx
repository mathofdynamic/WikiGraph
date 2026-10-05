import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Library,
  UploadCloud,
  Network,
  Cpu,
  CheckCircle2,
  KeyRound,
  Settings,
  Search,
  Sun,
  Moon,
  Languages,
  Menu,
  X,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useLocale } from '../../locales/useLocale';
import { useTheme } from '../../context/ThemeContext';
import { useRepository } from '../../services/RepositoryContext';
import { SearchModal } from '../common/SearchModal';

export const AppLayout: React.FC = () => {
  const { t, locale, toggleLocale } = useLocale();
  const { isDark, toggleTheme } = useTheme();
  const { isDemoMode } = useRepository();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

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

  const navItems = [
    { to: '/library', label: t('nav.library'), icon: Library },
    { to: '/import', label: t('nav.import'), icon: UploadCloud },
    { to: '/graph', label: t('nav.graph'), icon: Network },
    { to: '/context', label: t('nav.context'), icon: Cpu },
    { to: '/outcomes', label: t('nav.outcomes'), icon: CheckCircle2 },
    { to: '/connections', label: t('nav.connections'), icon: KeyRound },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  // SVG Brand Mark: connected knowledge nodes with Linear lavender accent
  const BrandMark = () => (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-6 h-6 text-[#5e6ad2] shrink-0"
    >
      <circle cx="8" cy="8" r="3.5" fill="currentColor" />
      <circle cx="24" cy="10" r="3" fill="currentColor" fillOpacity="0.8" />
      <circle cx="16" cy="24" r="4" fill="currentColor" />
      <line x1="8" y1="8" x2="16" y2="24" stroke="currentColor" strokeWidth="2" strokeOpacity="0.5" />
      <line x1="24" y1="10" x2="16" y2="24" stroke="currentColor" strokeWidth="2" strokeOpacity="0.5" />
      <line x1="8" y1="8" x2="24" y2="10" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" strokeDasharray="2 2" />
    </svg>
  );

  return (
    <div className="min-h-screen flex bg-[#010102] text-[#f7f8f8] font-sans antialiased">
      {/* Desktop Left Rail Navigation */}
      <aside className="hidden md:flex flex-col w-60 border-r border-[#23252a] bg-[#0f1011] shrink-0 select-none z-20">
        {/* Brand Header */}
        <div className="h-14 flex items-center gap-3 px-5 border-b border-[#23252a]">
          <BrandMark />
          <div className="min-w-0">
            <h1 className="text-sm font-semibold tracking-card-title text-[#f7f8f8] leading-none">
              WikiGraph
            </h1>
            <p className="text-[11px] text-[#8a8f98] mt-1 truncate">
              {t('common.appTagline')}
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#141516] text-[#f7f8f8] border border-[#23252a]'
                      : 'text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#141516]/60 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#5e6ad2]' : 'text-[#8a8f98]'}`} />
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Demo Mode & Sync Status Badge */}
        <div className="p-3 border-t border-[#23252a]">
          <div className="p-2.5 rounded-lg bg-[#141516] border border-[#23252a] text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="flex items-center gap-1.5 font-medium text-[#d0d6e0]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#27a644]" />
                {t('common.demoWorkspace')}
              </span>
              <span className="text-[10px] uppercase font-medium px-1.5 py-0.5 rounded bg-[#18191a] text-[#8a8f98] border border-[#23252a]">
                Local
              </span>
            </div>
            <p className="text-[11px] text-[#8a8f98] leading-tight">
              {t('common.demoNotice')}
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#000000]/70 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Navigation Drawer */}
      <aside
        className={`fixed top-0 bottom-0 start-0 z-50 w-72 bg-[#0f1011] border-e border-[#23252a] flex flex-col transform transition-transform duration-200 ease-in-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'
        }`}
      >
        <div className="h-14 flex items-center justify-between px-5 border-b border-[#23252a]">
          <div className="flex items-center gap-3">
            <BrandMark />
            <span className="text-sm font-semibold tracking-card-title text-[#f7f8f8]">
              WikiGraph
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#141516]"
            aria-label={t('common.close')}
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
                  `flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#141516] text-[#f7f8f8] border border-[#23252a]'
                      : 'text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#141516]/60 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#5e6ad2]' : 'text-[#8a8f98]'}`} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#23252a]">
          <div className="p-2.5 rounded-lg bg-[#141516] border border-[#23252a] text-xs">
            <span className="font-medium text-[#d0d6e0]">
              {t('common.demoWorkspace')}
            </span>
            <p className="text-[11px] text-[#8a8f98] mt-0.5">
              {t('common.demoNotice')}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header / Toolbar (height: 56px matching top-nav spec in DESIGN.md) */}
        <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-[#23252a] bg-[#010102]/95 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-md text-[#8a8f98] hover:text-[#f7f8f8] md:hidden cursor-pointer"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Quick Search Button */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-[#0f1011] hover:bg-[#141516] text-[#8a8f98] hover:text-[#d0d6e0] text-xs border border-[#23252a] hover:border-[#34343a] transition-colors cursor-pointer w-48 sm:w-64 md:w-80 justify-between"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 shrink-0 text-[#8a8f98]" />
                <span className="truncate">{t('common.search')}</span>
              </span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#141516] text-[#8a8f98] border border-[#23252a]">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right Header Controls: Language Switch, Theme Toggle, Demo Badge */}
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <button
              type="button"
              onClick={toggleLocale}
              title={locale === 'en' ? 'تغییر زبان به فارسی' : 'Switch to English'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#0f1011] border border-[#23252a] hover:border-[#34343a] transition-colors cursor-pointer"
            >
              <Languages className="w-3.5 h-3.5 text-[#8a8f98]" />
              <span>{locale === 'en' ? 'فارسی' : 'English'}</span>
            </button>

            {/* User / Logout */}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="px-2.5 py-1.5 text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#0f1011] rounded-md border border-[#23252a] hover:border-[#34343a] transition-colors cursor-pointer"
            >
              {t('nav.logout')}
            </button>
          </div>
        </header>

        {/* Dynamic Route Workspace Body */}
        <main className="flex-1 overflow-y-auto bg-[#010102]">
          <Outlet />
        </main>
      </div>

      {/* Global Cmd+K Search Modal */}
      <SearchModal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} />
    </div>
  );
};
