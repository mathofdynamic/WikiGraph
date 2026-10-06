import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  ArrowLeft,
  ExternalLink,
  AlertCircle,
  Copy,
  Check,
  History,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import { Collection, KnowledgeItem, SourceDocument, SourceRevision } from '../types';
import { MarkdownViewer } from '../components/common/MarkdownViewer';
import { Badge } from '../components/common/Badge';

export const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { repository, version } = useRepository();
  const { t, locale } = useLocale();
  const navigate = useNavigate();

  const [document, setDocument] = useState<SourceDocument | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [relatedKnowledge, setRelatedKnowledge] = useState<KnowledgeItem[]>([]);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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

  const activeRevision: SourceRevision | undefined = React.useMemo(() => {
    if (!document) return undefined;
    return (
      document.revisions.find((r) => r.revisionId === selectedRevisionId) ||
      document.revisions[document.revisions.length - 1]
    );
  }, [document, selectedRevisionId]);

  const activeContent: string = activeRevision?.content || document?.originalContent || '';

  const handleCopyContent = () => {
    navigator.clipboard.writeText(activeContent || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-[var(--muted)]">
        <Clock className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--accent)]" />
        <span>{t('common.loading')}</span>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="py-24 text-center text-xs text-[var(--muted)] max-w-md mx-auto space-y-3">
        <AlertCircle className="w-8 h-8 mx-auto text-[var(--muted)]" />
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-1">
            {t('sourceDetail.notFound')}
          </h2>
          <p className="text-[var(--muted)]">This source document could not be located in workspace.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/library?tab=sources')}
          className="ui-button ui-button-secondary text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
          <span>{t('common.backToLibrary')}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Contextual Actions Bar */}
      <div className="space-y-3 pb-4 border-b border-[var(--separator)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/library?tab=sources')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            <span>{t('common.backToLibrary')}</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyContent}
              className="ui-button ui-button-secondary text-xs"
              title={t('common.copy')}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[var(--muted)]" />
              )}
              <span>{copied ? t('common.copied') : t('common.copy')}</span>
            </button>
          </div>
        </div>

        {/* Title & Metadata Line */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--muted)]">
            <span className="font-mono text-[11px] text-[var(--foreground)] bg-[var(--surface-secondary)] px-2 py-0.5 rounded border border-[var(--border)]">
              {document.filename}
            </span>
            {collection && (
              <>
                <span className="text-[var(--separator)]">•</span>
                <span className="font-medium text-[var(--foreground)]">
                  {locale === 'fa' ? collection.nameFa : collection.name}
                </span>
              </>
            )}
            <span className="text-[var(--separator)]">•</span>
            <span className="text-[11px] font-mono">
              {((document.rawSize || 0) / 1024).toFixed(1)} KiB
            </span>
            <span className="text-[var(--separator)]">•</span>
            <span className="text-[11px]">
              {document.revisions.length} revision{document.revisions.length === 1 ? '' : 's'}
            </span>
          </div>

          <h1
            dir="auto"
            className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-[var(--foreground)] leading-snug"
          >
            {document.title}
          </h1>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Column (8 cols on lg ~ 67%) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="ui-card p-6 sm:p-8 space-y-8">
            {/* 1. Document Overview & Active Content */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--separator)]">
                <div className="flex items-center gap-2">
                  <h2 className="text-[14px] sm:text-[15px] font-semibold text-[var(--foreground)] tracking-tight">
                    Document Content
                  </h2>
                  {activeRevision && (
                    <span className="text-[11px] font-mono bg-[var(--surface-secondary)] px-2 py-0.5 rounded border border-[var(--border)] text-[var(--muted)]">
                      Rev: {activeRevision.revisionId}
                    </span>
                  )}
                </div>
                {activeRevision && (
                  <span className="text-xs text-[var(--muted)] truncate max-w-[280px]">
                    {activeRevision.changeSummary || activeRevision.summary || 'Initial snapshot'}
                  </span>
                )}
              </div>

              {/* Rendered Markdown Document View */}
              <div className="text-[13px] sm:text-[14px] text-[var(--foreground)] leading-relaxed select-text">
                <MarkdownViewer content={activeContent} />
              </div>
            </section>

            {/* 2. Extracted Grounded Knowledge Units */}
            <section className="space-y-4 pt-6 border-t border-[var(--separator)]">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] sm:text-[15px] font-semibold text-[var(--foreground)] tracking-tight">
                  Extracted Knowledge Units ({relatedKnowledge.length})
                </h2>
              </div>

              {relatedKnowledge.length === 0 ? (
                <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]/30 text-xs text-[var(--muted)] italic">
                  No knowledge items have been derived from this document yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {relatedKnowledge.map((k) => (
                    <div
                      key={k.id}
                      onClick={() => navigate(`/knowledge/${k.id}`)}
                      className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]/40 hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer space-y-2 group"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge type="knowledgeType" value={k.type} size="sm" />
                        <Badge type="evidence" value={k.evidenceLevel} size="sm" />
                      </div>
                      <h3
                        dir="auto"
                        className="text-xs font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors line-clamp-2"
                      >
                        {k.title}
                      </h3>
                      <p
                        dir="auto"
                        className="text-[11px] text-[var(--muted)] line-clamp-2 leading-relaxed"
                      >
                        {k.summary}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 3. Revision Timeline History (Read-Only Viewer) */}
            <section className="space-y-4 pt-6 border-t border-[var(--separator)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[var(--muted)]" />
                  <h2 className="text-[14px] sm:text-[15px] font-semibold text-[var(--foreground)] tracking-tight">
                    Revision History ({document.revisions.length})
                  </h2>
                </div>
                <span className="text-xs text-[var(--muted)]">
                  Select a snapshot to inspect past text
                </span>
              </div>

              <div className="space-y-2">
                {document.revisions.map((rev) => {
                  const isSelected = rev.revisionId === selectedRevisionId;
                  return (
                    <div
                      key={rev.revisionId}
                      onClick={() => setSelectedRevisionId(rev.revisionId)}
                      className={`p-3.5 rounded-xl border transition-colors cursor-pointer text-xs space-y-1.5 ${
                        isSelected
                          ? 'bg-[var(--surface-secondary)] border-[var(--accent)] shadow-xs'
                          : 'bg-[var(--surface-secondary)]/30 border-[var(--border)] hover:bg-[var(--surface-secondary)]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-semibold text-[var(--foreground)]">
                            {rev.revisionId}
                          </span>
                          <span className="text-[var(--separator)]">•</span>
                          <span className="text-[var(--muted)] truncate max-w-sm">
                            {rev.changeSummary || rev.summary || 'Initial revision baseline.'}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-[var(--muted)]">
                          {((rev.content?.length || 0) / 1024).toFixed(1)} KiB
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[var(--muted)] pt-0.5">
                        <span className="font-mono">
                          {new Date(rev.timestamp).toLocaleString()}
                        </span>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 text-[var(--accent)] font-medium">
                            <Check className="w-3 h-3" />
                            <span>Active View</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>

        {/* Supporting Inspector Sidebar (4 cols on lg ~ 33%) */}
        <div className="lg:col-span-4 sticky top-6 space-y-4">
          <div className="ui-panel p-5 space-y-6 shadow-xs">
            {/* Document Properties */}
            <div className="space-y-3 pb-5 border-b border-[var(--separator)]">
              <div className="text-[12px] font-medium text-[var(--muted)]">
                Document Properties
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Filename</span>
                  <span className="font-mono text-[11px] text-[var(--foreground)] truncate max-w-[170px]" title={document.filename}>
                    {document.filename}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">{t('knowledgeDetail.fieldCollection')}</span>
                  <span className="font-medium text-[var(--foreground)]">
                    {collection ? (locale === 'fa' ? collection.nameFa : collection.name) : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">{t('sourceDetail.language')}</span>
                  <span className="font-medium text-[var(--foreground)]">
                    {document.language === 'fa' ? 'فارسی' : 'English'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">{t('sourceDetail.size')}</span>
                  <span className="font-mono text-[11px] text-[var(--foreground)]">
                    {((document.rawSize || 0) / 1024).toFixed(1)} KiB
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Document ID</span>
                  <span className="font-mono text-[11px] text-[var(--muted)] truncate max-w-[170px]" title={document.id}>
                    {document.id}
                  </span>
                </div>
              </div>
            </div>

            {/* Ingestion & Provenance */}
            <div className="space-y-3 pb-5 border-b border-[var(--separator)]">
              <div className="text-[12px] font-medium text-[var(--muted)]">
                Ingestion & Provenance
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">{t('sourceDetail.importedAt')}</span>
                  <span className="font-mono text-[11px] text-[var(--foreground)]">
                    {new Date(document.importedAt || document.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Last Updated</span>
                  <span className="font-mono text-[11px] text-[var(--foreground)]">
                    {document.updatedAt ? new Date(document.updatedAt).toLocaleDateString() : '-'}
                  </span>
                </div>
                {(document.sourceUrl || document.url) && (
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--muted)]">{t('sourceDetail.originalUrl')}</span>
                    <a
                      href={document.sourceUrl || document.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline font-mono text-[11px]"
                    >
                      <span>External Source</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Active Revision Snapshot */}
            <div className="space-y-2.5 text-xs">
              <div className="text-[12px] font-medium text-[var(--muted)]">
                Selected Snapshot
              </div>
              {activeRevision ? (
                <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-[var(--foreground)] font-semibold">
                      {activeRevision.revisionId}
                    </span>
                    <span className="text-[10px] text-[var(--muted)] font-mono">
                      {new Date(activeRevision.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--muted)] leading-relaxed">
                    {activeRevision.changeSummary || activeRevision.summary || 'Initial revision baseline.'}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[var(--muted)] italic">No active revision loaded.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
