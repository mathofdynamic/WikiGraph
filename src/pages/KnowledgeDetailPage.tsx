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
  History,
  RotateCcw,
  Archive,
  Eye,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import {
  Collection,
  KnowledgeItem,
  KnowledgeRelationship,
  KnowledgeRevision,
  RelationshipType,
  SourceDocument,
  KnowledgeOutcome,
} from '../types';
import { Badge } from '../components/common/Badge';
import { MarkdownViewer } from '../components/common/MarkdownViewer';
import { ConfirmModal } from '../components/common/ConfirmModal';

export const KnowledgeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { repository, version, notifyMutation } = useRepository();
  const { t, locale } = useLocale();
  const navigate = useNavigate();

  const [item, setItem] = useState<KnowledgeItem | null>(null);
  const [source, setSource] = useState<SourceDocument | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [allKnowledge, setAllKnowledge] = useState<KnowledgeItem[]>([]);
  const [relationships, setRelationships] = useState<KnowledgeRelationship[]>([]);
  const [outcomes, setOutcomes] = useState<KnowledgeOutcome[]>([]);
  const [revisions, setRevisions] = useState<KnowledgeRevision[]>([]);
  const [activeRevision, setActiveRevision] = useState<KnowledgeRevision | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isRetireModalOpen, setIsRetireModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isRestoreRevModalOpen, setIsRestoreRevModalOpen] = useState(false);
  const [selectedRevToRestore, setSelectedRevToRestore] = useState<KnowledgeRevision | null>(null);
  const [changeNote, setChangeNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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

        const [srcDoc, cols, allK, allRels, allOutcomes, revList] = await Promise.all([
          k.sourceId ? repository.getSource(k.sourceId) : Promise.resolve(null),
          repository.listCollections(),
          repository.listKnowledge({ includeRetired: true }),
          repository.listRelationships(),
          repository.listOutcomes(id),
          repository.getKnowledgeRevisions(id),
        ]);

        if (!active) return;
        setSource(srcDoc);
        setCollection(cols.find((c) => c.id === k.collectionId) || null);
        setAllKnowledge(allK);
        setOutcomes(allOutcomes);
        setRevisions(revList);

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

  const handleRetire = async () => {
    if (!item) return;
    try {
      setActionLoading(true);
      const updated = await repository.retireKnowledge(item.id, changeNote.trim() || undefined);
      setItem(updated);
      setChangeNote('');
      setIsRetireModalOpen(false);
      notifyMutation();
      const revList = await repository.getKnowledgeRevisions(item.id);
      setRevisions(revList);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!item) return;
    try {
      setActionLoading(true);
      const updated = await repository.restoreKnowledge(item.id, changeNote.trim() || undefined);
      setItem(updated);
      setChangeNote('');
      setIsRestoreModalOpen(false);
      notifyMutation();
      const revList = await repository.getKnowledgeRevisions(item.id);
      setRevisions(revList);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreRevision = async () => {
    if (!item || !selectedRevToRestore) return;
    try {
      setActionLoading(true);
      const updated = await repository.restoreKnowledgeRevision(
        item.id,
        selectedRevToRestore.id,
        changeNote.trim() || undefined
      );
      setItem(updated);
      setActiveRevision(null);
      setSelectedRevToRestore(null);
      setChangeNote('');
      setIsRestoreRevModalOpen(false);
      notifyMutation();
      const revList = await repository.getKnowledgeRevisions(item.id);
      setRevisions(revList);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Determine which fields to display (active revision snapshot vs current live item)
  const displayFields = activeRevision
    ? {
        title: activeRevision.snapshot.title,
        summary: activeRevision.snapshot.summary,
        body: activeRevision.snapshot.body,
        type: activeRevision.snapshot.type,
        evidenceLevel: activeRevision.snapshot.evidenceLevel,
        reviewStatus: activeRevision.snapshot.reviewStatus,
        applicability: activeRevision.snapshot.applicability,
        exclusions: activeRevision.snapshot.exclusions,
        requirements: activeRevision.snapshot.requirements,
      }
    : item
    ? {
        title: item.title,
        summary: item.summary,
        body: item.body,
        type: item.type,
        evidenceLevel: item.evidenceLevel,
        reviewStatus: item.reviewStatus,
        applicability: item.applicability,
        exclusions: item.exclusions,
        requirements: item.requirements,
      }
    : null;

  const handleCopyAgentPrompt = () => {
    if (!item || !displayFields) return;
    const promptXml = `<agent_skill id="${item.id}" type="${displayFields.type}" evidence="${displayFields.evidenceLevel}">
<title>${displayFields.title}</title>
<summary>${displayFields.summary}</summary>
<applicability>${displayFields.applicability || 'General'}</applicability>
<exclusions>${displayFields.exclusions || 'None'}</exclusions>
<requirements>${displayFields.requirements.join(', ')}</requirements>
<procedure>
${displayFields.body || displayFields.summary}
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
    if (!item || !displayFields) return;
    const md = `# ${displayFields.title}

> **${t('knowledgeDetail.fieldSummary')}:** ${displayFields.summary}
> **${t('knowledgeDetail.fieldType')}:** ${displayFields.type} | **${t('knowledgeDetail.fieldEvidenceLevel')}:** ${displayFields.evidenceLevel} | **${t('knowledgeDetail.fieldReviewStatus')}:** ${displayFields.reviewStatus}

## ${t('knowledgeDetail.fieldApplicability')}
${displayFields.applicability || 'General'}

## ${t('knowledgeDetail.fieldExclusions')}
${displayFields.exclusions || 'None'}

## ${t('knowledgeDetail.fieldRequirements')}
${displayFields.requirements.length > 0 ? displayFields.requirements.map((r) => `- ${r}`).join('\n') : 'None'}

## ${t('knowledgeDetail.fieldBody')}
${displayFields.body || displayFields.summary}

## ${t('knowledgeDetail.groundingCitationTitle')}
> "${item.sourceExcerpt || ''}"
— ${t('knowledgeDetail.sourceProvenance')}: ${source?.filename || item.sourceId || t('knowledgeDetail.manualNoteNotice')}
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

  if (!item || !displayFields) {
    return (
      <div className="py-24 text-center text-xs text-[var(--muted)] max-w-md mx-auto space-y-3">
        <AlertCircle className="w-8 h-8 mx-auto text-[var(--muted)]" />
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-1">
            {t('knowledgeDetail.notFound')}
          </h2>
          <p className="text-[var(--muted)]">
            {t('knowledgeDetail.notFoundDesc')}
          </p>
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

          {/* Contextual Top Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* If currently viewing past revision: Show restore revision action and exit button */}
            {activeRevision ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRevToRestore(activeRevision);
                    setIsRestoreRevModalOpen(true);
                  }}
                  className="ui-button ui-button-primary text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('knowledgeDetail.restoreRevision')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRevision(null)}
                  className="ui-button ui-button-secondary text-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                  <span>{t('knowledgeDetail.backToCurrent')}</span>
                </button>
              </>
            ) : (
              <>
                {/* Retire / Restore Action Button */}
                {item.status === 'retired' ? (
                  <button
                    type="button"
                    onClick={() => setIsRestoreModalOpen(true)}
                    className="ui-button ui-button-secondary text-xs text-[var(--accent)]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('knowledgeDetail.restore')}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsRetireModalOpen(true)}
                    className="ui-button ui-button-secondary text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>{t('knowledgeDetail.retire')}</span>
                  </button>
                )}

                {/* Read-Only Export Actions */}
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
                  <span>{copiedPrompt ? t('common.copied') : t('knowledgeDetail.copyPromptBtn')}</span>
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
                  <span>{copiedMarkdown ? t('common.copied') : t('knowledgeDetail.copyMarkdownBtn')}</span>
                </button>
              </>
            )}
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
                <span className="text-[11px] font-mono">
                  {new Date(item.updatedAt).toLocaleDateString()}
                </span>
              </>
            )}
            {item.origin && (
              <>
                <span className="text-[var(--separator)]">•</span>
                <span className="text-[11px]">
                  {item.origin === 'manual' ? t('library.originManual') : t('library.originBundle')}
                </span>
              </>
            )}
          </div>

          <h1
            dir="auto"
            className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-[var(--foreground)] leading-snug"
          >
            {displayFields.title}
          </h1>
        </div>
      </div>

      {/* Retired Warning Banner */}
      {item.status === 'retired' && (
        <div className="p-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-100/80 dark:bg-stone-900/60 text-stone-800 dark:text-stone-200 flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <Archive className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-stone-900 dark:text-stone-100">
                {t('knowledgeDetail.retiredBanner')}
              </div>
              {item.retiredAt && (
                <div className="text-stone-500 font-mono text-[11px] mt-0.5">
                  {t('knowledgeDetail.retiredAt')}: {new Date(item.retiredAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsRestoreModalOpen(true)}
            className="ui-button ui-button-secondary text-xs shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('knowledgeDetail.restore')}</span>
          </button>
        </div>
      )}

      {/* Past Revision Inspection Banner */}
      {activeRevision && (
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--foreground)] flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Eye className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <div>
              <span className="font-semibold">{t('knowledgeDetail.viewingRevision')}</span>
              <span className="text-[var(--muted)] ms-2 font-mono text-[11px]">
                ({new Date(activeRevision.createdAt).toLocaleString()})
              </span>
              {activeRevision.changeNote && (
                <span className="text-[var(--foreground)] italic ms-2">
                  — "{activeRevision.changeNote}"
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedRevToRestore(activeRevision);
                setIsRestoreRevModalOpen(true);
              }}
              className="ui-button ui-button-primary text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('knowledgeDetail.restoreRevision')}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveRevision(null)}
              className="ui-button ui-button-secondary text-xs"
            >
              {t('knowledgeDetail.backToCurrent')}
            </button>
          </div>
        </div>
      )}

      {/* Source Changed Notice (Read-Only) */}
      {item.sourceHasChanged && !activeRevision && (
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--foreground)] flex items-start gap-2.5 text-xs">
          <AlertTriangle className="w-4 h-4 text-[var(--muted)] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold me-1">{t('library.needsReview')}:</span>
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
                {displayFields.summary}
              </p>
            </section>

            {/* Main Methodology & Technical Body */}
            <section className="space-y-3 pt-6 border-t border-[var(--separator)]">
              <h2 className="text-[14px] sm:text-[15px] font-semibold text-[var(--foreground)] tracking-tight">
                {t('knowledgeDetail.fieldBody')}
              </h2>
              <div className="text-[13px] sm:text-[14px] text-[var(--foreground)] leading-relaxed">
                {displayFields.body ? (
                  <MarkdownViewer content={displayFields.body} />
                ) : (
                  <p className="italic text-[var(--muted)]">{displayFields.summary}</p>
                )}
              </div>
            </section>

            {/* Operational Scope (Applicability & Exclusions) */}
            <section className="pt-6 border-t border-[var(--separator)] space-y-4">
              <h2 className="text-[14px] sm:text-[15px] font-semibold text-[var(--foreground)] tracking-tight">
                {t('knowledgeDetail.fieldApplicability')} & {t('knowledgeDetail.fieldExclusions')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]/50 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-[var(--foreground)] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                    <span>{t('knowledgeDetail.fieldApplicability')}</span>
                  </div>
                  <p dir="auto" className="text-[13px] text-[var(--foreground)] leading-relaxed">
                    {displayFields.applicability || t('common.none')}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]/50 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-[var(--muted)] font-medium">
                    <AlertCircle className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                    <span>{t('knowledgeDetail.fieldExclusions')}</span>
                  </div>
                  <p dir="auto" className="text-[13px] text-[var(--muted)] leading-relaxed">
                    {displayFields.exclusions || t('common.none')}
                  </p>
                </div>
              </div>
            </section>

            {/* Prerequisites & Requirements */}
            {displayFields.requirements && displayFields.requirements.length > 0 && (
              <section className="pt-6 border-t border-[var(--separator)] space-y-3">
                <h2 className="text-[14px] sm:text-[15px] font-semibold text-[var(--foreground)] tracking-tight">
                  {t('knowledgeDetail.fieldRequirements')} ({displayFields.requirements.length})
                </h2>
                <div className="flex flex-wrap gap-2">
                  {displayFields.requirements.map((req, i) => (
                    <span
                      key={i}
                      dir="auto"
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
                          <span className="text-[var(--foreground)] font-medium me-1.5">
                            {t('outcomes.metrics')}:
                          </span>
                          <span>{out.metrics}</span>
                        </div>
                      )}
                      {out.notes && (
                        <p dir="auto" className="text-[12px] text-[var(--muted)] leading-relaxed">
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

        {/* Supporting Metadata & Revision History Column (4 cols on lg ~ 33%) */}
        <div className="lg:col-span-4 sticky top-6 space-y-4">
          <div className="ui-panel p-5 space-y-6 shadow-xs">
            {/* Classification & Provenance */}
            <div className="space-y-3 pb-5 border-b border-[var(--separator)]">
              <div className="text-[12px] font-medium text-[var(--muted)]">
                {t('knowledgeDetail.classificationTitle')}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge type="knowledgeType" value={displayFields.type} />
                <Badge type="evidence" value={displayFields.evidenceLevel} />
                <Badge type="review" value={displayFields.reviewStatus} />
                <Badge type="status" value={item.status || 'active'} />
                <Badge type="origin" value={item.origin || 'manual'} />
              </div>
            </div>

            {/* Grounding & Source Document */}
            <div className="space-y-3 pb-5 border-b border-[var(--separator)]">
              <div className="flex items-center justify-between text-[12px] font-medium text-[var(--muted)]">
                <span>{t('knowledgeDetail.sourceEvidenceTitle')}</span>
                {source && (
                  <button
                    type="button"
                    onClick={() => navigate(`/documents/${source.id}`)}
                    className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline cursor-pointer text-xs"
                  >
                    <span>{t('knowledgeDetail.openDocument')}</span>
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
                        {t('knowledgeDetail.groundingCitationTitle')}
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
                <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] text-xs space-y-1">
                  <div className="font-medium text-[var(--foreground)]">
                    {t('knowledgeDetail.manualNoteNotice')}
                  </div>
                  <p className="text-[11px] text-[var(--muted)]">
                    {t('knowledgeDetail.manualNoteDesc')}
                  </p>
                </div>
              )}
            </div>

            {/* Workspace Metadata */}
            <div className="space-y-2.5 text-xs pb-5 border-b border-[var(--separator)]">
              <div className="text-[12px] font-medium text-[var(--muted)]">
                {t('knowledgeDetail.workspacePropertiesTitle')}
              </div>
              <div className="space-y-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">{t('knowledgeDetail.collectionLabel')}</span>
                  <span className="font-medium text-[var(--foreground)]">
                    {collection ? (locale === 'fa' ? collection.nameFa : collection.name) : t('common.none')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">{t('knowledgeDetail.createdLabel')}</span>
                  <span className="font-mono text-[11px] text-[var(--foreground)]">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">{t('knowledgeDetail.sourceSyncLabel')}</span>
                  <span className="font-medium text-[var(--foreground)]">
                    {item.sourceHasChanged
                      ? t('knowledgeDetail.pendingReview')
                      : t('knowledgeDetail.synchronized')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">{t('knowledgeDetail.revisionsCount')}</span>
                  <span className="font-mono text-[11px] text-[var(--foreground)]">
                    {revisions.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Revision History Panel */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-medium text-[var(--foreground)]">
                  <History className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>{t('knowledgeDetail.historySection')}</span>
                </div>
                <span className="text-[11px] font-mono text-[var(--muted)]">
                  {revisions.length} {t('knowledgeDetail.version')}
                </span>
              </div>
              <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                {t('knowledgeDetail.historyDesc')}
              </p>

              {revisions.length === 0 ? (
                <p className="text-[11px] text-[var(--muted)] italic">
                  {t('knowledgeDetail.noRevisions')}
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pe-1">
                  {revisions.map((rev, idx) => {
                    const isSelected = activeRevision?.id === rev.id;
                    const revNum = revisions.length - idx;

                    return (
                      <div
                        key={rev.id}
                        className={`p-2.5 rounded-lg border text-xs transition-colors space-y-1.5 ${
                          isSelected
                            ? 'bg-[var(--surface-secondary)] border-[var(--accent)]'
                            : 'bg-[var(--surface-secondary)]/50 border-[var(--border)] hover:bg-[var(--surface-secondary)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[11px] font-semibold text-[var(--foreground)]">
                            v{revNum} • {new Date(rev.createdAt).toLocaleDateString()}
                          </span>
                          <span className="text-[10px] text-[var(--muted)] font-mono">
                            {new Date(rev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {rev.changeNote && (
                          <p dir="auto" className="text-[11px] text-[var(--foreground)] leading-snug">
                            {rev.changeNote}
                          </p>
                        )}

                        <div className="flex items-center justify-end gap-1 pt-1 border-t border-[var(--separator)]">
                          {isSelected ? (
                            <button
                              type="button"
                              onClick={() => setActiveRevision(null)}
                              className="text-[11px] text-[var(--accent)] font-medium hover:underline cursor-pointer"
                            >
                              {t('knowledgeDetail.backToCurrent')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setActiveRevision(rev)}
                              className="text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] font-medium cursor-pointer"
                            >
                              {t('knowledgeDetail.viewRevision')}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRevToRestore(rev);
                              setIsRestoreRevModalOpen(true);
                            }}
                            className="text-[11px] text-[var(--accent)] hover:underline font-medium ms-2 cursor-pointer inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>{t('knowledgeDetail.restore')}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Retire Knowledge Modal */}
      <ConfirmModal
        isOpen={isRetireModalOpen}
        title={t('knowledgeDetail.retireTitle')}
        description={t('knowledgeDetail.retireConfirm')}
        confirmLabel={t('knowledgeDetail.retire')}
        cancelLabel={t('common.cancel')}
        isDestructive={true}
        onConfirm={handleRetire}
        onCancel={() => {
          setIsRetireModalOpen(false);
          setChangeNote('');
        }}
      >
        <div className="space-y-1 text-xs">
          <label className="font-medium text-[var(--foreground)]">
            {t('knowledgeDetail.changeNote')}
          </label>
          <input
            type="text"
            dir="auto"
            value={changeNote}
            onChange={(e) => setChangeNote(e.target.value)}
            placeholder={t('knowledgeDetail.changeNotePlaceholder')}
            className="ui-input w-full text-xs"
          />
        </div>
      </ConfirmModal>

      {/* Restore Knowledge Modal */}
      <ConfirmModal
        isOpen={isRestoreModalOpen}
        title={t('knowledgeDetail.restoreTitle')}
        description={t('knowledgeDetail.restoreConfirm')}
        confirmLabel={t('knowledgeDetail.restore')}
        cancelLabel={t('common.cancel')}
        isDestructive={false}
        onConfirm={handleRestore}
        onCancel={() => {
          setIsRestoreModalOpen(false);
          setChangeNote('');
        }}
      >
        <div className="space-y-1 text-xs">
          <label className="font-medium text-[var(--foreground)]">
            {t('knowledgeDetail.changeNote')}
          </label>
          <input
            type="text"
            dir="auto"
            value={changeNote}
            onChange={(e) => setChangeNote(e.target.value)}
            placeholder={t('knowledgeDetail.changeNotePlaceholder')}
            className="ui-input w-full text-xs"
          />
        </div>
      </ConfirmModal>

      {/* Restore Specific Past Revision Modal */}
      <ConfirmModal
        isOpen={isRestoreRevModalOpen}
        title={t('knowledgeDetail.restoreRevision')}
        description={t('knowledgeDetail.restoreRevisionConfirm')}
        confirmLabel={t('knowledgeDetail.restore')}
        cancelLabel={t('common.cancel')}
        isDestructive={false}
        onConfirm={handleRestoreRevision}
        onCancel={() => {
          setIsRestoreRevModalOpen(false);
          setSelectedRevToRestore(null);
          setChangeNote('');
        }}
      >
        <div className="space-y-1 text-xs">
          <label className="font-medium text-[var(--foreground)]">
            {t('knowledgeDetail.changeNote')}
          </label>
          <input
            type="text"
            dir="auto"
            value={changeNote}
            onChange={(e) => setChangeNote(e.target.value)}
            placeholder={t('knowledgeDetail.changeNotePlaceholder')}
            className="ui-input w-full text-xs"
          />
        </div>
      </ConfirmModal>
    </div>
  );
};
