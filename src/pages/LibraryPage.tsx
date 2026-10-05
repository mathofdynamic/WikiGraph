import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  UploadCloud,
  Plus,
  Filter,
  X,
  Search,
  FileText,
  Lightbulb,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Clock,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import {
  Collection,
  EvidenceLevel,
  KnowledgeFilter,
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

  // Tab: 'knowledge' | 'sources'
  const activeTab = (searchParams.get('tab') as 'knowledge' | 'sources') || 'knowledge';

  // Filters state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCollection, setSelectedCollection] = useState(searchParams.get('col') || 'all');
  const [selectedType, setSelectedType] = useState<KnowledgeType | 'all'>(
    (searchParams.get('type') as KnowledgeType) || 'all'
  );
  const [selectedLanguage, setSelectedLanguage] = useState<'all' | 'en' | 'fa'>(
    (searchParams.get('lang') as 'all' | 'en' | 'fa') || 'all'
  );
  const [selectedReview, setSelectedReview] = useState<ReviewStatus | 'all'>(
    (searchParams.get('review') as ReviewStatus) || 'all'
  );
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceLevel | 'all'>(
    (searchParams.get('evidence') as EvidenceLevel) || 'all'
  );
  const [selectedFreshness, setSelectedFreshness] = useState<
    'all' | 'needs_review' | 'fresh' | 'stale'
  >((searchParams.get('freshness') as 'all' | 'needs_review' | 'fresh' | 'stale') || 'all');

  // Data state
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>([]);
  const [sourcesList, setSourcesList] = useState<SourceDocument[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inspector state for wide screen
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState<string | null>(null);
  const [newKnowledgeModalOpen, setNewKnowledgeModalOpen] = useState(false);

  // Load data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const filterArgs: KnowledgeFilter = {
        search: searchQuery,
        collectionId: selectedCollection !== 'all' ? selectedCollection : undefined,
        type: selectedType,
        language: selectedLanguage !== 'all' ? selectedLanguage : undefined,
        reviewStatus: selectedReview,
        evidenceLevel: selectedEvidence,
        freshness: selectedFreshness,
      };

      const [kRes, sRes, cRes] = await Promise.all([
        repository.listKnowledge(filterArgs),
        repository.listSources(),
        repository.listCollections(),
      ]);

      setKnowledgeList(kRes);
      setSourcesList(sRes);
      setCollections(cRes);

      if (kRes.length > 0 && !selectedKnowledgeId) {
        setSelectedKnowledgeId(kRes[0].id);
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
    selectedLanguage,
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

  // Selected knowledge for inspector
  const inspectorItem = useMemo(() => {
    return knowledgeList.find((k) => k.id === selectedKnowledgeId) || null;
  }, [knowledgeList, selectedKnowledgeId]);

  // Active filter chips count and list
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
    if (selectedLanguage !== 'all') {
      chips.push({
        label: `${t('library.filterLanguage')}: ${selectedLanguage === 'fa' ? 'فارسی' : 'English'}`,
        onRemove: () => setSelectedLanguage('all'),
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
    if (searchQuery.trim() !== '') {
      chips.push({
        label: `"${searchQuery}"`,
        onRemove: () => setSearchQuery(''),
      });
    }
    return chips;
  }, [
    selectedCollection,
    selectedType,
    selectedLanguage,
    selectedReview,
    selectedEvidence,
    selectedFreshness,
    searchQuery,
    collections,
    locale,
    t,
  ]);

  const clearAllFilters = () => {
    setSelectedCollection('all');
    setSelectedType('all');
    setSelectedLanguage('all');
    setSelectedReview('all');
    setSelectedEvidence('all');
    setSelectedFreshness('all');
    setSearchQuery('');
  };

  // Filter sources if search query exists
  const filteredSources = useMemo(() => {
    if (!searchQuery.trim()) return sourcesList;
    const q = searchQuery.toLowerCase();
    return sourcesList.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.filename.toLowerCase().includes(q) ||
        s.originalContent.toLowerCase().includes(q)
    );
  }, [sourcesList, searchQuery]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#23252a]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#8a8f98] uppercase tracking-wider mb-1">
            <span>WikiGraph</span>
            <span>/</span>
            <span className="text-[#5e6ad2] font-medium">
              {t('nav.library')}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-title text-[#f7f8f8]">
            {t('library.title')}
          </h2>
          <p className="text-xs sm:text-sm text-[#8a8f98] mt-0.5">
            {t('library.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/import')}
            className="linear-btn-secondary text-xs sm:text-sm gap-2"
          >
            <UploadCloud className="w-4 h-4 text-[#5e6ad2]" />
            <span>{t('library.importResearch')}</span>
          </button>
          <button
            type="button"
            onClick={() => setNewKnowledgeModalOpen(true)}
            className="linear-btn-primary text-xs sm:text-sm gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{t('library.newKnowledge')}</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center p-1 rounded-lg bg-[#0f1011] border border-[#23252a] w-fit">
            <button
              type="button"
              onClick={() => setTab('knowledge')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'knowledge'
                  ? 'bg-[#141516] text-[#f7f8f8] border border-[#23252a]'
                  : 'text-[#8a8f98] hover:text-[#f7f8f8] border border-transparent'
              }`}
            >
              <Lightbulb className="w-4 h-4 text-[#5e6ad2]" />
              <span>{t('library.tabKnowledge')}</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-[#1e2024] text-[#8a8f98]">
                {knowledgeList.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab('sources')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'sources'
                  ? 'bg-[#141516] text-[#f7f8f8] border border-[#23252a]'
                  : 'text-[#8a8f98] hover:text-[#f7f8f8] border border-transparent'
              }`}
            >
              <FileText className="w-4 h-4 text-[#7a7fad]" />
              <span>{t('library.tabSources')}</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-[#1e2024] text-[#8a8f98]">
                {sourcesList.length}
              </span>
            </button>
          </div>

          {/* Quick in-library Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[#8a8f98] absolute start-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              dir="auto"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('common.searchPlaceholder')}
              className="w-full ps-9 pe-8 py-1.5 text-xs sm:text-sm rounded-md border border-[#23252a] bg-[#0f1011] text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute end-2.5 top-2 text-[#8a8f98] hover:text-[#f7f8f8] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Bar (for Knowledge tab) */}
        {activeTab === 'knowledge' && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            {/* Collection Filter */}
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              className="px-2.5 py-1.5 rounded-md border border-[#23252a] bg-[#0f1011] text-[#d0d6e0] cursor-pointer focus:outline-none focus:border-[#5e6ad2]"
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
              onChange={(e) => setSelectedType(e.target.value as KnowledgeType | 'all')}
              className="px-2.5 py-1.5 rounded-md border border-[#23252a] bg-[#0f1011] text-[#d0d6e0] cursor-pointer focus:outline-none focus:border-[#5e6ad2]"
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
              onChange={(e) => setSelectedReview(e.target.value as ReviewStatus | 'all')}
              className="px-2.5 py-1.5 rounded-md border border-[#23252a] bg-[#0f1011] text-[#d0d6e0] cursor-pointer focus:outline-none focus:border-[#5e6ad2]"
            >
              <option value="all">{t('library.allReview')}</option>
              <option value="reviewed">{t('reviewStatus.reviewed')}</option>
              <option value="draft">{t('reviewStatus.draft')}</option>
              <option value="deprecated">{t('reviewStatus.deprecated')}</option>
            </select>

            {/* Evidence Level Filter */}
            <select
              value={selectedEvidence}
              onChange={(e) => setSelectedEvidence(e.target.value as EvidenceLevel | 'all')}
              className="px-2.5 py-1.5 rounded-md border border-[#23252a] bg-[#0f1011] text-[#d0d6e0] cursor-pointer focus:outline-none focus:border-[#5e6ad2]"
            >
              <option value="all">{t('library.allEvidence')}</option>
              <option value="tested">{t('evidenceLevel.tested')}</option>
              <option value="observed">{t('evidenceLevel.observed')}</option>
              <option value="unverified">{t('evidenceLevel.unverified')}</option>
            </select>

            {/* Freshness Filter */}
            <select
              value={selectedFreshness}
              onChange={(e) =>
                setSelectedFreshness(
                  e.target.value as 'all' | 'needs_review' | 'fresh' | 'stale'
                )
              }
              className="px-2.5 py-1.5 rounded-md border border-[#23252a] bg-[#0f1011] text-[#d0d6e0] cursor-pointer focus:outline-none focus:border-[#5e6ad2]"
            >
              <option value="all">{t('library.allFreshness')}</option>
              <option value="needs_review">{t('library.needsReview')}</option>
              <option value="fresh">{t('library.fresh')}</option>
              <option value="stale">{t('library.stale')}</option>
            </select>

            {/* Language Filter */}
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as 'all' | 'en' | 'fa')}
              className="px-2.5 py-1.5 rounded-md border border-[#23252a] bg-[#0f1011] text-[#d0d6e0] cursor-pointer focus:outline-none focus:border-[#5e6ad2]"
            >
              <option value="all">{t('library.filterLanguage')}: {t('common.all')}</option>
              <option value="en">English</option>
              <option value="fa">فارسی</option>
            </select>
          </div>
        )}

        {/* Active Filter Chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-[#8a8f98] flex items-center gap-1">
              <Filter className="w-3 h-3" />
            </span>
            {activeChips.map((chip, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-[#141516] text-[#d0d6e0] border border-[#23252a]"
              >
                <span>{chip.label}</span>
                <button
                  type="button"
                  onClick={chip.onRemove}
                  className="hover:text-[#f7f8f8] p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs text-[#8a8f98] hover:text-[#f7f8f8] underline ps-1 cursor-pointer"
            >
              {t('library.clearFilters')}
            </button>
          </div>
        )}
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="p-12 text-center text-[#8a8f98] text-sm">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#5e6ad2]" />
          <span>{t('common.loading')}</span>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 rounded-xl border border-[#34343a] bg-[#141516] flex items-center justify-between text-xs sm:text-sm text-[#f43f5e]">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="px-2.5 py-1 rounded bg-[#f43f5e] text-white font-medium hover:bg-rose-600 cursor-pointer"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Main Content Area */}
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
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Knowledge List (Left 7 cols on wide screen) */}
                <div className="lg:col-span-7 space-y-2.5">
                  {knowledgeList.map((item) => {
                    const isSelected = item.id === selectedKnowledgeId;
                    const col = collections.find((c) => c.id === item.collectionId);

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedKnowledgeId(item.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-[#141516] border-[#5e6ad2]'
                            : 'bg-[#0f1011] border-[#23252a] hover:border-[#34343a]'
                        }`}
                      >
                        {/* Needs Review Alert Stripe */}
                        {item.sourceHasChanged && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#f59e0b] font-medium mb-1.5 bg-[#141516] px-2 py-0.5 rounded border border-[#34343a] w-fit">
                            <Clock className="w-3 h-3" />
                            <span>{t('knowledgeDetail.sourceChangedWarning')}</span>
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <h3
                            dir="auto"
                            className="text-sm sm:text-base font-semibold text-[#f7f8f8] hover:text-[#828fff] leading-snug tracking-card-title"
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
                            className="p-1 rounded text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#18191a] shrink-0 cursor-pointer"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>

                        <p
                          dir="auto"
                          className="text-xs sm:text-sm text-[#8a8f98] line-clamp-2 mb-3 leading-relaxed"
                        >
                          {item.summary}
                        </p>

                        {/* Badges footer */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs pt-2 border-t border-[#23252a]">
                          <Badge type="knowledgeType" value={item.type} size="sm" />
                          <Badge type="evidence" value={item.evidenceLevel} size="sm" />
                          <Badge type="review" value={item.reviewStatus} size="sm" />
                          {col && (
                            <span className="text-[11px] text-[#8a8f98] font-medium ms-auto">
                              {locale === 'fa' ? col.nameFa : col.name}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Wide-screen Detail Inspector (Right 5 cols) */}
                <div className="hidden lg:block lg:col-span-5 sticky top-24">
                  {inspectorItem ? (
                    <div className="p-5 rounded-xl border border-[#23252a] bg-[#0f1011] space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-[#23252a]">
                        <span className="text-xs uppercase tracking-wider text-[#8a8f98]">
                          {t('library.selectedItem')}
                        </span>
                        <button
                          type="button"
                          onClick={() => navigate(`/knowledge/${inspectorItem.id}`)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#828fff] hover:text-[#5e6ad2] cursor-pointer"
                        >
                          <span>{t('common.openDetail')}</span>
                          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                        </button>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge type="knowledgeType" value={inspectorItem.type} />
                          <Badge type="evidence" value={inspectorItem.evidenceLevel} />
                          <Badge type="review" value={inspectorItem.reviewStatus} />
                        </div>
                        <h4
                          dir="auto"
                          className="text-base font-semibold tracking-card-title text-[#f7f8f8] leading-snug"
                        >
                          {inspectorItem.title}
                        </h4>
                      </div>

                      <div className="text-xs sm:text-sm text-[#d0d6e0] leading-relaxed bg-[#141516] p-3 rounded-lg border border-[#23252a]">
                        <div className="font-semibold text-[#8a8f98] text-[11px] uppercase tracking-wider mb-1">
                          {t('knowledgeDetail.fieldSummary')}
                        </div>
                        <p dir="auto">{inspectorItem.summary}</p>
                      </div>

                      {inspectorItem.applicability && (
                        <div className="text-xs">
                          <span className="font-semibold text-[#8a8f98] block mb-0.5">
                            {t('knowledgeDetail.fieldApplicability')}:
                          </span>
                          <span dir="auto" className="text-[#d0d6e0]">
                            {inspectorItem.applicability}
                          </span>
                        </div>
                      )}

                      {inspectorItem.exclusions && (
                        <div className="text-xs">
                          <span className="font-semibold text-[#8a8f98] block mb-0.5">
                            {t('knowledgeDetail.fieldExclusions')}:
                          </span>
                          <span dir="auto" className="text-[#d0d6e0]">
                            {inspectorItem.exclusions}
                          </span>
                        </div>
                      )}

                      {/* Source excerpt citation pin */}
                      <div className="text-xs p-3 rounded-lg border border-[#23252a] border-s-2 border-s-[#5e6ad2] bg-[#141516]">
                        <span className="font-semibold text-[#828fff] block mb-1">
                          {t('knowledgeDetail.fieldSourceExcerpt')}
                        </span>
                        <blockquote
                          dir="auto"
                          className="italic text-[#d0d6e0] ps-2"
                        >
                          "{inspectorItem.sourceExcerpt}"
                        </blockquote>
                        <div className="mt-2 pt-2 border-t border-[#23252a] flex items-center justify-between text-[11px] text-[#8a8f98]">
                          <button
                            type="button"
                            onClick={() => navigate(`/documents/${inspectorItem.sourceId}`)}
                            className="hover:text-[#f7f8f8] underline cursor-pointer"
                          >
                            {t('sourceDetail.title')}
                          </button>
                          <span>{inspectorItem.sourceRevisionId}</span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          ) : (
            /* Sources Tab View */
            <div className="space-y-3">
              {filteredSources.length === 0 ? (
                <EmptyState
                  title={t('library.noSourcesFound')}
                  description={t('common.emptyDesc')}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredSources.map((doc) => {
                    const col = collections.find((c) => c.id === doc.collectionId);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => navigate(`/documents/${doc.id}`)}
                        className="p-5 rounded-xl border border-[#23252a] bg-[#0f1011] hover:border-[#34343a] transition-all cursor-pointer group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs text-[#8a8f98] mb-2">
                            <span>{doc.filename}</span>
                            <span>{((doc.rawSize || 0) / 1024).toFixed(1)} KiB</span>
                          </div>

                          <h3
                            dir="auto"
                            className="text-base font-semibold text-[#f7f8f8] group-hover:text-[#828fff] mb-2 leading-snug tracking-card-title"
                          >
                            {doc.title}
                          </h3>

                          <div className="flex items-center gap-2 text-xs text-[#8a8f98] mb-4">
                            <Layers className="w-3.5 h-3.5 text-[#8a8f98]" />
                            <span>
                              {doc.revisions.length} {t('sourceDetail.revisions')}
                            </span>
                            <span>&bull;</span>
                            <span>{doc.language === 'fa' ? 'فارسی' : 'English'}</span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-[#23252a] flex items-center justify-between text-xs">
                          <span className="font-medium text-[#8a8f98]">
                            {col ? (locale === 'fa' ? col.nameFa : col.name) : ''}
                          </span>
                          <span className="text-[#828fff] font-medium group-hover:text-[#5e6ad2] transition-colors flex items-center gap-1">
                            <span>{t('sourceDetail.viewOriginal')}</span>
                            <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* New Knowledge Modal */}
      {newKnowledgeModalOpen && (
        <CreateKnowledgeModal
          isOpen={newKnowledgeModalOpen}
          collections={collections}
          sources={sourcesList}
          onClose={() => setNewKnowledgeModalOpen(false)}
          onCreated={() => {
            setNewKnowledgeModalOpen(false);
            notifyMutation();
          }}
        />
      )}
    </div>
  );
};

// Modal for creating new knowledge directly
interface CreateKnowledgeModalProps {
  isOpen: boolean;
  collections: Collection[];
  sources: SourceDocument[];
  onClose: () => void;
  onCreated: () => void;
}

const CreateKnowledgeModal: React.FC<CreateKnowledgeModalProps> = ({
  isOpen,
  collections,
  sources,
  onClose,
  onCreated,
}) => {
  const { repository } = useRepository();
  const { t, locale } = useLocale();

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<KnowledgeType>('procedure');
  const [collectionId, setCollectionId] = useState(collections[0]?.id || 'col-research-synthesis');
  const [sourceId, setSourceId] = useState(sources[0]?.id || '');
  const [sourceExcerpt, setSourceExcerpt] = useState('');
  const [applicability, setApplicability] = useState('');
  const [exclusions, setExclusions] = useState('');
  const [requirementsStr, setRequirementsStr] = useState('');
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>('draft');
  const [evidenceLevel, setEvidenceLevel] = useState<EvidenceLevel>('observed');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim()) return;

    try {
      setSaving(true);
      const chosenSource = sources.find((s) => s.id === sourceId);
      const revisionId = chosenSource?.revisions[0]?.revisionId || 'rev-src-01-a';

      const requirements = requirementsStr
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);

      await repository.createKnowledge({
        title,
        summary,
        body,
        type,
        collectionId,
        sourceId: sourceId || sources[0]?.id || 'src-synth-eval-02',
        sourceRevisionId: revisionId,
        sourceExcerpt: sourceExcerpt || summary,
        applicability,
        exclusions,
        requirements,
        reviewStatus,
        evidenceLevel,
        language: locale,
        sourceHasChanged: false,
      });

      onCreated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-2xl bg-[#0f1011] rounded-xl border border-[#23252a] overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#23252a]">
          <h3 className="text-base font-semibold tracking-title text-[#f7f8f8]">
            {t('library.newKnowledge')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#8a8f98] hover:text-[#f7f8f8] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-[#8a8f98] mb-1">
              {t('knowledgeDetail.fieldTitle')} *
            </label>
            <input
              type="text"
              dir="auto"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                {t('knowledgeDetail.fieldType')}
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as KnowledgeType)}
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
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
              >
                {collections.map((c) => (
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
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8a8f98] mb-1">
              {t('knowledgeDetail.fieldBody')}
            </label>
            <textarea
              dir="auto"
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2] text-xs leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                {t('knowledgeDetail.fieldReviewStatus')}
              </label>
              <select
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value as ReviewStatus)}
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
                value={evidenceLevel}
                onChange={(e) => setEvidenceLevel(e.target.value as EvidenceLevel)}
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
              {t('sourceDetail.title')}
            </label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
            >
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.filename})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8a8f98] mb-1">
              {t('knowledgeDetail.fieldSourceExcerpt')}
            </label>
            <input
              type="text"
              dir="auto"
              value={sourceExcerpt}
              onChange={(e) => setSourceExcerpt(e.target.value)}
              placeholder="Exact sentence or paragraph from source report..."
              className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#23252a]">
            <button
              type="button"
              onClick={onClose}
              className="linear-btn-secondary text-xs sm:text-sm"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="linear-btn-primary text-xs sm:text-sm"
            >
              {saving ? t('common.saving') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
