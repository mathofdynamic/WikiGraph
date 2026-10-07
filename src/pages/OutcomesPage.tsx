import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Check,
  X,
  AlertCircle,
  ExternalLink,
  Search,
  ShieldCheck,
  FileText,
  Plus,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import {
  KnowledgeItem,
  KnowledgeOutcome,
  OutcomeResult,
} from '../types';

export const OutcomesPage: React.FC = () => {
  const { repository, version, notifyMutation } = useRepository();
  const { t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();

  const [outcomes, setOutcomes] = useState<KnowledgeOutcome[]>([]);
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultFilter, setResultFilter] = useState<OutcomeResult | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null);

  // Create outcome form modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [newAppliedKnowledgeIds, setNewAppliedKnowledgeIds] = useState<string[]>([]);
  const [newResult, setNewResult] = useState<OutcomeResult>('success');
  const [newMetrics, setNewMetrics] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Check for prefill from ContextPage packet
  useEffect(() => {
    if (location.state && (location.state as any).openCreate) {
      const state = location.state as {
        openCreate: boolean;
        task?: string;
        appliedKnowledgeIds?: string[];
      };
      setNewTask(state.task || '');
      setNewAppliedKnowledgeIds(state.appliedKnowledgeIds || []);
      setIsCreateOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const [oList, kList] = await Promise.all([
          repository.listOutcomes(),
          repository.listKnowledge({ includeRetired: true }),
        ]);
        if (!active) return;
        setOutcomes(oList);
        setKnowledgeList(kList);
        if (oList.length > 0 && !selectedOutcomeId) {
          setSelectedOutcomeId(oList[0].id);
        }
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

  const handleCreateOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    try {
      setSubmitting(true);
      const created = await repository.createOutcome({
        task: newTask.trim(),
        taskContext: newTask.trim(),
        appliedKnowledgeIds: newAppliedKnowledgeIds,
        result: newResult,
        metrics: newMetrics.trim() || undefined,
        notes: newNotes.trim() || undefined,
      });
      notifyMutation();
      setIsCreateOpen(false);
      setSelectedOutcomeId(created.id);
      // reset form
      setNewTask('');
      setNewAppliedKnowledgeIds([]);
      setNewMetrics('');
      setNewNotes('');
      setNewResult('success');
    } catch (err) {
      console.error('Failed to create outcome', err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOutcomes = outcomes.filter((o) => {
    if (resultFilter !== 'all' && o.result !== resultFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTask = (o.task || o.taskContext || '').toLowerCase().includes(q);
      const matchNotes = (o.notes || o.reviewNotes || o.prompt || '').toLowerCase().includes(q);
      const matchMetrics = (o.metrics || '').toLowerCase().includes(q);
      return matchTask || matchNotes || matchMetrics;
    }
    return true;
  });

  const selectedOutcome =
    outcomes.find((o) => o.id === selectedOutcomeId) ||
    filteredOutcomes[0] ||
    null;

  const stats = {
    total: outcomes.length,
    success: outcomes.filter((o) => o.result === 'success').length,
    failure: outcomes.filter((o) => o.result === 'failure').length,
    uncertain: outcomes.filter((o) => o.result === 'uncertain').length,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--separator)]">
        <div>
          <h1 className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-[var(--foreground)] leading-snug">
            {t('outcomes.title')}
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">
            {t('outcomes.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--foreground)] text-[var(--surface)] hover:opacity-90 transition-opacity cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t('outcomes.recordBtn')}</span>
        </button>
      </div>

      {/* Summary Metadata Strip (Neutral, Compact, Non-KPI) */}
      <div className="flex items-center gap-3 sm:gap-6 px-4 py-2.5 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border)] text-xs font-mono overflow-x-auto">
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted)]">{t('outcomes.totalRuns')}:</span>
          <span className="font-semibold text-[var(--foreground)]">{stats.total}</span>
        </div>
        <span className="text-[var(--separator)]">•</span>
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted)]">{t('outcomes.successfulRuns')}:</span>
          <span className="font-semibold text-[var(--foreground)]">{stats.success}</span>
        </div>
        <span className="text-[var(--separator)]">•</span>
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted)]">{t('outcomes.failureRuns')}:</span>
          <span className="font-semibold text-[var(--foreground)]">{stats.failure}</span>
        </div>
        <span className="text-[var(--separator)]">•</span>
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted)]">{t('outcomes.inconclusiveRuns')}:</span>
          <span className="font-semibold text-[var(--foreground)]">{stats.uncertain}</span>
        </div>
      </div>

      {/* Unified Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute start-2.5 top-2 pointer-events-none" />
          <input
            type="text"
            dir="auto"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('outcomes.searchOutcomesPlaceholder')}
            className="ui-input ps-8 py-1 text-xs h-8"
          />
        </div>

        {/* Result Filter Segmented Switch */}
        <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] self-start sm:self-auto">
          {(['all', 'success', 'failure', 'uncertain'] as (OutcomeResult | 'all')[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setResultFilter(f)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer capitalize ${
                resultFilter === f
                  ? 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              {f === 'all' ? t('common.all') : t(`results.${f}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Column Layout: History List (70%) + Selected Inspector (30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Outcome History Table / List (~70%) */}
        <div className="lg:col-span-8 space-y-3">
          {filteredOutcomes.length === 0 ? (
            <div className="p-12 text-center text-xs text-[var(--muted)] rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] space-y-2">
              <ShieldCheck className="w-7 h-7 text-[var(--muted)] mx-auto" />
              <p className="font-medium text-[var(--foreground)]">{t('outcomes.noOutcomes')}</p>
              <p className="text-[11px] leading-relaxed">
                Empirical evaluation records ground model reliability across real-world workloads.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden divide-y divide-[var(--separator)]">
              {filteredOutcomes.map((out) => {
                const dateStr = out.recordedAt || out.executedAt;
                const isSelected = selectedOutcome?.id === out.id;

                return (
                  <div
                    key={out.id}
                    onClick={() => setSelectedOutcomeId(out.id)}
                    className={`p-4 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-[var(--surface-secondary)]/80 border-s-2 border-s-[var(--accent)]'
                        : 'hover:bg-[var(--surface-secondary)]/40 border-s-2 border-s-transparent'
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Neutral Result Badge with Distinct Icons */}
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--surface-secondary)] text-[var(--foreground)] border border-[var(--border)]">
                          {out.result === 'success' && (
                            <Check className="w-3 h-3 text-[var(--accent)]" />
                          )}
                          {out.result === 'failure' && (
                            <X className="w-3 h-3 text-[var(--muted)]" />
                          )}
                          {out.result === 'uncertain' && (
                            <AlertCircle className="w-3 h-3 text-[var(--muted)]" />
                          )}
                          <span className="capitalize">{t(`results.${out.result}`)}</span>
                        </div>

                        <h3
                          dir="auto"
                          className="text-xs sm:text-[13px] font-semibold text-[var(--foreground)] truncate"
                        >
                          {out.task || out.taskContext}
                        </h3>
                      </div>

                      {/* Observations / Prompt Snippet */}
                      {(out.notes || out.reviewNotes || out.prompt) && (
                        <p
                          dir="auto"
                          className="text-[12px] text-[var(--muted)] line-clamp-2 leading-relaxed"
                        >
                          {out.notes || out.reviewNotes || out.prompt}
                        </p>
                      )}

                      {/* Metrics and Applied Knowledge Meta */}
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-[var(--muted)] font-mono flex-wrap">
                        {out.metrics && (
                          <span>
                            <span className="text-[var(--foreground)] font-medium">Metric:</span> {out.metrics}
                          </span>
                        )}
                        {out.appliedKnowledgeIds && out.appliedKnowledgeIds.length > 0 && (
                          <span>
                            <span className="text-[var(--foreground)] font-medium">Applied:</span>{' '}
                            {out.appliedKnowledgeIds.length} knowledge node(s)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Timestamp */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 text-xs shrink-0">
                      <span className="text-[11px] text-[var(--muted)] font-mono">
                        {dateStr ? new Date(dateStr).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Outcome Inspector Panel (~30%) */}
        <div className="lg:col-span-4 sticky top-6 space-y-4">
          <div className="ui-panel p-5 space-y-5 shadow-xs">
            {selectedOutcome ? (
              <>
                {/* Header */}
                <div className="flex items-start justify-between pb-3 border-b border-[var(--separator)] gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
                      Outcome Inspector
                    </span>
                    <h2
                      dir="auto"
                      className="text-sm font-semibold text-[var(--foreground)] leading-snug mt-0.5"
                    >
                      {selectedOutcome.task || selectedOutcome.taskContext}
                    </h2>
                  </div>

                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--surface-secondary)] text-[var(--foreground)] border border-[var(--border)] shrink-0">
                    {selectedOutcome.result === 'success' && (
                      <Check className="w-3 h-3 text-[var(--accent)]" />
                    )}
                    {selectedOutcome.result === 'failure' && (
                      <X className="w-3 h-3 text-[var(--muted)]" />
                    )}
                    {selectedOutcome.result === 'uncertain' && (
                      <AlertCircle className="w-3 h-3 text-[var(--muted)]" />
                    )}
                    <span className="capitalize">{t(`results.${selectedOutcome.result}`)}</span>
                  </div>
                </div>

                {/* Execution Metadata */}
                <div className="space-y-2 text-xs">
                  <div className="text-[11px] font-medium text-[var(--muted)]">
                    Execution Details
                  </div>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--muted)]">Recorded Date</span>
                      <span className="text-[var(--foreground)]">
                        {selectedOutcome.recordedAt || selectedOutcome.executedAt
                          ? new Date(
                              selectedOutcome.recordedAt || selectedOutcome.executedAt!
                            ).toLocaleString()
                          : 'Recorded recently'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--muted)]">Outcome ID</span>
                      <span
                        className="text-[var(--muted)] truncate max-w-[170px]"
                        title={selectedOutcome.id}
                      >
                        {selectedOutcome.id}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Measured Benchmark / Metrics */}
                {selectedOutcome.metrics && (
                  <div className="space-y-1.5 pt-3 border-t border-[var(--separator)] text-xs">
                    <div className="text-[11px] font-medium text-[var(--muted)]">
                      {t('outcomes.measuredBenchmark')}
                    </div>
                    <div className="p-2.5 rounded-lg bg-[var(--surface-secondary)]/50 border border-[var(--border)] font-mono text-xs text-[var(--foreground)]">
                      {selectedOutcome.metrics}
                    </div>
                  </div>
                )}

                {/* Observations & Notes */}
                {(selectedOutcome.notes || selectedOutcome.reviewNotes || selectedOutcome.prompt) && (
                  <div className="space-y-1.5 pt-3 border-t border-[var(--separator)] text-xs">
                    <div className="text-[11px] font-medium text-[var(--muted)]">
                      {t('outcomes.observationsTitle')}
                    </div>
                    <p
                      dir="auto"
                      className="text-[13px] text-[var(--foreground)] leading-relaxed p-3 rounded-lg bg-[var(--surface-secondary)]/30 border border-[var(--border)] whitespace-pre-wrap"
                    >
                      {selectedOutcome.notes || selectedOutcome.reviewNotes || selectedOutcome.prompt}
                    </p>
                  </div>
                )}

                {/* Applied Knowledge Provenance */}
                <div className="space-y-2 pt-3 border-t border-[var(--separator)] text-xs">
                  <div className="text-[11px] font-medium text-[var(--muted)]">
                    {t('outcomes.appliedKnowledgeUnits')} ({selectedOutcome.appliedKnowledgeIds?.length || 0})
                  </div>

                  {!selectedOutcome.appliedKnowledgeIds ||
                  selectedOutcome.appliedKnowledgeIds.length === 0 ? (
                    <p className="text-xs text-[var(--muted)] italic">
                      {t('outcomes.noLinkedKnowledge')}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedOutcome.appliedKnowledgeIds.map((kId) => {
                        const k = knowledgeList.find((item) => item.id === kId);
                        return (
                          <div
                            key={kId}
                            onClick={() => navigate(`/knowledge/${kId}`)}
                            className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]/50 hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer flex items-center justify-between gap-2 group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-medium text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors truncate block">
                                {k?.title || kId}
                              </span>
                              {k?.status === 'retired' && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-[var(--surface-tertiary)] text-[var(--muted)] border border-[var(--border)] shrink-0">
                                  {t('outcomes.retiredBadge')}
                                </span>
                              )}
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--accent)] shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-xs text-[var(--muted)]">
                <FileText className="w-6 h-6 text-[var(--muted)] mx-auto mb-2" />
                <p>{t('outcomes.selectOutcomePrompt')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Log Outcome Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-[var(--separator)] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                {t('outcomes.modalTitle')}
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] p-1 rounded-lg hover:bg-[var(--surface-secondary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOutcome} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Task context */}
              <div className="space-y-1.5">
                <label className="font-medium text-[var(--foreground)] block">
                  {t('outcomes.taskContext')} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  dir="auto"
                  required
                  rows={2}
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Task or evaluation run context..."
                  className="ui-input py-2 text-xs w-full resize-none"
                />
              </div>

              {/* Observed Result */}
              <div className="space-y-1.5">
                <label className="font-medium text-[var(--foreground)] block">
                  {t('outcomes.result')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['success', 'failure', 'uncertain'] as OutcomeResult[]).map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setNewResult(res)}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer capitalize ${
                        newResult === res
                          ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] font-semibold'
                          : 'border-[var(--border)] bg-[var(--surface-secondary)]/50 text-[var(--muted)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {res === 'success' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      {res === 'failure' && <X className="w-3.5 h-3.5 text-rose-600" />}
                      {res === 'uncertain' && <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
                      <span>{t(`results.${res}`)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Applied Knowledge Units */}
              <div className="space-y-1.5">
                <label className="font-medium text-[var(--foreground)] block">
                  {t('outcomes.appliedKnowledgeUnits')} ({newAppliedKnowledgeIds.length})
                </label>
                <div className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]/30 space-y-2 max-h-36 overflow-y-auto">
                  {newAppliedKnowledgeIds.length === 0 ? (
                    <p className="text-[11px] text-[var(--muted)] italic">
                      {t('outcomes.noLinkedKnowledge')}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {newAppliedKnowledgeIds.map((id) => {
                        const item = knowledgeList.find((k) => k.id === id);
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[11px] text-[var(--foreground)] max-w-full"
                          >
                            <span className="truncate max-w-[200px]">{item?.title || id}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setNewAppliedKnowledgeIds((prev) => prev.filter((i) => i !== id))
                              }
                              className="text-[var(--muted)] hover:text-rose-600 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Add more knowledge items */}
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value && !newAppliedKnowledgeIds.includes(e.target.value)) {
                        setNewAppliedKnowledgeIds([...newAppliedKnowledgeIds, e.target.value]);
                      }
                    }}
                    className="ui-select text-[11px] py-1 w-full"
                  >
                    <option value="">+ {t('outcomes.selectKnowledge')}...</option>
                    {knowledgeList
                      .filter((k) => !newAppliedKnowledgeIds.includes(k.id))
                      .map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.title}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-1">
                <label className="font-medium text-[var(--foreground)] block">
                  {t('outcomes.metrics')}
                </label>
                <input
                  type="text"
                  dir="auto"
                  value={newMetrics}
                  onChange={(e) => setNewMetrics(e.target.value)}
                  placeholder="e.g. 98.4% precision on financial tables, latency: 120ms"
                  className="ui-input py-1.5 text-xs"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="font-medium text-[var(--foreground)] block">
                  {t('outcomes.notes')}
                </label>
                <textarea
                  dir="auto"
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Observations, lessons, edge cases encountered..."
                  className="ui-input py-1.5 text-xs w-full resize-none"
                />
              </div>

              {/* Rigor Notice */}
              <div className="p-2.5 rounded-lg bg-[var(--surface-secondary)]/60 border border-[var(--border)] text-[11px] text-[var(--muted)] flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-[var(--muted)] shrink-0 mt-0.5" />
                <span>{t('outcomes.rigorNotice')}</span>
              </div>

              {/* Modal footer */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--separator)]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-secondary)] cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newTask.trim()}
                  className="px-4 py-1.5 rounded-lg bg-[var(--foreground)] text-[var(--surface)] font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {submitting ? t('common.loading') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
