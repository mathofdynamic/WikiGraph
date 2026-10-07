import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Layers,
  Cpu,
  CheckCircle2,
  KeyRound,
  Settings,
  Search,
  Languages,
  Sun,
  Moon,
  Menu,
  X,
  FileUp,
  ClipboardCheck,
  LogOut,
  GitFork,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { useLocale } from '../../locales/useLocale';
import { useTheme } from '../../context/ThemeContext';
import { useRepository } from '../../services/RepositoryContext';
import { useAuth } from '../../context/AuthContext';
import { SearchModal } from '../common/SearchModal';
import { QUOTA_ERROR_EVENT } from '../../lib/storage';

export const AppLayout: React.FC = () => {
  const { t, locale, setLocale } = useLocale();
  const { isDark, toggleTheme } = useTheme();
  const { repository, version } = useRepository();
  const { logout } = useAuth();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [needsReviewCount, setNeedsReviewCount] = useState<number>(0);
  const [quotaError, setQuotaError] = useState<string | null>(null);

  // Storage quota event listener
  useEffect(() => {
    const handleQuota = (e: Event) => {
      const custom = e as CustomEvent<{ message: string }>;
      setQuotaError(custom.detail?.message || 'Browser storage is full. Export a backup and clear space.');
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

  // Load items needing review count for sidebar badge
  useEffect(() => {
    let active = true;
    repository
      .listKnowledge({ reviewStatus: 'needs_review' })
      .then((items) => {
        if (active) setNeedsReviewCount(items.length);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [repository, version]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Global keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    { to: '/library', label: t('nav.library'), icon: Layers },
    { to: '/review', label: t('nav.review'), icon: ClipboardCheck, badge: needsReviewCount },
    { to: '/graph', label: t('nav.graph') || (locale === 'fa' ? 'گراف دانش' : 'Knowledge Graph'), icon: GitFork },
    { to: '/import', label: t('nav.import'), icon: FileUp },
    { to: '/context', label: t('nav.context'), icon: Cpu },
    { to: '/outcomes', label: t('nav.outcomes'), icon: CheckCircle2 },
    { to: '/connections', label: 'API & Agent Access', icon: KeyRound },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[var(--surface)] select-none">
      {/* Workspace Brand Identity */}
      <div className="h-14 flex items-center px-4 gap-2.5 border-b border-[var(--separator)] shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shrink-0">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="5" cy="6" r="2.5" />
            <circle cx="19" cy="8" r="2.5" />
            <circle cx="12" cy="18" r="2.5" />
            <line x1="7.2" y1="6.8" x2="16.8" y2="7.6" />
            <line x1="6.6" y1="8.2" x2="10.8" y2="15.8" />
            <line x1="17.6" y1="10.2" x2="13.2" y2="15.8" />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--foreground)] tracking-tight leading-none truncate">
            WikiGraph
          </div>
          <div className="text-[11px] text-[var(--muted)] font-mono leading-none mt-1 truncate">
            Public Knowledge Platform
          </div>
        </div>
      </div>

      {/* Main Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 text-[13px] font-medium rounded-[10px] transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[var(--surface-secondary)] text-[var(--foreground)] font-semibold'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)]/50'
                }`
              }
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className="w-[17px] h-[17px] shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 shrink-0">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Section: Settings */}
      <div className="p-3 border-t border-[var(--separator)] shrink-0">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-[10px] transition-colors cursor-pointer ${
              isActive
                ? 'bg-[var(--surface-secondary)] text-[var(--foreground)] font-semibold'
                : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)]/50'
            }`
          }
        >
          <Settings className="w-[17px] h-[17px] shrink-0" />
          <span className="truncate">{t('nav.settings')}</span>
        </NavLink>

        <button
          type="button"
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-[10px] text-[var(--muted)] hover:text-rose-500 hover:bg-[var(--surface-secondary)]/50 transition-colors cursor-pointer mt-0.5"
          aria-label={locale === 'fa' ? 'خروج از حساب' : 'Sign Out'}
        >
          <LogOut className="w-[17px] h-[17px] shrink-0" />
          <span className="truncate">{locale === 'fa' ? 'خروج از حساب' : 'Sign Out'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      {/* Desktop Persistent Left Sidebar (230px) */}
      <aside className="hidden lg:flex flex-col w-[230px] shrink-0 border-e border-[var(--border)] h-full z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop and Sidebar */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex flex-col w-[240px] max-w-[80vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="absolute top-3 end-3 z-20">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)]"
                aria-label={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        {/* Top Workspace Header (56px) */}
        <header className="h-14 px-4 sm:px-6 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between gap-4 shrink-0 z-10">
          {/* Left: Mobile hamburger & Global Search Button */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 -ms-1.5 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)] cursor-pointer"
              aria-label={locale === 'fa' ? 'تغییر وضعیت منو' : 'Toggle navigation'}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Compact Search Trigger with Cmd+K */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--field-background)] text-xs text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)] transition-all cursor-pointer w-48 sm:w-64"
              aria-label={t('common.searchWorkspace')}
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate flex-1 text-start">{t('common.searchWorkspace')}</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--muted)]">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Controls & Profile */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Language Switch */}
            <button
              type="button"
              onClick={() => setLocale(locale === 'en' ? 'fa' : 'en')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)] border border-transparent hover:border-[var(--border)] transition-colors cursor-pointer flex items-center gap-1.5"
              title="Toggle Language"
              aria-label={locale === 'fa' ? 'تغییر زبان به انگلیسی' : 'Switch language to Persian'}
            >
              <Languages className="w-3.5 h-3.5" />
              <span className="font-mono uppercase">{locale === 'en' ? 'FA' : 'EN'}</span>
            </button>

            {/* Theme Switch */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)] border border-transparent hover:border-[var(--border)] transition-colors cursor-pointer"
              title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label={isDark ? (locale === 'fa' ? 'تغییر به پوسته روشن' : 'Switch to Light Theme') : (locale === 'fa' ? 'تغییر به پوسته تاریک' : 'Switch to Dark Theme')}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Public status badge */}
            <div className="hidden sm:flex items-center gap-2 ps-2 border-s border-[var(--separator)]">
              <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
              <span className="text-xs font-medium text-[var(--foreground)]">
                Public Platform
              </span>
            </div>
          </div>
        </header>

        {/* Storage Quota Warning Banner */}
        {quotaError && (
          <div
            role="alert"
            className="bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2.5 text-xs flex items-center justify-between gap-3 shrink-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-medium truncate">{quotaError}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportBackup}
                className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export backup</span>
              </button>
              <button
                type="button"
                onClick={() => setQuotaError(null)}
                className="p-1 rounded text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                aria-label={t('common.close')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Main Application Workspace Canvas (Full width with 24-32px gutters) */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Cmd+K Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};
