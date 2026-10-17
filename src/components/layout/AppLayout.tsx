import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Languages,
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  AlertTriangle,
  Download,
  SlidersHorizontal,
  Bot,
} from 'lucide-react';
import { useLocale } from '../../locales/useLocale';
import { useTheme } from '../../context/ThemeContext';
import { useRepository } from '../../services/RepositoryContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { QUOTA_ERROR_EVENT } from '../../lib/storage';
import { renderAgentPrompt } from '../../shared/agentSkill';
import { initEntranceMotion, prefetchRoute } from '../../shared/motion';
import { useTransientSurface } from '../../lib/useTransientSurface';
import { Container } from './Container';
import { PageGrid } from './PageGrid';
import { GridOverlay } from './GridOverlay';
import { AppearancePanel } from '../common/AppearancePanel';

export const AppLayout: React.FC = () => {
  const { t, locale, setLocale } = useLocale();
  const { isDark, toggleTheme } = useTheme();
  const { repository, isDemoMode } = useRepository();
  const { isAuthenticated, logout } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const mainRef = useRef<HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [navSearchQuery, setNavSearchQuery] = useState('');
  const [quotaError, setQuotaError] = useState<string | null>(null);

  const {
    isRendered: isMobileMenuRendered,
    isClosing: isMobileMenuClosing,
    requestClose: requestCloseMobileMenu,
  } = useTransientSurface(mobileMenuOpen, () => setMobileMenuOpen(false));

  const handleCopyAgentPrompt = async () => {
    try {
      const prompt = renderAgentPrompt(window.location.origin, 'install');
      await navigator.clipboard.writeText(prompt);
      showToast({ type: 'success', message: t('agentPrompt.promptCopied') });
    } catch {
      showToast({ type: 'error', message: 'Failed to copy to clipboard' });
    }
  };

  // Page Swap handling (Entrance-motion contract):
  // 1. Top bar & footer remain mounted, do not re-animate.
  // 2. Previous page unmounts immediately (no delayed exit).
  // 3. Scroll to top on route change unless hash exists.
  // 4. Background remains continuous.
  // 5. Fresh entrance motion queue starts for new page.
  useEffect(() => {
    if (location.hash) {
      const hashId = location.hash.replace(/^#/, '');
      const el = document.getElementById(hashId);
      if (el) {
        el.scrollIntoView();
      } else {
        window.scrollTo(0, 0);
      }
    } else {
      window.scrollTo(0, 0);
    }

    if (mainRef.current) {
      const cleanup = initEntranceMotion(mainRef.current);
      return () => {
        cleanup();
      };
    }
  }, [location.pathname, location.search]);

  // Storage quota event listener
  useEffect(() => {
    const handleQuota = (e: Event) => {
      const custom = e as CustomEvent<{ message: string }>;
      setQuotaError(
        custom.detail?.message || 'Browser storage is full. Export a backup and clear space.'
      );
    };
    window.addEventListener(QUOTA_ERROR_EVENT, handleQuota);
    return () => window.removeEventListener(QUOTA_ERROR_EVENT, handleQuota);
  }, []);

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
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wikigraph_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Backup export failed:', err);
    }
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = navSearchQuery.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    } else {
      navigate('/search');
    }
  };

  const navLinks = [
    { to: '/collections', label: t('nav.collections') },
    { to: '/for-agents', label: t('nav.forAgents') },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)] font-sans antialiased selection:bg-[var(--accent)] selection:text-[var(--accent-foreground)]">
      {/* Slim Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] app-topbar glass-surface">
        <Container>
          <div className="flex items-center justify-between h-13 gap-3 md:gap-4 w-full">
            {/* Brand Wordmark */}
            <div className="flex items-center shrink-0">
              <Link
                to="/"
                className="flex items-center gap-2.5 text-[var(--foreground)] hover:opacity-90 transition-opacity font-semibold tracking-tight text-base shrink-0"
              >
                <span className="w-5 h-5 rounded bg-[var(--foreground)] text-[var(--surface)] flex items-center justify-center font-bold text-[11px] leading-none">
                  W
                </span>
                <span>WikiGraph</span>
              </Link>
            </div>

            {/* Desktop Inline Search Field */}
            <div className="hidden md:block w-44 lg:w-60 xl:w-72 shrink-0">
              <form onSubmit={handleSearchSubmit} className="relative w-full">
                <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
                <input
                  type="search"
                  value={navSearchQuery}
                  onChange={(e) => setNavSearchQuery(e.target.value)}
                  placeholder={t('common.searchWorkspace')}
                  className="w-full ps-8 pe-3 py-1.5 text-xs rounded-md bg-[var(--surface-secondary)] border border-transparent focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none text-[var(--foreground)] placeholder:text-[var(--muted)] transition-colors"
                />
              </form>
            </div>

            {/* Desktop Nav Links */}
            <nav className="hidden md:flex items-center gap-4 lg:gap-6 shrink-0">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onMouseEnter={() => prefetchRoute(link.to)}
                  onFocus={() => prefetchRoute(link.to)}
                  className={({ isActive }) =>
                    `text-[13px] font-medium transition-colors hover:text-[var(--foreground)] whitespace-nowrap ${
                      isActive
                        ? 'text-[var(--foreground)] font-semibold border-b-2 border-[var(--foreground)] -mb-[1px] pb-3.5 pt-4'
                        : 'text-[var(--muted)]'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {/* Right Controls */}
            <div className="flex items-center justify-end gap-1.5 shrink-0 ms-auto">
              {/* Mobile Search Icon Trigger */}
              <button
                type="button"
                onClick={() => navigate('/search')}
                className="md:hidden p-2 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)] transition-colors"
                aria-label={t('nav.search')}
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Copy Agent Prompt Button (icon button; label visible from md breakpoint up, strictly single-line) */}
              <button
                type="button"
                onClick={handleCopyAgentPrompt}
                className="p-1.5 md:px-2.5 md:py-1 rounded text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)] transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                aria-label={t('agentPrompt.copyPrompt')}
                title={t('agentPrompt.copyPrompt')}
              >
                <Bot className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <span className="hidden xl:inline whitespace-nowrap">{t('agentPrompt.copyPrompt')}</span>
                <span className="hidden md:inline xl:hidden whitespace-nowrap">{t('agentPrompt.copyPromptShort')}</span>
              </button>

              {/* Language Toggle */}
              <button
                type="button"
                onClick={() => setLocale(locale === 'en' ? 'fa' : 'en')}
                className="px-2 py-1 rounded text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)] transition-colors flex items-center gap-1 shrink-0"
                title="Toggle language (English / فارسی)"
              >
                <Languages className="w-3.5 h-3.5" />
                <span className="font-mono uppercase">{locale === 'en' ? 'FA' : 'EN'}</span>
              </button>

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)] transition-colors shrink-0"
                title={isDark ? 'Light mode' : 'Dark mode'}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Appearance Preferences Button */}
              <button
                type="button"
                data-appearance-trigger="true"
                onClick={() => setAppearanceOpen(true)}
                className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer shrink-0"
                aria-label={t('appearance.title')}
                title={t('appearance.title')}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              {/* Logout (if authenticated and not running in headless demo mode) */}
              {isAuthenticated && !isDemoMode && (
                <button
                  type="button"
                  onClick={logout}
                  className="p-1.5 rounded text-[var(--muted)] hover:text-rose-600 hover:bg-[var(--surface-secondary)] transition-colors shrink-0"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}

              {/* Mobile Hamburger Menu Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (mobileMenuOpen) {
                    requestCloseMobileMenu();
                  } else {
                    setMobileMenuOpen(true);
                  }
                }}
                className="md:hidden p-1.5 rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer shrink-0"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </Container>

        {/* Mobile Dropdown Menu (Transient Surface: 100ms entrance, 66ms exit) */}
        {isMobileMenuRendered && (
          <div
            className={`md:hidden border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 space-y-3 motion-transient-card ${
              isMobileMenuClosing ? 'closing' : 'entering'
            }`}
          >
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
              <input
                type="search"
                value={navSearchQuery}
                onChange={(e) => setNavSearchQuery(e.target.value)}
                placeholder={t('common.searchWorkspace')}
                className="w-full ps-8 pe-3 py-1.5 text-xs rounded-md bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--foreground)]"
              />
            </form>

            <nav className="flex flex-col space-y-1 pt-1">
              <Link
                to="/"
                onClick={requestCloseMobileMenu}
                className="px-2.5 py-1.5 rounded text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-secondary)]"
              >
                {t('nav.home')}
              </Link>
              <Link
                to="/library"
                onClick={requestCloseMobileMenu}
                onMouseEnter={() => prefetchRoute('/library')}
                onFocus={() => prefetchRoute('/library')}
                className="px-2.5 py-1.5 rounded text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                {t('nav.library')}
              </Link>
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={requestCloseMobileMenu}
                  onMouseEnter={() => prefetchRoute(link.to)}
                  onFocus={() => prefetchRoute(link.to)}
                  className={({ isActive }) =>
                    `px-2.5 py-1.5 rounded text-sm font-medium ${
                      isActive
                        ? 'bg-[var(--surface-secondary)] text-[var(--foreground)] font-semibold'
                        : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <Link
                to="/graph"
                onClick={requestCloseMobileMenu}
                onMouseEnter={() => prefetchRoute('/graph')}
                onFocus={() => prefetchRoute('/graph')}
                className="px-2.5 py-1.5 rounded text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                {t('home.exploreMap')}
              </Link>
              <button
                type="button"
                onClick={() => {
                  requestCloseMobileMenu();
                  setAppearanceOpen(true);
                }}
                className="w-full text-start px-2.5 py-1.5 rounded text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-secondary)] flex items-center gap-2 cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4 text-[var(--accent)]" />
                <span>{t('appearance.title')}</span>
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Storage Quota Warning Banner */}
      {quotaError && (
        <div
          role="alert"
          className="bg-amber-500/10 border-b border-amber-500/25 text-amber-900 dark:text-amber-200 py-2 text-xs"
        >
          <Container>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">{quotaError}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="px-2 py-0.5 rounded bg-amber-600 text-white font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Export backup</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuotaError(null)}
                  className="p-0.5 rounded hover:bg-amber-500/20 text-amber-800 dark:text-amber-300"
                  aria-label={t('common.close')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </Container>
        </div>
      )}

      {/* Main Content Area: Root for shared entrance motion on page swaps */}
      <main ref={mainRef} className="flex-1 w-full" id="main-content">
        <Outlet />
      </main>

      {/* Quiet Publication Footer */}
      <footer className="border-t border-[var(--separator)] bg-[var(--surface)]/50 mt-20 py-10">
        <Container>
          <PageGrid className="items-center text-xs text-[var(--muted)]">
            <div className="col-span-12 md:col-span-7">
              <span className="font-semibold text-[var(--foreground)]">WikiGraph</span>
              <span className="mx-2">·</span>
              <span>Knowledge library for AI agents with a human reading view</span>
            </div>
            <div className="col-span-12 md:col-span-5 flex flex-wrap items-center md:justify-end gap-4 pt-2 md:pt-0">
              <Link
                to="/library"
                onMouseEnter={() => prefetchRoute('/library')}
                onFocus={() => prefetchRoute('/library')}
                className="hover:text-[var(--foreground)] transition-colors"
              >
                {t('nav.library')}
              </Link>
              <Link
                to="/collections"
                onMouseEnter={() => prefetchRoute('/collections')}
                onFocus={() => prefetchRoute('/collections')}
                className="hover:text-[var(--foreground)] transition-colors"
              >
                {t('nav.collections')}
              </Link>
              <Link
                to="/for-agents"
                onMouseEnter={() => prefetchRoute('/for-agents')}
                onFocus={() => prefetchRoute('/for-agents')}
                className="hover:text-[var(--foreground)] transition-colors"
              >
                {t('nav.forAgents')}
              </Link>
              <Link
                to="/graph"
                onMouseEnter={() => prefetchRoute('/graph')}
                onFocus={() => prefetchRoute('/graph')}
                className="hover:text-[var(--foreground)] transition-colors"
              >
                {t('home.exploreMap')}
              </Link>
            </div>
          </PageGrid>
        </Container>
      </footer>

      {/* 12-Column Verification Grid Overlay */}
      <GridOverlay />

      {/* Appearance Preferences Drawer / Popover */}
      <AppearancePanel
        isOpen={appearanceOpen}
        onClose={() => setAppearanceOpen(false)}
      />
    </div>
  );
};
