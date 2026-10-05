import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Layers,
  UploadCloud,
  Network,
  Cpu,
  CheckCircle2,
  KeyRound,
  Settings,
  Search,
  Languages,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  Shield,
} from 'lucide-react';
import { useLocale } from '../../locales/useLocale';
import { useTheme } from '../../context/ThemeContext';
import { SearchModal } from '../common/SearchModal';

export const AppLayout: React.FC = () => {
  const { t, locale, setLocale } = useLocale();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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
    { to: '/import', label: t('nav.import'), icon: UploadCloud },
    { to: '/graph', label: t('nav.graph'), icon: Network },
    { to: '/context', label: t('nav.context'), icon: Cpu },
    { to: '/outcomes', label: t('nav.outcomes'), icon: CheckCircle2 },
    { to: '/connections', label: t('nav.connections'), icon: KeyRound },
  ];

  const handleLogout = () => {
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[var(--surface)] select-none">
      {/* Workspace Brand Identity */}
      <div className="h-14 flex items-center px-4 gap-2.5 border-b border-[var(--separator)] shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] font-semibold shrink-0">
          <Shield className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--foreground)] tracking-tight leading-none truncate">
            WikiGraph
          </div>
          <div className="text-[11px] text-[var(--muted)] font-mono leading-none mt-1 truncate">
            Research Workspace
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
                `flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-[10px] transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[var(--surface-secondary)] text-[var(--foreground)] font-semibold'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)]/50'
                }`
              }
            >
              <Icon className="w-[17px] h-[17px] shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Section: Settings & User Profile / Exit */}
      <div className="p-3 border-t border-[var(--separator)] space-y-1 shrink-0">
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
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-[10px] text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--surface-secondary)]/50 transition-colors cursor-pointer text-start"
          title={t('nav.logout')}
        >
          <LogOut className="w-[17px] h-[17px] shrink-0 rtl:rotate-180" />
          <span className="truncate">{t('nav.logout')}</span>
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
              aria-label="Toggle navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Compact Search Trigger with Cmd+K */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--field-background)] text-xs text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)] transition-all cursor-pointer w-48 sm:w-64"
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate flex-1 text-start">{t('common.searchPlaceholder')}</span>
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
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Workspace status badge */}
            <div className="hidden sm:flex items-center gap-2 ps-2 border-s border-[var(--separator)]">
              <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
              <span className="text-xs font-medium text-[var(--foreground)]">
                Workspace
              </span>
            </div>
          </div>
        </header>

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
