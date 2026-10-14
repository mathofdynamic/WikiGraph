import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import { Collection, KnowledgeItem, KnowledgeType, AppLanguage } from '../types';
import { Container } from '../components/layout/Container';
import { PageGrid } from '../components/layout/PageGrid';

export const LibraryPage: React.FC = () => {
  const { repository, version } = useRepository();
  const { t, locale } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Minimal single-row filters
  const selectedCollection = searchParams.get('collection') || 'all';
  const selectedType = (searchParams.get('type') as KnowledgeType | 'all') || 'all';
  const selectedLanguage = (searchParams.get('lang') as AppLanguage | 'all') || 'all';

  // Load collections
  useEffect(() => {
    let mounted = true;
    repository.listCollections().then((cols) => {
      if (mounted) setCollections(cols);
    });
    return () => {
      mounted = false;
    };
  }, [repository]);

  // Fetch initial page with filters via listKnowledgePaginated
  useEffect(() => {
    let mounted = true;
    const fetchCatalog = async () => {
      setLoading(true);
      try {
        const res = await repository.listKnowledgePaginated({
          collectionId: selectedCollection === 'all' ? undefined : selectedCollection,
          type: selectedType === 'all' ? undefined : selectedType,
          language: selectedLanguage === 'all' ? undefined : selectedLanguage,
          limit: 20,
        });

        if (mounted) {
          setItems(res.items);
          setNextCursor(res.nextCursor);
          setTotalCount(res.total);
        }
      } catch (err) {
        console.error('Failed to load library items:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchCatalog();
    return () => {
      mounted = false;
    };
  }, [repository, version, selectedCollection, selectedType, selectedLanguage]);

  // Load more with cursor
  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await repository.listKnowledgePaginated({
        collectionId: selectedCollection === 'all' ? undefined : selectedCollection,
        type: selectedType === 'all' ? undefined : selectedType,
        language: selectedLanguage === 'all' ? undefined : selectedLanguage,
        cursor: nextCursor,
        limit: 20,
      });

      setItems((prev) => [...prev, ...res.items]);
      setNextCursor(res.nextCursor);
    } catch (err) {
      console.error('Failed to load more library items:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const updateFilter = (key: string, value: string) => {
    const updated = new URLSearchParams(searchParams);
    if (value === 'all' || !value) {
      updated.delete(key);
    } else {
      updated.set(key, value);
    }
    setSearchParams(updated);
  };

  const knowledgeTypes: KnowledgeType[] = [
    'research_finding',
    'tip',
    'procedure',
    'skill',
    'example',
    'failure',
    'lesson',
  ];

  return (
    <Container className="py-12 sm:py-16">
      <PageGrid className="gap-y-10">
        {/* Header: Columns 1-12, aligned with wordmark */}
        <header className="col-span-12 space-y-3 pb-6 border-b border-[var(--separator)] bg-transparent">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
            {t('library.title')}
          </h1>
          <p className="text-sm sm:text-base text-[var(--muted)] leading-relaxed max-w-[70ch]">
            {t('library.subtitle')}
          </p>
        </header>

        {/* Minimal Single Filter Row: Columns 1-12, aligned with wordmark */}
        <div className="col-span-12 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
          {/* Collection Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-[var(--foreground)]">{t('library.filterCollection')}:</span>
            <select
              value={selectedCollection}
              onChange={(e) => updateFilter('collection', e.target.value)}
              className="bg-[var(--surface-secondary)] border border-[var(--border)] rounded px-2.5 py-1 text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              <option value="all">{t('library.allCollections')}</option>
              {collections.map((col) => (
                <option key={col.id} value={col.id}>
                  {locale === 'fa' && col.nameFa ? col.nameFa : col.name}
                </option>
              ))}
            </select>
          </div>

          <span aria-hidden="true" className="text-[var(--border)]">·</span>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-[var(--foreground)]">{t('library.filterType')}:</span>
            <select
              value={selectedType}
              onChange={(e) => updateFilter('type', e.target.value)}
              className="bg-[var(--surface-secondary)] border border-[var(--border)] rounded px-2.5 py-1 text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              <option value="all">{t('library.allTypes')}</option>
              {knowledgeTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <span aria-hidden="true" className="text-[var(--border)]">·</span>

          {/* Language Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-[var(--foreground)]">{t('library.filterLanguage')}:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => updateFilter('lang', e.target.value)}
              className="bg-[var(--surface-secondary)] border border-[var(--border)] rounded px-2.5 py-1 text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              <option value="all">{t('library.allLanguages')}</option>
              <option value="en">English (en)</option>
              <option value="fa">فارسی (fa)</option>
            </select>
          </div>

          {/* Reset Filters (if active) */}
          {(selectedCollection !== 'all' || selectedType !== 'all' || selectedLanguage !== 'all') && (
            <button
              type="button"
              onClick={() => setSearchParams(new URLSearchParams())}
              className="ms-auto text-xs text-[var(--muted)] hover:text-[var(--foreground)] underline cursor-pointer"
            >
              {t('common.reset')}
            </button>
          )}
        </div>

        {/* Reading List of Entries: Columns 1-8 */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {loading ? (
            <div className="py-16 text-center text-xs text-[var(--muted)]">
              {t('common.loading')}
            </div>
          ) : items.length === 0 ? (
            <p className="py-12 text-xs text-[var(--muted)] italic">
              {t('library.noKnowledgeFound')}
            </p>
          ) : (
            <>
              <div className="divide-y divide-[var(--separator)]">
                {items.map((item) => (
                  <article key={item.id} className="py-4 space-y-1.5">
                    <Link
                      to={`/knowledge/${item.id}`}
                      className="text-base font-semibold text-[var(--foreground)] hover:text-[var(--accent)] transition-colors block"
                      dir="auto"
                    >
                      {item.title}
                    </Link>

                    {/* Quiet Text Metadata Line (type · evidence · language · updated) */}
                    <div className="text-xs text-[var(--muted)] flex items-center gap-2">
                      <span className="capitalize">{item.type.replace('_', ' ')}</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{item.evidenceLevel.replace('_', ' ')}</span>
                      <span aria-hidden="true">·</span>
                      <span className="uppercase">{item.language}</span>
                      <span aria-hidden="true">·</span>
                      <span>{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</span>
                      {item.status === 'retired' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            {t('library.retired')}
                          </span>
                        </>
                      )}
                    </div>

                    <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-2 max-w-[70ch]" dir="auto">
                      {item.summary}
                    </p>
                  </article>
                ))}
              </div>

              {/* Cursor-based Load More */}
              {nextCursor && (
                <div className="pt-4 text-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-secondary)] text-xs font-medium text-[var(--foreground)] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {loadingMore ? t('common.loading') : (t('common.loadMore') || 'Load more entries')}
                  </button>
                </div>
              )}

              <div className="text-[11px] text-[var(--muted)] font-mono">
                Showing {items.length} of {totalCount} entries
              </div>
            </>
          )}
        </div>
      </PageGrid>
    </Container>
  );
};
