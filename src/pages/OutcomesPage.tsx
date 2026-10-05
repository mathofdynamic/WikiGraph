import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Sparkles,
  Calendar,
  Layers,
  Trash2,
  ExternalLink,
  BookOpen,
  X,
  History,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import {
  KnowledgeItem,
  KnowledgeOutcome,
  KnowledgeType,
  OutcomeResult,
  ReviewStatus,
} from '../types';
import { Badge } from '../components/common/Badge';
import { ConfirmModal } from '../components/common/ConfirmModal';

export const OutcomesPage: React.FC = () => {
  const { repository, version, notifyMutation } = useRepository();
  const { t, locale } = useLocale();
  const navigate = useNavigate();

  const [outcomes, setOutcomes] = useState<KnowledgeOutcome[]>([]);
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultFilter, setResultFilter] = useState<OutcomeResult | 'all'>('all');

  // New Outcome Modal
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [promptNotes, setPromptNotes] = useState('');
  const [appliedKnowledgeIds, setAppliedKnowledgeIds] = useState<string[]>([]);
  const [result, setResult] = useState<OutcomeResult>('success');
  const [reviewNotes, setReviewNotes] = useState('');

  // Promote Outcome to Lesson/Failure modal
  const [promoteOutcome, setPromoteOutcome] = useState<KnowledgeOutcome | null>(null);
  const [promoteType, setPromoteType] = useState<KnowledgeType>('lesson');
  const [promoteTitle, setPromoteTitle] = useState('');
  const [promoteSummary, setPromoteSummary] = useState('');

  // Delete modal
  const [deleteOutcomeId, setDeleteOutcomeId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const [oList, kList] = await Promise.all([
          repository.listOutcomes(),
          repository.listKnowledge(),
        ]);
        if (!active) return;
        setOutcomes(oList);
        setKnowledgeList(kList);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [repository, version]);

  const filteredOutcomes = outcomes.filter((o) => {
    if (resultFilter === 'all') return true;
    return o.result === resultFilter;
  });

  const handleCreateOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    try {
      await repository.createOutcome({
        task: taskName,
        prompt: promptNotes || undefined,
        appliedKnowledgeIds,
        result,
        reviewNotes: reviewNotes || 'Executed task in workspace.',
      });

      setLogModalOpen(false);
      setTaskName('');
      setPromptNotes('');
      setAppliedKnowledgeIds([]);
      setReviewNotes('');
      notifyMutation();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePromoteOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoteOutcome || !promoteTitle.trim()) return;

    try {
      // Find source of first applied knowledge item for linkage
      const appliedIds = promoteOutcome.appliedKnowledgeIds || [];
      const firstApplied = knowledgeList.find((k) => appliedIds.includes(k.id));

      const created = await repository.createKnowledge({
        title: promoteTitle,
        summary: promoteSummary || promoteOutcome.reviewNotes || promoteOutcome.notes || '',
        body: `Empirical outcome observation logged during task "${promoteOutcome.task || promoteOutcome.taskContext}".\nResult: ${promoteOutcome.result}.\nNotes: ${promoteOutcome.reviewNotes || promoteOutcome.notes || ''}`,
        type: promoteType,
        collectionId: firstApplied?.collectionId || 'col-research-synthesis',
        sourceId: firstApplied?.sourceId || 'src-synth-eval-02',
        sourceRevisionId: firstApplied?.sourceRevisionId || 'rev-src-01-a',
        sourceExcerpt: `Outcome log: ${promoteOutcome.task || promoteOutcome.taskContext} (${promoteOutcome.result})`,
        applicability: `Observed in practice during "${promoteOutcome.task || promoteOutcome.taskContext}".`,
        exclusions: 'Field observation, subject to ongoing testing.',
        requirements: [],
        reviewStatus: 'reviewed',
        evidenceLevel: 'tested',
        language: locale,
        sourceHasChanged: false,
      });

      // Reciprocal relationship link
      if (firstApplied) {
        await repository.addRelationship({
          sourceKnowledgeId: created.id,
          targetKnowledgeId: firstApplied.id,
          relationshipType: promoteType === 'failure' ? 'conflicts_with' : 'derived_from',
          notes: `Observed outcome from executing task: ${promoteOutcome.task}`,
        });
      }

      setPromoteOutcome(null);
      notifyMutation();
      navigate(`/knowledge/${created.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!deleteOutcomeId) return;
    try {
      await repository.deleteOutcome(deleteOutcomeId);
      setDeleteOutcomeId(null);
      notifyMutation();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#23252a]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#8a8f98] uppercase tracking-wider mb-1">
            <span>WikiGraph</span>
            <span>/</span>
            <span className="text-[#828fff] font-medium">
              {t('nav.outcomes')}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-title text-[#f7f8f8]">
            {t('outcomes.title')}
          </h2>
          <p className="text-xs sm:text-sm text-[#8a8f98] mt-0.5">
            {t('outcomes.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Result Filter */}
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value as OutcomeResult | 'all')}
            className="px-2.5 py-1.5 text-xs rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
          >
            <option value="all">{t('common.all')}</option>
            <option value="success">{t('results.success')}</option>
            <option value="failure">{t('results.failure')}</option>
            <option value="uncertain">{t('results.uncertain')}</option>
          </select>

          <button
            type="button"
            onClick={() => setLogModalOpen(true)}
            className="linear-btn-primary text-xs sm:text-sm gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{t('outcomes.logOutcome')}</span>
          </button>
        </div>
      </div>

      {/* Outcomes Timeline List */}
      <div className="space-y-4">
        {filteredOutcomes.length === 0 ? (
          <div className="p-12 text-center text-xs sm:text-sm text-[#8a8f98] border border-dashed border-[#23252a] rounded-xl bg-[#0f1011]">
            {t('outcomes.noOutcomes')}
          </div>
        ) : (
          filteredOutcomes.map((outcome) => (
            <div
              key={outcome.id}
              className="p-5 rounded-xl border border-[#23252a] bg-[#0f1011] space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#23252a]">
                <div className="flex items-center gap-2.5">
                  <Badge type="outcome" value={outcome.result} />
                  <h3
                    dir="auto"
                    className="text-base font-semibold tracking-title text-[#f7f8f8]"
                  >
                    {outcome.task}
                  </h3>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#8a8f98]">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(outcome.executedAt || outcome.recordedAt || Date.now()).toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => setDeleteOutcomeId(outcome.id)}
                    className="p-1 rounded text-[#8a8f98] hover:text-[#fb7185] cursor-pointer ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Review Notes */}
              <div
                dir="auto"
                className="text-xs sm:text-sm text-[#d0d6e0] leading-relaxed bg-[#141516] p-3.5 rounded-lg border border-[#23252a]"
              >
                {outcome.reviewNotes || outcome.notes}
              </div>

              {/* Applied Knowledge Chips */}
              {(outcome.appliedKnowledgeIds || []).length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-xs text-[#8a8f98] font-medium">Applied Knowledge:</span>
                  {(outcome.appliedKnowledgeIds || []).map((kId) => {
                    const item = knowledgeList.find((k) => k.id === kId);
                    return (
                      <button
                        key={kId}
                        type="button"
                        onClick={() => navigate(`/knowledge/${kId}`)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-[#141516] hover:bg-[#1b1c1d] text-[#d0d6e0] border border-[#23252a] cursor-pointer transition-colors"
                      >
                        <span dir="auto">{item?.title || kId}</span>
                        <ExternalLink className="w-3 h-3 text-[#8a8f98]" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Promote action */}
              <div className="pt-2 border-t border-[#23252a] flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setPromoteOutcome(outcome);
                    setPromoteTitle(`Lesson from: ${outcome.task || outcome.taskContext || ''}`);
                    setPromoteSummary(outcome.reviewNotes || outcome.notes || '');
                    setPromoteType(outcome.result === 'failure' ? 'failure' : 'lesson');
                  }}
                  className="linear-btn-secondary text-xs gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[#828fff]" />
                  <span>{t('outcomes.promoteToLesson')}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Log Outcome Modal */}
      {logModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div className="w-full max-w-xl bg-[#0f1011] rounded-xl border border-[#23252a] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#23252a] flex items-center justify-between">
              <h3 className="text-base font-semibold tracking-title text-[#f7f8f8]">
                {t('outcomes.logOutcome')}
              </h3>
              <button
                type="button"
                onClick={() => setLogModalOpen(false)}
                className="p-1 rounded text-[#8a8f98] hover:text-[#f7f8f8] cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateOutcome} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  Task / Prompt Objective *
                </label>
                <input
                  type="text"
                  dir="auto"
                  required
                  placeholder="e.g. Migration of RAG pipeline to edge worker"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  Result *
                </label>
                <select
                  value={result}
                  onChange={(e) => setResult(e.target.value as OutcomeResult)}
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                >
                  <option value="success">{t('results.success')}</option>
                  <option value="failure">{t('results.failure')}</option>
                  <option value="uncertain">{t('results.uncertain')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  Review Notes & Observations *
                </label>
                <textarea
                  dir="auto"
                  required
                  rows={3}
                  placeholder="What happened when the assembled knowledge was applied? Any unexpected failure or edge case?"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  Applied Knowledge Items
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1 p-2 border border-[#23252a] rounded-lg bg-[#141516]">
                  {knowledgeList.map((k) => {
                    const isChecked = appliedKnowledgeIds.includes(k.id);
                    return (
                      <label
                        key={k.id}
                        className="flex items-center gap-2 p-1.5 text-xs hover:bg-[#1b1c1d] rounded cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAppliedKnowledgeIds((prev) => [...prev, k.id]);
                            } else {
                              setAppliedKnowledgeIds((prev) => prev.filter((id) => id !== k.id));
                            }
                          }}
                          className="rounded text-[#5e6ad2] focus:ring-0"
                        />
                        <span dir="auto" className="truncate text-[#d0d6e0]">
                          {k.title}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#23252a]">
                <button
                  type="button"
                  onClick={() => setLogModalOpen(false)}
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
          </div>
        </div>
      )}

      {/* Promote to Lesson/Failure Modal */}
      {promoteOutcome && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg bg-[#0f1011] rounded-xl border border-[#23252a] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#23252a] flex items-center justify-between">
              <h3 className="text-base font-semibold tracking-title text-[#f7f8f8]">
                {t('outcomes.promoteToLesson')}
              </h3>
              <button
                type="button"
                onClick={() => setPromoteOutcome(null)}
                className="p-1 rounded text-[#8a8f98] hover:text-[#f7f8f8] cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handlePromoteOutcome} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  Knowledge Type
                </label>
                <select
                  value={promoteType}
                  onChange={(e) => setPromoteType(e.target.value as KnowledgeType)}
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                >
                  <option value="lesson">{t('types.lesson')}</option>
                  <option value="failure">{t('types.failure')}</option>
                  <option value="tip">{t('types.tip')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  dir="auto"
                  required
                  value={promoteTitle}
                  onChange={(e) => setPromoteTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  Extracted Summary *
                </label>
                <textarea
                  dir="auto"
                  required
                  rows={3}
                  value={promoteSummary}
                  onChange={(e) => setPromoteSummary(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#23252a]">
                <button
                  type="button"
                  onClick={() => setPromoteOutcome(null)}
                  className="linear-btn-secondary text-xs sm:text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="linear-btn-primary text-xs sm:text-sm"
                >
                  Promote & Open
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={deleteOutcomeId !== null}
        title="Delete Outcome Record"
        description="Are you sure you want to delete this task execution outcome?"
        isDestructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteOutcomeId(null)}
      />
    </div>
  );
};
