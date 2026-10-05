import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Layers,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  Plus,
  RefreshCw,
  AlertCircle,
  X,
  Check,
  Bot,
  AlertTriangle,
  UploadCloud,
  FileCode,
  ArrowRight,
  Tag,
  ShieldCheck,
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
  const [selectedLanguage, setSelectedLanguage] = useState<'all' | 'en' | 'fa'>('all');

  // Data state
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>([]);
  const [sourcesList, setSourcesList] = useState<SourceDocument[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const [newSourceExcerpt, setNewSourceExcerpt] = useState('');

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
      if (selectedLanguage !== 'all') {
        filtered = filtered.filter((k) => k.language === selectedLanguage);
      }
      if (selectedFreshness === 'needs_review') {
        filtered = filtered.filter((k) => k.sourceHasChanged);
      } else if (selectedFreshness === 'fresh') {
        filtered = filtered.filter((k) => !k.sourceHasChanged && k.reviewStatus === 'reviewed');
      } else if (selectedFreshness === 'stale') {
        filtered = filtered.filter((k) => k.reviewStatus === 'deprecated');
      }

      setKnowledgeList(filtered);

      // Auto-select first item if none selected or current selection missing
      if (filtered.length > 0) {
        const hasSelection = filtered.some((k) => k.id === selectedKnowledgeId);
        if (!hasSelection) {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('id', filtered[0].id);
            return next;
          }, { replace: true });
        }
      }
    } catch (err) {
      console.error(err);
      setError(t('common.errorOccurred'));
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
    selectedLanguage,
  ]);

  const setTab = (tab: 'knowledge' | 'sources') => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  const setSelectedId = (id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('id', id);
      return next;
    }, { replace: true });
  };

  // Selected knowledge for inspector
  const inspectorItem = useMemo(() => {
    return knowledgeList.find((k) => k.id === selectedKnowledgeId) || knowledgeList[0] || null;
  }, [knowledgeList, selectedKnowledgeId]);

  // Active filter chips
  const activeChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = [];
    if (selectedCollection !== 'all') {
      const col = collections.find((c) => c.id === selectedCollection);
      chips.push({
        label: `${t('library.filterCollection')}: ${col ? (locale === 'fa' ? col.nameFa : col.name) : selectedCollection}`,
        onRemove: () => setSelectedCollection('all'),
      });
    }
    if (selectedType !== 'all') {
      chips.push({
        label: `${t('library.filterType')}: ${t(`types.${selectedType}`)}`,
        onRemove: () => setSelectedType('all'),
      });
    }
    if (selectedReview !== 'all') {
      chips.push({
        label: `${t('library.filterReview')}: ${t(`reviewStatus.${selectedReview}`)}`,
        onRemove: () => setSelectedReview('all'),
      });
    }
    if (selectedEvidence !== 'all') {
      chips.push({
        label: `${t('library.filterEvidence')}: ${t(`evidenceLevel.${selectedEvidence}`)}`,
        onRemove: () => setSelectedEvidence('all'),
      });
    }
    if (selectedFreshness !== 'all') {
      chips.push({
        label: `${t('library.filterFreshness')}: ${
          selectedFreshness === 'needs_review'
            ? t('library.needsReview')
            : selectedFreshness === 'fresh'
            ? t('library.fresh')
            : t('library.stale')
        }`,
        onRemove: () => setSelectedFreshness('all'),
      });
    }
    if (selectedLanguage !== 'all') {
      chips.push({
        label: `${t('library.filterLanguage')}: ${selectedLanguage === 'fa' ? 'فارسی' : 'English'}`,
        onRemove: () => setSelectedLanguage('all'),
      });
    }
    return chips;
  }, [selectedCollection, selectedType, selectedReview, selectedEvidence, selectedFreshness, selectedLanguage, collections, locale, t]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCollection('all');
    setSelectedType('all');
    setSelectedReview('all');
    setSelectedEvidence('all');
    setSelectedFreshness('all');
    setSelectedLanguage('all');
  };

  const handleCopyAgentPrompt = (e: React.MouseEvent, item: KnowledgeItem) => {
    e.stopPropagation();
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
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSummary.trim()) return;

    try {
      const sourceId = sourcesList[0]?.id || 'src-table-extract-01';
      const requirements = newRequirements
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);

      const created = await repository.createKnowledge({
        title: newTitle.trim(),
        summary: newSummary.trim(),
        body: newBody.trim() || '',
        type: newType,
        collectionId: newCollectionId || collections[0]?.id || 'col-data-extraction',
        sourceId,
        sourceRevisionId: sourcesList[0]?.revisions?.[0]?.revisionId || 'rev-01',
        reviewStatus: 'reviewed',
        evidenceLevel: newEvidenceLevel,
        applicability: newApplicability.trim() || '',
        exclusions: newExclusions.trim() || '',
        requirements,
        sourceExcerpt: newSourceExcerpt.trim() || '',
        language: (locale as any) || 'en',
      });

      setCreateModalOpen(false);
      setNewTitle('');
      setNewSummary('');
      setNewBody('');
      setNewApplicability('');
      setNewExclusions('');
      setNewRequirements('');
      setNewSourceExcerpt('');
      notifyMutation();

      navigate(`/knowledge/${created.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
      {/* Top Section: Page Title + Description with Aligned Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
            {t('library.title')}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            {t('library.subtitle')}
          </p>
        </div>

        {/* Primary Workspace Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/import')}
            className="heroui-btn-secondary"
          >
            <UploadCloud className="w-4 h-4 text-zinc-400" />
            <span>{t('library.importResearch')}</span>
          </button>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="heroui-btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>{t('library.newKnowledge')}</span>
          </button>
        </div>
      </div>

      {/* Controls Bar: Segmented Switch, Integrated Search, and Compact Filters */}
      <div className="space-y-3 p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Segmented Knowledge / Sources Switch */}
          <div className="inline-flex items-center p-1 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0">
            <button
              type="button"
              onClick={() => setTab('knowledge')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'knowledge'
                  ? 'bg-zinc-800 text-zinc-100 shadow-xs border border-zinc-700/60'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>{t('library.tabKnowledge')}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                {knowledgeList.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab('sources')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'sources'
                  ? 'bg-zinc-800 text-zinc-100 shadow-xs border border-zinc-700/60'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>{t('library.tabSources')}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                {sourcesList.length}
              </span>
            </button>
          </div>

          {/* Integrated Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute start-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              dir="auto"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('common.searchPlaceholder')}
              className="heroui-input ps-9 pe-8"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute end-2.5 top-2 text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Compact Filters (for Knowledge tab) */}
        {activeTab === 'knowledge' && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-800/80">
            {/* Collection Filter */}
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              className="heroui-select"
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
              className="heroui-select"
            >
              <option value="all">{t('library.allTypes')}</option>
              <option value="research_finding">{t('types.research_finding')}</option>
              <option value="tip">{t('types.tip')}</option>
              <option value="procedure">{t('types.procedure')}</option>
              <option value="skill">{t('types.skill')}</option>
              <option value="example">{t('types.example')}</option>
              <option value="failure">{t('types.failure')}</option>
              <option value="lesson">{t('types.lesson')}</option>
            </select>

            {/* Review Status Filter */}
            <select
              value={selectedReview}
              onChange={(e) => setSelectedReview(e.target.value as any)}
              className="heroui-select"
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
              className="heroui-select"
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
              className="heroui-select"
            >
              <option value="all">{t('library.allFreshness')}</option>
              <option value="needs_review">{t('library.needsReview')}</option>
              <option value="fresh">{t('library.fresh')}</option>
              <option value="stale">{t('library.stale')}</option>
            </select>

            {/* Language Filter */}
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as any)}
              className="heroui-select"
            >
              <option value="all">{t('library.filterLanguage')}: {t('common.all')}</option>
              <option value="en">English</option>
              <option value="fa">فارسی</option>
            </select>
          </div>
        )}

        {/* Quiet Filter Chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-zinc-500 flex items-center gap-1">
              <Filter className="w-3 h-3" />
            </span>
            {activeChips.map((chip, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-zinc-800 text-zinc-300 border border-zinc-700"
              >
                <span>{chip.label}</span>
                <button
                  type="button"
                  onClick={chip.onRemove}
                  className="hover:text-white p-0.5 rounded cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 underline ps-1 cursor-pointer"
            >
              {t('library.clearFilters')}
            </button>
          </div>
        )}
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="py-16 text-center text-zinc-500 text-xs">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
          <span>{t('common.loading')}</span>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 rounded-xl border border-rose-900/50 bg-rose-950/20 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="px-3 py-1 rounded bg-rose-600 text-white font-medium hover:bg-rose-500 cursor-pointer"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Main Workspace Area */}
      {!loading && !error && (
        <>
          {activeTab === 'knowledge' ? (
            knowledgeList.length === 0 ? (
              <EmptyState
                title={t('library.noKnowledgeFound')}
                description={t('common.emptyDesc')}
                actionLabel={t('library.clearFilters')}
                onAction={clearAllFilters}
              />
            ) : (
              /* Master/Detail Model (Left knowledge list, Right inspector) */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                {/* Left/Main Knowledge List (7 or 8 cols) */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-2">
                  {knowledgeList.map((item) => {
                    const isSelected = item.id === (inspectorItem?.id || selectedKnowledgeId);
                    const col = collections.find((c) => c.id === item.collectionId);

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-zinc-800/80 border-blue-500 shadow-sm ring-1 ring-blue-500/30'
                            : 'bg-[#18181b] border-zinc-800/90 hover:border-zinc-700 hover:bg-zinc-850'
                        }`}
                      >
                        {/* Source Changed Warning Alert */}
                        {item.sourceHasChanged && (
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-medium mb-1.5 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-800/30 w-fit">
                            <Clock className="w-3 h-3" />
                            <span>{t('knowledgeDetail.sourceChangedWarning')}</span>
                          </div>
                        )}

                        {/* Title & Open Action */}
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <h3
                            dir="auto"
                            className={`text-sm font-semibold leading-snug tracking-tight ${
                              isSelected ? 'text-white' : 'text-zinc-200 hover:text-blue-400'
                            }`}
                          >
                            {item.title}
                          </h3>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/knowledge/${item.id}`);
                            }}
                            title={t('common.openDetail')}
                            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50 shrink-0 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Short Summary (2 lines) */}
                        <p
                          dir="auto"
                          className="text-xs text-zinc-400 line-clamp-2 mb-2.5 leading-relaxed"
                        >
                          {item.summary}
                        </p>

                        {/* Metadata / Badges & Source / Freshness Info */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t border-zinc-800/60">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge type="knowledgeType" value={item.type} size="sm" />
                            <Badge type="evidence" value={item.evidenceLevel} size="sm" />
                            <Badge type="review" value={item.reviewStatus} size="sm" />
                          </div>

                          {col && (
                            <span className="text-[11px] text-zinc-500 font-medium truncate max-w-[150px]">
                              {locale === 'fa' ? col.nameFa : col.name}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right Inspector (5 or 4 cols) - Holdings Style Side Panel */}
                <div className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-20">
                  {inspectorItem && (
                    <div className="p-4 rounded-xl border border-zinc-800 bg-[#18181b] space-y-4 shadow-sm">
                      
                      {/* Inspector Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                          {t('library.selectedItem')}
                        </span>
                        <button
                          type="button"
                          onClick={() => navigate(`/knowledge/${inspectorItem.id}`)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 cursor-pointer"
                        >
                          <span>{t('common.openDetail')}</span>
                          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                        </button>
                      </div>

                      {/* Item Badges & Title */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge type="knowledgeType" value={inspectorItem.type} size="sm" />
                          <Badge type="evidence" value={inspectorItem.evidenceLevel} size="sm" />
                          <Badge type="review" value={inspectorItem.reviewStatus} size="sm" />
                        </div>
                        <h4
                          dir="auto"
                          className="text-sm font-bold text-zinc-100 leading-snug"
                        >
                          {inspectorItem.title}
                        </h4>
                      </div>

                      {/* Summary Panel */}
                      <div className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/80 p-3 rounded-lg border border-zinc-800">
                        <div className="font-semibold text-zinc-500 text-[10px] uppercase tracking-wider mb-1">
                          {t('knowledgeDetail.fieldSummary')}
                        </div>
                        <p dir="auto">{inspectorItem.summary}</p>
                      </div>

                      {/* Applicability */}
                      {inspectorItem.applicability && (
                        <div className="text-xs">
                          <span className="font-semibold text-zinc-400 block mb-0.5 text-[11px]">
                            {t('knowledgeDetail.fieldApplicability')}:
                          </span>
                          <span dir="auto" className="text-zinc-300">
                            {inspectorItem.applicability}
                          </span>
                        </div>
                      )}

                      {/* Exclusions */}
                      {inspectorItem.exclusions && (
                        <div className="text-xs">
                          <span className="font-semibold text-rose-400 block mb-0.5 text-[11px]">
                            {t('knowledgeDetail.fieldExclusions')}:
                          </span>
                          <span dir="auto" className="text-zinc-300">
                            {inspectorItem.exclusions}
                          </span>
                        </div>
                      )}

                      {/* Requirements */}
                      {inspectorItem.requirements && inspectorItem.requirements.length > 0 && (
                        <div className="text-xs">
                          <span className="font-semibold text-zinc-400 block mb-1 text-[11px]">
                            {t('knowledgeDetail.fieldRequirements')}:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {inspectorItem.requirements.map((req, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded text-[10px] bg-zinc-900 text-zinc-300 border border-zinc-800 font-mono"
                              >
                                {req}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Citation Excerpt */}
                      {inspectorItem.sourceExcerpt && (
                        <div className="p-3 rounded-lg border-s-2 border-s-blue-500 bg-zinc-900/60 border border-zinc-800 text-xs">
                          <div className="font-semibold text-blue-400 text-[10px] uppercase tracking-wider mb-1">
                            {t('knowledgeDetail.fieldSourceExcerpt')}
                          </div>
                          <blockquote dir="auto" className="italic text-zinc-400 font-mono text-[11px] leading-relaxed">
                            "{inspectorItem.sourceExcerpt}"
                          </blockquote>
                        </div>
                      )}

                      {/* Bottom Inspector Actions */}
                      <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleCopyAgentPrompt(e, inspectorItem)}
                          className="heroui-btn-secondary text-xs flex-1 justify-center"
                        >
                          {copiedId === inspectorItem.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Bot className="w-3.5 h-3.5 text-blue-400" />
                          )}
                          <span>{copiedId === inspectorItem.id ? t('common.copied') : t('marketplace.copyForAgent')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/knowledge/${inspectorItem.id}`)}
                          className="heroui-btn-primary text-xs flex-1 justify-center"
                        >
                          <span>{t('common.openDetail')}</span>
                          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                        </button>
                      </div>

                    </div>
                  )}
                </div>

              </div>
            )
          ) : (
            /* SOURCE VIEW: Refined Table/List Interface (HeroUI Transaction Style) */
            <div className="rounded-xl border border-zinc-800 bg-[#18181b] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left rtl:text-right border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/90 text-zinc-400">
                      <th className="p-3.5 font-medium">{t('sourceDetail.filename')}</th>
                      <th className="p-3.5 font-medium">{t('common.collection')}</th>
                      <th className="p-3.5 font-medium">{t('sourceDetail.revisions')}</th>
                      <th className="p-3.5 font-medium">{t('sourceDetail.rawSize')}</th>
                      <th className="p-3.5 font-medium">{t('library.colUpdated')}</th>
                      <th className="p-3.5 font-medium text-end">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {sourcesList.map((doc) => {
                      const col = collections.find((c) => c.id === doc.collectionId);
                      return (
                        <tr
                          key={doc.id}
                          onClick={() => navigate(`/documents/${doc.id}`)}
                          className="hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                        >
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                              <div>
                                <span className="font-semibold text-zinc-100 group-hover:text-blue-400 transition-colors block">
                                  {doc.title}
                                </span>
                                <span className="font-mono text-[11px] text-zinc-500">
                                  {doc.filename}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 whitespace-nowrap text-zinc-400">
                            {col ? (locale === 'fa' ? col.nameFa : col.name) : '-'}
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[11px] bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                              v{doc.revisions.length}
                            </span>
                          </td>
                          <td className="p-3.5 whitespace-nowrap font-mono text-zinc-400">
                            {Math.round((doc.rawSize || 0) / 1024)} KiB
                          </td>
                          <td className="p-3.5 whitespace-nowrap text-zinc-500">
                            {new Date(doc.updatedAt).toLocaleDateString()}
                          </td>
                          <td className="p-3.5 text-end whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 font-medium text-blue-400 group-hover:underline">
                              <span>{t('common.openDetail')}</span>
                              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* New Knowledge Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#18181b] border border-zinc-800 rounded-xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-zinc-100">
                  {t('library.newKnowledge')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateKnowledge} className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  {t('knowledgeDetail.fieldTitle')} *
                </label>
                <input
                  type="text"
                  dir="auto"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Dual-Pass Bounding Box Alignment for Tables"
                  className="heroui-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    {t('knowledgeDetail.fieldType')}
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as KnowledgeType)}
                    className="heroui-select w-full"
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
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    {t('knowledgeDetail.fieldCollection')}
                  </label>
                  <select
                    value={newCollectionId}
                    onChange={(e) => setNewCollectionId(e.target.value)}
                    className="heroui-select w-full"
                  >
                    {collections.map((col) => (
                      <option key={col.id} value={col.id}>
                        {locale === 'fa' ? col.nameFa : col.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  {t('knowledgeDetail.fieldSummary')} *
                </label>
                <textarea
                  dir="auto"
                  required
                  rows={2}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Concise 1-2 sentence core takeaway..."
                  className="heroui-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  {t('knowledgeDetail.fieldBody')}
                </label>
                <textarea
                  dir="auto"
                  rows={4}
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Technical procedure steps or markdown details..."
                  className="heroui-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    {t('knowledgeDetail.fieldApplicability')}
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={newApplicability}
                    onChange={(e) => setNewApplicability(e.target.value)}
                    className="heroui-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    {t('knowledgeDetail.fieldExclusions')}
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={newExclusions}
                    onChange={(e) => setNewExclusions(e.target.value)}
                    className="heroui-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  {t('knowledgeDetail.fieldRequirements')}
                </label>
                <input
                  type="text"
                  dir="auto"
                  value={newRequirements}
                  onChange={(e) => setNewRequirements(e.target.value)}
                  placeholder="e.g. Python 3.11, Scikit-learn"
                  className="heroui-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  {t('knowledgeDetail.fieldSourceExcerpt')}
                </label>
                <textarea
                  dir="auto"
                  rows={2}
                  value={newSourceExcerpt}
                  onChange={(e) => setNewSourceExcerpt(e.target.value)}
                  className="heroui-input"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="heroui-btn-secondary"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="heroui-btn-primary"
                >
                  {t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
