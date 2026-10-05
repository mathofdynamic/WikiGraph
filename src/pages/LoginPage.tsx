import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, ShieldCheck, KeyRound, Sparkles } from 'lucide-react';
import { useLocale } from '../locales/useLocale';

export const LoginPage: React.FC = () => {
  const { t, locale, setLocale } = useLocale();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [usePasskey, setUsePasskey] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/library');
  };

  const handleQuickDemoEnter = () => {
    navigate('/library');
  };

  return (
    <div className="min-h-screen bg-[#010102] text-[#d0d6e0] flex flex-col justify-between p-6 sm:p-10">
      {/* Top bar with language switcher */}
      <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#5e6ad2] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            W
          </div>
          <span className="font-semibold text-[#f7f8f8] tracking-tight text-base">
            WikiGraph
          </span>
        </div>

        <button
          type="button"
          onClick={() => setLocale(locale === 'en' ? 'fa' : 'en')}
          className="linear-btn-secondary text-xs"
        >
          {locale === 'en' ? 'فارسی' : 'English'}
        </button>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#141516] border border-[#23252a] text-[#828fff] mx-auto flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-title text-[#f7f8f8]">
            {t('login.title')}
          </h1>
          <p className="text-xs sm:text-sm text-[#8a8f98]">
            {t('login.subtitle')}
          </p>
        </div>

        <div className="p-6 rounded-xl border border-[#23252a] bg-[#0f1011] shadow-2xl space-y-5">
          {/* Demo Unlocked Banner */}
          <div className="p-3 rounded-lg bg-[#10221c] border border-[#184a37] text-xs text-[#4ade80] flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#4ade80] shrink-0 mt-0.5" />
            <p className="leading-relaxed">{t('login.demoUnlocked')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                {t('login.password')}
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2]"
              />
            </div>

            <button
              type="submit"
              className="w-full linear-btn-primary py-2.5 text-sm justify-center"
            >
              {t('login.enterWorkspace')}
            </button>
          </form>

          <div className="pt-2 border-t border-[#23252a] text-center">
            <button
              type="button"
              onClick={handleQuickDemoEnter}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#828fff] hover:text-[#99a4ff] transition-colors cursor-pointer"
            >
              <span>{t('login.quickDemoEnter')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="text-[11px] text-center text-[#8a8f98]">
          Cloudflare Pages Functions + D1 single-owner JWT session will guard this endpoint in production.
        </p>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-[#8a8f98]">
        WikiGraph — Private Empirical Knowledge Workspace
      </div>
    </div>
  );
};
