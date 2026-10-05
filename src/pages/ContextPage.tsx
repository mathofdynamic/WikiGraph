import React, { useEffect, useState, useMemo } from 'react';
import {
  Cpu,
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
  FileText,
  Info,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import {
  Collection,
  ContextRecipe,
  EvidenceLevel,
  KnowledgeItem,
  KnowledgeType,
  ReviewStatus,
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
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)]">
            {t('context.title')}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">
            {t('context.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="ui-button ui-button-secondary text-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? t('common.copied') : t('common.copy')}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="ui-button ui-button-primary text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('common.download')}</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Configuration & Knowledge Selection (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Task Goal Input */}
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-2">
            <label className="block text-xs font-semibold text-[var(--foreground)]">
              Task Objective / Downstream Purpose
            </label>
            <input
              type="text"
              value={taskGoal}
              onChange={(e) => setTaskGoal(e.target.value)}
              placeholder="e.g. Table Extraction Heuristics for Financial Filings"
              className="ui-input"
            />
          </div>

          {/* Selected Knowledge Items in Packet */}
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Assembled Knowledge Sequence</span>
              </span>
              <span className="text-xs font-medium text-blue-400 font-mono">
                {selectedItems.length} units
              </span>
            </div>

            {selectedItems.length === 0 ? (
              <p className="text-xs text-[var(--muted)] py-3 text-center italic">
                No items selected yet. Choose items below to assemble your context packet.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]/70 space-y-1.5 group"
                  >
                    {item.sourceHasChanged && (
                      <div className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Source changed - verification recommended</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs text-[var(--muted)] font-mono">#{idx + 1}</span>
                        <Badge type="knowledgeType" value={item.type} size="sm" />
                        <h4 dir="auto" className="text-xs font-medium text-[var(--foreground)] truncate">
                          {item.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveItem(idx, 'up')}
                          className="p-1 rounded text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-20 cursor-pointer"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === selectedItems.length - 1}
                          onClick={() => moveItem(idx, 'down')}
                          className="p-1 rounded text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-20 cursor-pointer"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1 rounded text-[var(--muted)] hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p dir="auto" className="text-[11px] text-[var(--muted)] line-clamp-1">
                      {item.summary}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Knowledge Picker */}
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)] block">
              Available Knowledge Units
            </span>

            {/* Filter Inputs */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute start-2.5 top-2 pointer-events-none" />
                <input
                  type="text"
                  dir="auto"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter available knowledge..."
                  className="ui-input ps-8 py-1 text-xs"
                />
              </div>

              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="ui-select text-xs py-1"
              >
                <option value="all">All Collections</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {locale === 'fa' ? c.nameFa : c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* List of Available Items */}
            <div className="max-h-64 overflow-y-auto space-y-1.5 divide-y divide-[var(--separator)]">
              {availableItems.length === 0 ? (
                <p className="text-xs text-[var(--muted)] py-3 text-center italic">
                  No additional units match filter.
                </p>
              ) : (
                availableItems.map((item) => (
                  <div key={item.id} className="pt-2 flex items-center justify-between gap-2">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge type="knowledgeType" value={item.type} size="sm" />
                        <span dir="auto" className="text-xs font-medium text-[var(--foreground)] truncate">
                          {item.title}
                        </span>
                      </div>
                      <p dir="auto" className="text-[11px] text-[var(--muted)] line-clamp-1">
                        {item.summary}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => addItem(item.id)}
                      className="ui-button ui-button-secondary text-xs px-2.5 py-1 shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right: Output Format & Assembled Live Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4 sticky top-20">
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-3 shadow-xs">
            
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <span className="text-xs font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-blue-400" />
                <span>Assembled Context Preview</span>
              </span>

              {/* Segmented Format Switch */}
              <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)]">
                {(['markdown', 'json', 'briefing'] as OutputFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormat(fmt)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      format === fmt
                        ? 'bg-[var(--surface-tertiary)] text-[var(--foreground)] shadow-xs'
                        : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Assembled Output Code Box */}
            <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] font-mono text-xs text-[var(--foreground)] max-h-[550px] overflow-y-auto leading-relaxed">
              <pre className="whitespace-pre-wrap">{assembledPayload}</pre>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[var(--muted)] pt-1">
              <span>{assembledPayload.length} characters</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-blue-400 hover:underline cursor-pointer"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
