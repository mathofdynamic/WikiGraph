import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Copy,
  Check,
  Download,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Layers,
  FileCode,
  FileText,
  Sliders,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Bookmark,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  ClipboardList,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import {
  Collection,
  ContextRequest,
  ContextResult,
  KnowledgeItem,
  SourceDocument,
} from '../types';
import { Badge } from '../components/common/Badge';
import { formatContextMarkdown } from '../lib/retrieval';

export const ContextPage: React.FC = () => {
  const { repository, version } = useRepository();
  const { t, locale } = useLocale();
  const navigate = useNavigate();

  // Collections & Metadata
  const [collections, setCollections] = useState<Collection[]>([]);
  const [allKnowledgeMap, setAllKnowledgeMap] = useState<Map<string, KnowledgeItem>>(new Map());

  // Form State
  const [task, setTask] = useState<string>(
    'Extract complex tables from research documents into structured markdown'
  );
  const [tools, setTools] = useState<string>('python, pdfplumber');
  const [inputs, setInputs] = useState<string>('scanned PDF files');
  const [outputFormat, setOutputFormat] = useState<string>('structured markdown');
  const [language, setLanguage] = useState<'any' | 'en' | 'fa'>('any');
  const [constraints, setConstraints] = useState<string>('cpu-only execution');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [maxTokens, setMaxTokens] = useState<number>(4000);
  const [includeUnreviewed, setIncludeUnreviewed] = useState<boolean>(false);

  // Retrieval Result State
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ContextResult | null>(null);
  const [showExcluded, setShowExcluded] = useState<boolean>(false);

  // Copy Feedback
  const [copiedMd, setCopiedMd] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Load collections and knowledge map
  useEffect(() => {
    let active = true;
    const loadMeta = async () => {
      try {
        const [cols, kList] = await Promise.all([
          repository.listCollections(),
          repository.listKnowledge({ includeRetired: true }),
        ]);
        if (!active) return;
        setCollections(cols);
        setAllKnowledgeMap(new Map(kList.map((k) => [k.id, k])));
      } catch (err) {
        console.error('Failed to load collections', err);
      }
    };
    loadMeta();
    return () => {
      active = false;
    };
  }, [repository, version]);

  // Execute retrieval query
  const executeQuery = useCallback(async () => {
    if (!task.trim()) return;
    try {
      setLoading(true);

      const parsedTools = tools
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const request: ContextRequest = {
        task: task.trim(),
        requirements: {
          tools: parsedTools.length > 0 ? parsedTools : undefined,
          inputs: inputs.trim() || undefined,
          outputFormat: outputFormat.trim() || undefined,
          language: language === 'any' ? undefined : language,
          constraints: constraints.trim() || undefined,
        },
        collectionIds: selectedCollection !== 'all' ? [selectedCollection] : undefined,
        maxTokens: maxTokens > 0 ? maxTokens : 4000,
        includeUnreviewed,
      };

      const res = await repository.buildContext(request);
      setResult(res);
    } catch (err) {
      console.error('Retrieval error', err);
    } finally {
      setLoading(false);
    }
  }, [
    repository,
    task,
    tools,
    inputs,
    outputFormat,
    language,
    constraints,
    selectedCollection,
    maxTokens,
    includeUnreviewed,
  ]);

  // Run initial query once on load
  useEffect(() => {
    executeQuery();
  }, [repository, version]);

  // Markdown packet string
  const markdownPacket = useMemo(() => {
    if (!result) return '';
    return formatContextMarkdown(result);
  }, [result]);

  const handleCopyMarkdown = async () => {
    if (!markdownPacket) return;
    await navigator.clipboard.writeText(markdownPacket);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handleCopyJson = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!markdownPacket) return;
    const blob = new Blob([markdownPacket], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `context-packet-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLogOutcome = () => {
    if (!result) return;
    const appliedIds = result.selected.map((s) => s.item.id);
    navigate('/outcomes', {
      state: {
        openCreate: true,
        task: result.request.task,
        appliedKnowledgeIds: appliedIds,
      },
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Top Header */}
      <div className="pb-4 border-b border-[var(--separator)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-[var(--foreground)] leading-snug">
            {t('context.title')}
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">
            {t('context.subtitle')}
          </p>
        </div>

        {/* Global Export & Actions Header Strip */}
        {result && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
            >
              {copiedMd ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('common.copied')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[var(--muted)]" />
                  <span>{t('context.copyMarkdown')}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[var(--muted)]" />
              <span>{t('context.downloadMarkdown')}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
            >
              {copiedJson ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('common.copied')}</span>
                </>
              ) : (
                <>
                  <FileCode className="w-3.5 h-3.5 text-[var(--muted)]" />
                  <span>{t('context.copyJson')}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleLogOutcome}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--foreground)] text-[var(--surface)] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>{t('context.logOutcome')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Two-Pane Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Task & Retrieval Requirements Form (approx 38%) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--separator)]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="text-sm font-semibold text-[var(--foreground)]">
                  {t('context.leftTitle')}
                </h2>
              </div>
              <span className="text-[11px] font-mono text-[var(--muted)]">API /query Contract</span>
            </div>

            {/* Task Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                {t('context.taskField')} <span className="text-rose-500">*</span>
              </label>
              <textarea
                dir="auto"
                rows={3}
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder={t('context.taskPlaceholder')}
                className="ui-input py-2 text-xs leading-relaxed w-full resize-none"
              />
            </div>

            {/* Requirements Sub-form */}
            <div className="pt-2 border-t border-[var(--separator)] space-y-3">
              <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                {t('context.requirementsTitle')}
              </div>

              {/* Tools */}
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-[var(--muted)]">
                  {t('context.toolsField')}
                </label>
                <input
                  type="text"
                  dir="auto"
                  value={tools}
                  onChange={(e) => setTools(e.target.value)}
                  placeholder={t('context.toolsPlaceholder')}
                  className="ui-input text-xs py-1.5"
                />
              </div>

              {/* Inputs */}
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-[var(--muted)]">
                  {t('context.inputsField')}
                </label>
                <input
                  type="text"
                  dir="auto"
                  value={inputs}
                  onChange={(e) => setInputs(e.target.value)}
                  placeholder={t('context.inputsPlaceholder')}
                  className="ui-input text-xs py-1.5"
                />
              </div>

              {/* Output Format */}
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-[var(--muted)]">
                  {t('context.outputFormatField')}
                </label>
                <input
                  type="text"
                  dir="auto"
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  placeholder={t('context.outputFormatPlaceholder')}
                  className="ui-input text-xs py-1.5"
                />
              </div>

              {/* Constraints */}
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-[var(--muted)]">
                  {t('context.constraintsField')}
                </label>
                <input
                  type="text"
                  dir="auto"
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  placeholder={t('context.constraintsPlaceholder')}
                  className="ui-input text-xs py-1.5"
                />
              </div>

              {/* Language Selection */}
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-[var(--muted)]">
                  {t('context.languageField')}
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="ui-select text-xs py-1.5"
                >
                  <option value="any">{t('context.languageAny')}</option>
                  <option value="en">{t('context.languageEn')}</option>
                  <option value="fa">{t('context.languageFa')}</option>
                </select>
              </div>
            </div>

            {/* Scope & Budget Parameters */}
            <div className="pt-2 border-t border-[var(--separator)] space-y-3">
              {/* Collection Scope */}
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-[var(--muted)]">
                  {t('context.collectionsFilter')}
                </label>
                <select
                  value={selectedCollection}
                  onChange={(e) => setSelectedCollection(e.target.value)}
                  className="ui-select text-xs py-1.5"
                >
                  <option value="all">{t('context.allCollections')}</option>
                  {collections.map((col) => (
                    <option key={col.id} value={col.id}>
                      {locale === 'fa' ? col.nameFa || col.name : col.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Token Budget Control */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <label className="font-medium text-[var(--muted)]">
                    {t('context.budgetField')}
                  </label>
                  <span className="font-mono font-semibold text-[var(--foreground)]">
                    {maxTokens.toLocaleString()} tokens
                  </span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={12000}
                  step={500}
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="w-full accent-[var(--accent)] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[var(--muted)] font-mono">
                  <span>1,000</span>
                  <span>4,000 (Default)</span>
                  <span>12,000</span>
                </div>
              </div>

              {/* Include Unreviewed Toggle */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-[var(--surface-secondary)] transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={includeUnreviewed}
                    onChange={(e) => setIncludeUnreviewed(e.target.checked)}
                    className="mt-0.5 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-medium text-[var(--foreground)]">
                      {t('context.includeUnreviewed')}
                    </div>
                    <div className="text-[11px] text-[var(--muted)] leading-tight">
                      {t('context.includeUnreviewedHint')}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Run Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={executeQuery}
                disabled={loading || !task.trim()}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t('context.retrieving')}</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>{t('context.retrieveBtn')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Pane: Context Package Results & Analysis (approx 62%) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {!result ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] space-y-2">
              <Search className="w-7 h-7 mx-auto text-[var(--muted)]" />
              <p className="text-xs font-medium text-[var(--foreground)]">
                {t('context.noItemsSelected')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 1. Sufficiency Banner */}
              <div
                className={`p-4 rounded-xl border transition-colors ${
                  result.sufficiency === 'sufficient'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                    : result.sufficiency === 'partial'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.sufficiency === 'sufficient' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  {result.sufficiency === 'partial' && (
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  )}
                  {result.sufficiency === 'insufficient' && (
                    <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  )}

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {t(`context.sufficiency.${result.sufficiency}`)}
                      </span>
                      <span className="text-[11px] font-mono opacity-75">
                        ({result.selected.length} units selected)
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed opacity-90">
                      {result.sufficiencyNote}
                    </p>

                    {result.sufficiency === 'insufficient' && (
                      <p className="text-xs font-medium pt-1 text-rose-700 dark:text-rose-300">
                        {t('context.insufficientNotice')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Conflicts Box (if any exist) */}
              {result.conflicts && result.conflicts.length > 0 && (
                <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider">
                      {t('context.conflictsTitle')} ({result.conflicts.length})
                    </h3>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                    {t('context.conflictsDesc')}
                  </p>
                  <div className="space-y-1.5 pt-1">
                    {result.conflicts.map((c, idx) => {
                      const itemA = allKnowledgeMap.get(c.itemIds[0]);
                      const itemB = allKnowledgeMap.get(c.itemIds[1]);
                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-[var(--surface)] border border-amber-500/20 text-xs space-y-1 text-[var(--foreground)]"
                        >
                          <div className="font-semibold flex items-center gap-2 text-xs">
                            <span className="truncate">{itemA?.title || c.itemIds[0]}</span>
                            <span className="text-amber-600 font-mono text-[10px] shrink-0">⟷</span>
                            <span className="truncate">{itemB?.title || c.itemIds[1]}</span>
                          </div>
                          {c.note && (
                            <div className="text-[11px] text-[var(--muted)] italic">
                              "{c.note}"
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Token Estimate Strip */}
              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--foreground)]">
                      {t('context.tokenEstimateLabel')}
                    </span>
                    <span className="text-[11px] text-[var(--muted)] font-mono">
                      (rule: ceil(chars / 4))
                    </span>
                  </div>
                  <div className="font-mono text-xs">
                    <span className="font-bold text-[var(--foreground)]">
                      {result.tokenEstimate.used.toLocaleString()}
                    </span>
                    <span className="text-[var(--muted)]">
                      {' '}
                      / {result.tokenEstimate.budget.toLocaleString()} tokens
                    </span>
                  </div>
                </div>

                {/* Progress meter */}
                <div className="w-full h-1.5 bg-[var(--surface-secondary)] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      result.tokenEstimate.used > result.tokenEstimate.budget * 0.9
                        ? 'bg-amber-500'
                        : 'bg-[var(--accent)]'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (result.tokenEstimate.used / result.tokenEstimate.budget) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* 4. Selected Knowledge Units List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-[var(--accent)]" />
                    <span>{t('context.selectedUnits')}</span>
                    <span className="text-xs font-mono text-[var(--muted)] font-normal">
                      ({result.selected.length})
                    </span>
                  </h3>
                </div>

                {result.selected.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[var(--muted)] rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]">
                    {t('context.noItemsSelected')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {result.selected.map((sel, idx) => {
                      const item = sel.item;
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 space-y-3 shadow-xs hover:border-[var(--border-hover)] transition-colors"
                        >
                          {/* Item Card Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                            <div className="space-y-1.5 min-w-0 flex-1">
                              {/* Badges row */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Role Badge */}
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider border ${
                                    sel.role === 'primary'
                                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300'
                                      : sel.role === 'prerequisite'
                                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300'
                                      : 'bg-[var(--surface-secondary)] border-[var(--border)] text-[var(--muted)]'
                                  }`}
                                >
                                  {t(`context.role.${sel.role}`)}
                                </span>

                                <Badge type="knowledgeType" value={item.type} />
                                <Badge type="evidence" value={item.evidenceLevel} />
                                <Badge type="review" value={item.reviewStatus} />

                                {/* Score badge */}
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--muted)] border border-[var(--border)]">
                                  Score: {sel.score}
                                </span>
                              </div>

                              {/* Title */}
                              <h4
                                dir="auto"
                                className="text-sm font-semibold text-[var(--foreground)] leading-snug"
                              >
                                {item.title}
                              </h4>
                            </div>

                            <button
                              type="button"
                              onClick={() => navigate(`/knowledge/${item.id}`)}
                              className="text-[11px] font-medium text-[var(--muted)] hover:text-[var(--accent)] flex items-center gap-1 self-start shrink-0 cursor-pointer pt-0.5"
                            >
                              <span>Inspect</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Match Reasons */}
                          {sel.reasons && sel.reasons.length > 0 && (
                            <div className="flex items-start gap-2 flex-wrap text-[11px]">
                              <span className="text-[var(--muted)] shrink-0 font-medium">
                                {t('context.reasonsLabel')}:
                              </span>
                              {sel.reasons.map((r, rIdx) => (
                                <span
                                  key={rIdx}
                                  className="px-2 py-0.5 rounded-md bg-[var(--surface-secondary)] text-[var(--foreground)] border border-[var(--border)] text-[10px]"
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Item Warnings (if any) */}
                          {sel.warnings && sel.warnings.length > 0 && (
                            <div className="flex items-start gap-2 flex-wrap text-[11px]">
                              <span className="text-amber-600 dark:text-amber-400 shrink-0 font-medium">
                                {t('context.warningsLabel')}:
                              </span>
                              {sel.warnings.map((w, wIdx) => (
                                <span
                                  key={wIdx}
                                  className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-[10px] font-medium"
                                >
                                  {w}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Summary & Applicability */}
                          <div className="text-xs text-[var(--muted)] leading-relaxed space-y-1.5">
                            <p dir="auto" className="text-[var(--foreground)]">
                              {item.summary}
                            </p>
                            {item.applicability && (
                              <p dir="auto" className="text-[11px]">
                                <span className="font-semibold text-[var(--foreground)]">
                                  Applicability:
                                </span>{' '}
                                {item.applicability}
                              </p>
                            )}
                            {item.exclusions && (
                              <p dir="auto" className="text-[11px] text-rose-700 dark:text-rose-300">
                                <span className="font-semibold">Exclusions:</span> {item.exclusions}
                              </p>
                            )}
                          </div>

                          {/* Source Citation with Excerpt Blockquote */}
                          {(sel.source || item.sourceExcerpt) && (
                            <div className="pt-2 border-t border-[var(--separator)] space-y-1">
                              <div className="text-[11px] font-semibold text-[var(--muted)] flex items-center gap-1.5">
                                <FileText className="w-3 h-3" />
                                <span>{t('context.sourceCitation')}:</span>
                                <span className="text-[var(--foreground)] font-normal truncate">
                                  {sel.source?.title || 'Referenced Document'}
                                </span>
                              </div>
                              <blockquote
                                dir="auto"
                                className="ps-3 border-s-2 border-[var(--accent)] text-[11px] text-[var(--muted)] italic leading-relaxed line-clamp-3 bg-[var(--surface-secondary)]/30 py-1 pe-2 rounded-e"
                              >
                                {sel.source?.excerpt || item.sourceExcerpt}
                              </blockquote>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 5. Excluded Items Collapsible Section */}
              {result.excluded && result.excluded.length > 0 && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowExcluded(!showExcluded)}
                    className="w-full p-4 flex items-center justify-between text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span>{t('context.excludedUnits')}</span>
                      <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-[var(--surface-secondary)] text-[var(--muted)] border border-[var(--border)]">
                        {result.excluded.length}
                      </span>
                    </div>
                    {showExcluded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {showExcluded && (
                    <div className="px-4 pb-4 pt-1 border-t border-[var(--separator)] divide-y divide-[var(--separator)]">
                      {result.excluded.map((ex, idx) => {
                        const item = allKnowledgeMap.get(ex.itemId);
                        return (
                          <div
                            key={idx}
                            className="py-2.5 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <div
                                dir="auto"
                                className="font-medium text-[var(--foreground)] truncate"
                              >
                                {item?.title || ex.itemId}
                              </div>
                              <div className="text-[10px] font-mono text-[var(--muted)]">
                                ID: {ex.itemId}
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[var(--surface-secondary)] text-[var(--muted)] border border-[var(--border)] shrink-0">
                              {t(`context.exclusionReasons.${ex.reason}`)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
