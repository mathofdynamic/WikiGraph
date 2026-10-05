import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Layers,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  Plus,
  X,
  Check,
  AlertCircle,
  Copy,
  Tag,
  ShieldCheck,
  ArrowRight,
  FileCode,
  FolderOpen,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import {
  Collection,
  EvidenceLevel,
  KnowledgeItem,
  KnowledgeType,
  ReviewStatus,
  SourceDocument,
} from '../types';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';

export const LibraryPage: React.FC = () => {
  const { repository, version, notifyMutation } = useRepository();
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab: 'knowledge' | 'sources'
  const activeTab = (searchParams.get('tab') as 'knowledge' | 'sources') || 'knowledge';
  const selectedKnowledgeId = searchParams.get('id');

  // Filter state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCollection, setSelectedCollection] = useState<string>(searchParams.get('col') || 'all');
  const [selectedType, setSelectedType] = useState<KnowledgeType | 'all'>('all');
  const [selectedReview, setSelectedReview] = useState<ReviewStatus | 'all'>('all');
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceLevel | 'all'>('all');
  const [selectedFreshness, setSelectedFreshness] = useState<'all' | 'needs_review' | 'fresh' | 'stale'>('all');

  // Data state
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>([]);
  const [sourcesList, setSourcesList] = useState<SourceDocument[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inspector selected item state
  const [activeKnowledgeId, setActiveKnowledgeId] = useState<string | null>(selectedKnowledgeId);

  // Quick copied feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Knowledge Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newType, setNewType] = useState<KnowledgeType>('procedure');
  const [newCollectionId, setNewCollectionId] = useState('');
  const [newEvidenceLevel, setNewEvidenceLevel] = useState<EvidenceLevel>('tested');
  const [newApplicability, setNewApplicability] = useState('');
  const [newExclusions, setNewExclusions] = useState('');
  const [newRequirements, setNewRequirements] = useState('');

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [cols, allK, allS] = await Promise.all([
        repository.listCollections(),
        repository.listKnowledge(),
        repository.listSources(),
      ]);

      setCollections(cols);
      if (cols.length > 0 && !newCollectionId) {
        setNewCollectionId(cols[0].id);
      }
      setSourcesList(allS);

      // Filter knowledge items
      let filtered = [...allK];

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(
          (k) =>
            k.title.toLowerCase().includes(q) ||
            k.summary.toLowerCase().includes(q) ||
            (k.body && k.body.toLowerCase().includes(q)) ||
            (k.applicability && k.applicability.toLowerCase().includes(q)) ||
            (k.sourceExcerpt && k.sourceExcerpt.toLowerCase().includes(q)) ||
            k.requirements.some((r) => r.toLowerCase().includes(q))
        );
      }

      if (selectedCollection !== 'all') {
        filtered = filtered.filter((k) => k.collectionId === selectedCollection);
      }
      if (selectedType !== 'all') {
        filtered = filtered.filter((k) => k.type === selectedType);
      }
      if (selectedReview !== 'all') {
        filtered = filtered.filter((k) => k.reviewStatus === selectedReview);
      }
      if (selectedEvidence !== 'all') {
        filtered = filtered.filter((k) => k.evidenceLevel === selectedEvidence);
      }
      if (selectedFreshness !== 'all') {
        if (selectedFreshness === 'needs_review') {
          filtered = filtered.filter((k) => k.sourceHasChanged || k.reviewStatus === 'draft');
        } else if (selectedFreshness === 'fresh') {
          filtered = filtered.filter((k) => !k.sourceHasChanged && k.reviewStatus === 'reviewed');
        } else if (selectedFreshness === 'stale') {
          filtered = filtered.filter((k) => k.reviewStatus === 'deprecated' || k.sourceHasChanged);
        }
      }

      setKnowledgeList(filtered);

      // Set default active knowledge item for inspector
      if (filtered.length > 0) {
        if (!activeKnowledgeId || !filtered.some((k) => k.id === activeKnowledgeId)) {
          setActiveKnowledgeId(filtered[0].id);
        }
      } else {
        setActiveKnowledgeId(null);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load library data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [
    repository,
    version,
    searchQuery,
    selectedCollection,
    selectedType,
    selectedReview,
    selectedEvidence,
    selectedFreshness,
  ]);

  const setTab = (tab: 'knowledge' | 'sources') => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  const handleSelectKnowledge = (item: KnowledgeItem) => {
    setActiveKnowledgeId(item.id);
  };

  const handleCopyKnowledge = (item: KnowledgeItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = `## ${item.title} (${item.type})\n${item.summary}\n\nApplicability: ${item.applicability || 'General'}\nRequirements: ${item.requirements.join(', ')}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSummary.trim()) return;

    try {
      const reqArray = newRequirements
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean);

      const created = await repository.createKnowledge({
        title: newTitle.trim(),
        summary: newSummary.trim(),
        body: newBody.trim() || '',
        type: newType,
        collectionId: newCollectionId || collections[0]?.id || 'col-01',
        evidenceLevel: newEvidenceLevel,
        reviewStatus: 'draft',
        applicability: newApplicability.trim() || '',
        exclusions: newExclusions.trim() || '',
        requirements: reqArray,
        sourceId: '',
        sourceExcerpt: '',
        sourceRevisionId: '',
        language: locale,
      });

      setCreateModalOpen(false);
      setNewTitle('');
      setNewSummary('');
      setNewBody('');
      setNewApplicability('');
      setNewExclusions('');
      setNewRequirements('');
      notifyMutation();
      setActiveKnowledgeId(created.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Currently active knowledge item for the inspector panel
  const activeItem = useMemo(() => {
    if (!activeKnowledgeId) return knowledgeList[0] || null;
    return knowledgeList.find((k) => k.id === activeKnowledgeId) || knowledgeList[0] || null;
  }, [activeKnowledgeId, knowledgeList]);

  // Find collection name for an item
  const getCollectionName = (colId: string) => {
    const col = collections.find((c) => c.id === colId);
    if (!col) return colId;
    return locale === 'fa' ? col.nameFa : col.name;
  };

  // Find source document for an item
  const getSourceDoc = (sourceId?: string) => {
    if (!sourceId) return null;
    return sourcesList.find((s) => s.id === sourceId) || null;
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 min-h-full flex flex-col">
      {/* Top Section: Page Title + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-[var(--foreground)]">
            {t('library.title')}
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-1">
            {t('library.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/import')}
            className="ui-button ui-button-secondary"
          >
            <FolderOpen className="w-4 h-4 text-[var(--muted)]" />
            <span>{t('library.importResearch')}</span>
          </button>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="ui-button ui-button-primary"
          >
            <Plus className="w-4 h-4" />
            <span>{t('library.newKnowledge')}</span>
          </button>
        </div>
      </div>

      {/* Unified Control Surface: Segmented Switch, Search, and Filters */}
      <div className="ui-panel p-3.5 space-y-3 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Segmented Knowledge / Sources Switch */}
          <div className="ui-segment shrink-0">
            <button
              type="button"
              onClick={() => setTab('knowledge')}
              className={`ui-segment-item ${activeTab === 'knowledge' ? 'active' : ''}`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t('library.tabKnowledge')}</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full font-mono bg-[var(--surface-secondary)] text-[var(--muted)] border border-[var(--border)]">
                {knowledgeList.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab('sources')}
              className={`ui-segment-item ${activeTab === 'sources' ? 'active' : ''}`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t('library.tabSources')}</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full font-mono bg-[var(--surface-secondary)] text-[var(--muted)] border border-[var(--border)]">
                {sourcesList.length}
              </span>
            </button>
          </div>

          {/* Integrated Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute start-3 top-3 pointer-events-none" />
            <input
              type="text"
              dir="auto"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('library.filterLibrary') || 'Filter library…'}
              className="ui-input ps-9 pe-8"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute end-2.5 top-2.5 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Compact Filters Bar (for Knowledge tab) */}
        {activeTab === 'knowledge' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--separator)]">
            {/* Collection Filter */}
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              className="ui-select text-xs py-1"
            >
              <option value="all">{t('library.allCollections')}</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {locale === 'fa' ? c.nameFa : c.name}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="ui-select text-xs py-1"
            >
              <option value="all">{t('library.allTypes')}</option>
              <option value="procedure">{t('types.procedure')}</option>
              <option value="research_finding">{t('types.research_finding')}</option>
              <option value="tip">{t('types.tip')}</option>
              <option value="skill">{t('types.skill')}</option>
              <option value="example">{t('types.example')}</option>
              <option value="failure">{t('types.failure')}</option>
              <option value="lesson">{t('types.lesson')}</option>
            </select>

            {/* Review Status Filter */}
            <select
              value={selectedReview}
              onChange={(e) => setSelectedReview(e.target.value as any)}
              className="ui-select text-xs py-1"
            >
              <option value="all">{t('library.allReview')}</option>
              <option value="reviewed">{t('reviewStatus.reviewed')}</option>
              <option value="draft">{t('reviewStatus.draft')}</option>
              <option value="deprecated">{t('reviewStatus.deprecated')}</option>
            </select>

            {/* Evidence Level Filter */}
            <select
              value={selectedEvidence}
              onChange={(e) => setSelectedEvidence(e.target.value as any)}
              className="ui-select text-xs py-1"
            >
              <option value="all">{t('library.allEvidence')}</option>
              <option value="tested">{t('evidenceLevel.tested')}</option>
              <option value="observed">{t('evidenceLevel.observed')}</option>
              <option value="unverified">{t('evidenceLevel.unverified')}</option>
            </select>

            {/* Freshness Filter */}
            <select
              value={selectedFreshness}
              onChange={(e) => setSelectedFreshness(e.target.value as any)}
              className="ui-select text-xs py-1"
            >
              <option value="all">{t('library.allFreshness')}</option>
              <option value="fresh">{t('library.fresh')}</option>
              <option value="needs_review">{t('library.needsReview')}</option>
              <option value="stale">{t('library.stale')}</option>
            </select>

            {(searchQuery ||
              selectedCollection !== 'all' ||
              selectedType !== 'all' ||
              selectedReview !== 'all' ||
              selectedEvidence !== 'all' ||
              selectedFreshness !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCollection('all');
                  setSelectedType('all');
                  setSelectedReview('all');
                  setSelectedEvidence('all');
                  setSelectedFreshness('all');
                }}
                className="text-xs text-[var(--accent)] hover:underline ms-auto cursor-pointer"
              >
                {t('library.clearFilters')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Content Workspace */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="p-16 text-center text-xs text-[var(--muted)]">
            <Clock className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--accent)]" />
            <span>{t('common.loading')}</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-[var(--danger)] ui-card">
            <AlertCircle className="w-5 h-5 mx-auto mb-2" />
            <span>{error}</span>
          </div>
        ) : activeTab === 'knowledge' ? (
          /* Master-Detail Layout (70-75% list / 25-30% inspector) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Knowledge List (8 cols on lg ~ 67-70%, 9 cols on xl ~ 75%) */}
            <div className="lg:col-span-8 xl:col-span-8 space-y-2">
              {knowledgeList.length === 0 ? (
                <EmptyState
                  title={t('library.noKnowledgeFound')}
                  description={t('common.emptyDesc')}
                  actionLabel={t('library.newKnowledge')}
                  onAction={() => setCreateModalOpen(true)}
                />
              ) : (
                knowledgeList.map((item) => {
                  const isSelected = item.id === activeItem?.id;
                  const sourceDoc = getSourceDoc(item.sourceId);

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectKnowledge(item)}
                      className={`p-4 rounded-xl border border-[var(--border)] transition-colors cursor-pointer relative group ${
                        isSelected
                          ? 'bg-[var(--surface-secondary)]'
                          : 'bg-[var(--surface)] hover:bg-[var(--surface-secondary)]/50'
                      }`}
                    >
                      {/* Left subtle 2px accent indicator line for selected item */}
                      {isSelected && (
                        <div className="absolute start-0 top-3 bottom-3 w-[2px] bg-[var(--accent)] rounded-e" />
                      )}

                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          {/* Row title (14-15px / 600) */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2
                              dir="auto"
                              className="text-[14px] sm:text-[15px] font-semibold text-[var(--foreground)] tracking-tight leading-snug group-hover:text-[var(--accent)] transition-colors"
                            >
                              {item.title}
                            </h2>
                            {item.sourceHasChanged && (
                              <span className="text-[11px] font-medium text-[var(--warning)] px-1.5 py-0.5 rounded bg-[var(--warning)]/10 border border-[var(--warning)]/20">
                                Source Updated
                              </span>
                            )}
                          </div>

                          {/* Short summary (13-14px) */}
                          <p
                            dir="auto"
                            className="text-[13px] text-[var(--muted)] line-clamp-2 leading-relaxed"
                          >
                            {item.summary}
                          </p>

                          {/* Metadata row: Badges + collection + source */}
                          <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px] text-[var(--muted)]">
                            <Badge type="knowledgeType" value={item.type} size="sm" />
                            <Badge type="evidence" value={item.evidenceLevel} size="sm" />
                            <Badge type="review" value={item.reviewStatus} size="sm" />

                            <span className="text-[var(--separator)]">•</span>
                            <span className="truncate">{getCollectionName(item.collectionId)}</span>

                            {sourceDoc && (
                              <>
                                <span className="text-[var(--separator)]">•</span>
                                <span className="font-mono truncate">{sourceDoc.filename}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions aligned opposite */}
                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          <button
                            type="button"
                            onClick={(e) => handleCopyKnowledge(item, e)}
                            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-tertiary)] transition-colors cursor-pointer"
                            title="Copy Summary"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/knowledge/${item.id}`);
                            }}
                            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-tertiary)] transition-colors cursor-pointer"
                            title="Open Detail Page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Inspector Panel (Holding side panel model: coherent, dense, sticky) */}
            <div className="hidden lg:block lg:col-span-4 xl:col-span-4 sticky top-6">
              {activeItem ? (
                <div className="ui-panel p-5 space-y-4 shadow-sm">
                  {/* Inspector Header: Title + open button */}
                  <div className="space-y-2 pb-3 border-b border-[var(--separator)]">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-medium text-[var(--muted)]">
                        {t('library.selectedItem')}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate(`/knowledge/${activeItem.id}`)}
                        className="ui-button ui-button-ghost text-xs p-1 text-[var(--muted)] hover:text-[var(--foreground)] inline-flex items-center gap-1"
                      >
                        <span>{t('common.openDetail')}</span>
                        <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                      </button>
                    </div>

                    <h3
                      dir="auto"
                      className="text-[16px] font-semibold text-[var(--foreground)] leading-snug tracking-tight"
                    >
                      {activeItem.title}
                    </h3>

                    {/* Metadata tags */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <Badge type="knowledgeType" value={activeItem.type} size="sm" />
                      <Badge type="evidence" value={activeItem.evidenceLevel} size="sm" />
                      <Badge type="review" value={activeItem.reviewStatus} size="sm" />
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="space-y-1">
                    <div className="text-[12px] font-medium text-[var(--muted)]">
                      Summary
                    </div>
                    <p
                      dir="auto"
                      className="text-[13px] sm:text-[14px] text-[var(--foreground)] leading-relaxed"
                    >
                      {activeItem.summary}
                    </p>
                  </div>

                  {/* Applicability */}
                  {activeItem.applicability && (
                    <div className="space-y-1">
                      <div className="text-[12px] font-medium text-[var(--muted)]">
                        Applicability
                      </div>
                      <p
                        dir="auto"
                        className="text-[13px] text-[var(--foreground)] leading-relaxed"
                      >
                        {activeItem.applicability}
                      </p>
                    </div>
                  )}

                  {/* Exclusions */}
                  {activeItem.exclusions && (
                    <div className="space-y-1">
                      <div className="text-[12px] font-medium text-[var(--muted)]">
                        Exclusions
                      </div>
                      <p
                        dir="auto"
                        className="text-[13px] text-[var(--muted)] leading-relaxed"
                      >
                        {activeItem.exclusions}
                      </p>
                    </div>
                  )}

                  {/* Requirements */}
                  {activeItem.requirements && activeItem.requirements.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[12px] font-medium text-[var(--muted)]">
                        Prerequisites & Requirements ({activeItem.requirements.length})
                      </div>
                      <ul className="space-y-1 text-[13px] text-[var(--foreground)] list-disc list-inside ps-1">
                        {activeItem.requirements.map((r, i) => (
                          <li key={i} dir="auto" className="leading-snug">
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Source Citation */}
                  {activeItem.sourceExcerpt && (
                    <div className="space-y-1 pt-1 border-t border-[var(--separator)]">
                      <div className="text-[12px] font-medium text-[var(--muted)]">
                        Grounding Citation
                      </div>
                      <blockquote
                        dir="auto"
                        className="text-[13px] text-[var(--muted)] italic ps-2.5 border-s-2 border-[var(--border)] leading-relaxed"
                      >
                        "{activeItem.sourceExcerpt}"
                      </blockquote>
                    </div>
                  )}

                  {/* Inspector Footer Actions */}
                  <div className="pt-3 border-t border-[var(--separator)] flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/knowledge/${activeItem.id}`)}
                      className="flex-1 ui-button ui-button-secondary text-xs"
                    >
                      <span>Open Full Knowledge Node</span>
                      <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180 text-[var(--muted)]" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="ui-panel p-8 text-center text-xs text-[var(--muted)]">
                  Select a knowledge item to inspect details.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* SOURCE VIEW: Refined Transaction-Style Table */
          <div className="ui-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--separator)] bg-[var(--surface-secondary)]/40 text-[var(--muted)] text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4 text-start font-medium">{t('library.colTitle')}</th>
                    <th className="py-3 px-4 text-start font-medium">{t('library.colCollection')}</th>
                    <th className="py-3 px-4 text-start font-medium">Revisions</th>
                    <th className="py-3 px-4 text-start font-medium">File Size</th>
                    <th className="py-3 px-4 text-start font-medium">Imported</th>
                    <th className="py-3 px-4 text-end font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--separator)]">
                  {sourcesList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[var(--muted)]">
                        {t('library.noSourcesFound')}
                      </td>
                    </tr>
                  ) : (
                    sourcesList.map((doc) => {
                      const col = collections.find((c) => c.id === doc.collectionId);
                      const colName = col ? (locale === 'fa' ? col.nameFa : col.name) : '-';

                      return (
                        <tr
                          key={doc.id}
                          onClick={() => navigate(`/documents/${doc.id}`)}
                          className="hover:bg-[var(--surface-secondary)]/60 transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-4 min-w-[220px]">
                            <div className="flex items-center gap-2.5">
                              <FileText className="w-4 h-4 text-[var(--accent)] shrink-0" />
                              <div className="min-w-0">
                                <span
                                  dir="auto"
                                  className="text-[13px] font-medium text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors block truncate"
                                >
                                  {doc.title}
                                </span>
                                <span className="font-mono text-[11px] text-[var(--muted)] block truncate">
                                  {doc.filename}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-[var(--foreground)] whitespace-nowrap">
                            <span className="ui-badge text-[11px] font-normal">
                              {colName}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-[var(--muted)] font-mono whitespace-nowrap">
                            {doc.revisions.length} rev{doc.revisions.length > 1 ? 's' : ''}
                          </td>

                          <td className="py-3.5 px-4 text-[var(--muted)] font-mono whitespace-nowrap">
                            {((doc.rawSize || 0) / 1024).toFixed(1)} KiB
                          </td>

                          <td className="py-3.5 px-4 text-[var(--muted)] whitespace-nowrap">
                            {new Date(doc.importedAt || doc.createdAt).toLocaleDateString()}
                          </td>

                          <td className="py-3.5 px-4 text-end whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/documents/${doc.id}`);
                              }}
                              className="ui-button ui-button-secondary text-xs py-1 px-2.5"
                            >
                              <span>Inspect</span>
                              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* New Knowledge Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="ui-card max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-[var(--separator)]">
              <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[var(--accent)]" />
                <span>{t('library.newKnowledge')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateKnowledge} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[var(--foreground)]">
                  Title (Imperative or Claim)
                </label>
                <input
                  type="text"
                  dir="auto"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Always normalize vector dimensions before dot-product scoring"
                  className="ui-input"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--foreground)]">
                    Knowledge Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="ui-select w-full"
                  >
                    <option value="procedure">Procedure</option>
                    <option value="research_finding">Research Finding</option>
                    <option value="tip">Tip</option>
                    <option value="skill">Skill</option>
                    <option value="example">Example</option>
                    <option value="failure">Failure</option>
                    <option value="lesson">Lesson</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--foreground)]">
                    Evidence Level
                  </label>
                  <select
                    value={newEvidenceLevel}
                    onChange={(e) => setNewEvidenceLevel(e.target.value as any)}
                    className="ui-select w-full"
                  >
                    <option value="tested">Empirically Tested</option>
                    <option value="observed">Observed</option>
                    <option value="unverified">Unverified</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[var(--foreground)]">
                  Collection
                </label>
                <select
                  value={newCollectionId}
                  onChange={(e) => setNewCollectionId(e.target.value)}
                  className="ui-select w-full"
                >
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {locale === 'fa' ? c.nameFa : c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[var(--foreground)]">
                  Executive Summary
                </label>
                <textarea
                  dir="auto"
                  rows={3}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Concise 1-2 sentence explanation of the finding or rule..."
                  className="ui-input"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[var(--foreground)]">
                  Full Technical Body (Markdown)
                </label>
                <textarea
                  dir="auto"
                  rows={4}
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Detailed markdown specification, execution steps, or code..."
                  className="ui-input font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--foreground)]">
                    Applicability Scope
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={newApplicability}
                    onChange={(e) => setNewApplicability(e.target.value)}
                    placeholder="When to apply..."
                    className="ui-input text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--foreground)]">
                    Exclusions / Negative Conditions
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={newExclusions}
                    onChange={(e) => setNewExclusions(e.target.value)}
                    placeholder="When NOT to apply..."
                    className="ui-input text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[var(--foreground)]">
                  Prerequisites (One per line)
                </label>
                <textarea
                  dir="auto"
                  rows={2}
                  value={newRequirements}
                  onChange={(e) => setNewRequirements(e.target.value)}
                  placeholder="Node.js 20+&#10;HNSW index configuration"
                  className="ui-input text-xs"
                />
              </div>

              <div className="pt-3 border-t border-[var(--separator)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="ui-button ui-button-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ui-button ui-button-primary text-xs"
                >
                  Create Knowledge Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
