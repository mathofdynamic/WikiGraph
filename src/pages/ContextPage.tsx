import React, { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  AlertTriangle,
  MoveUp,
  MoveDown,
  Layers,
  FileCode,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import {
  Collection,
  KnowledgeItem,
  KnowledgeType,
  SourceDocument,
} from '../types';
import { Badge } from '../components/common/Badge';

type OutputFormat = 'markdown' | 'json' | 'briefing' | 'plain';

export const ContextPage: React.FC = () => {
  const { repository, version } = useRepository();
  const { t, locale } = useLocale();

  const [allKnowledge, setAllKnowledge] = useState<KnowledgeItem[]>([]);
  const [sources, setSources] = useState<SourceDocument[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);

  // Selection & Assembly state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [format, setFormat] = useState<OutputFormat>('markdown');
  const [taskGoal, setTaskGoal] = useState<string>('Production Readiness Review & Implementation');

  // Search & Filter for Knowledge picker
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('all');
  const [selectedType, setSelectedType] = useState<KnowledgeType | 'all'>('all');

  // Copy & Download states
  const [copied, setCopied] = useState(false);

  // Initial data load
  useEffect(() => {
    let active = true;
    const load = async () => {
      const [kList, sList, cList] = await Promise.all([
        repository.listKnowledge(),
        repository.listSources(),
        repository.listCollections(),
      ]);
      if (!active) return;
      setAllKnowledge(kList);
      setSources(sList);
      setCollections(cList);

      if (kList.length > 0 && selectedIds.length === 0) {
        setSelectedIds(kList.slice(0, 4).map((k) => k.id));
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [repository, version]);

  const selectedItems = useMemo(() => {
    const map = new Map(allKnowledge.map((k) => [k.id, k]));
    return selectedIds.map((id) => map.get(id)).filter(Boolean) as KnowledgeItem[];
  }, [selectedIds, allKnowledge]);

  const availableItems = useMemo(() => {
    let filtered = allKnowledge.filter((k) => !selectedIds.includes(k.id));
    if (selectedCollection !== 'all') {
      filtered = filtered.filter((k) => k.collectionId === selectedCollection);
    }
    if (selectedType !== 'all') {
      filtered = filtered.filter((k) => k.type === selectedType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (k) => k.title.toLowerCase().includes(q) || k.summary.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [allKnowledge, selectedIds, selectedCollection, selectedType, searchQuery]);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedIds.length) return;
    const next = [...selectedIds];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    setSelectedIds(next);
  };

  const removeItem = (id: string) => {
    setSelectedIds((prev) => prev.filter((item) => item !== id));
  };

  const addItem = (id: string) => {
    if (!selectedIds.includes(id)) {
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  // Assembled payload preview
  const assembledPayload = useMemo(() => {
    const sourceMap = new Map(sources.map((s) => [s.id, s]));

    if (format === 'json') {
      const bundle = {
        contextAssemblyVersion: '1.0',
        timestamp: new Date().toISOString(),
        taskObjective: taskGoal,
        totalItems: selectedItems.length,
        items: selectedItems.map((item, idx) => ({
          priority: idx + 1,
          id: item.id,
          title: item.title,
          type: item.type,
          evidenceLevel: item.evidenceLevel,
          summary: item.summary,
          applicability: item.applicability,
          exclusions: item.exclusions,
          requirements: item.requirements,
          procedure: item.body || item.summary,
          sourceCitation: {
            document: sourceMap.get(item.sourceId)?.filename || item.sourceId,
            excerpt: item.sourceExcerpt,
          },
        })),
      };
      return JSON.stringify(bundle, null, 2);
    }

    if (format === 'briefing') {
      let b = `# Technical Context Briefing: ${taskGoal}\n\n`;
      b += `*Generated: ${new Date().toLocaleDateString()} | Grounded Knowledge Units: ${selectedItems.length}*\n\n`;
      b += `## Executive Summary & Applicable Heuristics\n\n`;
      selectedItems.forEach((item, idx) => {
        b += `### ${idx + 1}. ${item.title} [${item.type}]\n`;
        b += `**Core Insight:** ${item.summary}\n`;
        if (item.applicability) b += `**When to Apply:** ${item.applicability}\n`;
        if (item.exclusions) b += `**Constraints:** ${item.exclusions}\n`;
        b += `\n`;
      });
      return b;
    }

    // Default: Markdown
    let md = `# Context Package: ${taskGoal}\n\n`;
    md += `> Assembled for autonomous agent ingestion or human technical review.\n\n`;
    selectedItems.forEach((item, idx) => {
      const srcDoc = sourceMap.get(item.sourceId);
      md += `## Section ${idx + 1}: ${item.title}\n`;
      md += `**Type:** ${item.type} | **Evidence Grade:** ${item.evidenceLevel}\n\n`;
      md += `${item.summary}\n\n`;
      if (item.body) {
        md += `### Execution Steps\n${item.body}\n\n`;
      }
      if (item.sourceExcerpt) {
        md += `> "${item.sourceExcerpt}"\n> — *Source: ${srcDoc?.filename || item.sourceId}*\n\n`;
      }
    });
    return md;
  }, [format, selectedItems, taskGoal, sources]);

  const estimatedTokens = useMemo(() => {
    return Math.round(assembledPayload.length / 4);
  }, [assembledPayload]);

  const handleCopy = () => {
    navigator.clipboard.writeText(assembledPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = format === 'json' ? 'json' : 'md';
    const blob = new Blob([assembledPayload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `context_${taskGoal.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Global Actions */}
      <div className="space-y-3 pb-4 border-b border-[var(--separator)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-[var(--foreground)] leading-snug">
              {t('context.title')}
            </h1>
            <p className="text-[13px] text-[var(--muted)] mt-0.5">
              {t('context.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                className="ui-button ui-button-secondary text-xs"
                title="Clear selected sequence"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="ui-button ui-button-secondary text-xs"
              title={t('common.copy')}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[var(--muted)]" />
              )}
              <span>{copied ? t('common.copied') : t('common.copy')}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="ui-button ui-button-primary text-xs"
              title={t('common.download')}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('common.download')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Three-Zone Studio Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Zone 1: Available Knowledge Browser (4 cols on lg ~ 33%) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="ui-panel p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--separator)]">
              <div>
                <h2 className="text-[13px] sm:text-[14px] font-semibold text-[var(--foreground)] tracking-tight">
                  Available Knowledge
                </h2>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">
                  Browse repository items to stage into context.
                </p>
              </div>
              <span className="text-[11px] font-mono text-[var(--muted)]">
                {availableItems.length} units
              </span>
            </div>

            {/* Filter Inputs */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute start-2.5 top-2 pointer-events-none" />
                <input
                  type="text"
                  dir="auto"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter available items..."
                  className="ui-input ps-8 py-1 text-xs h-8"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedCollection}
                  onChange={(e) => setSelectedCollection(e.target.value)}
                  className="ui-select text-xs h-8"
                >
                  <option value="all">All Collections</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {locale === 'fa' ? c.nameFa : c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as any)}
                  className="ui-select text-xs h-8"
                >
                  <option value="all">All Types</option>
                  <option value="procedure">{t('types.procedure')}</option>
                  <option value="skill">{t('types.skill')}</option>
                  <option value="research_finding">{t('types.research_finding')}</option>
                  <option value="tip">{t('types.tip')}</option>
                  <option value="example">{t('types.example')}</option>
                  <option value="failure">{t('types.failure')}</option>
                  <option value="lesson">{t('types.lesson')}</option>
                </select>
              </div>
            </div>

            {/* List of Available Items */}
            <div className="max-h-[580px] overflow-y-auto space-y-2 pt-1">
              {availableItems.length === 0 ? (
                <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]/40 text-center text-xs text-[var(--muted)]">
                  <p className="italic">No additional items match filter.</p>
                </div>
              ) : (
                availableItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]/40 hover:bg-[var(--surface-secondary)] transition-colors space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Badge type="knowledgeType" value={item.type} size="sm" />
                          <Badge type="evidence" value={item.evidenceLevel} size="sm" />
                        </div>
                        <h3
                          dir="auto"
                          className="text-xs font-semibold text-[var(--foreground)] truncate"
                        >
                          {item.title}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => addItem(item.id)}
                        className="ui-button ui-button-secondary text-xs px-2.5 py-1 shrink-0"
                        title="Add to context packet"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    </div>

                    <p
                      dir="auto"
                      className="text-[11px] text-[var(--muted)] line-clamp-2 leading-relaxed"
                    >
                      {item.summary}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Zone 2: Selected Context Assembly Workspace (4 cols on lg ~ 33%) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="ui-card p-5 sm:p-6 space-y-5">
            {/* Task Objective Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[var(--muted)]">
                Task Objective / Ingestion Goal *
              </label>
              <input
                type="text"
                dir="auto"
                value={taskGoal}
                onChange={(e) => setTaskGoal(e.target.value)}
                placeholder="e.g. Heuristic Table Alignment for SEC Filings"
                className="ui-input text-xs"
              />
            </div>

            {/* Sequence Workspace Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--separator)]">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--muted)]" />
                <h2 className="text-[13px] sm:text-[14px] font-semibold text-[var(--foreground)] tracking-tight">
                  Staged Sequence ({selectedItems.length})
                </h2>
              </div>
              <span className="text-[11px] font-mono text-[var(--muted)]">
                Ordered by execution
              </span>
            </div>

            {/* Selected Sequence Stack */}
            {selectedItems.length === 0 ? (
              <div className="p-8 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]/30 text-center text-xs text-[var(--muted)] space-y-2">
                <p className="font-medium text-[var(--foreground)]">No items in context package</p>
                <p className="leading-relaxed">
                  Choose units from the Available Knowledge list on the left to assemble this package.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[580px] overflow-y-auto">
                {selectedItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]/60 hover:bg-[var(--surface-secondary)] transition-colors space-y-2 group"
                  >
                    {item.sourceHasChanged && (
                      <div className="flex items-center gap-1.5 p-1.5 rounded bg-[var(--surface-tertiary)] border border-[var(--border)] text-[11px] text-[var(--foreground)]">
                        <AlertTriangle className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                        <span>Source document has changed since citation</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] text-[var(--muted)] font-mono font-semibold px-1 rounded bg-[var(--surface-tertiary)]">
                          #{idx + 1}
                        </span>
                        <Badge type="knowledgeType" value={item.type} size="sm" />
                        <h3
                          dir="auto"
                          className="text-xs font-semibold text-[var(--foreground)] truncate"
                        >
                          {item.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveItem(idx, 'up')}
                          className="p-1 rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-tertiary)] disabled:opacity-20 cursor-pointer"
                          title="Move up in sequence"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === selectedItems.length - 1}
                          onClick={() => moveItem(idx, 'down')}
                          className="p-1 rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-tertiary)] disabled:opacity-20 cursor-pointer"
                          title="Move down in sequence"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1 rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-tertiary)] cursor-pointer"
                          title="Remove from package"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p
                      dir="auto"
                      className="text-[11px] text-[var(--muted)] line-clamp-1 leading-relaxed"
                    >
                      {item.summary}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Zone 3: Generated Context Preview & Output (4 cols on lg ~ 33%) */}
        <div className="lg:col-span-4 space-y-4 sticky top-6">
          <div className="ui-panel p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--separator)]">
              <div className="flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-[var(--muted)]" />
                <h2 className="text-[13px] sm:text-[14px] font-semibold text-[var(--foreground)] tracking-tight">
                  Generated Package
                </h2>
              </div>

              {/* Segmented Format Switcher */}
              <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)]">
                {(['markdown', 'json', 'briefing'] as OutputFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormat(fmt)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-medium transition-colors cursor-pointer ${
                      format === fmt
                        ? 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-xs'
                        : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Metrics Metadata Ribbon */}
            <div className="flex items-center justify-between text-[11px] text-[var(--muted)] px-3 py-2 rounded-lg bg-[var(--surface-secondary)]/50 border border-[var(--border)] font-mono">
              <span>{selectedItems.length} units</span>
              <span>&bull;</span>
              <span>~{estimatedTokens.toLocaleString()} tokens</span>
              <span>&bull;</span>
              <span>{assembledPayload.length.toLocaleString()} chars</span>
            </div>

            {/* Assembled Output Body */}
            <div className="p-3.5 rounded-lg bg-[var(--surface-secondary)]/40 border border-[var(--border)] font-mono text-[11px] text-[var(--foreground)] max-h-[460px] overflow-y-auto leading-relaxed select-text">
              <pre className="whitespace-pre-wrap">{assembledPayload}</pre>
            </div>

            {/* Action Group */}
            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopy}
                className="ui-button ui-button-secondary text-xs flex-1 justify-center"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[var(--muted)]" />
                )}
                <span>{copied ? t('common.copied') : 'Copy Package'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="ui-button ui-button-primary text-xs flex-1 justify-center"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export File</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
