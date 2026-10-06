import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  X,
  AlertCircle,
  ExternalLink,
  Search,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import {
  KnowledgeItem,
  KnowledgeOutcome,
  OutcomeResult,
} from '../types';

export const OutcomesPage: React.FC = () => {
  const { repository, version } = useRepository();
  const { t } = useLocale();
  const navigate = useNavigate();

  const [outcomes, setOutcomes] = useState<KnowledgeOutcome[]>([]);
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultFilter, setResultFilter] = useState<OutcomeResult | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null);

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
      </div>

      {/* Summary Metadata Strip (Neutral, Compact, Non-KPI) */}
      <div className="flex items-center gap-3 sm:gap-6 px-4 py-2.5 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border)] text-xs font-mono overflow-x-auto">
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted)]">Total Runs:</span>
          <span className="font-semibold text-[var(--foreground)]">{stats.total}</span>
        </div>
        <span className="text-[var(--separator)]">•</span>
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted)]">Successful:</span>
          <span className="font-semibold text-[var(--foreground)]">{stats.success}</span>
        </div>
        <span className="text-[var(--separator)]">•</span>
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted)]">Failure / Breakages:</span>
          <span className="font-semibold text-[var(--foreground)]">{stats.failure}</span>
        </div>
        <span className="text-[var(--separator)]">•</span>
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted)]">Inconclusive:</span>
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
            placeholder="Search evaluation runs..."
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
                      Measured Benchmark
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
                      Observations & Findings
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
                    Applied Knowledge Units ({selectedOutcome.appliedKnowledgeIds?.length || 0})
                  </div>

                  {!selectedOutcome.appliedKnowledgeIds ||
                  selectedOutcome.appliedKnowledgeIds.length === 0 ? (
                    <p className="text-xs text-[var(--muted)] italic">
                      No linked knowledge items recorded.
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
                            <span className="font-medium text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors truncate block">
                              {k?.title || kId}
                            </span>
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
                <p>Select an outcome record to inspect provenance and measurement notes.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
