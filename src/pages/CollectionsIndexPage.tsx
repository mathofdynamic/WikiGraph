import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GitFork, ArrowRight } from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import { Collection } from '../types';
import { Container } from '../components/layout/Container';
import { PageGrid } from '../components/layout/PageGrid';

export const CollectionsIndexPage: React.FC = () => {
  const { repository } = useRepository();
  const { t, locale } = useLocale();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchCollections = async () => {
      try {
        const cols = await repository.listCollections();
        if (mounted) setCollections(cols);
      } catch (err) {
        console.error('Failed to load collections:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchCollections();
    return () => {
      mounted = false;
    };
  }, [repository]);

  if (loading) {
    return (
      <Container className="py-20 text-center text-sm text-[var(--muted)]">
        {t('common.loading')}
      </Container>
    );
  }

  return (
    <Container className="py-12 sm:py-16">
      <PageGrid className="gap-y-10">
        {/* Header: Columns 1-12 */}
        <header className="col-span-12 space-y-3 pb-6 border-b border-[var(--separator)] bg-transparent">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
            {t('collectionsPage.title')}
          </h1>
          <p className="text-sm sm:text-base text-[var(--muted)] leading-relaxed max-w-[70ch]">
            {t('collectionsPage.subtitle')}
          </p>
        </header>

        {/* Shelves List: Columns 1-8 */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {collections.length === 0 ? (
            <p className="py-8 text-xs text-[var(--muted)] italic">
              {t('collectionsPage.emptyCollections')}
            </p>
          ) : (
            collections.map((col) => {
              const name = locale === 'fa' && col.nameFa ? col.nameFa : col.name;
              const desc =
                locale === 'fa' && col.descriptionFa
                  ? col.descriptionFa
                  : col.description || 'Subject knowledge shelf.';

              return (
                <article
                  key={col.id}
                  className="py-5 border-b border-[var(--separator)] last:border-b-0 space-y-2"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <Link
                      to={`/collections/${col.id}`}
                      className="text-lg font-semibold text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                      dir="auto"
                    >
                      {name}
                    </Link>

                    <span className="text-xs text-[var(--muted)] font-mono shrink-0">
                      {col.count !== undefined ? `${col.count} entries` : ''}
                    </span>
                  </div>

                  <p className="text-sm text-[var(--muted)] leading-relaxed max-w-[70ch]" dir="auto">
                    {desc}
                  </p>

                  <div className="flex items-center gap-4 pt-1 text-xs text-[var(--muted)]">
                    <Link
                      to={`/collections/${col.id}`}
                      className="hover:text-[var(--foreground)] font-medium transition-colors"
                    >
                      {t('collectionsPage.viewCollection')}
                    </Link>
                    <span aria-hidden="true">·</span>
                    <Link
                      to={`/graph?collection=${col.id}`}
                      className="hover:text-[var(--foreground)] inline-flex items-center gap-1 transition-colors"
                    >
                      <GitFork className="w-3 h-3" />
                      <span>{t('collectionsPage.exploreGraph')}</span>
                    </Link>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </PageGrid>
    </Container>
  );
};
