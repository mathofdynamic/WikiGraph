import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  X,
  History,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import {
  KnowledgeItem,
  KnowledgeOutcome,
  OutcomeResult,
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
        taskContext: taskName,
        prompt: promptNotes || undefined,
        appliedKnowledgeIds,
        result,
        notes: reviewNotes || undefined,
        reviewNotes: reviewNotes || 'Executed task in workspace.',
      });

      setLogModalOpen(false);
      setTaskName('');
      setPromptNotes('');
      setAppliedKnowledgeIds([]);
      setResult('success');
      setReviewNotes('');
      notifyMutation();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteOutcome = async () => {
    if (!deleteOutcomeId) return;
    try {
      await repository.deleteOutcome(deleteOutcomeId);
      setDeleteOutcomeId(null);
      notifyMutation();
    } catch (err) {
      console.error(err);
    }
  };

  const stats = {
    total: outcomes.length,
    success: outcomes.filter((o) => o.result === 'success').length,
    failure: outcomes.filter((o) => o.result === 'failure').length,
    uncertain: outcomes.filter((o) => o.result === 'uncertain').length,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
            {t('outcomes.title')}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            {t('outcomes.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setLogModalOpen(true)}
          className="heroui-btn-primary"
        >
          <Plus className="w-4 h-4" />
          <span>{t('outcomes.recordBtn')}</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-zinc-800 bg-[#18181b]">
          <div className="text-xl font-bold text-zinc-100 font-mono">{stats.total}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Total Audit Runs</div>
        </div>
        <div className="p-3.5 rounded-xl border border-emerald-800/30 bg-emerald-950/15">
          <div className="text-xl font-bold text-emerald-400 font-mono">{stats.success}</div>
          <div className="text-[11px] text-emerald-400/80 mt-0.5">Successful Runs</div>
        </div>
        <div className="p-3.5 rounded-xl border border-rose-800/30 bg-rose-950/15">
          <div className="text-xl font-bold text-rose-400 font-mono">{stats.failure}</div>
          <div className="text-[11px] text-rose-400/80 mt-0.5">Failure / Breakages</div>
        </div>
        <div className="p-3.5 rounded-xl border border-amber-800/30 bg-amber-950/15">
          <div className="text-xl font-bold text-amber-400 font-mono">{stats.uncertain}</div>
          <div className="text-[11px] text-amber-400/80 mt-0.5">Inconclusive</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-900 border border-zinc-800 w-fit">
        {(['all', 'success', 'failure', 'uncertain'] as (OutcomeResult | 'all')[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setResultFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              resultFilter === f
                ? 'bg-zinc-800 text-zinc-100 shadow-xs border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {f === 'all' ? t('common.all') : t(`results.${f}`)}
          </button>
        ))}
      </div>

      {/* Outcomes List */}
      <div className="space-y-3">
        {filteredOutcomes.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-500 rounded-xl border border-zinc-800 bg-[#18181b]">
            <p>{t('outcomes.noOutcomes')}</p>
          </div>
        ) : (
          filteredOutcomes.map((out) => {
            const dateStr = out.recordedAt || out.executedAt;
            return (
              <div
                key={out.id}
                className="p-4 rounded-xl border border-zinc-800 bg-[#18181b] space-y-2.5 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge type="outcome" value={out.result} size="sm" />
                    <span className="text-xs font-semibold text-zinc-100">
                      {out.task || out.taskContext}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {dateStr ? new Date(dateStr).toLocaleDateString() : 'Recent'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDeleteOutcomeId(out.id)}
                      className="text-zinc-500 hover:text-rose-400 cursor-pointer p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {out.metrics && (
                  <div className="p-2 rounded bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-zinc-300">
                    <span className="text-zinc-500 me-2">Measured:</span>
                    <span>{out.metrics}</span>
                  </div>
                )}

                {(out.notes || out.reviewNotes || out.prompt) && (
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {out.notes || out.reviewNotes || out.prompt}
                  </p>
                )}

                {/* Linked Knowledge Items */}
                {out.appliedKnowledgeIds && out.appliedKnowledgeIds.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-zinc-800/80">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Applied:</span>
                    {out.appliedKnowledgeIds.map((kId) => {
                      const k = knowledgeList.find((item) => item.id === kId);
                      return (
                        <button
                          key={kId}
                          type="button"
                          onClick={() => navigate(`/knowledge/${kId}`)}
                          className="px-2 py-0.5 rounded text-[11px] bg-zinc-900 text-blue-400 hover:text-blue-300 border border-zinc-800 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>{k?.title || kId}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Log Outcome Modal */}
      {logModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#18181b] border border-zinc-800 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-100">
                {t('outcomes.modalTitle')}
              </h3>
              <button
                type="button"
                onClick={() => setLogModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOutcome} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Task / Execution Context *
                </label>
                <input
                  type="text"
                  required
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="e.g. Scanned SEC 10-K tables extraction batch"
                  className="heroui-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Result
                </label>
                <select
                  value={result}
                  onChange={(e) => setResult(e.target.value as OutcomeResult)}
                  className="heroui-select w-full"
                >
                  <option value="success">{t('results.success')}</option>
                  <option value="failure">{t('results.failure')}</option>
                  <option value="uncertain">{t('results.uncertain')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Applied Knowledge Items
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
                  {knowledgeList.map((k) => {
                    const isChecked = appliedKnowledgeIds.includes(k.id);
                    return (
                      <label
                        key={k.id}
                        className="flex items-center gap-2 p-1 rounded hover:bg-zinc-800/50 cursor-pointer"
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
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-zinc-300 truncate">{k.title}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Measured Benchmarks / Metrics
                </label>
                <input
                  type="text"
                  value={promptNotes}
                  onChange={(e) => setPromptNotes(e.target.value)}
                  placeholder="e.g. 99.1% column alignment, 0 unparsed cells"
                  className="heroui-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Observations / Review Notes
                </label>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Key empirical lessons or failure symptoms..."
                  className="heroui-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setLogModalOpen(false)}
                  className="heroui-btn-secondary"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="heroui-btn-primary"
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
        isOpen={Boolean(deleteOutcomeId)}
        title="Delete Outcome Record"
        description="Are you sure you want to delete this recorded empirical outcome?"
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        isDestructive
        onConfirm={handleDeleteOutcome}
        onCancel={() => setDeleteOutcomeId(null)}
      />
    </div>
  );
};
