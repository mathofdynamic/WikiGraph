import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit3,
  ExternalLink,
  Plus,
  GitFork,
  FileText,
  ShieldCheck,
  X,
  AlertCircle,
  Copy,
  Check,
  Bot,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import {
  Collection,
  EvidenceLevel,
  KnowledgeItem,
  KnowledgeRelationship,
  KnowledgeType,
  RelationshipType,
  ReviewStatus,
  SourceDocument,
  KnowledgeOutcome,
} from '../types';
import { Badge } from '../components/common/Badge';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { MarkdownViewer } from '../components/common/MarkdownViewer';

export const KnowledgeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { repository, version, notifyMutation } = useRepository();
  const { t, locale } = useLocale();
  const navigate = useNavigate();

  const [item, setItem] = useState<KnowledgeItem | null>(null);
  const [source, setSource] = useState<SourceDocument | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [allKnowledge, setAllKnowledge] = useState<KnowledgeItem[]>([]);
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [relationships, setRelationships] = useState<KnowledgeRelationship[]>([]);
  const [outcomes, setOutcomes] = useState<KnowledgeOutcome[]>([]);
  const [loading, setLoading] = useState(true);

  // Copy feedback
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editType, setEditType] = useState<KnowledgeType>('procedure');
  const [editCollectionId, setEditCollectionId] = useState('');
  const [editReviewStatus, setEditReviewStatus] = useState<ReviewStatus>('draft');
  const [editEvidenceLevel, setEditEvidenceLevel] = useState<EvidenceLevel>('observed');
  const [editApplicability, setEditApplicability] = useState('');
  const [editExclusions, setEditExclusions] = useState('');
  const [editRequirementsStr, setEditRequirementsStr] = useState('');
  const [editSourceExcerpt, setEditSourceExcerpt] = useState('');

  // Add Relationship Modal state
  const [relModalOpen, setRelModalOpen] = useState(false);
  const [targetKnowledgeId, setTargetKnowledgeId] = useState('');
  const [relType, setRelType] = useState<RelationshipType>('supports');
  const [relNotes, setRelNotes] = useState('');

  // Add Outcome Modal state
  const [outcomeModalOpen, setOutcomeModalOpen] = useState(false);
  const [outcomeTask, setOutcomeTask] = useState('');
  const [outcomeResult, setOutcomeResult] = useState<'success' | 'failure' | 'uncertain'>('success');
  const [outcomeMetrics, setOutcomeMetrics] = useState('');
  const [outcomeNotes, setOutcomeNotes] = useState('');

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

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
        setEditTitle(k.title);
        setEditSummary(k.summary);
        setEditBody(k.body || '');
        setEditType(k.type);
        setEditCollectionId(k.collectionId);
        setEditReviewStatus(k.reviewStatus);
        setEditEvidenceLevel(k.evidenceLevel);
        setEditApplicability(k.applicability || '');
        setEditExclusions(k.exclusions || '');
        setEditRequirementsStr(k.requirements.join(', '));
        setEditSourceExcerpt(k.sourceExcerpt || '');

        const [srcDoc, cols, allK, allRels, allOutcomes] = await Promise.all([
          repository.getSource(k.sourceId),
          repository.listCollections(),
          repository.listKnowledge(),
          repository.listRelationships(),
          repository.listOutcomes(id),
        ]);

        if (!active) return;
        setSource(srcDoc || null);
        setAllCollections(cols);
        setCollection(cols.find((c) => c.id === k.collectionId) || null);
        setAllKnowledge(allK);
        setOutcomes(allOutcomes);

        const itemRels = allRels.filter(
          (r) => r.sourceId === id || r.sourceKnowledgeId === id
        );
        setRelationships(itemRels);
        if (allK.length > 0) {
          setTargetKnowledgeId(allK.find((item) => item.id !== id)?.id || '');
        }
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

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !id) return;

    try {
      const requirements = editRequirementsStr
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);

      await repository.updateKnowledge(id, {
        title: editTitle,
        summary: editSummary,
        body: editBody,
        type: editType,
        collectionId: editCollectionId,
        reviewStatus: editReviewStatus,
        evidenceLevel: editEvidenceLevel,
        applicability: editApplicability,
        exclusions: editExclusions,
        requirements,
        sourceExcerpt: editSourceExcerpt,
      });

      setIsEditing(false);
      notifyMutation();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcknowledgeSourceChange = async () => {
    if (!item || !id) return;
    try {
      await repository.updateKnowledge(id, {
        sourceHasChanged: false,
        reviewStatus: 'reviewed',
      });
      notifyMutation();
    } catch (err) {
      console.error(err);
    }
  };

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

  const handleAddRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !id || !targetKnowledgeId) return;

    try {
      await repository.addRelationship({
        sourceKnowledgeId: id,
        targetKnowledgeId,
        relationshipType: relType,
        notes: relNotes || undefined,
      });

      setRelModalOpen(false);
      setRelNotes('');
      notifyMutation();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveRelationship = async (relId: string) => {
    if (!id) return;
    try {
      await repository.deleteRelationship(relId);
      notifyMutation();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !id || !outcomeTask) return;

    try {
      await repository.createOutcome({
        knowledgeId: id,
        taskContext: outcomeTask,
        result: outcomeResult,
        metrics: outcomeMetrics || undefined,
        notes: outcomeNotes || undefined,
      });

      setOutcomeModalOpen(false);
      setOutcomeTask('');
      setOutcomeMetrics('');
      setOutcomeNotes('');
      notifyMutation();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async () => {
    if (!item || !id) return;
    try {
      await repository.deleteKnowledge(id);
      notifyMutation();
      navigate('/library');
    } catch (err) {
      console.error(err);
    }
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
      <div className="py-20 text-center text-xs text-[var(--muted)]">
        <Clock className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
        <span>{t('common.loading')}</span>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="py-20 text-center text-xs text-[var(--muted)] max-w-md mx-auto">
        <AlertCircle className="w-7 h-7 mx-auto mb-2 text-rose-500" />
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-1">{t('knowledgeDetail.notFound')}</h2>
        <button
          type="button"
          onClick={() => navigate('/library')}
          className="ui-button ui-button-secondary mt-3"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
          <span>{t('common.backToLibrary')}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
        <button
          type="button"
          onClick={() => navigate('/library')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180 text-blue-400" />
          <span>{t('common.backToLibrary')}</span>
        </button>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyAgentPrompt}
            className="ui-button ui-button-secondary text-xs"
            title="Copy Context Prompt"
          >
            {copiedPrompt ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5 text-[var(--accent)]" />}
            <span>{copiedPrompt ? t('common.copied') : 'Copy Prompt'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="ui-button ui-button-secondary text-xs"
            title="Copy Markdown"
          >
            {copiedMarkdown ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedMarkdown ? t('common.copied') : 'Markdown'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="ui-button ui-button-secondary text-xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-[var(--muted)]" />
            <span>{isEditing ? t('common.close') : t('common.edit')}</span>
          </button>

          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/40 transition-colors cursor-pointer"
            title={t('knowledgeDetail.deleteKnowledge')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Source Changed Alert Banner */}
      {item.sourceHasChanged && (
        <div className="p-3.5 rounded-xl border border-amber-800/40 bg-amber-950/20 text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{t('knowledgeDetail.sourceChangedWarning')}</span>
          </div>
          <button
            type="button"
            onClick={handleAcknowledgeSourceChange}
            className="px-2.5 py-1 rounded bg-amber-500 text-black font-semibold hover:bg-amber-400 shrink-0 self-end sm:self-auto cursor-pointer"
          >
            {t('knowledgeDetail.acknowledgeSourceChange')}
          </button>
        </div>
      )}

      {/* Composed Detail Content */}
      {isEditing ? (
        <form onSubmit={handleSaveEdit} className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-4">
          <h3 className="text-sm font-semibold text-[var(--foreground)] pb-2 border-b border-[var(--border)]">
            {t('common.edit')} {t('library.tabKnowledge')}
          </h3>

          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">
              {t('knowledgeDetail.fieldTitle')} *
            </label>
            <input
              type="text"
              dir="auto"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="ui-input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                {t('knowledgeDetail.fieldType')}
              </label>
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value as KnowledgeType)}
                className="ui-select w-full"
              >
                <option value="procedure">{t('types.procedure')}</option>
                <option value="skill">{t('types.skill')}</option>
                <option value="research_finding">{t('types.research_finding')}</option>
                <option value="tip">{t('types.tip')}</option>
                <option value="example">{t('types.example')}</option>
                <option value="failure">{t('types.failure')}</option>
                <option value="lesson">{t('types.lesson')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                {t('knowledgeDetail.fieldCollection')}
              </label>
              <select
                value={editCollectionId}
                onChange={(e) => setEditCollectionId(e.target.value)}
                className="ui-select w-full"
              >
                {allCollections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {locale === 'fa' ? c.nameFa : c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">
              {t('knowledgeDetail.fieldSummary')} *
            </label>
            <textarea
              dir="auto"
              required
              rows={2}
              value={editSummary}
              onChange={(e) => setEditSummary(e.target.value)}
              className="ui-input"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">
              {t('knowledgeDetail.fieldBody')}
            </label>
            <textarea
              dir="auto"
              rows={6}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="ui-input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                {t('knowledgeDetail.fieldReviewStatus')}
              </label>
              <select
                value={editReviewStatus}
                onChange={(e) => setEditReviewStatus(e.target.value as ReviewStatus)}
                className="ui-select w-full"
              >
                <option value="draft">{t('reviewStatus.draft')}</option>
                <option value="reviewed">{t('reviewStatus.reviewed')}</option>
                <option value="deprecated">{t('reviewStatus.deprecated')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                {t('knowledgeDetail.fieldEvidenceLevel')}
              </label>
              <select
                value={editEvidenceLevel}
                onChange={(e) => setEditEvidenceLevel(e.target.value as EvidenceLevel)}
                className="ui-select w-full"
              >
                <option value="unverified">{t('evidenceLevel.unverified')}</option>
                <option value="observed">{t('evidenceLevel.observed')}</option>
                <option value="tested">{t('evidenceLevel.tested')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                {t('knowledgeDetail.fieldApplicability')}
              </label>
              <input
                type="text"
                dir="auto"
                value={editApplicability}
                onChange={(e) => setEditApplicability(e.target.value)}
                className="ui-input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                {t('knowledgeDetail.fieldExclusions')}
              </label>
              <input
                type="text"
                dir="auto"
                value={editExclusions}
                onChange={(e) => setEditExclusions(e.target.value)}
                className="ui-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">
              {t('knowledgeDetail.fieldRequirements')}
            </label>
            <input
              type="text"
              dir="auto"
              value={editRequirementsStr}
              onChange={(e) => setEditRequirementsStr(e.target.value)}
              className="ui-input"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">
              {t('knowledgeDetail.fieldSourceExcerpt')}
            </label>
            <textarea
              dir="auto"
              rows={2}
              value={editSourceExcerpt}
              onChange={(e) => setEditSourceExcerpt(e.target.value)}
              className="ui-input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="ui-button ui-button-secondary"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="ui-button ui-button-primary"
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      ) : (
        /* Composed Read View */
        <div className="space-y-6">
          
          {/* Header & Primary Metadata */}
          <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge type="knowledgeType" value={item.type} />
              <Badge type="evidence" value={item.evidenceLevel} />
              <Badge type="review" value={item.reviewStatus} />
              {collection && (
                <span className="text-xs text-[var(--muted)] font-medium px-2 py-0.5 rounded bg-[var(--surface-tertiary)] border border-[var(--border)]">
                  {locale === 'fa' ? collection.nameFa : collection.name}
                </span>
              )}
            </div>

            <h1 dir="auto" className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)]">
              {item.title}
            </h1>

            {/* Core Takeaway Box */}
            <div className="p-3.5 rounded-lg bg-[var(--surface)]/90 border border-[var(--border)] text-xs sm:text-sm text-[var(--foreground)] leading-relaxed">
              <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">
                {t('knowledgeDetail.fieldSummary')}
              </span>
              <p dir="auto">{item.summary}</p>
            </div>
          </div>

          {/* Operational Scope (Applicability & Exclusions) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t('knowledgeDetail.fieldApplicability')}</span>
              </div>
              <p dir="auto" className="text-[var(--foreground)] leading-relaxed">
                {item.applicability || 'General application'}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{t('knowledgeDetail.fieldExclusions')}</span>
              </div>
              <p dir="auto" className="text-[var(--foreground)] leading-relaxed">
                {item.exclusions || 'None specified'}
              </p>
            </div>
          </div>

          {/* Requirements Chips */}
          {item.requirements && item.requirements.length > 0 && (
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-2">
              <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                {t('knowledgeDetail.fieldRequirements')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {item.requirements.map((req, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded text-xs bg-[var(--surface-secondary)] text-[var(--foreground)] border border-[var(--border)] font-mono"
                  >
                    {req}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Main Content & Technical Guide */}
          <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-3">
            <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
              {t('knowledgeDetail.fieldBody')}
            </h3>
            <div className="text-xs sm:text-sm text-[var(--foreground)] leading-relaxed">
              {item.body ? (
                <MarkdownViewer content={item.body} />
              ) : (
                <p className="italic text-[var(--muted)]">{item.summary}</p>
              )}
            </div>
          </div>

          {/* Source Grounding & Citation Anchor */}
          <div className="p-4 rounded-xl border-s-2 border-s-blue-500 bg-[var(--surface)] border border-[var(--border)] space-y-2">
            <div className="flex items-center justify-between text-xs text-blue-400 font-medium">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>{t('knowledgeDetail.fieldSourceExcerpt')}</span>
              </span>
              {source && (
                <button
                  type="button"
                  onClick={() => navigate(`/documents/${source.id}`)}
                  className="inline-flex items-center gap-1 hover:underline cursor-pointer font-mono"
                >
                  <span>{source.filename}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            <blockquote
              dir="auto"
              className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] text-xs text-[var(--foreground)] italic font-mono leading-relaxed"
            >
              "{item.sourceExcerpt || 'Direct citation excerpt anchored in source peer report.'}"
            </blockquote>
          </div>

          {/* Related Information (Graph Relationships) */}
          <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider flex items-center gap-2">
                <GitFork className="w-3.5 h-3.5 text-blue-400" />
                <span>{t('knowledgeDetail.relationshipsSection')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setRelModalOpen(true)}
                className="text-xs font-medium text-blue-400 hover:text-blue-300 cursor-pointer"
              >
                + {t('knowledgeDetail.addRelationship')}
              </button>
            </div>

            {relationships.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">{t('knowledgeDetail.noRelationships')}</p>
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
                      className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]/60 hover:bg-[var(--surface-secondary)] hover:border-[var(--border)] transition-colors cursor-pointer flex items-center justify-between group"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="text-[10px] font-medium text-blue-400 bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-800/30 me-1.5">
                          {relLabel}
                        </span>
                        <span className="text-xs text-[var(--foreground)] group-hover:text-blue-400 transition-colors font-medium truncate inline-block align-middle max-w-[200px]">
                          {target.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveRelationship(rel.id);
                        }}
                        className="p-1 text-[var(--muted)] hover:text-rose-400 shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Practical Application Outcomes */}
          <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('knowledgeDetail.outcomesSection')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setOutcomeModalOpen(true)}
                className="text-xs font-medium text-emerald-400 hover:text-emerald-300 cursor-pointer"
              >
                + {t('knowledgeDetail.addOutcome')}
              </button>
            </div>

            {outcomes.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">{t('knowledgeDetail.noOutcomes')}</p>
            ) : (
              <div className="space-y-2">
                {outcomes.map((out) => (
                  <div
                    key={out.id}
                    className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]/60 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${
                          out.result === 'success'
                            ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                            : out.result === 'failure'
                            ? 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
                            : 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
                        }`}
                      >
                        {t(`results.${out.result}`)}
                      </span>
                      <span className="text-[10px] text-[var(--muted)] font-mono">
                        {out.recordedAt ? new Date(out.recordedAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-[var(--foreground)] font-medium">{out.taskContext}</p>
                    {out.metrics && (
                      <p className="font-mono text-[11px] text-[var(--muted)] bg-[var(--surface-tertiary)]/60 p-1.5 rounded border border-[var(--border)]/50">
                        {out.metrics}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Add Relationship Modal */}
      {relModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl max-w-md w-full p-4 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <h3 className="text-xs font-semibold text-[var(--foreground)]">
                {t('knowledgeDetail.addRelationship')}
              </h3>
              <button
                type="button"
                onClick={() => setRelModalOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] p-1 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleAddRelationship} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  {t('graph.relationType')}
                </label>
                <select
                  value={relType}
                  onChange={(e) => setRelType(e.target.value as RelationshipType)}
                  className="ui-select w-full"
                >
                  <option value="supports">{t('relationTypes.supports')}</option>
                  <option value="requires">{t('relationTypes.requires')}</option>
                  <option value="complements">{t('relationTypes.complements')}</option>
                  <option value="conflicts_with">{t('relationTypes.conflicts_with')}</option>
                  <option value="alternative_to">{t('relationTypes.alternative_to')}</option>
                  <option value="supersedes">{t('relationTypes.supersedes')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  {t('graph.targetItem')}
                </label>
                <select
                  value={targetKnowledgeId}
                  onChange={(e) => setTargetKnowledgeId(e.target.value)}
                  className="ui-select w-full"
                >
                  {allKnowledge
                    .filter((k) => k.id !== id)
                    .map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.title}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  {t('graph.rationale')}
                </label>
                <textarea
                  rows={2}
                  value={relNotes}
                  onChange={(e) => setRelNotes(e.target.value)}
                  placeholder={t('graph.rationalePlaceholder')}
                  className="ui-input"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setRelModalOpen(false)}
                  className="ui-button ui-button-secondary"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="ui-button ui-button-primary"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Outcome Modal */}
      {outcomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl max-w-md w-full p-4 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <h3 className="text-xs font-semibold text-[var(--foreground)]">
                {t('knowledgeDetail.addOutcome')}
              </h3>
              <button
                type="button"
                onClick={() => setOutcomeModalOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] p-1 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleAddOutcome} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  {t('outcomes.taskContext')} *
                </label>
                <input
                  type="text"
                  required
                  value={outcomeTask}
                  onChange={(e) => setOutcomeTask(e.target.value)}
                  placeholder="e.g. Extraction of SEC borderless tables"
                  className="ui-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  {t('outcomes.result')}
                </label>
                <select
                  value={outcomeResult}
                  onChange={(e) => setOutcomeResult(e.target.value as any)}
                  className="ui-select w-full"
                >
                  <option value="success">{t('results.success')}</option>
                  <option value="failure">{t('results.failure')}</option>
                  <option value="uncertain">{t('results.uncertain')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  {t('outcomes.metrics')}
                </label>
                <input
                  type="text"
                  value={outcomeMetrics}
                  onChange={(e) => setOutcomeMetrics(e.target.value)}
                  placeholder="e.g. 99.2% alignment precision"
                  className="ui-input"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setOutcomeModalOpen(false)}
                  className="ui-button ui-button-secondary"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="ui-button ui-button-primary"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title={t('knowledgeDetail.deleteKnowledge')}
        description={t('knowledgeDetail.deleteConfirm')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        isDestructive
        onConfirm={handleDeleteItem}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
};
