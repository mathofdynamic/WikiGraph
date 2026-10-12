import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  BookOpen,
  Bot,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import { Collection, KnowledgeItem, SourceDocument, SourceRevision } from '../types';
import { MarkdownViewer } from '../components/common/MarkdownViewer';
import { renderSourceMarkdown, estimateTokens } from '../shared/renderers';

export const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { repository, version } = useRepository();
  const { t, locale } = useLocale();

  const [document, setDocument] = useState<SourceDocument | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [relatedKnowledge, setRelatedKnowledge] = useState<KnowledgeItem[]>([]);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isAgentView, setIsAgentView] = useState(false);
  const [copiedAgentMd, setCopiedAgentMd] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;

    const loadDoc = async () => {
      try {
        setLoading(true);
        const doc = await repository.getSource(id);
        if (!active) return;
        if (!doc) {
          setDocument(null);
          return;
        }

        setDocument(doc);
        if (doc.revisions.length > 0) {
          setSelectedRevisionId(doc.revisions[doc.revisions.length - 1].revisionId);
        }

        const [cols, allK] = await Promise.all([
          repository.listCollections(),
          repository.listKnowledge(),
        ]);
        if (!active) return;

        setCollection(cols.find((c) => c.id === doc.collectionId) || null);
        setRelatedKnowledge(allK.filter((k) => k.sourceId === id));
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDoc();
    return () => {
      active = false;
    };
  }, [id, repository, version]);

  const activeRevision: SourceRevision | undefined = useMemo(() => {
    if (!document) return undefined;
    return (
      document.revisions.find((r) => r.revisionId === selectedRevisionId) ||
      document.revisions[document.revisions.length - 1]
    );
  }, [document, selectedRevisionId]);

  const activeContent: string = activeRevision?.content || document?.originalContent || '';

  // Generate exact agent markdown using shared renderer
  const agentMarkdown = useMemo(() => {
    if (!document) return '';
    return renderSourceMarkdown(document, relatedKnowledge);
  }, [document, relatedKnowledge]);

  const agentTokens = useMemo(() => estimateTokens(agentMarkdown), [agentMarkdown]);

  // Highlight all extracted excerpts in the text if present
  const contentWithHighlights = useMemo(() => {
    if (!activeContent) return '';
    return activeContent;
  }, [activeContent]);

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(activeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyAgentMd = async () => {
    try {
      await navigator.clipboard.writeText(agentMarkdown);
      setCopiedAgentMd(true);
      setTimeout(() => setCopiedAgentMd(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[72ch] mx-auto px-4 py-20 text-center text-sm text-[var(--muted)]">
        {t('common.loading')}
      </div>
    );
  }

  if (!document) {
    return (
      <div className="max-w-[72ch] mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">
          {t('common.emptyTitle')}
        </h1>
        <Link
          to="/library"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('library.title')}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10">
      {/* Navigation breadcrumb */}
      <div>
        <Link
          to="/library"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('library.title')}</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-14">
        {/* Main Document Reading Column (~72ch) */}
        <article className="lg:col-span-8 max-w-[72ch] space-y-8">
          <header className="space-y-3 pb-6 border-b border-[var(--separator)]">
            <h1
              className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)] leading-tight"
              dir="auto"
            >
              {document.title}
            </h1>

            {/* Quiet Text Metadata Line (kind · language · filename · updated · slug) */}
            <div className="text-xs text-[var(--muted)] flex flex-wrap items-center gap-2">
              <span className="capitalize">{(document.kind || 'research_report').replace('_', ' ')}</span>
              <span aria-hidden="true">·</span>
              <span className="uppercase">{document.language}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{document.filename}</span>
              <span aria-hidden="true">·</span>
              <span>{new Date(document.updatedAt || document.createdAt).toLocaleDateString()}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-[11px] text-[var(--muted)]">slug: {document.slug || document.id}</span>
            </div>

            {/* Document Tags as Quiet Inline Text */}
            {document.tags && document.tags.length > 0 && (
              <div className="text-[11px] text-[var(--muted)] font-mono">
                Tags: {document.tags.join(', ')}
              </div>
            )}
          </header>

          {isAgentView ? (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] font-mono">
                      GET /api/v1/sources/{document.slug || document.id}.md
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
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
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
            <div className="prose prose-stone dark:prose-invert max-w-none text-sm leading-relaxed" dir="auto">
              <MarkdownViewer content={contentWithHighlights} />
            </div>
          )}
        </article>

        {/* Alongside Column: Extracted Knowledge Entries */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-4 sticky top-20">
            {/* Agent View Toggle in Aside */}
            <button
              type="button"
              onClick={() => setIsAgentView((prev) => !prev)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer border text-xs ${
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

            <div className="flex items-center justify-between pt-2 border-t border-[var(--separator)]">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                {t('knowledgeDetail.title')} ({relatedKnowledge.length})
              </h2>
              <button
                type="button"
                onClick={handleCopyContent}
                className="text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] inline-flex items-center gap-1 cursor-pointer"
                title="Copy full source markdown"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? t('common.copied') : t('common.copy')}</span>
              </button>
            </div>

            {relatedKnowledge.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">
                No knowledge units extracted yet from this document.
              </p>
            ) : (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pe-1 divide-y divide-[var(--separator)]">
                {relatedKnowledge.map((k) => (
                  <div
                    key={k.id}
                    onMouseEnter={() => setActiveHighlightId(k.id)}
                    onMouseLeave={() => setActiveHighlightId(null)}
                    className="pt-3 first:pt-0 space-y-1.5"
                  >
                    <Link
                      to={`/knowledge/${k.id}`}
                      className="text-xs font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors block leading-snug"
                      dir="auto"
                    >
                      {k.title}
                    </Link>

                    {/* Quiet Metadata Line */}
                    <div className="text-[10px] text-[var(--muted)] flex items-center gap-1.5 font-mono">
                      <span>{k.type}</span>
                      <span aria-hidden="true">·</span>
                      <span>{k.evidenceLevel}</span>
                    </div>

                    {k.sourceExcerpt && (
                      <blockquote className="text-[11px] text-[var(--muted)] italic ps-2 border-s-2 border-[var(--border)] leading-relaxed line-clamp-3">
                        "{k.sourceExcerpt}"
                      </blockquote>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
