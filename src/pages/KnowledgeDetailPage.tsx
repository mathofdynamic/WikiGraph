import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Copy,
  Check,
  FileCode,
  FileText,
  ExternalLink,
  ChevronDown,
  GitFork,
  ArrowLeft,
  AlertTriangle,
  History,
  X,
  Bot,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import {
  KnowledgeItem,
  KnowledgeOutcome,
  KnowledgeRelationship,
  KnowledgeRevision,
  RelationType,
  SourceDocument,
} from '../types';
import { MarkdownViewer } from '../components/common/MarkdownViewer';
import { renderKnowledgeMarkdown, estimateTokens } from '../shared/renderers';
import { useTransientSurface } from '../lib/useTransientSurface';
import { Container } from '../components/layout/Container';
import { PageGrid } from '../components/layout/PageGrid';

export const KnowledgeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { repository } = useRepository();
  const { t, locale } = useLocale();
  const navigate = useNavigate();

  const [item, setItem] = useState<KnowledgeItem | null>(null);
  const [source, setSource] = useState<SourceDocument | null>(null);
  const [relationships, setRelationships] = useState<KnowledgeRelationship[]>([]);
  const [relatedItemsMap, setRelatedItemsMap] = useState<Record<string, KnowledgeItem>>({});
  const [outcomes, setOutcomes] = useState<KnowledgeOutcome[]>([]);
  const [revisions, setRevisions] = useState<KnowledgeRevision[]>([]);
  const [activeRevision, setActiveRevision] = useState<KnowledgeRevision | null>(null);

  const [isAgentView, setIsAgentView] = useState(false);
  const [copiedAgentMd, setCopiedAgentMd] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Copied feedback states
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedApi, setCopiedApi] = useState(false);

  // Raw preview modal
  const [rawModalContent, setRawModalContent] = useState<{
    title: string;
    content: string;
    type: 'markdown' | 'json';
  } | null>(null);

  const {
    isRendered: isRawModalRendered,
    isClosing: isRawModalClosing,
    requestClose: requestCloseRawModal,
  } = useTransientSurface(Boolean(rawModalContent), () => setRawModalContent(null));

  useEffect(() => {
    let mounted = true;
    if (!id) return;

    const fetchArticleData = async () => {
      setLoading(true);
      setError(null);
      try {
        const kno = await repository.getKnowledge(id);
        if (!kno) {
          if (mounted) setError('Knowledge entry not found.');
          return;
        }

        if (mounted) setItem(kno);

        // Concurrently fetch source, relationships, outcomes, and revisions
        const [srcDoc, rels, outs, revs] = await Promise.all([
          kno.sourceId ? repository.getSource(kno.sourceId) : Promise.resolve(null),
          repository.listRelationships(id),
          repository.listOutcomes(id),
          repository.getKnowledgeRevisions(id),
        ]);

        if (!mounted) return;
        setSource(srcDoc);
        setRelationships(rels);
        setOutcomes(outs);
        setRevisions(revs);

        // Fetch targets of relationships for title lookup
        const targetIds = Array.from(
          new Set(
            rels.map((r) =>
              r.sourceKnowledgeId === id ? r.targetKnowledgeId : r.sourceKnowledgeId
            )
          )
        );

        if (targetIds.length > 0) {
          const fetchedItems = await Promise.all(
            targetIds.map((tid) => repository.getKnowledge(tid))
          );
          const map: Record<string, KnowledgeItem> = {};
          fetchedItems.forEach((it) => {
            if (it) map[it.id] = it;
          });
          if (mounted) setRelatedItemsMap(map);
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load article');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchArticleData();
    return () => {
      mounted = false;
    };
  }, [id, repository]);

  if (loading) {
    return (
      <Container className="py-20 text-center text-sm text-[var(--muted)]">
        {t('common.loading')}
      </Container>
    );
  }

  if (error || !item) {
    return (
      <Container className="py-20 text-center space-y-4">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">
          {error || t('knowledgeDetail.notFoundDesc')}
        </h1>
        <Link
          to="/library"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('common.back')}</span>
        </Link>
      </Container>
    );
  }

  // Active content: current item or snapshot if viewing past revision
  const displayFields = activeRevision
    ? {
        title: activeRevision.snapshot.title,
        summary: activeRevision.snapshot.summary,
        body: activeRevision.snapshot.body,
        type: activeRevision.snapshot.type,
        evidenceLevel: activeRevision.snapshot.evidenceLevel,
        applicability: activeRevision.snapshot.applicability,
        exclusions: activeRevision.snapshot.exclusions,
        requirements: activeRevision.snapshot.requirements,
      }
    : {
        title: item.title,
        summary: item.summary,
        body: item.body,
        type: item.type,
        evidenceLevel: item.evidenceLevel,
        applicability: item.applicability,
        exclusions: item.exclusions,
        requirements: item.requirements,
      };

  // Compile formatted Markdown representation of this knowledge unit using shared renderer
  const agentMarkdown = item
    ? renderKnowledgeMarkdown(item, {
        sourceTitle: source?.title,
        sourceFilename: source?.filename,
      })
    : '';

  const agentTokens = estimateTokens(agentMarkdown);

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(agentMarkdown);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyAgentMd = async () => {
    try {
      await navigator.clipboard.writeText(agentMarkdown);
      setCopiedAgentMd(true);
      setTimeout(() => setCopiedAgentMd(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyApiUrl = async () => {
    try {
      const slugOrId = item?.slug || item?.id || '';
      const apiUrl = `${window.location.origin}/api/v1/knowledge/${slugOrId}.md`;
      await navigator.clipboard.writeText(apiUrl);
      setCopiedApi(true);
      setTimeout(() => setCopiedApi(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenRawMd = () => {
    if (!item) return;
    setRawModalContent({
      title: `${item.title} (.md)`,
      content: agentMarkdown,
      type: 'markdown',
    });
  };

  const handleOpenRawJson = () => {
    if (!item) return;
    setRawModalContent({
      title: `${item.title} (.json)`,
      content: JSON.stringify(item, null, 2),
      type: 'json',
    });
  };

  // Group relationships
  const groupedRelationships: Record<RelationType, { rel: KnowledgeRelationship; other: KnowledgeItem }[]> = {
    conflicts_with: [],
    alternative_to: [],
    prerequisite_for: [],
    derived_from: [],
    supersedes: [],
    supports: [],
    relates_to: [],
  };

  relationships.forEach((rel) => {
    const otherId = rel.sourceKnowledgeId === item.id ? rel.targetKnowledgeId : rel.sourceKnowledgeId;
    const otherItem = relatedItemsMap[otherId];
    if (otherItem && groupedRelationships[rel.type]) {
      groupedRelationships[rel.type].push({ rel, other: otherItem });
    }
  });

  return (
    <>
      <Container className="py-12 sm:py-16">
      <PageGrid className="gap-y-10">
        {/* Back button: Columns 1-12 */}
        <div className="col-span-12">
          <Link
            to="/library"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('library.title')}</span>
          </Link>
        </div>

        {/* Main Article Reading Column (~70ch): Columns 1-8 */}
        <article className="col-span-12 lg:col-span-8 space-y-10">
          {/* Active Revision Banner (if viewing history) */}
          {activeRevision && (
            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between gap-3 text-[var(--foreground)]">
              <div>
                <span className="font-semibold me-1">
                  {t('knowledgeDetail.viewingRevision')}:
                </span>
                <span>
                  {new Date(activeRevision.createdAt).toLocaleDateString()}
                </span>
                {activeRevision.changeNote && (
                  <span className="text-[var(--muted)] ms-2 italic">
                    — "{activeRevision.changeNote}"
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveRevision(null)}
                className="px-2.5 py-1 rounded bg-[var(--surface)] border border-[var(--border)] text-xs font-medium cursor-pointer"
              >
                {t('knowledgeDetail.backToCurrent')}
              </button>
            </div>
          )}

          {/* Article Header */}
          <header className="space-y-4 bg-transparent">
            <h1
              className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)] leading-tight"
              dir="auto"
            >
              {displayFields.title}
            </h1>

            <p
              className="text-base sm:text-lg text-[var(--muted)] leading-relaxed"
              dir="auto"
            >
              {displayFields.summary}
            </p>

            {/* Quiet Text Metadata Line (type · evidence · language · updated · slug) */}
            <div className="text-xs text-[var(--muted)] flex flex-wrap items-center gap-2 pt-1 border-b border-[var(--separator)] pb-4">
              <span className="capitalize">{displayFields.type.replace('_', ' ')}</span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{displayFields.evidenceLevel.replace('_', ' ')}</span>
              <span aria-hidden="true">·</span>
              <span className="uppercase">{item.language}</span>
              <span aria-hidden="true">·</span>
              <span>{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-[11px] text-[var(--muted)]">slug: {item.slug || item.id}</span>
              {item.status === 'retired' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    {t('library.retired')}
                  </span>
                </>
              )}
            </div>
          </header>

          {isAgentView ? (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] font-mono">
                      GET /api/v1/knowledge/{item.slug || item.id}.md
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)]">
                      ~{agentTokens} {t('knowledgeDetail.tokensEstimate')}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    {t('knowledgeDetail.agentViewDesc')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyAgentMd}
                    className="px-3 py-1.5 rounded-lg bg-[var(--foreground)] text-[var(--surface)] text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {copiedAgentMd ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span>{t('common.copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t('knowledgeDetail.copyAgentMd')}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAgentView(false)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] text-xs cursor-pointer"
                  >
                    {t('knowledgeDetail.exitAgentView')}
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6 rounded-xl bg-[var(--surface-secondary)]/80 border border-[var(--border)] font-mono text-xs text-[var(--foreground)] overflow-x-auto leading-relaxed select-text" dir="ltr">
                <pre className="whitespace-pre-wrap">{agentMarkdown}</pre>
              </div>
            </div>
          ) : (
            <>
          {/* Section: When to use */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
              {t('knowledgeDetail.whenToUse')}
            </h2>
            <div className="text-sm text-[var(--foreground)] leading-relaxed" dir="auto">
              {displayFields.applicability || t('knowledgeDetail.noExclusions')}
            </div>
          </section>

          {/* Section: When not to */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
              {t('knowledgeDetail.whenNotTo')}
            </h2>
            <div className="text-sm text-[var(--foreground)] leading-relaxed" dir="auto">
              {displayFields.exclusions || t('knowledgeDetail.noExclusions')}
            </div>
          </section>

          {/* Section: Requirements */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
              {t('knowledgeDetail.requirements')}
            </h2>
            {displayFields.requirements.length > 0 ? (
              <ul className="list-disc list-inside text-sm text-[var(--foreground)] space-y-1">
                {displayFields.requirements.map((req, i) => (
                  <li key={i} dir="auto">
                    {req}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                {t('knowledgeDetail.noRequirements')}
              </p>
            )}
          </section>

          {/* Section: Details (Markdown Body) */}
          <section className="space-y-2 pt-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
              {t('knowledgeDetail.details')}
            </h2>
            <div className="prose prose-stone dark:prose-invert max-w-none text-sm leading-relaxed" dir="auto">
              <MarkdownViewer content={displayFields.body} />
            </div>
          </section>

          {/* Section: Source (Excerpt Blockquote) */}
          {item.sourceExcerpt && (
            <section className="space-y-2 pt-4 border-t border-[var(--separator)]">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
                {t('knowledgeDetail.source')}
              </h2>
              <blockquote className="ps-4 border-s-2 border-[var(--foreground)] text-xs text-[var(--muted)] italic space-y-1">
                <p dir="auto">"{item.sourceExcerpt}"</p>
                {source && (
                  <cite className="not-italic block pt-1 text-[11px] font-mono">
                    <Link
                      to={`/documents/${source.id}`}
                      className="text-[var(--foreground)] hover:underline inline-flex items-center gap-1"
                    >
                      <span>{source.filename}</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </cite>
                )}
              </blockquote>
            </section>
          )}

          {/* Section: Related (Grouped by relationship type) */}
          <section className="space-y-4 pt-4 border-t border-[var(--separator)]">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
                {t('knowledgeDetail.related')}
              </h2>
              <Link
                to={`/graph?focus=${item.id}`}
                className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] inline-flex items-center gap-1"
              >
                <span>{t('knowledgeDetail.exploreMap')}</span>
                <GitFork className="w-3 h-3" />
              </Link>
            </div>

            {relationships.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">
                {t('knowledgeDetail.noRelated')}
              </p>
            ) : (
              <div className="space-y-4 text-xs">
                {/* 1. Conflicts */}
                {groupedRelationships.conflicts_with.length > 0 && (
                  <div className="space-y-1.5 p-3 rounded-lg border border-amber-300 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
                    <div className="font-semibold text-amber-900 dark:text-amber-200">
                      {t('relationships.conflictsWith')}:
                    </div>
                    {groupedRelationships.conflicts_with.map(({ rel, other }) => (
                      <div key={rel.id} className="space-y-0.5">
                        <Link
                          to={`/knowledge/${other.id}`}
                          className="font-medium hover:underline text-[var(--foreground)]"
                          dir="auto"
                        >
                          {other.title}
                        </Link>
                        {rel.notes && (
                          <p className="text-[11px] text-[var(--muted)]">{rel.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Alternatives */}
                {groupedRelationships.alternative_to.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="font-semibold text-[var(--foreground)]">
                      {t('relationships.alternativeTo')}:
                    </div>
                    {groupedRelationships.alternative_to.map(({ rel, other }) => (
                      <div key={rel.id} className="ps-2 border-s border-[var(--border)]">
                        <Link
                          to={`/knowledge/${other.id}`}
                          className="hover:underline text-[var(--foreground)]"
                          dir="auto"
                        >
                          {other.title}
                        </Link>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Supersedes / Superseded */}
                {groupedRelationships.supersedes.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="font-semibold text-[var(--foreground)]">
                      {t('relationships.supersededBy')}:
                    </div>
                    {groupedRelationships.supersedes.map(({ rel, other }) => (
                      <div key={rel.id} className="ps-2 border-s border-[var(--border)]">
                        <Link
                          to={`/knowledge/${other.id}`}
                          className="hover:underline text-[var(--foreground)]"
                          dir="auto"
                        >
                          {other.title}
                        </Link>
                      </div>
                    ))}
                  </div>
                )}

                {/* 4. Prerequisites */}
                {groupedRelationships.prerequisite_for.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="font-semibold text-[var(--foreground)]">
                      {t('relationships.prerequisiteFor')}:
                    </div>
                    {groupedRelationships.prerequisite_for.map(({ rel, other }) => (
                      <div key={rel.id} className="ps-2 border-s border-[var(--border)]">
                        <Link
                          to={`/knowledge/${other.id}`}
                          className="hover:underline text-[var(--foreground)]"
                          dir="auto"
                        >
                          {other.title}
                        </Link>
                      </div>
                    ))}
                  </div>
                )}

                {/* 5. Derived from */}
                {groupedRelationships.derived_from.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="font-semibold text-[var(--foreground)]">
                      {t('relationships.spawned')}:
                    </div>
                    {groupedRelationships.derived_from.map(({ rel, other }) => (
                      <div key={rel.id} className="ps-2 border-s border-[var(--border)]">
                        <Link
                          to={`/knowledge/${other.id}`}
                          className="hover:underline text-[var(--foreground)]"
                          dir="auto"
                        >
                          {other.title}
                        </Link>
                      </div>
                    ))}
                  </div>
                )}

                {/* 6. Supports */}
                {groupedRelationships.supports.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="font-semibold text-[var(--foreground)]">
                      {t('relationships.supportedBy')}:
                    </div>
                    {groupedRelationships.supports.map(({ rel, other }) => (
                      <div key={rel.id} className="ps-2 border-s border-[var(--border)]">
                        <Link
                          to={`/knowledge/${other.id}`}
                          className="hover:underline text-[var(--foreground)]"
                          dir="auto"
                        >
                          {other.title}
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Section: Reported Outcomes (Read-Only) */}
          <section className="space-y-3 pt-4 border-t border-[var(--separator)]">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
              {t('knowledgeDetail.outcomesSection')}
            </h2>
            {outcomes.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">
                {t('knowledgeDetail.noOutcomes')}
              </p>
            ) : (
              <div className="space-y-2.5">
                {outcomes.map((out) => (
                  <div
                    key={out.id}
                    className="p-3 rounded-lg bg-[var(--surface-secondary)]/50 text-xs space-y-1"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium text-[var(--foreground)]" dir="auto">
                        {out.task}
                      </span>
                      <span className="text-[11px] font-mono text-[var(--muted)]">
                        {out.result} · {new Date(out.recordedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {out.reportedBy && (
                      <div className="text-[11px] text-[var(--muted)] font-mono">
                        {t('knowledgeDetail.reportedByAgent')}: {out.reportedBy}
                      </div>
                    )}
                    {out.notes && (
                      <p className="text-[11px] text-[var(--muted)] leading-relaxed" dir="auto">
                        {out.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section: Collapsed History (<details>) */}
          <section className="pt-4 border-t border-[var(--separator)]">
            <details className="group">
              <summary className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)] cursor-pointer select-none hover:text-[var(--foreground)] transition-colors flex items-center gap-2 list-none">
                <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
                <span>{t('knowledgeDetail.history')}</span>
                <span className="text-xs font-normal normal-case font-mono">
                  ({revisions.length})
                </span>
              </summary>

              <div className="mt-4 space-y-2 divide-y divide-[var(--separator)] text-xs">
                {revisions.map((rev, idx) => (
                  <div key={rev.id} className="pt-2.5 first:pt-0 space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium font-mono text-[11px]">
                        rev-{revisions.length - idx} · {new Date(rev.createdAt).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveRevision(rev)}
                        className="text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] underline cursor-pointer"
                      >
                        {t('knowledgeDetail.viewRevision')}
                      </button>
                    </div>
                    {rev.changeNote && (
                      <p className="text-[11px] text-[var(--muted)] italic" dir="auto">
                        "{rev.changeNote}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </details>
          </section>
          </>
        )}
        </article>

        {/* Right Panel on Desktop / Stacks Below on Mobile: Columns 9-12 */}
        <aside className="col-span-12 lg:col-span-4 space-y-6">
          <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              {t('knowledgeDetail.useWithAI')}
            </h2>

            <div className="space-y-2 text-xs">
              {/* Agent View Toggle */}
              <button
                type="button"
                onClick={() => setIsAgentView((prev) => !prev)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer border ${
                  isAgentView
                    ? 'bg-[var(--foreground)] text-[var(--surface)] border-[var(--foreground)]'
                    : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface-secondary)]/80 text-[var(--foreground)] border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bot className="w-3.5 h-3.5" />
                  <span>{isAgentView ? t('knowledgeDetail.humanView') : t('knowledgeDetail.agentView')}</span>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  isAgentView
                    ? 'bg-[var(--surface)]/20 text-[var(--surface)]'
                    : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)]'
                }`}>
                  ~{agentTokens} {t('knowledgeDetail.tokensEstimate')}
                </span>
              </button>

              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--surface-secondary)] hover:bg-[var(--surface-secondary)]/80 text-[var(--foreground)] font-medium transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[var(--muted)]" />
                  <span>{t('knowledgeDetail.copyMarkdown')}</span>
                </div>
                {copiedMd ? (
                  <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[var(--muted)]" />
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyApiUrl}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--surface-secondary)] hover:bg-[var(--surface-secondary)]/80 text-[var(--foreground)] font-medium transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-[var(--muted)]" />
                  <span>{t('knowledgeDetail.copyApiUrl')}</span>
                </div>
                {copiedApi ? (
                  <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[var(--muted)]" />
                )}
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenRawMd}
                  className="px-2.5 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--surface-secondary)] text-[var(--muted)] hover:text-[var(--foreground)] text-[11px] font-mono text-center cursor-pointer transition-colors"
                >
                  {t('knowledgeDetail.openRawMd')}
                </button>
                <button
                  type="button"
                  onClick={handleOpenRawJson}
                  className="px-2.5 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--surface-secondary)] text-[var(--muted)] hover:text-[var(--foreground)] text-[11px] font-mono text-center cursor-pointer transition-colors"
                >
                  {t('knowledgeDetail.openRawJson')}
                </button>
              </div>
            </div>

            {/* Explore Graph Deep Link */}
            <div className="pt-2 border-t border-[var(--separator)]">
              <Link
                to={`/graph?focus=${item.id}`}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <GitFork className="w-3.5 h-3.5" />
                <span>{t('knowledgeDetail.exploreMap')}</span>
              </Link>
            </div>
          </div>
        </aside>
      </PageGrid>
    </Container>

      {/* Raw Markdown / JSON Modal (Transient Surface) */}
      {isRawModalRendered && rawModalContent && (
        <div
          role="dialog"
          aria-modal="true"
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs motion-transient-overlay ${
            isRawModalClosing ? 'closing' : ''
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) requestCloseRawModal();
          }}
        >
          <div
            className={`bg-[var(--surface)] border border-[var(--border)] rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl motion-transient-card ${
              isRawModalClosing ? 'closing' : 'entering'
            }`}
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h3 className="text-sm font-mono font-medium truncate">
                {rawModalContent.title}
              </h3>
              <button
                type="button"
                onClick={requestCloseRawModal}
                className="p-1 rounded text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="p-4 overflow-auto flex-1 font-mono text-xs bg-[var(--surface-secondary)]/50 text-[var(--foreground)] whitespace-pre-wrap leading-relaxed select-all">
              {rawModalContent.content}
            </pre>
            <div className="p-3 border-t border-[var(--border)] flex justify-end">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(rawModalContent.content);
                  requestCloseRawModal();
                }}
                className="px-3 py-1.5 rounded bg-[var(--foreground)] text-[var(--surface)] text-xs font-medium cursor-pointer"
              >
                {t('common.copy')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
