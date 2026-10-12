import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ArrowLeft, AlertCircle } from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import { SearchMatchItem } from '../types';

export const SearchPage: React.FC = () => {
  const { repository } = useRepository();
  const { t } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryFromUrl = searchParams.get('q') || '';
  const [queryInput, setQueryInput] = useState(queryFromUrl);
  const [results, setResults] = useState<SearchMatchItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setQueryInput(queryFromUrl);
  }, [queryFromUrl]);

  useEffect(() => {
    let mounted = true;
    const clean = queryFromUrl.trim();
    if (!clean) {
      setResults([]);
      setTotalCount(0);
      setNextCursor(undefined);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      try {
        const res = await repository.searchKnowledge({
          query: clean,
          limit: 20,
        });

        if (mounted) {
          setResults(res.results);
          setTotalCount(res.total);
          setNextCursor(res.nextCursor);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    performSearch();
    return () => {
      mounted = false;
    };
  }, [queryFromUrl, repository]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = queryInput.trim();
    if (clean) {
      setSearchParams({ q: clean });
    } else {
      setSearchParams({});
    }
  };

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore || !queryFromUrl.trim()) return;
    setLoadingMore(true);
    try {
      const res = await repository.searchKnowledge({
        query: queryFromUrl.trim(),
        cursor: nextCursor,
        limit: 20,
      });

      setResults((prev) => [...prev, ...res.results]);
      setNextCursor(res.nextCursor);
    } catch (err) {
      console.error('Failed to load more search results:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="max-w-[72ch] mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10">
      {/* Search Header Form */}
      <header className="space-y-4 pb-6 border-b border-[var(--separator)]">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
          {t('searchPage.title')}
        </h1>

        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
          <input
            type="search"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder={t('searchPage.placeholder')}
            autoFocus
            className="w-full ps-10 pe-24 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--foreground)] transition-colors shadow-xs"
          />
          <button
            type="submit"
            className="absolute end-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-[var(--foreground)] text-[var(--surface)] text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            {t('nav.search')}
          </button>
        </form>

        {queryFromUrl && !loading && (
          <div className="text-xs text-[var(--muted)] font-mono">
            {totalCount} matching {totalCount === 1 ? 'entry' : 'entries'} found for "{queryFromUrl}"
          </div>
        )}
      </header>

      {/* Results List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[var(--muted)]">
          {t('searchPage.searching')}
        </div>
      ) : queryFromUrl && results.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {t('searchPage.noResultsTitle')}
          </p>
          <p className="text-xs text-[var(--muted)]">
            {t('searchPage.noResultsDesc')}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="divide-y divide-[var(--separator)]">
            {results.map(({ item, snippet, matchReasons }) => (
              <article key={item.id} className="py-5 space-y-2">
                <Link
                  to={`/knowledge/${item.id}`}
                  className="text-base font-semibold text-[var(--foreground)] hover:text-[var(--accent)] transition-colors block"
                  dir="auto"
                >
                  {item.title}
                </Link>

                {/* Quiet Text Metadata Line */}
                <div className="text-xs text-[var(--muted)] flex items-center gap-2">
                  <span className="capitalize">{item.type.replace('_', ' ')}</span>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize">{item.evidenceLevel.replace('_', ' ')}</span>
                  <span aria-hidden="true">·</span>
                  <span className="uppercase">{item.language}</span>
                  <span aria-hidden="true">·</span>
                  <span>{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</span>
                </div>

                {/* Match Reasons as quiet inline text */}
                {matchReasons.length > 0 && (
                  <div className="text-[11px] text-[var(--muted)] flex items-center gap-1 font-mono">
                    <span className="font-semibold">{t('searchPage.matchReasons')}:</span>
                    <span>{matchReasons.join(', ')}</span>
                  </div>
                )}

                {/* Contextual Snippet */}
                <p
                  className="text-xs text-[var(--foreground)] leading-relaxed ps-3 border-s-2 border-[var(--border)] italic"
                  dir="auto"
                >
                  {snippet}
                </p>
              </article>
            ))}
          </div>

          {/* Cursor pagination */}
          {nextCursor && (
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-secondary)] text-xs font-medium text-[var(--foreground)] transition-colors cursor-pointer disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load more results'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
