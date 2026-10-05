import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Lightbulb, X, ArrowRight } from 'lucide-react';
import { useRepository } from '../../services/RepositoryContext';
import { useLocale } from '../../locales/useLocale';
import { KnowledgeItem, SourceDocument } from '../../types';
import { Badge } from './Badge';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const { repository, version } = useRepository();
  const { t } = useLocale();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [knowledgeResults, setKnowledgeResults] = useState<KnowledgeItem[]>([]);
  const [sourceResults, setSourceResults] = useState<SourceDocument[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

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

      const [kRes, allSources] = await Promise.all([
        repository.listKnowledge({ search: query }),
        repository.listSources(),
      ]);

      if (active) {
        setKnowledgeResults(kRes.slice(0, 6));
        const q = query.toLowerCase();
        setSourceResults(
          allSources
            .filter(
              (s) =>
                s.title.toLowerCase().includes(q) ||
                s.filename.toLowerCase().includes(q) ||
                s.originalContent.toLowerCase().includes(q)
            )
            .slice(0, 4)
        );
      }
    };

    const handler = setTimeout(searchAll, 120);
    return () => {
      active = false;
      clearTimeout(handler);
    };
  }, [query, isOpen, repository, version]);

  const handleSelectKnowledge = (id: string) => {
    onClose();
    navigate(`/knowledge/${id}`);
  };

  const handleSelectSource = (id: string) => {
    onClose();
    navigate(`/documents/${id}`);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('common.search')}
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-[#000000]/70 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-[#0f1011] border border-[#23252a] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#23252a]">
          <Search className="w-5 h-5 text-[#8a8f98] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            dir="auto"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('common.searchPlaceholder')}
            className="w-full bg-transparent text-sm sm:text-base text-[#f7f8f8] placeholder-[#62666d] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded text-[#8a8f98] hover:text-[#f7f8f8] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#141516] text-[#8a8f98] border border-[#23252a]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4 divide-y divide-[#23252a]">
          {/* Knowledge Items */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98] px-2 mb-1.5 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-[#5e6ad2]" />
              <span>{t('library.tabKnowledge')}</span>
            </div>
            {knowledgeResults.length === 0 ? (
              <p className="text-xs text-[#62666d] px-2 py-1.5 italic">
                {t('library.noKnowledgeFound')}
              </p>
            ) : (
              <div className="space-y-1">
                {knowledgeResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectKnowledge(item.id)}
                    className="w-full flex items-center justify-between text-left rtl:text-right p-2.5 rounded-lg hover:bg-[#141516] transition-colors group cursor-pointer border border-transparent hover:border-[#23252a]"
                  >
                    <div className="min-w-0 pr-3 rtl:pr-0 rtl:pl-3">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge type="knowledgeType" value={item.type} size="sm" />
                        <span
                          dir="auto"
                          className="text-xs sm:text-sm font-medium text-[#f7f8f8] group-hover:text-[#828fff] truncate"
                        >
                          {item.title}
                        </span>
                      </div>
                      <p
                        dir="auto"
                        className="text-xs text-[#8a8f98] line-clamp-1"
                      >
                        {item.summary}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#62666d] group-hover:text-[#d0d6e0] rtl:rotate-180 shrink-0 transition-transform" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sources */}
          <div className="pt-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98] px-2 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#7a7fad]" />
              <span>{t('library.tabSources')}</span>
            </div>
            {sourceResults.length === 0 ? (
              <p className="text-xs text-[#62666d] px-2 py-1.5 italic">
                {t('library.noSourcesFound')}
              </p>
            ) : (
              <div className="space-y-1">
                {sourceResults.map((src) => (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => handleSelectSource(src.id)}
                    className="w-full flex items-center justify-between text-left rtl:text-right p-2.5 rounded-lg hover:bg-[#141516] transition-colors group cursor-pointer border border-transparent hover:border-[#23252a]"
                  >
                    <div className="min-w-0 pr-3 rtl:pr-0 rtl:pl-3">
                      <span
                        dir="auto"
                        className="text-xs sm:text-sm font-medium text-[#f7f8f8] group-hover:text-[#828fff] block truncate"
                      >
                        {src.title}
                      </span>
                      <span className="text-[11px] text-[#8a8f98]">
                        {src.filename} &bull; {((src.rawSize || 0) / 1024).toFixed(1)} KiB
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#62666d] group-hover:text-[#d0d6e0] rtl:rotate-180 shrink-0 transition-transform" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#141516] border-t border-[#23252a] text-[11px] text-[#8a8f98]">
          <span>{t('common.demoNotice')}</span>
          <span className="text-[#62666d]">WikiGraph v1.0</span>
        </div>
      </div>
    </div>
  );
};
