import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Copy, Check, Sparkles, AlertCircle, BookOpen, Bot } from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import { useToast } from '../context/ToastContext';
import { Collection, ContextResult, KnowledgeItem } from '../types';
import { formatContextMarkdown } from '../shared/retrieval';
import { renderAgentPrompt } from '../shared/agentSkill';
import { Container } from '../components/layout/Container';
import { PageGrid } from '../components/layout/PageGrid';

export const HomePage: React.FC = () => {
  const { repository } = useRepository();
  const { t, locale } = useLocale();
  const { showToast } = useToast();

  const [taskQuery, setTaskQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [contextResult, setContextResult] = useState<ContextResult | null>(null);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  const [collections, setCollections] = useState<Collection[]>([]);
  const [recentItems, setRecentItems] = useState<KnowledgeItem[]>([]);
  const [loadingShelves, setLoadingShelves] = useState(true);

  // Example prompts
  const examples = [
    t('home.exQuantization'),
    t('home.exPersianNLP'),
    t('home.exCalibration'),
  ];

  useEffect(() => {
    let mounted = true;
    const loadShelvesAndRecents = async () => {
      try {
        const [cols, res] = await Promise.all([
          repository.listCollections(),
          repository.listKnowledgePaginated({ limit: 6 }),
        ]);
        if (mounted) {
          setCollections(cols);
          setRecentItems(res.items);
        }
      } catch (err) {
        console.error('Failed to load home shelves:', err);
      } finally {
        if (mounted) setLoadingShelves(false);
      }
    };
    loadShelvesAndRecents();
    return () => {
      mounted = false;
    };
  }, [repository]);

  const handleTaskSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = taskQuery.trim();
    if (!clean) return;

    setSubmitting(true);
    try {
      const res = await repository.buildContext({
        task: clean,
        maxTokens: 4000,
      });
      setContextResult(res);
    } catch (err) {
      console.error('buildContext failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyMarkdown = async () => {
    if (!contextResult) return;
    try {
      await navigator.clipboard.writeText(formatContextMarkdown(contextResult));
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2500);
    } catch (err) {
      console.error('Copy markdown failed:', err);
    }
  };

  return (
    <Container className="py-12 sm:py-16">
      <PageGrid className="gap-y-16">
        {/* 1. Prominent Task Box: Columns 1-8 */}
        <section className="col-span-12 lg:col-span-8 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
              {t('home.taskHeading')}
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed max-w-[70ch]">
              {locale === 'fa'
                ? 'وظیفه یا هدف خود را بنویسید تا موتور بازیابی قطعی، مرتبط‌ترین واحدهای دانشی را همراه با استنادها و وابستگی‌ها آماده کند.'
                : 'State what you are building or solving. The deterministic retrieval engine compiles the minimal, cited reading packet for your AI agent.'}
            </p>
          </div>

        <form onSubmit={handleTaskSubmit} className="space-y-3">
          <div className="relative">
            <textarea
              rows={3}
              value={taskQuery}
              onChange={(e) => setTaskQuery(e.target.value)}
              placeholder={t('home.taskPlaceholder')}
              dir="auto"
              className="w-full p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)] text-sm leading-relaxed focus:outline-none focus:border-[var(--foreground)] transition-colors shadow-xs resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Example Prompt Chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted)]">
              <span className="font-medium me-1">{t('home.exampleChipsTitle')}</span>
              {examples.map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setTaskQuery(ex);
                  }}
                  className="px-2.5 py-1 rounded-md bg-[var(--surface-secondary)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)]/80 text-[11px] transition-colors cursor-pointer text-start truncate max-w-[260px]"
                  title={ex}
                >
                  {ex}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={submitting || !taskQuery.trim()}
              className="px-4 py-2 rounded-lg bg-[var(--foreground)] text-[var(--surface)] text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shrink-0 self-end sm:self-auto"
            >
              {submitting ? t('home.submitting') : t('home.submitTask')}
            </button>
          </div>
        </form>

        {/* Quiet Link under the task box */}
        <div className="mt-3.5 flex items-center justify-between text-xs text-[var(--muted)]">
          <button
            type="button"
            onClick={async () => {
              try {
                const prompt = renderAgentPrompt(window.location.origin, 'install');
                await navigator.clipboard.writeText(prompt);
                showToast({ type: 'success', message: t('agentPrompt.promptCopied') });
              } catch {
                showToast({ type: 'error', message: 'Failed to copy to clipboard' });
              }
            }}
            className="inline-flex items-center gap-1.5 hover:text-[var(--foreground)] transition-colors cursor-pointer group"
          >
            <Bot className="w-3.5 h-3.5 text-[var(--accent)] group-hover:scale-110 transition-transform" />
            <span className="underline underline-offset-4 decoration-[var(--border)] group-hover:decoration-[var(--foreground)]">
              {t('agentPrompt.homeQuietLink')}
            </span>
          </button>
          <Link
            to="/for-agents"
            className="hover:text-[var(--foreground)] transition-colors hidden sm:inline"
          >
            {t('nav.forAgents')} →
          </Link>
        </div>

        {/* 2. Reading List Results (when task submitted) */}
        {contextResult && (
          <div className="mt-8 pt-8 border-t border-[var(--separator)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground)] tracking-tight">
                  {t('home.readingListTitle')}
                </h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  {t('home.readingListSubtitle')}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] py-1 cursor-pointer transition-colors"
              >
                {copiedMarkdown ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span className="text-[var(--accent)] font-semibold">{t('home.copied')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t('home.copyAsMarkdown')}</span>
                  </>
                )}
              </button>
            </div>

            {/* Plain Prose Sufficiency Statement */}
            <div className="p-4 rounded-xl bg-[var(--surface-secondary)]/60 text-xs leading-relaxed space-y-1">
              <div className="font-semibold text-[var(--foreground)]">
                {t('home.sufficiencyTitle')}:
              </div>
              <p className="text-[var(--muted)]">
                {contextResult.sufficiency === 'sufficient'
                  ? t('home.sufficiencySufficient')
                  : contextResult.sufficiency === 'partial'
                  ? t('home.sufficiencyPartial')
                  : t('home.sufficiencyInsufficient')}
              </p>
              {contextResult.sufficiencyNote && (
                <p className="text-[var(--foreground)] italic text-[11px] pt-1">
                  "{contextResult.sufficiencyNote}"
                </p>
              )}
            </div>

            {/* Conflicts Note (if any) */}
            {contextResult.conflicts.length > 0 && (
              <div className="p-3.5 rounded-lg border border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('home.conflictsNote')}</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 ps-1 text-[11px]">
                  {contextResult.conflicts.map((c, i) => (
                    <li key={i}>
                      {c.note || `${c.itemIds[0]} ↔ ${c.itemIds[1]}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* The Reading List Items */}
            <div className="space-y-4 pt-2">
              {contextResult.selected.map((entry, idx) => (
                <article
                  key={entry.item.id}
                  className="py-3 border-b border-[var(--separator)] last:border-b-0 space-y-1.5"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <Link
                      to={`/knowledge/${entry.item.id}`}
                      className="text-base font-semibold text-[var(--foreground)] hover:text-[var(--accent)] transition-colors leading-snug"
                      dir="auto"
                    >
                      {idx + 1}. {entry.item.title}
                    </Link>
                    <span className="text-[11px] text-[var(--muted)] font-mono shrink-0">
                      {entry.role === 'primary'
                        ? t('home.rolePrimary')
                        : t('home.rolePrerequisite')}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--foreground)] leading-relaxed" dir="auto">
                    {entry.reasons.join('; ')}
                  </p>

                  {/* Grounding Citation */}
                  {(entry.source || entry.item.sourceExcerpt) && (
                    <div className="text-[11px] text-[var(--muted)] ps-3 border-s-2 border-[var(--border)] italic leading-relaxed pt-0.5">
                      "{entry.source?.excerpt || entry.item.sourceExcerpt}"
                      {entry.source?.title && (
                        <span className="not-italic ms-1 font-mono text-[10px]">
                          — {entry.source.title}
                        </span>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 3. Collections as Short Descriptive Shelves: Spans all 12 columns */}
      <section className="col-span-12 space-y-4 pt-4 border-t border-[var(--separator)]">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
              {t('home.collectionsHeading')}
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5 max-w-[70ch]">
              {t('home.collectionsSubheading')}
            </p>
          </div>
          <Link
            to="/collections"
            className="text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            {t('home.viewAllCollections')}
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {collections.map((col) => (
            <Link
              key={col.id}
              to={`/collections/${col.id}`}
              className="group p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--foreground)] transition-colors space-y-1.5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors" dir="auto">
                  {locale === 'fa' && col.nameFa ? col.nameFa : col.name}
                </h3>
                <span className="text-[11px] text-[var(--muted)] font-mono">
                  {col.count !== undefined ? `${col.count}` : ''}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] line-clamp-2 leading-relaxed max-w-[70ch]" dir="auto">
                {locale === 'fa' && col.descriptionFa ? col.descriptionFa : (col.description || 'Curated subject shelf.')}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. "Recently Added" Plain List: Spans all 12 columns */}
      <section className="col-span-12 space-y-4 pt-4 border-t border-[var(--separator)]">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
              {t('home.recentlyAddedHeading')}
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5 max-w-[70ch]">
              {t('home.recentlyAddedSubheading')}
            </p>
          </div>
          <Link
            to="/library"
            className="text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            {t('home.viewAllLibrary')}
          </Link>
        </div>

        <div className="divide-y divide-[var(--separator)] pt-2">
          {recentItems.map((item) => (
            <article key={item.id} className="py-3.5 space-y-1">
              <div className="flex items-baseline justify-between gap-3">
                <Link
                  to={`/knowledge/${item.id}`}
                  className="text-sm font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                  dir="auto"
                >
                  {item.title}
                </Link>
              </div>

              {/* Quiet Text Metadata Line (type · evidence · language · updated) */}
              <div className="text-[11px] text-[var(--muted)] flex items-center gap-2">
                <span className="capitalize">{item.type.replace('_', ' ')}</span>
                <span aria-hidden="true">·</span>
                <span className="capitalize">{item.evidenceLevel.replace('_', ' ')}</span>
                <span aria-hidden="true">·</span>
                <span className="uppercase">{item.language}</span>
                <span aria-hidden="true">·</span>
                <span>{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</span>
              </div>

              <p className="text-xs text-[var(--muted)] line-clamp-2 leading-relaxed max-w-[70ch]" dir="auto">
                {item.summary}
              </p>
            </article>
          ))}
        </div>
      </section>
    </PageGrid>
  </Container>
  );
};
