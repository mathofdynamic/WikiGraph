import React, { useEffect, useState } from 'react';
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
  Tag,
  X,
  History,
  AlertCircle,
  HelpCircle,
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
} from '../types';
import { Badge } from '../components/common/Badge';
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
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [relationships, setRelationships] = useState<KnowledgeRelationship[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteRelTargetId, setDeleteRelTargetId] = useState<string | null>(null);

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
        setEditBody(k.body);
        setEditType(k.type);
        setEditCollectionId(k.collectionId);
        setEditReviewStatus(k.reviewStatus);
        setEditEvidenceLevel(k.evidenceLevel);
        setEditApplicability(k.applicability || '');
        setEditExclusions(k.exclusions || '');
        setEditRequirementsStr(k.requirements.join(', '));
        setEditSourceExcerpt(k.sourceExcerpt || '');

        const [srcDoc, cols, allK, allRels] = await Promise.all([
          repository.getSource(k.sourceId),
          repository.listCollections(),
          repository.listKnowledge(),
          repository.listRelationships(),
        ]);

        if (!active) return;
        setSource(srcDoc || null);
        setAllCollections(cols);
        setCollection(cols.find((c) => c.id === k.collectionId) || null);
        setAllKnowledge(allK.filter((item) => item.id !== id));
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

  const handleRemoveRelationship = async (targetId: string) => {
    if (!id) return;
    try {
      const rel = relationships.find(
        (r) =>
          r.id === targetId ||
          r.targetId === targetId ||
          r.targetKnowledgeId === targetId
      );
      if (rel) {
        await repository.deleteRelationship(rel.id);
      }
      setDeleteRelTargetId(null);
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

  // Reciprocal relationship preview helper
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
      <div className="p-12 text-center text-sm text-stone-500">
        <Clock className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
        <span>{t('common.loading')}</span>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-12 text-center text-sm text-stone-500">
        <AlertCircle className="w-6 h-6 mx-auto mb-2 text-rose-500" />
        <span>{t('knowledgeDetail.notFound')}</span>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate('/library')}
            className="text-emerald-700 underline text-xs"
          >
            {t('common.backToLibrary')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-[#23252a]">
        <button
          type="button"
          onClick={() => navigate('/library')}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#8a8f98] hover:text-[#f7f8f8] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{t('common.backToLibrary')}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRelModalOpen(true)}
            className="linear-btn-secondary text-xs gap-1.5"
          >
            <GitFork className="w-3.5 h-3.5 text-[#5e6ad2]" />
            <span>{t('knowledgeDetail.addRelationship')}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
              isEditing
                ? 'bg-[#1f2347] border-[#5e6ad2] text-[#828fff]'
                : 'linear-btn-secondary'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-[#5e6ad2]" />
            <span>{isEditing ? t('common.close') : t('common.edit')}</span>
          </button>

          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="p-1.5 rounded-md text-[#8a8f98] hover:text-[#f43f5e] hover:bg-[#1a1012] cursor-pointer"
            title={t('knowledgeDetail.deleteKnowledge')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Warning banner if Source Has Changed */}
      {item.sourceHasChanged && (
        <div className="p-4 rounded-xl border border-[#34343a] bg-[#141516] text-[#f59e0b] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-[#f59e0b] shrink-0 mt-0.5 sm:mt-0" />
            <div className="text-xs sm:text-sm">
              <span className="font-semibold block sm:inline">
                {t('knowledgeDetail.sourceChangedWarning')}
              </span>
              <span className="text-[#8a8f98] sm:ms-2 text-xs">
                The underlying source report was updated with a new revision. Verify that this extracted knowledge remains accurate.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAcknowledgeSourceChange}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#f59e0b] text-black hover:bg-[#fbbf24] shrink-0 self-end sm:self-auto cursor-pointer font-semibold"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{t('knowledgeDetail.acknowledgeSourceChange')}</span>
          </button>
        </div>
      )}

      {/* Main Grid: Left Body & Source citation, Right Metadata & Relationships */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols): Body / Editor */}
        <div className="lg:col-span-8 space-y-6">
          {isEditing ? (
            /* Structured Editor Form */
            <form
              onSubmit={handleSaveEdit}
              className="p-6 sm:p-8 rounded-xl border border-[#23252a] bg-[#0f1011] space-y-4"
            >
              <h3 className="text-base font-semibold tracking-title text-[#f7f8f8] pb-2 border-b border-[#23252a]">
                {t('common.edit')} {t('library.tabKnowledge')}
              </h3>

              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  {t('knowledgeDetail.fieldTitle')} *
                </label>
                <input
                  type="text"
                  dir="auto"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                    {t('knowledgeDetail.fieldType')}
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as KnowledgeType)}
                    className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  >
                    <option value="procedure">{t('types.procedure')}</option>
                    <option value="research_finding">{t('types.research_finding')}</option>
                    <option value="tip">{t('types.tip')}</option>
                    <option value="skill">{t('types.skill')}</option>
                    <option value="example">{t('types.example')}</option>
                    <option value="failure">{t('types.failure')}</option>
                    <option value="lesson">{t('types.lesson')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                    {t('knowledgeDetail.fieldCollection')}
                  </label>
                  <select
                    value={editCollectionId}
                    onChange={(e) => setEditCollectionId(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
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
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  {t('knowledgeDetail.fieldSummary')} *
                </label>
                <textarea
                  dir="auto"
                  required
                  rows={2}
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  {t('knowledgeDetail.fieldBody')} (Markdown supported)
                </label>
                <textarea
                  dir="auto"
                  rows={6}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  className="w-full p-3 text-xs rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                    {t('knowledgeDetail.fieldReviewStatus')}
                  </label>
                  <select
                    value={editReviewStatus}
                    onChange={(e) => setEditReviewStatus(e.target.value as ReviewStatus)}
                    className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  >
                    <option value="draft">{t('reviewStatus.draft')}</option>
                    <option value="reviewed">{t('reviewStatus.reviewed')}</option>
                    <option value="deprecated">{t('reviewStatus.deprecated')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                    {t('knowledgeDetail.fieldEvidenceLevel')}
                  </label>
                  <select
                    value={editEvidenceLevel}
                    onChange={(e) => setEditEvidenceLevel(e.target.value as EvidenceLevel)}
                    className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  >
                    <option value="unverified">{t('evidenceLevel.unverified')}</option>
                    <option value="observed">{t('evidenceLevel.observed')}</option>
                    <option value="tested">{t('evidenceLevel.tested')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  {t('knowledgeDetail.fieldApplicability')}
                </label>
                <input
                  type="text"
                  dir="auto"
                  value={editApplicability}
                  onChange={(e) => setEditApplicability(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  {t('knowledgeDetail.fieldExclusions')}
                </label>
                <input
                  type="text"
                  dir="auto"
                  value={editExclusions}
                  onChange={(e) => setEditExclusions(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  {t('knowledgeDetail.fieldRequirements')} (comma-separated)
                </label>
                <input
                  type="text"
                  dir="auto"
                  value={editRequirementsStr}
                  onChange={(e) => setEditRequirementsStr(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  {t('knowledgeDetail.fieldSourceExcerpt')}
                </label>
                <textarea
                  dir="auto"
                  rows={2}
                  value={editSourceExcerpt}
                  onChange={(e) => setEditSourceExcerpt(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#23252a]">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="linear-btn-secondary text-xs sm:text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="linear-btn-primary text-xs sm:text-sm"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          ) : (
            /* Read-only Structured Display */
            <div className="p-6 sm:p-8 rounded-xl border border-[#23252a] bg-[#0f1011] space-y-6">
              <div className="space-y-3 pb-4 border-b border-[#23252a]">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge type="knowledgeType" value={item.type} />
                  <Badge type="evidence" value={item.evidenceLevel} />
                  <Badge type="review" value={item.reviewStatus} />
                </div>

                <h1
                  dir="auto"
                  className="text-xl sm:text-2xl font-bold tracking-title text-[#f7f8f8] leading-snug"
                >
                  {item.title}
                </h1>

                <p
                  dir="auto"
                  className="text-sm sm:text-base text-[#d0d6e0] leading-relaxed font-sans"
                >
                  {item.summary}
                </p>
              </div>

              {/* Structured Body / Step instructions */}
              {item.body && (
                <div className="space-y-2">
                  <h3 className="text-xs uppercase tracking-wider text-[#8a8f98] font-medium">
                    {t('knowledgeDetail.fieldBody')}
                  </h3>
                  <div
                    dir="auto"
                    className="p-4 rounded-lg bg-[#141516] border border-[#23252a] text-xs sm:text-sm whitespace-pre-wrap leading-relaxed text-[#f7f8f8]"
                  >
                    {item.body}
                  </div>
                </div>
              )}

              {/* Applicability & Exclusions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {item.applicability && (
                  <div className="p-4 rounded-lg border border-[#23252a] bg-[#141516] space-y-1">
                    <span className="text-xs font-semibold text-[#828fff] block">
                      {t('knowledgeDetail.fieldApplicability')}
                    </span>
                    <p dir="auto" className="text-xs text-[#d0d6e0] leading-normal">
                      {item.applicability}
                    </p>
                  </div>
                )}

                {item.exclusions && (
                  <div className="p-4 rounded-lg border border-[#23252a] bg-[#141516] space-y-1">
                    <span className="text-xs font-semibold text-[#f43f5e] block">
                      {t('knowledgeDetail.fieldExclusions')}
                    </span>
                    <p dir="auto" className="text-xs text-[#d0d6e0] leading-normal">
                      {item.exclusions}
                    </p>
                  </div>
                )}
              </div>

              {/* Requirements List */}
              {item.requirements && item.requirements.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">
                    {t('knowledgeDetail.fieldRequirements')}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {item.requirements.map((req, i) => (
                      <span
                        key={i}
                        dir="auto"
                        className="px-2.5 py-1 rounded-md text-xs bg-[#141516] text-[#d0d6e0] border border-[#23252a]"
                      >
                        {req}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Citation Pin to Source Document */}
              <div className="p-4 rounded-lg border border-[#23252a] border-s-2 border-s-[#5e6ad2] bg-[#141516] space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-[#828fff]">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    <span>{t('knowledgeDetail.fieldSourceExcerpt')}</span>
                  </span>
                  {source && (
                    <button
                      type="button"
                      onClick={() => navigate(`/documents/${source.id}`)}
                      className="inline-flex items-center gap-1 hover:text-[#f7f8f8] underline cursor-pointer"
                    >
                      <span>{source.filename}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <blockquote
                  dir="auto"
                  className="italic text-xs sm:text-sm text-[#d0d6e0] ps-2 py-0.5"
                >
                  "{item.sourceExcerpt}"
                </blockquote>

                <div className="pt-2 text-[11px] text-[#8a8f98] flex items-center justify-between border-t border-[#23252a]">
                  <span>Revision: {item.sourceRevisionId}</span>
                  <span>Extracted citation pin</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Metadata & Outbound Relationships */}
        <div className="lg:col-span-4 space-y-6">
          {/* Metadata Card */}
          <div className="p-5 rounded-xl border border-[#23252a] bg-[#0f1011] space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-[#8a8f98] font-medium">
              {t('sourceDetail.metadata')}
            </h3>

            <div className="space-y-2 text-xs divide-y divide-[#23252a]">
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[#8a8f98]">{t('knowledgeDetail.fieldCollection')}</span>
                <span className="font-medium text-[#f7f8f8]">
                  {collection ? (locale === 'fa' ? collection.nameFa : collection.name) : '-'}
                </span>
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[#8a8f98]">{t('sourceDetail.language')}</span>
                <span className="font-medium text-[#f7f8f8]">
                  {item.language === 'fa' ? 'فارسی' : 'English'}
                </span>
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[#8a8f98]">{t('knowledgeDetail.fieldReviewStatus')}</span>
                <Badge type="review" value={item.reviewStatus} size="sm" />
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[#8a8f98]">{t('knowledgeDetail.fieldEvidenceLevel')}</span>
                <Badge type="evidence" value={item.evidenceLevel} size="sm" />
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[#8a8f98]">{t('common.updated')}</span>
                <span className="text-[#8a8f98]">
                  {new Date(item.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Connected Knowledge Relationships Card */}
          <div className="p-5 rounded-xl border border-[#23252a] bg-[#0f1011] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-wider text-[#8a8f98] font-medium flex items-center gap-1.5">
                <GitFork className="w-3.5 h-3.5 text-[#5e6ad2]" />
                <span>{t('knowledgeDetail.relationships')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setRelModalOpen(true)}
                className="text-xs text-[#828fff] hover:text-[#5e6ad2] font-medium cursor-pointer"
              >
                + {t('common.add')}
              </button>
            </div>

            {relationships.length === 0 ? (
              <p className="text-xs text-[#8a8f98] italic">
                {t('knowledgeDetail.noRelationships')}
              </p>
            ) : (
              <div className="space-y-2">
                {relationships.map((rel) => {
                  const targetId = rel.targetKnowledgeId || rel.targetId || '';
                  const targetItem = allKnowledge.find((k) => k.id === targetId);
                  const relTypeStr = String(rel.relationshipType || rel.type || 'supports');
                  return (
                    <div
                      key={rel.id || targetId}
                      className="p-3 rounded-lg border border-[#23252a] bg-[#141516] hover:border-[#34343a] transition-colors flex items-start justify-between gap-2 group"
                    >
                      <div
                        onClick={() => navigate(`/knowledge/${targetId}`)}
                        className="cursor-pointer min-w-0 flex-1"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[11px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[#1f2347] text-[#828fff]">
                            {t(`relationships.${relTypeStr}`)}
                          </span>
                        </div>
                        <h5
                          dir="auto"
                          className="text-xs font-medium text-[#f7f8f8] group-hover:text-[#828fff] truncate"
                        >
                          {targetItem?.title || targetId}
                        </h5>
                        {(rel.notes || rel.rationale) && (
                          <p dir="auto" className="text-[11px] text-[#8a8f98] line-clamp-1 mt-0.5">
                            {rel.notes || rel.rationale}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setDeleteRelTargetId(targetId)}
                        className="p-1 rounded text-[#8a8f98] hover:text-[#f43f5e] cursor-pointer"
                        title={t('knowledgeDetail.deleteRelationship')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Outbound Relationship Modal */}
      {relModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg bg-[#0f1011] rounded-xl border border-[#23252a] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#23252a] flex items-center justify-between">
              <h3 className="text-base font-semibold tracking-title text-[#f7f8f8]">
                {t('knowledgeDetail.addRelationship')}
              </h3>
              <button
                type="button"
                onClick={() => setRelModalOpen(false)}
                className="p-1 rounded text-[#8a8f98] hover:text-[#f7f8f8] cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddRelationship} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  Target Knowledge Item *
                </label>
                <select
                  required
                  value={targetKnowledgeId}
                  onChange={(e) => setTargetKnowledgeId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                >
                  {allKnowledge.map((k) => (
                    <option key={k.id} value={k.id}>
                      [{t(`types.${k.type}`)}] {k.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  Relationship Type *
                </label>
                <select
                  value={relType}
                  onChange={(e) => setRelType(e.target.value as RelationshipType)}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                >
                  <option value="supports">{t('relationships.supports')}</option>
                  <option value="conflicts_with">{t('relationships.conflicts_with')}</option>
                  <option value="prerequisite_for">{t('relationships.prerequisite_for')}</option>
                  <option value="derived_from">{t('relationships.derived_from')}</option>
                  <option value="supersedes">{t('relationships.supersedes')}</option>
                  <option value="relates_to">{t('relationships.relates_to')}</option>
                </select>
              </div>

              {/* Reciprocal Label Preview (Mandate from requirements) */}
              <div className="p-3 rounded-lg bg-[#141516] border border-[#23252a] text-xs">
                <span className="font-semibold text-[#8a8f98] block mb-1">
                  Reciprocal Relationship Preview:
                </span>
                <div className="text-[#d0d6e0] flex items-center gap-2">
                  <span>Target item will perceive this as:</span>
                  <span className="px-2 py-0.5 rounded bg-[#1f2347] text-[#828fff] font-semibold">
                    {getReciprocalLabel(relType)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  Notes / Context (optional)
                </label>
                <input
                  type="text"
                  dir="auto"
                  value={relNotes}
                  onChange={(e) => setRelNotes(e.target.value)}
                  placeholder="e.g. Validated through stress testing on cluster"
                  className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#23252a]">
                <button
                  type="button"
                  onClick={() => setRelModalOpen(false)}
                  className="linear-btn-secondary text-xs sm:text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="linear-btn-primary text-xs sm:text-sm"
                >
                  {t('common.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title={t('knowledgeDetail.deleteKnowledge')}
        description={t('knowledgeDetail.deleteConfirm')}
        isDestructive
        onConfirm={handleDeleteItem}
        onCancel={() => setDeleteModalOpen(false)}
      />

      {/* Delete Relationship Confirmation */}
      <ConfirmModal
        isOpen={deleteRelTargetId !== null}
        title={t('knowledgeDetail.deleteRelationship')}
        description="Are you sure you want to disconnect this knowledge relationship?"
        isDestructive
        onConfirm={() => deleteRelTargetId && handleRemoveRelationship(deleteRelTargetId)}
        onCancel={() => setDeleteRelTargetId(null)}
      />
    </div>
  );
};
