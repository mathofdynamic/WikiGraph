import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Lightbulb, X, ArrowRight } from 'lucide-react';
import { useRepository } from '../../services/RepositoryContext';
import { useLocale } from '../../locales/useLocale';
import { KnowledgeItem, SourceDocument } from '../../types';
import { Badge } from './Badge';
import { useFocusTrap } from '../../lib/useFocusTrap';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const { repository, version } = useRepository();
  const { t, locale } = useLocale();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [knowledgeResults, setKnowledgeResults] = useState<KnowledgeItem[]>([]);
  const [sourceResults, setSourceResults] = useState<SourceDocument[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useFocusTrap(modalRef, isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const searchAll = async () => {
      if (!query.trim()) {
        const [kList, sList] = await Promise.all([
          repository.listKnowledge(),
          repository.listSources(),
        ]);
        if (active) {
          setKnowledgeResults(kList.slice(0, 5));
          setSourceResults(sList.slice(0, 3));
        }
        return;
      }

      const q = query.toLowerCase();
      const [kList, sList] = await Promise.all([
        repository.listKnowledge(),
        repository.listSources(),
      ]);

      if (active) {
        setKnowledgeResults(
          kList
            .filter(
              (k) =>
                k.title.toLowerCase().includes(q) ||
                k.summary.toLowerCase().includes(q) ||
                (k.body && k.body.toLowerCase().includes(q))
            )
            .slice(0, 8)
        );
        setSourceResults(
          sList
            .filter(
              (s) =>
                s.title.toLowerCase().includes(q) ||
                s.filename.toLowerCase().includes(q)
            )
            .slice(0, 5)
        );
      }
    };

    searchAll();
    return () => {
      active = false;
    };
  }, [isOpen, query, repository, version]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectKnowledge = (id: string) => {
    navigate(`/knowledge/${id}`);
    onClose();
  };

  const handleSelectSource = (id: string) => {
    navigate(`/documents/${id}`);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('common.search')}
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--separator)]">
          <Search className="w-5 h-5 text-[var(--muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            dir="auto"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('common.searchPlaceholder')}
            className="w-full bg-transparent text-sm sm:text-base text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
              aria-label={locale === 'fa' ? 'پاک کردن جستجو' : 'Clear search query'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-medium rounded bg-[var(--surface-secondary)] text-[var(--muted)] border border-[var(--border)] font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4 divide-y divide-[var(--separator)]">
          {/* Knowledge Items */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] px-2 mb-1.5 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>{t('library.tabKnowledge')}</span>
            </div>
            {knowledgeResults.length === 0 ? (
              <p className="text-xs text-[var(--muted)] px-2 py-1.5 italic">
                {t('library.noKnowledgeFound')}
              </p>
            ) : (
              <div className="space-y-1">
                {knowledgeResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectKnowledge(item.id)}
                    className="w-full flex items-center justify-between text-left rtl:text-right p-2.5 rounded-lg hover:bg-[var(--surface-secondary)] transition-colors group cursor-pointer border border-transparent hover:border-[var(--border)]"
                  >
                    <div className="min-w-0 pe-3">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge type="knowledgeType" value={item.type} size="sm" />
                        <span
                          dir="auto"
                          className="text-xs sm:text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--accent)] truncate"
                        >
                          {item.title}
                        </span>
                      </div>
                      <p
                        dir="auto"
                        className="text-xs text-[var(--muted)] line-clamp-1"
                      >
                        {item.summary}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--foreground)] rtl:rotate-180 shrink-0 transition-transform" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sources */}
          <div className="pt-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] px-2 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[var(--muted)]" />
              <span>{t('library.tabSources')}</span>
            </div>
            {sourceResults.length === 0 ? (
              <p className="text-xs text-[var(--muted)] px-2 py-1.5 italic">
                {t('library.noSourcesFound')}
              </p>
            ) : (
              <div className="space-y-1">
                {sourceResults.map((src) => (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => handleSelectSource(src.id)}
                    className="w-full flex items-center justify-between text-left rtl:text-right p-2.5 rounded-lg hover:bg-[var(--surface-secondary)] transition-colors group cursor-pointer border border-transparent hover:border-[var(--border)]"
                  >
                    <div className="min-w-0 pe-3">
                      <span
                        dir="auto"
                        className="text-xs sm:text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--accent)] block truncate"
                      >
                        {src.title}
                      </span>
                      <span className="text-[11px] text-[var(--muted)] font-mono">
                        {src.filename} &bull; {((src.rawSize || 0) / 1024).toFixed(1)} KiB
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--foreground)] rtl:rotate-180 shrink-0 transition-transform" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--surface-secondary)]/50 border-t border-[var(--separator)] text-[11px] text-[var(--muted)]">
          <span>{t('common.demoNotice')}</span>
          <span className="font-mono">WikiGraph v1.0</span>
        </div>
      </div>
    </div>
  );
};
