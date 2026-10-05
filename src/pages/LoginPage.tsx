import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../locales/useLocale';
import { Shield, ArrowRight, Lock, KeyRound } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [email, setEmail] = useState('researcher@wikigraph.internal');
  const [password, setPassword] = useState('••••••••••••');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/library');
  };

  const handleDemoAccess = () => {
    navigate('/library');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[var(--background)] text-[var(--foreground)]">
      <div className="w-full max-w-md ui-card p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] mx-auto flex items-center justify-center text-[var(--accent)]">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            {t('login.title')}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted)]">
            {t('login.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--foreground)]">
              {t('login.emailLabel')}
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ui-input"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--foreground)]">
              {t('login.passwordLabel')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ui-input"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full ui-button ui-button-primary justify-center"
          >
            <span>{t('login.btnSignIn')}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--separator)]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-[var(--surface)] text-[var(--muted)]">
              Demo Access
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDemoAccess}
          className="w-full ui-button ui-button-secondary justify-center text-xs"
        >
          <KeyRound className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>{t('login.btnDemo')}</span>
        </button>

        <p className="text-[11px] text-[var(--muted)] text-center leading-relaxed">
          {t('login.demoNotice')}
        </p>
      </div>
    </div>
  );
};
