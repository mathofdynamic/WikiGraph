import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  SkipForward,
  Edit3,
  HelpCircle,
  ExternalLink,
  Layers,
  FileText,
  AlertTriangle,
  AlertCircle,
  Check,
  ChevronRight,
  ChevronLeft,
  Keyboard,
  FileCode,
  FolderOpen,
  Filter,
  RefreshCw,
  Archive,
  Save,
  Plus,
  Trash2,
  BookOpen,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import {
  Collection,
  EvidenceLevel,
  KnowledgeItem,
  KnowledgeType,
  SourceDocument,
} from '../types';
import { Badge } from '../components/common/Badge';
import { ConfirmModal } from '../components/common/ConfirmModal';

/**
 * Searches for excerpt inside content, returning start and end indices.
 * Attempts exact match, trimmed match, and flexible whitespace match.
 */
function findExcerptIndices(
  content: string,
  excerpt: string
): { start: number; end: number } | null {
  if (!content || !excerpt) return null;

  // 1. Direct match
  const exactIdx = content.indexOf(excerpt);
  if (exactIdx !== -1) {
    return { start: exactIdx, end: exactIdx + excerpt.length };
  }

  // 2. Trimmed match
  const trimmed = excerpt.trim();
  const trimmedIdx = content.indexOf(trimmed);
  if (trimmedIdx !== -1) {
    return { start: trimmedIdx, end: trimmedIdx + trimmed.length };
  }

  // 3. Flexible whitespace regex match
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    try {
      const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const pattern = escaped.join('\\s+');
      const regex = new RegExp(pattern);
      const match = regex.exec(content);
      if (match) {
        return { start: match.index, end: match.index + match[0].length };
      }
    } catch {
      // fallback
    }
  }

  return null;
}

export const ReviewPage: React.FC = () => {
  const { repository, version, notifyMutation } = useRepository();
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Route query params
  const initialSourceId = searchParams.get('sourceId') || 'all';
  const initialCollectionId = searchParams.get('col') || 'all';

  // State
  const [collections, setCollections] = useState<Collection[]>([]);
  const [sources, setSources] = useState<SourceDocument[]>([]);
  const [rawItems, setRawItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedSource, setSelectedSource] = useState<string>(initialSourceId);
  const [selectedCollection, setSelectedCollection] = useState<string>(initialCollectionId);

  // Active item & navigation
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Editing state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<Partial<KnowledgeItem>>({});
  const [newRequirementText, setNewRequirementText] = useState<string>('');

  // Modals & Feedback
  const [isRetireModalOpen, setIsRetireModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Session Progress
  const [reviewedInSession, setReviewedInSession] = useState<number>(0);
  const [sessionInitialTotal, setSessionInitialTotal] = useState<number>(0);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const passageScrollRef = useRef<HTMLDivElement>(null);

  // Sync state with search params changes
  useEffect(() => {
    const sId = searchParams.get('sourceId');
    if (sId) setSelectedSource(sId);
    const cId = searchParams.get('col');
    if (cId) setSelectedCollection(cId);
  }, [searchParams]);

  // Load data
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const [cols, srcs, needsReviewItems] = await Promise.all([
          repository.listCollections(),
          repository.listSources(),
          repository.listKnowledge({ reviewStatus: 'needs_review' }),
        ]);

        if (!active) return;
        setCollections(cols);
        setSources(srcs);
        setRawItems(needsReviewItems);

        if (sessionInitialTotal === 0 && needsReviewItems.length > 0) {
          setSessionInitialTotal(needsReviewItems.length);
        }
      } catch (err) {
        console.error('Failed to load review queue:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [repository, version]);

  // Filtered queue items
  const queueItems = useMemo(() => {
    return rawItems.filter((item) => {
      if (selectedCollection !== 'all' && item.collectionId !== selectedCollection) {
        return false;
      }
      if (selectedSource !== 'all' && item.sourceId !== selectedSource) {
        return false;
      }
      return true;
    });
  }, [rawItems, selectedCollection, selectedSource]);

  // Clamped active item
  const currentItem = queueItems[activeIndex] || queueItems[0] || null;

  // Source document of current item
  const activeSourceDoc = useMemo(() => {
    if (!currentItem?.sourceId) return null;
    return sources.find((s) => s.id === currentItem.sourceId) || null;
  }, [currentItem?.sourceId, sources]);

  // Initialize or reset edit form whenever active item changes
  useEffect(() => {
    if (currentItem) {
      setEditForm({
        title: currentItem.title,
        summary: currentItem.summary,
        body: currentItem.body || '',
        type: currentItem.type,
        evidenceLevel: currentItem.evidenceLevel,
        applicability: currentItem.applicability || '',
        exclusions: currentItem.exclusions || '',
        requirements: [...(currentItem.requirements || [])],
        collectionId: currentItem.collectionId,
        language: currentItem.language,
      });
      setIsEditing(false);
    }
  }, [currentItem?.id]);

  // Auto-scroll highlighted excerpt into view
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = document.getElementById('source-passage-highlight');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [currentItem?.id, activeSourceDoc?.id]);

  // Temporary feedback toast
  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 2200);
  };

  // Move in queue
  const handleNext = () => {
    if (queueItems.length === 0) return;
    setActiveIndex((prev) => (prev + 1 < queueItems.length ? prev + 1 : 0));
  };

  const handlePrev = () => {
    if (queueItems.length === 0) return;
    setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : queueItems.length - 1));
  };

  // APPROVE
  const handleApprove = async () => {
    if (!currentItem) return;
    try {
      await repository.updateKnowledge(
        currentItem.id,
        {
          ...editForm,
          reviewStatus: 'reviewed',
        },
        'Approved in knowledge review workflow'
      );
      setReviewedInSession((c) => c + 1);
      showFeedback(t('review.approve') + ': ' + currentItem.title);
      notifyMutation();
      // Auto-advance
      if (activeIndex >= queueItems.length - 1) {
        setActiveIndex(Math.max(0, queueItems.length - 2));
      }
    } catch (err) {
      console.error('Failed to approve item:', err);
    }
  };

  // REJECT (Retire)
  const handleReject = async () => {
    if (!currentItem) return;
    try {
      await repository.retireKnowledge(
        currentItem.id,
        'Rejected & retired during review workflow'
      );
      setReviewedInSession((c) => c + 1);
      showFeedback(t('review.reject') + ': ' + currentItem.title);
      notifyMutation();
      // Auto-advance
      if (activeIndex >= queueItems.length - 1) {
        setActiveIndex(Math.max(0, queueItems.length - 2));
      }
    } catch (err) {
      console.error('Failed to reject item:', err);
    }
  };

  // SKIP
  const handleSkip = () => {
    if (!currentItem) return;
    showFeedback(t('review.skip') + ': ' + currentItem.title);
    handleNext();
  };

  // SAVE EDITS (without approving)
  const handleSaveDraft = async () => {
    if (!currentItem) return;
    try {
      await repository.updateKnowledge(
        currentItem.id,
        editForm,
        'Edited in review queue'
      );
      setIsEditing(false);
      showFeedback(t('review.saveDraft'));
      notifyMutation();
    } catch (err) {
      console.error('Failed to save edits:', err);
    }
  };

  // BULK APPROVE
  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    const idsToApprove = Array.from(selectedIds);
    try {
      for (const id of idsToApprove) {
        await repository.updateKnowledge(
          id,
          { reviewStatus: 'reviewed' },
          'Bulk approved in review workflow'
        );
      }
      setReviewedInSession((c) => c + idsToApprove.length);
      setSelectedIds(new Set());
      showFeedback(`${idsToApprove.length} items approved`);
      notifyMutation();
    } catch (err) {
      console.error('Bulk approve failed:', err);
    }
  };

  // BULK RETIRE
  const handleBulkRetireConfirm = async () => {
    if (selectedIds.size === 0) return;
    const idsToRetire = Array.from(selectedIds);
    try {
      for (const id of idsToRetire) {
        await repository.retireKnowledge(
          id,
          'Bulk retired in review workflow'
        );
      }
      setReviewedInSession((c) => c + idsToRetire.length);
      setSelectedIds(new Set());
      setIsRetireModalOpen(false);
      showFeedback(`${idsToRetire.length} items retired`);
      notifyMutation();
    } catch (err) {
      console.error('Bulk retire failed:', err);
    }
  };

  // KEYBOARD SHORTCUTS LISTENER
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Must NOT fire while user is actively typing in a form field!
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        if (e.key === 'Escape') {
          setIsEditing(false);
          target.blur();
        }
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      const key = e.key.toLowerCase();

      if (key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleNext();
      } else if (key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
      } else if (key === 'a') {
        e.preventDefault();
        handleApprove();
      } else if (key === 'e') {
        e.preventDefault();
        setIsEditing((prev) => !prev);
        if (!isEditing) {
          setTimeout(() => titleInputRef.current?.focus(), 80);
        }
      } else if (key === 'r') {
        e.preventDefault();
        handleReject();
      } else if (key === 's') {
        e.preventDefault();
        handleSkip();
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsShortcutsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [queueItems, activeIndex, currentItem, editForm, isEditing]);

  // Bulk Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.size === queueItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(queueItems.map((k) => k.id)));
    }
  };

  const handleToggleSelectItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Add / Remove requirement
  const handleAddRequirement = () => {
    if (!newRequirementText.trim()) return;
    setEditForm((prev) => ({
      ...prev,
      requirements: [...(prev.requirements || []), newRequirementText.trim()],
    }));
    setNewRequirementText('');
  };

  const handleRemoveRequirement = (idx: number) => {
    setEditForm((prev) => ({
      ...prev,
      requirements: (prev.requirements || []).filter((_, i) => i !== idx),
    }));
  };

  // Progress metrics calculation
  const totalTracked = Math.max(sessionInitialTotal, reviewedInSession + queueItems.length);
  const progressPercent =
    totalTracked > 0 ? Math.min(100, Math.round((reviewedInSession / totalTracked) * 100)) : 0;

  // Split source content into before / highlight / after
  const passageHighlight = useMemo(() => {
    if (!activeSourceDoc || !currentItem?.sourceExcerpt) return null;
    const content = activeSourceDoc.originalContent || '';
    const match = findExcerptIndices(content, currentItem.sourceExcerpt);
    if (!match) return null;

    return {
      before: content.slice(0, match.start),
      highlight: content.slice(match.start, match.end),
      after: content.slice(match.end),
    };
  }, [activeSourceDoc, currentItem?.sourceExcerpt]);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-[var(--background)]">
      {/* Top Header & Context Filters Strip */}
      <div className="px-4 py-2.5 sm:px-6 border-b border-[var(--border)] bg-[var(--surface)] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-[var(--foreground)] leading-tight">
                {t('review.title')}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                {queueItems.length}
              </span>
            </div>
            <p className="text-[11px] text-[var(--muted)] hidden sm:block truncate max-w-md">
              {t('review.subtitle')}
            </p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Collection Filter */}
          <select
            value={selectedCollection}
            onChange={(e) => {
              setSelectedCollection(e.target.value);
              setActiveIndex(0);
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                if (e.target.value === 'all') next.delete('col');
                else next.set('col', e.target.value);
                return next;
              });
            }}
            className="ui-select text-xs py-1"
          >
            <option value="all">{t('review.allCollections')}</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {locale === 'fa' ? c.nameFa : c.name}
              </option>
            ))}
          </select>

          {/* Source Document Filter */}
          <select
            value={selectedSource}
            onChange={(e) => {
              setSelectedSource(e.target.value);
              setActiveIndex(0);
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                if (e.target.value === 'all') next.delete('sourceId');
                else next.set('sourceId', e.target.value);
                return next;
              });
            }}
            className="ui-select text-xs py-1 max-w-[200px]"
          >
            <option value="all">{t('review.allSources')}</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.filename}
              </option>
            ))}
          </select>

          {/* Keyboard Shortcuts Trigger Button */}
          <button
            type="button"
            onClick={() => setIsShortcutsModalOpen(true)}
            className="ui-button ui-button-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1.5"
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard className="w-3.5 h-3.5 text-[var(--muted)]" />
            <span className="hidden md:inline">{t('review.shortcuts')}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-xs text-[var(--muted)]">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--accent)]" />
          <span>{t('common.loading')}</span>
        </div>
      ) : queueItems.length === 0 ? (
        /* Editorial Empty State when Queue is Clear */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold text-[var(--foreground)] tracking-tight">
              {t('review.queueClearTitle')}
            </h2>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              {t('review.queueClearDesc')}
            </p>
          </div>

          {reviewedInSession > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] text-xs text-[var(--foreground)] font-mono">
              {reviewedInSession} {t('review.progressStat').toLowerCase()}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => navigate('/library')}
              className="ui-button ui-button-primary text-xs"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t('review.viewInLibrary')}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/import')}
              className="ui-button ui-button-secondary text-xs"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{t('common.import')}</span>
            </button>
          </div>
        </div>
      ) : (
        /* TWO-PANE REVIEW WORKSPACE */
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* LEFT PANE: Queue List (340px - 380px wide) */}
          <div className="w-full md:w-88 lg:w-96 flex flex-col border-e border-[var(--border)] bg-[var(--surface)] shrink-0 overflow-hidden">
            {/* Queue Summary & Progress Bar */}
            <div className="p-3 border-b border-[var(--separator)] bg-[var(--surface-secondary)]/40 space-y-2 shrink-0">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--foreground)]">
                  {t('review.progress')
                    .replace('{current}', String(reviewedInSession))
                    .replace('{total}', String(totalTracked))}
                </span>
                <span className="text-[11px] font-mono text-[var(--muted)]">
                  {progressPercent}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Bulk Toolbar */}
            <div className="p-2.5 border-b border-[var(--separator)] flex items-center justify-between gap-2 text-xs bg-[var(--surface)] shrink-0">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-[var(--muted)] hover:text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={
                    queueItems.length > 0 && selectedIds.size === queueItems.length
                  }
                  onChange={handleToggleSelectAll}
                  className="accent-[var(--accent)] rounded cursor-pointer"
                />
                <span>
                  {selectedIds.size > 0
                    ? `${selectedIds.size} / ${queueItems.length}`
                    : t('review.selectAll')}
                </span>
              </label>

              {selectedIds.size > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleBulkApprove}
                    className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                    title="Approve selected items"
                  >
                    {t('review.approve')} ({selectedIds.size})
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRetireModalOpen(true)}
                    className="px-2 py-0.5 rounded text-[11px] font-medium bg-stone-200 dark:bg-stone-800 text-[var(--foreground)] hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                    title="Retire selected items"
                  >
                    {t('review.reject')} ({selectedIds.size})
                  </button>
                </div>
              )}
            </div>

            {/* Queue Items Scrollable List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--separator)]">
              {queueItems.map((item, idx) => {
                const isActive = idx === activeIndex;
                const isChecked = selectedIds.has(item.id);

                // Warning flags for queue card
                const hasNoApplicability = !item.applicability || !item.applicability.trim();
                const hasEllipsis =
                  item.sourceExcerpt &&
                  (item.sourceExcerpt.includes('...') || item.sourceExcerpt.includes('…'));
                const hasSourceChanged = !!item.sourceHasChanged;
                const hasNonTheoretical =
                  item.evidenceLevel !== 'unverified' &&
                  (item.evidenceLevel as string) !== 'theoretical';

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setActiveIndex(idx);
                      setIsEditing(false);
                    }}
                    className={`p-3 text-start cursor-pointer transition-colors relative flex items-start gap-2.5 ${
                      isActive
                        ? 'bg-[var(--surface-secondary)] border-s-4 border-s-[var(--accent)]'
                        : 'hover:bg-[var(--surface-secondary)]/50'
                    }`}
                  >
                    {/* Bulk Checkbox */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onClick={(e) => handleToggleSelectItem(item.id, e)}
                      onChange={() => {}}
                      className="mt-0.5 accent-[var(--accent)] rounded cursor-pointer shrink-0"
                    />

                    {/* Card Content */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="text-[13px] font-semibold text-[var(--foreground)] line-clamp-2 leading-snug">
                        {item.title}
                      </div>

                      {/* Type & Evidence Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge type="knowledgeType" value={item.type} size="sm" />
                        <Badge type="evidence" value={item.evidenceLevel} size="sm" />
                      </div>

                      {/* Warning Chips */}
                      {(hasNoApplicability || hasEllipsis || hasSourceChanged || hasNonTheoretical) && (
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          {hasNoApplicability && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
                              <AlertCircle className="w-2.5 h-2.5" />
                              <span>{t('review.warnings.noApplicability')}</span>
                            </span>
                          )}
                          {hasEllipsis && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-200 dark:bg-stone-800 text-[var(--muted)] border border-[var(--border)] inline-flex items-center gap-1">
                              <span>… {t('review.warnings.ellipsis')}</span>
                            </span>
                          )}
                          {hasSourceChanged && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 inline-flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>{t('review.warnings.sourceChanged')}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANE: Focused Item (Fields next to Source Passage) */}
          {currentItem ? (
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[var(--background)]">
              {/* Action Toolbar Header */}
              <div className="p-3 sm:px-6 border-b border-[var(--border)] bg-[var(--surface)] flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--muted)] font-mono">
                    {activeIndex + 1} / {queueItems.length}
                  </span>

                  {actionFeedback && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in ms-2">
                      {actionFeedback}
                    </span>
                  )}
                </div>

                {/* Primary Review Workflow Action Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Approve (a) */}
                  <button
                    type="button"
                    onClick={handleApprove}
                    className="ui-button ui-button-primary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 shadow-xs"
                    title="Approve item (A)"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{t('review.approveShortcut')}</span>
                  </button>

                  {/* Edit Toggle (e) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(!isEditing);
                      if (!isEditing) {
                        setTimeout(() => titleInputRef.current?.focus(), 80);
                      }
                    }}
                    className={`ui-button text-xs py-1.5 px-3 inline-flex items-center gap-1.5 ${
                      isEditing ? 'ui-button-primary' : 'ui-button-secondary'
                    }`}
                    title="Edit fields (E)"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditing ? t('common.save') : t('review.editShortcut')}</span>
                  </button>

                  {/* Reject (r) */}
                  <button
                    type="button"
                    onClick={handleReject}
                    className="ui-button ui-button-secondary text-xs py-1.5 px-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900 inline-flex items-center gap-1.5"
                    title="Reject and retire item (R)"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{t('review.rejectShortcut')}</span>
                  </button>

                  {/* Skip (s) */}
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="ui-button ui-button-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
                    title="Skip item (S)"
                  >
                    <SkipForward className="w-3.5 h-3.5 text-[var(--muted)]" />
                    <span>{t('review.skipShortcut')}</span>
                  </button>

                  {/* Prev / Next buttons */}
                  <div className="flex items-center border border-[var(--border)] rounded-md overflow-hidden ms-1">
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="p-1.5 hover:bg-[var(--surface-secondary)] text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
                      title="Previous (K)"
                    >
                      <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="p-1.5 hover:bg-[var(--surface-secondary)] text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer border-s border-[var(--border)]"
                      title="Next (J)"
                    >
                      <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Split Content Area: Left=Fields, Right=Source Passage */}
              <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)]">
                {/* SUB-PANE 1: Editable Fields Workspace */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  {/* Title */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--muted)]">
                      {t('knowledgeDetail.fieldTitle')}
                    </label>
                    {isEditing ? (
                      <input
                        ref={titleInputRef}
                        type="text"
                        dir="auto"
                        value={editForm.title || ''}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, title: e.target.value }))
                        }
                        className="ui-input w-full font-semibold text-sm"
                      />
                    ) : (
                      <h2
                        dir="auto"
                        className="text-base sm:text-lg font-bold text-[var(--foreground)] leading-snug tracking-tight"
                      >
                        {editForm.title}
                      </h2>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--muted)]">
                      {t('knowledgeDetail.fieldSummary')}
                    </label>
                    {isEditing ? (
                      <textarea
                        dir="auto"
                        rows={3}
                        value={editForm.summary || ''}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, summary: e.target.value }))
                        }
                        className="ui-input w-full text-xs"
                      />
                    ) : (
                      <p
                        dir="auto"
                        className="text-xs sm:text-sm text-[var(--foreground)] leading-relaxed bg-[var(--surface-secondary)]/30 p-3 rounded-xl border border-[var(--border)]"
                      >
                        {editForm.summary}
                      </p>
                    )}
                  </div>

                  {/* Type & Evidence Level Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Knowledge Type */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[var(--muted)]">
                        {t('knowledgeDetail.fieldType')}
                      </label>
                      {isEditing ? (
                        <select
                          value={editForm.type}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              type: e.target.value as KnowledgeType,
                            }))
                          }
                          className="ui-select w-full text-xs"
                        >
                          <option value="procedure">{t('types.procedure')}</option>
                          <option value="research_finding">
                            {t('types.research_finding')}
                          </option>
                          <option value="tip">{t('types.tip')}</option>
                          <option value="skill">{t('types.skill')}</option>
                          <option value="example">{t('types.example')}</option>
                          <option value="failure">{t('types.failure')}</option>
                          <option value="lesson">{t('types.lesson')}</option>
                        </select>
                      ) : (
                        <div>
                          <Badge type="knowledgeType" value={editForm.type || 'tip'} />
                        </div>
                      )}
                    </div>

                    {/* Evidence Level */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[var(--muted)]">
                        {t('knowledgeDetail.fieldEvidenceLevel')}
                      </label>
                      {isEditing ? (
                        <select
                          value={editForm.evidenceLevel}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              evidenceLevel: e.target.value as EvidenceLevel,
                            }))
                          }
                          className="ui-select w-full text-xs"
                        >
                          <option value="unverified">
                            {t('evidenceLevel.unverified')} (Theoretical)
                          </option>
                          <option value="observed">
                            {t('evidenceLevel.observed')} (Tested)
                          </option>
                          <option value="tested">
                            {t('evidenceLevel.tested')} (Production Proven)
                          </option>
                        </select>
                      ) : (
                        <div>
                          <Badge
                            type="evidence"
                            value={editForm.evidenceLevel || 'unverified'}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SCIENTIFIC RIGOR REMINDER CALLOUT */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>{t('review.evidenceNotice')}</span>
                  </div>

                  {/* Body (Extended Markdown) */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--muted)]">
                      {t('knowledgeDetail.fieldBody')}
                    </label>
                    {isEditing ? (
                      <textarea
                        dir="auto"
                        rows={5}
                        value={editForm.body || ''}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, body: e.target.value }))
                        }
                        className="ui-input w-full text-xs font-mono"
                      />
                    ) : editForm.body ? (
                      <div
                        dir="auto"
                        className="text-xs text-[var(--foreground)] leading-relaxed p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] whitespace-pre-wrap font-mono"
                      >
                        {editForm.body}
                      </div>
                    ) : (
                      <div className="text-xs text-[var(--muted)] italic">
                        No body content provided.
                      </div>
                    )}
                  </div>

                  {/* Applicability & Exclusions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[var(--muted)]">
                        {t('knowledgeDetail.fieldApplicability')}
                      </label>
                      {isEditing ? (
                        <textarea
                          dir="auto"
                          rows={3}
                          value={editForm.applicability || ''}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              applicability: e.target.value,
                            }))
                          }
                          className="ui-input w-full text-xs"
                        />
                      ) : (
                        <div
                          dir="auto"
                          className="text-xs text-[var(--foreground)] p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]/30"
                        >
                          {editForm.applicability || (
                            <span className="text-[var(--muted)] italic">None</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[var(--muted)]">
                        {t('knowledgeDetail.fieldExclusions')}
                      </label>
                      {isEditing ? (
                        <textarea
                          dir="auto"
                          rows={3}
                          value={editForm.exclusions || ''}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              exclusions: e.target.value,
                            }))
                          }
                          className="ui-input w-full text-xs"
                        />
                      ) : (
                        <div
                          dir="auto"
                          className="text-xs text-[var(--foreground)] p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]/30"
                        >
                          {editForm.exclusions || (
                            <span className="text-[var(--muted)] italic">None</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Requirements List */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--muted)]">
                      {t('knowledgeDetail.fieldRequirements')}
                    </label>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {(editForm.requirements || []).map((req, rIdx) => (
                        <span
                          key={rIdx}
                          className="px-2 py-0.5 rounded-md text-[11px] bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--foreground)] inline-flex items-center gap-1"
                        >
                          <span>{req}</span>
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRequirement(rIdx)}
                              className="text-[var(--muted)] hover:text-red-500 cursor-pointer"
                            >
                              <XCircle className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}

                      {isEditing && (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="text"
                            value={newRequirementText}
                            onChange={(e) => setNewRequirementText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddRequirement();
                              }
                            }}
                            placeholder="Add requirement..."
                            className="ui-input text-xs py-0.5 px-2 w-36"
                          />
                          <button
                            type="button"
                            onClick={handleAddRequirement}
                            className="p-1 rounded bg-[var(--surface-secondary)] hover:bg-[var(--border)] text-[var(--foreground)] cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Target Collection & Save Edit Actions */}
                  {isEditing && (
                    <div className="pt-3 border-t border-[var(--separator)] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-[var(--muted)]">
                          {t('common.collection')}:
                        </label>
                        <select
                          value={editForm.collectionId}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              collectionId: e.target.value,
                            }))
                          }
                          className="ui-select text-xs py-1"
                        >
                          {collections.map((c) => (
                            <option key={c.id} value={c.id}>
                              {locale === 'fa' ? c.nameFa : c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSaveDraft}
                          className="ui-button ui-button-secondary text-xs"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{t('review.saveDraft')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleApprove}
                          className="ui-button ui-button-primary text-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{t('review.saveAndApprove')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* SUB-PANE 2: SOURCE PASSAGE EVIDENCE */}
                {activeSourceDoc ? (
                  <div
                    ref={passageScrollRef}
                    className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[var(--surface-secondary)]/20 space-y-4"
                  >
                    {/* Source Document Header Card */}
                    <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[var(--accent)]" />
                          <span className="font-semibold text-xs text-[var(--foreground)]">
                            {activeSourceDoc.title}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/documents/${activeSourceDoc.id}`)}
                          className="text-[11px] text-[var(--accent)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>{activeSourceDoc.filename}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
                        <span className="capitalize">{activeSourceDoc.kind || 'research_report'}</span>
                        <span>•</span>
                        <span className="uppercase font-mono">{activeSourceDoc.language}</span>
                        <span>•</span>
                        <span className="font-mono text-[10px] truncate max-w-[150px]">
                          {activeSourceDoc.contentSha256?.slice(0, 16)}...
                        </span>
                      </div>
                    </div>

                    {/* Excerpt Grounding Bar */}
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-[var(--foreground)] flex items-center justify-between">
                        <span>{t('review.sourcePassage')}</span>
                        <span className="text-[11px] text-[var(--muted)] font-mono">
                          {currentItem.sourceExcerpt?.length || 0} chars
                        </span>
                      </div>

                      {/* Render Source Text with Highlight */}
                      {passageHighlight ? (
                        <div
                          dir="auto"
                          className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--foreground)] font-mono leading-relaxed whitespace-pre-wrap select-text max-h-[600px] overflow-y-auto"
                        >
                          <span>{passageHighlight.before}</span>
                          <mark
                            id="source-passage-highlight"
                            className="bg-amber-300 dark:bg-amber-600/50 text-amber-950 dark:text-amber-100 font-semibold px-1 py-0.5 rounded shadow-2xs border border-amber-400 dark:border-amber-500"
                          >
                            {passageHighlight.highlight}
                          </mark>
                          <span>{passageHighlight.after}</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                            {t('review.excerptNotFoundInSource')}
                          </div>

                          <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--foreground)] italic whitespace-pre-wrap">
                            "{currentItem.sourceExcerpt}"
                          </div>

                          {/* Full Source text */}
                          <div
                            dir="auto"
                            className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--muted)] font-mono leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto"
                          >
                            {activeSourceDoc.originalContent}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Item has NO Source Document (e.g., Manual Note) */
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-[var(--muted)] space-y-3 bg-[var(--surface-secondary)]/10">
                    <BookOpen className="w-8 h-8 text-[var(--muted)]" />
                    <p className="max-w-sm leading-relaxed">
                      {t('review.manualNoteNotice')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-xs text-[var(--muted)]">
              {t('review.noItemsSelected')}
            </div>
          )}
        </div>
      )}

      {/* BULK RETIRE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={isRetireModalOpen}
        title={t('review.confirmRetireTitle')}
        description={t('review.confirmRetireDesc').replace(
          '{count}',
          String(selectedIds.size)
        )}
        confirmLabel={t('review.reject')}
        cancelLabel={t('common.cancel')}
        isDestructive={true}
        onConfirm={handleBulkRetireConfirm}
        onCancel={() => setIsRetireModalOpen(false)}
      />

      {/* KEYBOARD SHORTCUTS HELP MODAL */}
      {isShortcutsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setIsShortcutsModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--separator)]">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="text-base font-semibold text-[var(--foreground)]">
                  {t('review.shortcutsDialogTitle')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-secondary)]/50">
                <span className="text-[var(--foreground)]">
                  {t('review.shortcutsHelp.next')}
                </span>
                <kbd className="px-2 py-0.5 rounded font-mono bg-[var(--surface)] border border-[var(--border)] font-semibold text-[var(--foreground)]">
                  J / ↓
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-secondary)]/50">
                <span className="text-[var(--foreground)]">
                  {t('review.shortcutsHelp.prev')}
                </span>
                <kbd className="px-2 py-0.5 rounded font-mono bg-[var(--surface)] border border-[var(--border)] font-semibold text-[var(--foreground)]">
                  K / ↑
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-secondary)]/50">
                <span className="text-[var(--foreground)]">
                  {t('review.shortcutsHelp.approve')}
                </span>
                <kbd className="px-2 py-0.5 rounded font-mono bg-[var(--surface)] border border-[var(--border)] font-semibold text-[var(--foreground)]">
                  A
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-secondary)]/50">
                <span className="text-[var(--foreground)]">
                  {t('review.shortcutsHelp.edit')}
                </span>
                <kbd className="px-2 py-0.5 rounded font-mono bg-[var(--surface)] border border-[var(--border)] font-semibold text-[var(--foreground)]">
                  E
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-secondary)]/50">
                <span className="text-[var(--foreground)]">
                  {t('review.shortcutsHelp.reject')}
                </span>
                <kbd className="px-2 py-0.5 rounded font-mono bg-[var(--surface)] border border-[var(--border)] font-semibold text-[var(--foreground)]">
                  R
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-secondary)]/50">
                <span className="text-[var(--foreground)]">
                  {t('review.shortcutsHelp.skip')}
                </span>
                <kbd className="px-2 py-0.5 rounded font-mono bg-[var(--surface)] border border-[var(--border)] font-semibold text-[var(--foreground)]">
                  S
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-secondary)]/50">
                <span className="text-[var(--foreground)]">
                  {t('review.shortcutsHelp.help')}
                </span>
                <kbd className="px-2 py-0.5 rounded font-mono bg-[var(--surface)] border border-[var(--border)] font-semibold text-[var(--foreground)]">
                  ?
                </kbd>
              </div>
            </div>

            <p className="text-[11px] text-[var(--muted)] leading-relaxed pt-2 border-t border-[var(--separator)]">
              {t('review.shortcutsHelp.note')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
