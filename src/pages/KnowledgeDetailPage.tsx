import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  GitFork,
  FileText,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import {
  Collection,
  KnowledgeItem,
  KnowledgeRelationship,
  RelationshipType,
  SourceDocument,
  KnowledgeOutcome,
} from '../types';
import { Badge } from '../components/common/Badge';
import { MarkdownViewer } from '../components/common/MarkdownViewer';

export const KnowledgeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { repository, version } = useRepository();
  const { t, locale } = useLocale();
  const navigate = useNavigate();

  const [item, setItem] = useState<KnowledgeItem | null>(null);
  const [source, setSource] = useState<SourceDocument | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [allKnowledge, setAllKnowledge] = useState<KnowledgeItem[]>([]);
  const [relationships, setRelationships] = useState<KnowledgeRelationship[]>([]);
  const [outcomes, setOutcomes] = useState<KnowledgeOutcome[]>([]);
  const [loading, setLoading] = useState(true);

  // Copy feedback
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const k = await repository.getKnowledge(id);
        if (!active) return;
        if (!k) {
          setItem(null);
          return;
        }

        setItem(k);

        const [srcDoc, cols, allK, allRels, allOutcomes] = await Promise.all([
          repository.getSource(k.sourceId),
          repository.listCollections(),
          repository.listKnowledge(),
          repository.listRelationships(),
          repository.listOutcomes(id),
        ]);

        if (!active) return;
        setSource(srcDoc || null);
        setCollection(cols.find((c) => c.id === k.collectionId) || null);
        setAllKnowledge(allK);
        setOutcomes(allOutcomes);

        const itemRels = allRels.filter(
          (r) => r.sourceId === id || r.sourceKnowledgeId === id
        );
        setRelationships(itemRels);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [id, repository, version]);

  const handleCopyAgentPrompt = () => {
    if (!item) return;
    const promptXml = `<agent_skill id="${item.id}" type="${item.type}" evidence="${item.evidenceLevel}">
<title>${item.title}</title>
<summary>${item.summary}</summary>
<applicability>${item.applicability || 'General'}</applicability>
<exclusions>${item.exclusions || 'None'}</exclusions>
<requirements>${item.requirements.join(', ')}</requirements>
<procedure>
${item.body || item.summary}
</procedure>
<citation_grounding>
${item.sourceExcerpt || ''}
</citation_grounding>
</agent_skill>`;

    navigator.clipboard.writeText(promptXml);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleCopyMarkdown = () => {
    if (!item) return;
    const md = `# ${item.title}

> **Summary:** ${item.summary}
> **Type:** ${item.type} | **Evidence:** ${item.evidenceLevel} | **Review:** ${item.reviewStatus}

## Applicability
${item.applicability || 'General'}

## Exclusions
${item.exclusions || 'None'}

## Requirements
${item.requirements.length > 0 ? item.requirements.map((r) => `- ${r}`).join('\n') : 'None'}

## Methodology
${item.body || item.summary}

## Citation Grounding
> "${item.sourceExcerpt || ''}"
— Source: ${source?.filename || item.sourceId}
`;
    navigator.clipboard.writeText(md);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  const getRelationshipTarget = (rel: KnowledgeRelationship) => {
    const targetId = rel.sourceKnowledgeId === id ? rel.targetKnowledgeId : rel.sourceKnowledgeId;
    return allKnowledge.find((k) => k.id === targetId);
  };

  const getReciprocalLabel = (type: RelationshipType): string => {
    switch (type) {
      case 'supports':
        return t('relationships.supportedBy');
      case 'conflicts_with':
        return t('relationships.conflictsWith');
      case 'prerequisite_for':
        return t('relationships.requires');
      case 'derived_from':
        return t('relationships.spawned');
      case 'supersedes':
        return t('relationships.supersededBy');
      case 'relates_to':
        return t('relationships.relatesTo');
      case 'requires':
        return t('relationships.prerequisiteFor');
      case 'complements':
        return t('relationships.complements');
      case 'alternative_to':
        return t('relationships.alternativeTo');
      default:
        return String(type);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-[var(--muted)]">
        <Clock className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--accent)]" />
        <span>{t('common.loading')}</span>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="py-24 text-center text-xs text-[var(--muted)] max-w-md mx-auto space-y-3">
        <AlertCircle className="w-8 h-8 mx-auto text-[var(--muted)]" />
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-1">
            {t('knowledgeDetail.notFound')}
          </h2>
          <p className="text-[var(--muted)]">This knowledge node does not exist or has been removed.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/library')}
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
            onClick={() => navigate('/library')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            <span>{t('common.backToLibrary')}</span>
          </button>

          {/* Read-Only Export Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyAgentPrompt}
              className="ui-button ui-button-secondary text-xs"
              title="Copy Context Prompt"
            >
              {copiedPrompt ? (
                <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[var(--muted)]" />
              )}
              <span>{copiedPrompt ? t('common.copied') : 'Copy Prompt'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="ui-button ui-button-secondary text-xs"
              title="Copy Markdown"
            >
              {copiedMarkdown ? (
                <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[var(--muted)]" />
              )}
              <span>{copiedMarkdown ? t('common.copied') : 'Markdown'}</span>
            </button>
          </div>
        </div>

        {/* Title & Metadata Summary */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--muted)]">
            {collection && (
              <span className="font-medium text-[var(--foreground)]">
                {locale === 'fa' ? collection.nameFa : collection.name}
              </span>
            )}
            {collection && <span className="text-[var(--separator)]">•</span>}
            <span className="font-mono text-[11px]">ID: {item.id}</span>
            {item.updatedAt && (
              <>
                <span className="text-[var(--separator)]">•</span>
                <span className="text-[11px]">Updated {new Date(item.updatedAt).toLocaleDateString()}</span>
              </>
            )}
          </div>
          <h1
            dir="auto"
            className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-[var(--foreground)] leading-snug"
          >
            {item.title}
          </h1>
        </div>
      </div>

      {/* Source Changed Informational Notice (Read-Only) */}
      {item.sourceHasChanged && (
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--foreground)] flex items-start gap-2.5 text-xs">
          <AlertTriangle className="w-4 h-4 text-[var(--muted)] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold me-1">Source Content Updated:</span>
            <span className="text-[var(--muted)]">{t('knowledgeDetail.sourceChangedWarning')}</span>
          </div>
        </div>
      )}

      {/* Composed Read Mode: 2-column layout (Main 67% / Supporting 33%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Column (8 cols on lg ~ 67%) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="ui-card p-6 sm:p-8 space-y-8">
            {/* Summary Section */}
            <section className="space-y-2">
              <h2 className="text-[14px] sm:text-[15px] font-semibold text-[var(--foreground)] tracking-tight">
                {t('knowledgeDetail.fieldSummary')}
              </h2>
              <p dir="auto" className="text-[13px] sm:text-[14px] text-[var(--foreground)] leading-relaxed">
                {item.summary}
              </p>
            </section>

            {/* Main Methodology & Technical Body */}
            <section className="space-y-3 pt-6 border-t border-[var(--separator)]">
              <h2 className="text-[14px] sm:text-[15px] font-semibold text-[var(--foreground)] tracking-tight">
                {t('knowledgeDetail.fieldBody')}
              </h2>
              <div className="text-[13px] sm:text-[14px] text-[var(--foreground)] leading-relaxed">
                {item.body ? (
                  <MarkdownViewer content={item.body} />
                ) : (
                  <p className="italic text-[var(--muted)]">{item.summary}</p>
                )}
              </div>
            </section>

            {/* Operational Scope (Applicability & Exclusions) */}
            <section className="pt-6 border-t border-[var(--separator)] space-y-4">
              <h2 className="text-[14px] sm:text-[15px] font-semibold text-[var(--foreground)] tracking-tight">
                Operational Scope
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]/50 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-[var(--foreground)] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                    <span>{t('knowledgeDetail.fieldApplicability')}</span>
                  </div>
                  <p dir="auto" className="text-[13px] text-[var(--foreground)] leading-relaxed">
                    {item.applicability || 'General application'}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]/50 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-[var(--muted)] font-medium">
                    <AlertCircle className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                    <span>{t('knowledgeDetail.fieldExclusions')}</span>
                  </div>
                  <p dir="auto" className="text-[13px] text-[var(--muted)] leading-relaxed">
                    {item.exclusions || 'None specified'}
                  </p>
                </div>
              </div>
            </section>

            {/* Prerequisites & Requirements */}
            {item.requirements && item.requirements.length > 0 && (
              <section className="pt-6 border-t border-[var(--separator)] space-y-3">
                <h2 className="text-[14px] sm:text-[15px] font-semibold text-[var(--foreground)] tracking-tight">
                  {t('knowledgeDetail.fieldRequirements')} ({item.requirements.length})
                </h2>
                <div className="flex flex-wrap gap-2">
                  {item.requirements.map((req, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-md text-xs bg-[var(--surface-secondary)] text-[var(--foreground)] border border-[var(--border)] font-mono"
                    >
                      {req}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Related Knowledge (Relationships) - Read Only */}
            <section className="pt-6 border-t border-[var(--separator)] space-y-4">
              <h2 className="text-[14px] sm:text-[15px] font-semibold text-[var(--foreground)] tracking-tight flex items-center gap-2">
                <GitFork className="w-4 h-4 text-[var(--muted)]" />
                <span>{t('knowledgeDetail.relationshipsSection')}</span>
              </h2>

              {relationships.length === 0 ? (
                <p className="text-xs text-[var(--muted)] italic">
                  {t('knowledgeDetail.noRelationships')}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {relationships.map((rel) => {
                    const target = getRelationshipTarget(rel);
                    if (!target) return null;
                    const isOrigin = rel.sourceKnowledgeId === id;
                    const relTypeVal = (rel.relationshipType || rel.type || 'supports') as RelationshipType;
                    const relLabel = isOrigin
                      ? t(`relationTypes.${relTypeVal}`)
                      : getReciprocalLabel(relTypeVal);

                    return (
                      <div
                        key={rel.id}
                        onClick={() => navigate(`/knowledge/${target.id}`)}
                        className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]/50 hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer flex items-center justify-between gap-2 group"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-medium text-[var(--foreground)] bg-[var(--surface-tertiary)] px-1.5 py-0.5 rounded border border-[var(--border)] me-1.5 inline-block">
                            {relLabel}
                          </span>
                          <span className="text-xs text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors font-medium truncate block sm:inline">
                            {target.title}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Practical Application Outcomes - Read Only */}
            <section className="pt-6 border-t border-[var(--separator)] space-y-4">
              <h2 className="text-[14px] sm:text-[15px] font-semibold text-[var(--foreground)] tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
                <span>{t('knowledgeDetail.outcomesSection')}</span>
              </h2>

              {outcomes.length === 0 ? (
                <p className="text-xs text-[var(--muted)] italic">
                  {t('knowledgeDetail.noOutcomes')}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {outcomes.map((out) => (
                    <div
                      key={out.id}
                      className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]/50 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge type="outcome" value={out.result} size="sm" />
                          <span className="text-xs font-medium text-[var(--foreground)]">
                            {out.taskContext}
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--muted)] font-mono shrink-0">
                          {out.recordedAt ? new Date(out.recordedAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                      {out.metrics && (
                        <div className="font-mono text-[11px] text-[var(--muted)] bg-[var(--surface-tertiary)] px-2 py-1 rounded border border-[var(--border)]">
                          <span className="text-[var(--foreground)] font-medium me-1.5">Metrics:</span>
                          <span>{out.metrics}</span>
                        </div>
                      )}
                      {out.notes && (
                        <p className="text-[12px] text-[var(--muted)] leading-relaxed">
                          {out.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Supporting Metadata & Evidence Column (4 cols on lg ~ 33%) */}
        <div className="lg:col-span-4 sticky top-6 space-y-4">
          <div className="ui-panel p-5 space-y-6 shadow-xs">
            {/* Classification & Status */}
            <div className="space-y-3 pb-5 border-b border-[var(--separator)]">
              <div className="text-[12px] font-medium text-[var(--muted)]">
                Classification & Provenance
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge type="knowledgeType" value={item.type} />
                <Badge type="evidence" value={item.evidenceLevel} />
                <Badge type="review" value={item.reviewStatus} />
              </div>
            </div>

            {/* Grounding & Source Document */}
            <div className="space-y-3 pb-5 border-b border-[var(--separator)]">
              <div className="flex items-center justify-between text-[12px] font-medium text-[var(--muted)]">
                <span>Source Evidence</span>
                {source && (
                  <button
                    type="button"
                    onClick={() => navigate(`/documents/${source.id}`)}
                    className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline cursor-pointer text-xs"
                  >
                    <span>Open Document</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              {source ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] text-xs">
                    <FileText className="w-4 h-4 text-[var(--muted)] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-[var(--foreground)] truncate">
                        {source.filename}
                      </div>
                      <div className="text-[11px] text-[var(--muted)] font-mono truncate">
                        Rev: {item.sourceRevisionId ? item.sourceRevisionId.slice(0, 10) : (source.revisions?.[0]?.revisionId?.slice(0, 10) || 'initial')}
                      </div>
                    </div>
                  </div>

                  {/* Quoted Excerpt */}
                  {item.sourceExcerpt && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] text-[var(--muted)] font-medium">
                        Grounding Citation
                      </div>
                      <blockquote
                        dir="auto"
                        className="p-3 rounded-lg bg-[var(--surface-secondary)] border-s-2 border-s-[var(--accent)] border border-[var(--border)] text-xs text-[var(--foreground)] leading-relaxed font-sans italic"
                      >
                        "{item.sourceExcerpt}"
                      </blockquote>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[var(--muted)] italic">No source document attached.</p>
              )}
            </div>

            {/* Workspace Metadata */}
            <div className="space-y-2.5 text-xs">
              <div className="text-[12px] font-medium text-[var(--muted)]">
                Workspace Properties
              </div>
              <div className="space-y-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Collection</span>
                  <span className="font-medium text-[var(--foreground)]">
                    {collection ? (locale === 'fa' ? collection.nameFa : collection.name) : 'None'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Created</span>
                  <span className="font-mono text-[11px] text-[var(--foreground)]">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Source Sync</span>
                  <span className="font-medium text-[var(--foreground)]">
                    {item.sourceHasChanged ? 'Pending Review' : 'Synchronized'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
