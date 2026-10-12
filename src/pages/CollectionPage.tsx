import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, GitFork, Copy, Check, FileText } from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import { Collection, KnowledgeItem } from '../types';
import { renderCollectionMarkdown } from '../shared/renderers';

export const CollectionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { repository } = useRepository();
  const { t, locale } = useLocale();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [entries, setEntries] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedMd, setCopiedMd] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!id) return;

    const loadCollectionData = async () => {
      setLoading(true);
      setError(null);
      try {
        const target = await repository.getCollection(id);
        if (!target) {
          if (mounted) setError('Collection not found.');
          return;
        }

        const res = await repository.listKnowledgePaginated({
          collectionId: target.id,
          limit: 100,
        });

        if (!mounted) return;
        setCollection(target);
        setEntries(res.items);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load collection');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadCollectionData();
    return () => {
      mounted = false;
    };
  }, [id, repository]);

  if (loading) {
    return (
      <div className="max-w-[72ch] mx-auto px-4 py-20 text-center text-sm text-[var(--muted)]">
        {t('common.loading')}
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="max-w-[72ch] mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">
          {error || 'Collection not found.'}
        </h1>
        <Link
          to="/collections"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('nav.collections')}</span>
        </Link>
      </div>
    );
  }

  const name = locale === 'fa' && collection.nameFa ? collection.nameFa : collection.name;
  const description =
    locale === 'fa' && collection.descriptionFa
      ? collection.descriptionFa
      : collection.description || '';

  const handleCopyMarkdown = async () => {
    if (!collection) return;
    try {
      await navigator.clipboard.writeText(renderCollectionMarkdown(collection, entries));
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-[72ch] mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10">
      {/* Breadcrumb */}
      <div>
        <Link
          to="/collections"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('nav.collections')}</span>
        </Link>
      </div>

      {/* Collection Header: Title & Description */}
      <header className="space-y-4 pb-6 border-b border-[var(--separator)]">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]" dir="auto">
            {name}
          </h1>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer font-mono"
            >
              {copiedMd ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMd ? t('common.copied') : t('knowledgeDetail.copyMarkdown')}</span>
            </button>
            <Link
              to={`/graph?collection=${collection.id}`}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors shrink-0"
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>{t('home.exploreMap')}</span>
            </Link>
          </div>
        </div>

        {description && (
          <p className="text-sm sm:text-base text-[var(--muted)] leading-relaxed" dir="auto">
            {description}
          </p>
        )}

        <div className="text-xs text-[var(--muted)] font-mono">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'} in this shelf · slug: {collection.slug || collection.id}
        </div>
      </header>

      {/* Plain List of Entries (Zero-Pills, Clean Typography) */}
      <div className="divide-y divide-[var(--separator)]">
        {entries.length === 0 ? (
          <p className="py-8 text-xs text-[var(--muted)] italic text-center">
            {t('common.emptyTitle')}
          </p>
        ) : (
          entries.map((item) => (
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
              </div>

              <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-2" dir="auto">
                {item.summary}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
};
