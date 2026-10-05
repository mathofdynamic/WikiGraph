import React, { useEffect, useState, useMemo } from 'react';
import {
  Cpu,
  Search,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Bookmark,
  AlertTriangle,
  MoveUp,
  MoveDown,
  Layers,
  FileCode,
  FileText,
  Sparkles,
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
  const [recipes, setRecipes] = useState<ContextRecipe[]>([]);
  const [saveRecipeModalOpen, setSaveRecipeModalOpen] = useState(false);
  const [recipeName, setRecipeName] = useState('');
  const [recipeDesc, setRecipeDesc] = useState('');

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

      // Pre-select first 4 items as a starting contextual packet
      if (kList.length > 0 && selectedIds.length === 0) {
        setSelectedIds(kList.slice(0, 4).map((k) => k.id));
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [repository, version]);

  // Selected knowledge items in order
  const selectedItems = useMemo(() => {
    const map = new Map(allKnowledge.map((k) => [k.id, k]));
    return selectedIds.map((id) => map.get(id)).filter(Boolean) as KnowledgeItem[];
  }, [selectedIds, allKnowledge]);

  // Available knowledge items for left search
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

  // Reorder actions
  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= selectedIds.length) return;
    const copy = [...selectedIds];
    const temp = copy[index];
    copy[index] = copy[newIdx];
    copy[newIdx] = temp;
    setSelectedIds(copy);
  };

  const removeItem = (id: string) => {
    setSelectedIds((prev) => prev.filter((item) => item !== id));
  };

  const addItem = (id: string) => {
    setSelectedIds((prev) => [...prev, id]);
  };

  // Pre-built Prompt Recipes
  const applyPresetRecipe = (presetType: 'security' | 'rag' | 'i18n') => {
    if (presetType === 'security') {
      setTaskGoal('Security & Zero Trust Guardrail Audit');
      const ids = allKnowledge
        .filter((k) => k.title.toLowerCase().includes('security') || k.type === 'procedure')
        .slice(0, 4)
        .map((k) => k.id);
      setSelectedIds(ids.length > 0 ? ids : allKnowledge.slice(0, 3).map((k) => k.id));
    } else if (presetType === 'rag') {
      setTaskGoal('Dense Retrieval & Knowledge Packet Ingestion');
      const ids = allKnowledge
        .filter((k) => k.title.toLowerCase().includes('retrieval') || k.type === 'tip')
        .slice(0, 4)
        .map((k) => k.id);
      setSelectedIds(ids.length > 0 ? ids : allKnowledge.slice(0, 3).map((k) => k.id));
    } else {
      setTaskGoal('Persian RTL Localization & Font Hierarchy Verification');
      const ids = allKnowledge
        .filter((k) => k.language === 'fa' || k.title.toLowerCase().includes('localization'))
        .slice(0, 4)
        .map((k) => k.id);
      setSelectedIds(ids.length > 0 ? ids : allKnowledge.slice(0, 3).map((k) => k.id));
    }
  };

  // Formatted Output Generator
  const generatedOutput = useMemo(() => {
    const sourceMap = new Map(sources.map((s) => [s.id, s]));

    if (format === 'markdown') {
      let md = `# Task Directive: ${taskGoal}\n\n`;
      md += `*Assembled via WikiGraph Knowledge Engine on ${new Date().toISOString().split('T')[0]}*\n\n`;
      md += `## Assembled Empirical Knowledge Context\n\n`;

      selectedItems.forEach((item, idx) => {
        const src = sourceMap.get(item.sourceId);
        md += `### ${idx + 1}. [${item.type.toUpperCase()}] ${item.title} [^${idx + 1}]\n`;
        md += `**Summary**: ${item.summary}\n\n`;
        if (item.body) {
          md += `**Details & Procedure**:\n\`\`\`\n${item.body}\n\`\`\`\n\n`;
        }
        if (item.applicability) {
          md += `*Applicability*: ${item.applicability}\n`;
        }
        if (item.exclusions) {
          md += `*Exclusions / Guardrails*: ${item.exclusions}\n`;
        }
        md += `\n`;
      });

      md += `## Citations & Verification Pins\n\n`;
      selectedItems.forEach((item, idx) => {
        const src = sourceMap.get(item.sourceId);
        md += `[^${idx + 1}]: Source: **${src?.title || item.sourceId}** (${src?.filename || 'report.md'}, rev: ${item.sourceRevisionId}).\n`;
        md += `> "${item.sourceExcerpt}"\n\n`;
      });

      return md;
    }

    if (format === 'json') {
      const packet = {
        metadata: {
          generator: 'WikiGraph v1.0',
          generatedAt: new Date().toISOString(),
          taskGoal,
          totalItems: selectedItems.length,
        },
        items: selectedItems.map((item, idx) => {
          const src = sourceMap.get(item.sourceId);
          return {
            index: idx + 1,
            id: item.id,
            type: item.type,
            title: item.title,
            summary: item.summary,
            body: item.body,
            evidenceLevel: item.evidenceLevel,
            reviewStatus: item.reviewStatus,
            applicability: item.applicability,
            exclusions: item.exclusions,
            requirements: item.requirements,
            citation: {
              sourceId: item.sourceId,
              sourceFilename: src?.filename,
              sourceTitle: src?.title,
              sourceRevisionId: item.sourceRevisionId,
              excerptPin: item.sourceExcerpt,
            },
          };
        }),
      };
      return JSON.stringify(packet, null, 2);
    }

    if (format === 'briefing') {
      let br = `EXECUTIVE KNOWLEDGE BRIEFING: ${taskGoal}\n`;
      br += `======================================================\n\n`;
      selectedItems.forEach((item, idx) => {
        br += `${idx + 1}. ${item.title} (${item.type.toUpperCase()})\n`;
        br += `   • ${item.summary}\n`;
        if (item.applicability) br += `   • When: ${item.applicability}\n`;
        if (item.exclusions) br += `   • Caution: ${item.exclusions}\n`;
        br += `   • Evidence: ${item.evidenceLevel} | Review: ${item.reviewStatus}\n\n`;
      });
      return br;
    }

    // Plain text
    let plain = `TASK: ${taskGoal}\n\n`;
    selectedItems.forEach((item, idx) => {
      plain += `[ITEM ${idx + 1}] ${item.title}\n`;
      plain += `${item.summary}\n`;
      if (item.body) plain += `${item.body}\n`;
      plain += `--------------------------------------------------\n`;
    });
    return plain;
  }, [format, taskGoal, selectedItems, sources]);

  // Token count estimate (~4 chars per token)
  const tokenEstimate = Math.ceil(generatedOutput.length / 4);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = format === 'json' ? 'json' : 'md';
    const blob = new Blob([generatedOutput], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wikigraph_context_${Date.now()}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeName.trim()) return;

    const newRecipe: ContextRecipe = {
      id: `recipe-${Date.now()}`,
      name: recipeName,
      description: recipeDesc,
      selectedKnowledgeIds: [...selectedIds],
      outputFormat: format,
      createdAt: new Date().toISOString(),
    };

    setRecipes((prev) => [...prev, newRecipe]);
    setSaveRecipeModalOpen(false);
    setRecipeName('');
    setRecipeDesc('');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#23252a]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#8a8f98] uppercase tracking-wider mb-1">
            <span>WikiGraph</span>
            <span>/</span>
            <span className="text-[#828fff] font-medium">
              {t('nav.context')}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-title text-[#f7f8f8]">
            {t('context.title')}
          </h2>
          <p className="text-xs sm:text-sm text-[#8a8f98] mt-0.5">
            {t('context.subtitle')}
          </p>
        </div>

        {/* Preset quick recipes */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#8a8f98] font-medium">{t('context.recipes')}:</span>
          <button
            type="button"
            onClick={() => applyPresetRecipe('security')}
            className="linear-btn-secondary text-xs"
          >
            Security Audit
          </button>
          <button
            type="button"
            onClick={() => applyPresetRecipe('rag')}
            className="linear-btn-secondary text-xs"
          >
            RAG Synthesis
          </button>
          <button
            type="button"
            onClick={() => applyPresetRecipe('i18n')}
            className="linear-btn-secondary text-xs"
          >
            فارسی Localization
          </button>
        </div>
      </div>

      {/* Two-Pane Assembly Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Pane (5 cols): Knowledge Selection & Reordering */}
        <div className="lg:col-span-5 space-y-5">
          {/* Target Task Input */}
          <div className="p-4 rounded-xl border border-[#23252a] bg-[#0f1011] space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8a8f98]">
              Task Directive / Objective
            </label>
            <input
              type="text"
              dir="auto"
              value={taskGoal}
              onChange={(e) => setTaskGoal(e.target.value)}
              className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
            />
          </div>

          {/* Selected Knowledge Items in Packet */}
          <div className="p-4 rounded-xl border border-[#23252a] bg-[#0f1011] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#23252a]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#d0d6e0] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#828fff]" />
                <span>{t('context.selectedItems')}</span>
              </span>
              <span className="text-xs font-medium text-[#828fff]">
                {selectedItems.length} items
              </span>
            </div>

            {selectedItems.length === 0 ? (
              <p className="text-xs text-[#8a8f98] py-3 text-center italic">
                {t('context.noItemsSelected')}
              </p>
            ) : (
              <div className="space-y-2">
                {selectedItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-[#23252a] bg-[#141516] space-y-1.5 group"
                  >
                    {/* Source changed warning */}
                    {item.sourceHasChanged && (
                      <div className="flex items-center gap-1 text-[11px] text-[#f59e0b] font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Source changed - verify citation</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs text-[#8a8f98] font-semibold">
                          #{idx + 1}
                        </span>
                        <Badge type="knowledgeType" value={item.type} size="sm" />
                        <h4
                          dir="auto"
                          className="text-xs font-medium text-[#f7f8f8] truncate"
                        >
                          {item.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveItem(idx, 'up')}
                          className="p-1 rounded text-[#8a8f98] hover:text-[#f7f8f8] disabled:opacity-20 cursor-pointer"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === selectedItems.length - 1}
                          onClick={() => moveItem(idx, 'down')}
                          className="p-1 rounded text-[#8a8f98] hover:text-[#f7f8f8] disabled:opacity-20 cursor-pointer"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1 rounded text-[#8a8f98] hover:text-[#fb7185] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p
                      dir="auto"
                      className="text-[11px] text-[#8a8f98] line-clamp-1"
                    >
                      {item.summary}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add More Knowledge from Library Picker */}
          <div className="p-4 rounded-xl border border-[#23252a] bg-[#0f1011] space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#d0d6e0] block">
              {t('context.availableItems')}
            </span>

            {/* Filter inputs */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#8a8f98] absolute start-2.5 top-2 pointer-events-none" />
                <input
                  type="text"
                  dir="auto"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('common.searchPlaceholder')}
                  className="w-full ps-8 pe-3 py-1 text-xs rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="px-2 py-1 text-xs rounded-md border border-[#23252a] bg-[#141516] text-[#d0d6e0] focus:outline-none focus:border-[#5e6ad2]"
              >
                <option value="all">{t('library.allCollections')}</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {locale === 'fa' ? c.nameFa : c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* List of items that can be added */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-[#23252a]">
              {availableItems.length === 0 ? (
                <p className="text-xs text-[#8a8f98] py-2 text-center italic">
                  No additional items found.
                </p>
              ) : (
                availableItems.map((item) => (
                  <div
                    key={item.id}
                    className="pt-1.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge type="knowledgeType" value={item.type} size="sm" />
                        <span
                          dir="auto"
                          className="text-xs font-medium text-[#f7f8f8] truncate"
                        >
                          {item.title}
                        </span>
                      </div>
                      <p
                        dir="auto"
                        className="text-[11px] text-[#8a8f98] line-clamp-1"
                      >
                        {item.summary}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => addItem(item.id)}
                      className="p-1 rounded-md bg-[#141516] border border-[#23252a] hover:border-[#5e6ad2] text-[#8a8f98] hover:text-[#f7f8f8] shrink-0 cursor-pointer"
                      title={t('common.add')}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Pane (7 cols): Live Assembly Preview & Output Controls */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 sm:p-6 rounded-xl border border-[#23252a] bg-[#0f1011] space-y-4">
            {/* Output Bar & Format Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#23252a]">
              <div className="flex items-center gap-1.5 p-1 rounded-md bg-[#141516] border border-[#23252a] text-xs">
                <button
                  type="button"
                  onClick={() => setFormat('markdown')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                    format === 'markdown'
                      ? 'bg-[#1b1c1d] text-[#f7f8f8] border border-[#2e3036]'
                      : 'text-[#8a8f98] hover:text-[#f7f8f8]'
                  }`}
                >
                  Markdown
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('json')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                    format === 'json'
                      ? 'bg-[#1b1c1d] text-[#f7f8f8] border border-[#2e3036]'
                      : 'text-[#8a8f98] hover:text-[#f7f8f8]'
                  }`}
                >
                  JSON Packet
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('briefing')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                    format === 'briefing'
                      ? 'bg-[#1b1c1d] text-[#f7f8f8] border border-[#2e3036]'
                      : 'text-[#8a8f98] hover:text-[#f7f8f8]'
                  }`}
                >
                  Executive Brief
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('plain')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                    format === 'plain'
                      ? 'bg-[#1b1c1d] text-[#f7f8f8] border border-[#2e3036]'
                      : 'text-[#8a8f98] hover:text-[#f7f8f8]'
                  }`}
                >
                  Plain Text
                </button>
              </div>

              {/* Action Buttons: Copy, Download, Save Recipe */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="linear-btn-secondary text-xs gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#4ade80]" />
                      <span className="text-[#4ade80]">{t('common.copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t('common.copy')}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="linear-btn-secondary text-xs p-1.5"
                  title={t('common.download')}
                >
                  <Download className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setSaveRecipeModalOpen(true)}
                  className="linear-btn-primary text-xs gap-1.5"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Save Recipe</span>
                </button>
              </div>
            </div>

            {/* Token & Character Count stats bar */}
            <div className="flex items-center justify-between text-xs text-[#8a8f98]">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#828fff]" />
                <span>~{tokenEstimate.toLocaleString()} estimated tokens</span>
              </span>
              <span>{generatedOutput.length.toLocaleString()} characters</span>
            </div>

            {/* Live Assembly Text Box */}
            <div className="relative">
              <textarea
                readOnly
                dir="auto"
                rows={20}
                value={generatedOutput}
                className="w-full p-4 text-xs rounded-lg border border-[#23252a] bg-[#010102] text-[#d0d6e0] leading-relaxed focus:outline-none select-text"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Recipe Modal */}
      {saveRecipeModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-[#0f1011] rounded-xl border border-[#23252a] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#23252a] flex items-center justify-between">
              <h3 className="text-base font-semibold tracking-title text-[#f7f8f8]">
                Save Assembly Recipe
              </h3>
              <button
                type="button"
                onClick={() => setSaveRecipeModalOpen(false)}
                className="p-1 rounded text-[#8a8f98] hover:text-[#f7f8f8] cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveRecipe} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  Recipe Name *
                </label>
                <input
                  type="text"
                  dir="auto"
                  required
                  placeholder="e.g. Weekly Cloud Security Packet"
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  Description
                </label>
                <textarea
                  dir="auto"
                  rows={2}
                  placeholder="Instructions or scope of this reproducible recipe..."
                  value={recipeDesc}
                  onChange={(e) => setRecipeDesc(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#23252a]">
                <button
                  type="button"
                  onClick={() => setSaveRecipeModalOpen(false)}
                  className="linear-btn-secondary text-xs sm:text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="linear-btn-primary text-xs sm:text-sm"
                >
                  Save Recipe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
