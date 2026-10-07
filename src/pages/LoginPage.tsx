import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, ArrowRight, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../locales/useLocale';
import { useRepository } from '../services/RepositoryContext';

export const LoginPage: React.FC = () => {
  const { isAuthenticated, login, isLoading } = useAuth();
  const { isDemoMode } = useRepository();
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();

  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const from = (location.state as any)?.from?.pathname || '/library';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Password is required');
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);
    const success = await login(password.trim());
    setSubmitting(false);
    if (success) {
      navigate('/library', { replace: true });
    } else {
      setErrorMsg('Invalid password. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col justify-center items-center p-4 selection:bg-[var(--accent)] selection:text-white">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--accent)] mb-2 shadow-xs">
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="5" cy="6" r="2.5" />
              <circle cx="19" cy="8" r="2.5" />
              <circle cx="12" cy="18" r="2.5" />
              <line x1="7.2" y1="6.8" x2="16.8" y2="7.6" />
              <line x1="6.6" y1="8.2" x2="10.8" y2="15.8" />
              <line x1="17.6" y1="10.2" x2="13.2" y2="15.8" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            WikiGraph
          </h1>
          <p className="text-xs text-[var(--muted)]">
            Private Empirical Knowledge Workspace
          </p>
        </div>

        {/* Login Box */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--separator)]">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[var(--muted)]" />
              <span className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">
                Single-Owner Access
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--surface-secondary)] text-[var(--muted)] border border-[var(--border)]">
              {isDemoMode ? 'Demo Mode' : 'API Mode'}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[var(--foreground)]">
                Master Password
              </label>
              <input
                type="password"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isDemoMode ? 'Enter any password in demo mode...' : 'Enter owner password...'}
                className="ui-input py-2 text-sm w-full"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-[var(--foreground)] text-[var(--surface)] hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              <span>{submitting ? 'Authenticating...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          </form>

          {isDemoMode && (
            <div className="pt-2 border-t border-[var(--separator)] text-[11px] text-[var(--muted)] flex items-start gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Demo mode active: offline simulated workspace with local storage fixtures. Enter any password to unlock.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
