import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Plus,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Sparkles,
  GitFork,
  Copy,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import {
  Collection,
  ImportBundleOptions,
  ImportBundleResult,
  SourceDocument,
  WikiGraphBundle,
} from '../types';
import { Badge } from '../components/common/Badge';
import {
  validateBundle,
  SAMPLE_BUNDLE,
  SAMPLE_BUNDLE_FA,
  detectTextScript,
} from '../lib/bundle';

export const ImportPage: React.FC = () => {
  const { repository, version, notifyMutation } = useRepository();
  const { t, locale } = useLocale();
  const navigate = useNavigate();

  // Active top tab: 'bundle' | 'markdown'
  const [activeTab, setActiveTab] = useState<'bundle' | 'markdown'>('bundle');

  // Collections & Existing Sources (for duplicate checking & destination picker)
  const [collections, setCollections] = useState<Collection[]>([]);
  const [existingSources, setExistingSources] = useState<SourceDocument[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Bundle Ingestion State
  const [rawBundleJson, setRawBundleJson] = useState<string>('');
  const [bundleData, setBundleData] = useState<WikiGraphBundle | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Duplicate Analysis State
  const [isExactDuplicate, setIsExactDuplicate] = useState(false);
  const [exactDuplicateDoc, setExactDuplicateDoc] = useState<SourceDocument | null>(null);
  const [isFilenameCollision, setIsFilenameCollision] = useState(false);
  const [filenameCollisionDoc, setFilenameCollisionDoc] = useState<SourceDocument | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'new_revision' | 'overwrite' | 'skip'>('new_revision');

  // Target Collection Selection State
  const [collectionChoiceMode, setCollectionChoiceMode] = useState<'suggested' | 'existing'>('suggested');
  const [selectedExistingColId, setSelectedExistingColId] = useState<string>('');

  // Expand items in preview
  const [expandedItems, setExpandedItems] = useState(false);
  const [expandedItemMap, setExpandedItemMap] = useState<Record<string, boolean>>({});

  // Importing status & result
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportBundleResult | null>(null);

  // Markdown Tab State
  const [mdTitle, setMdTitle] = useState('');
  const [mdFilename, setMdFilename] = useState('');
  const [mdContent, setMdContent] = useState('');
  const [mdCollectionId, setMdCollectionId] = useState('');
  const [mdImporting, setMdImporting] = useState(false);
  const [mdError, setMdError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mdFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    const loadDependencies = async () => {
      try {
        setLoadingInitial(true);
        const [cols, srcs] = await Promise.all([
          repository.listCollections(),
          repository.listSources(),
        ]);
        if (!active) return;
        setCollections(cols);
        setExistingSources(srcs);
        if (cols.length > 0) {
          setSelectedExistingColId(cols[0].id);
          setMdCollectionId(cols[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoadingInitial(false);
      }
    };
    loadDependencies();
    return () => {
      active = false;
    };
  }, [repository, version]);

  // Process and validate bundle text
  const processBundleText = async (jsonString: string) => {
    setJsonError(null);
    setValidationErrors([]);
    setValidationWarnings([]);
    setBundleData(null);
    setIsExactDuplicate(false);
    setExactDuplicateDoc(null);
    setIsFilenameCollision(false);
    setFilenameCollisionDoc(null);
    setImportResult(null);

    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e: any) {
      setJsonError(t('import.invalidJsonError'));
      return;
    }

    setBundleData(parsed);
    setValidating(true);

    try {
      const validation = await validateBundle(parsed);
      setValidationErrors(validation.errors);
      setValidationWarnings(validation.warnings);

      // Check duplicates against loaded sources
      if (parsed.source?.content_sha256) {
        const hashMatch = existingSources.find(
          (s) =>
            s.contentSha256 &&
            s.contentSha256.toLowerCase() === parsed.source.content_sha256.toLowerCase()
        );
        if (hashMatch) {
          setIsExactDuplicate(true);
          setExactDuplicateDoc(hashMatch);
        }
      }

      if (parsed.source?.filename) {
        const nameMatch = existingSources.find(
          (s) =>
            s.filename.toLowerCase() === parsed.source.filename.toLowerCase() &&
            s.contentSha256?.toLowerCase() !== parsed.source.content_sha256?.toLowerCase()
        );
        if (nameMatch) {
          setIsFilenameCollision(true);
          setFilenameCollisionDoc(nameMatch);
          setDuplicateStrategy('new_revision');
        }
      }

      // Default collection suggestion mode
      if (parsed.collection_suggestion?.name) {
        setCollectionChoiceMode('suggested');
      } else {
        setCollectionChoiceMode('existing');
      }
    } finally {
      setValidating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawBundleJson(text);
      processBundleText(text);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawBundleJson(text);
      processBundleText(text);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleLoadSample = (sample: WikiGraphBundle = SAMPLE_BUNDLE) => {
    const sampleStr = JSON.stringify(sample, null, 2);
    setRawBundleJson(sampleStr);
    processBundleText(sampleStr);
  };

  const handleExecuteBundleImport = async () => {
    if (!bundleData || validationErrors.length > 0) return;

    try {
      setImporting(true);

      const options: ImportBundleOptions = {};

      if (collectionChoiceMode === 'suggested' && bundleData.collection_suggestion) {
        options.createCollection = {
          name: bundleData.collection_suggestion.name,
          name_fa: bundleData.collection_suggestion.name_fa,
        };
      } else {
        options.collectionId = selectedExistingColId || collections[0]?.id;
      }

      if (isFilenameCollision) {
        options.onDuplicate = duplicateStrategy;
      }

      const res = await repository.importBundle(bundleData, options);
      setImportResult(res);
      notifyMutation();
    } catch (err: any) {
      console.error(err);
      setValidationErrors((prev) => [...prev, err.message || 'Import failed.']);
    } finally {
      setImporting(false);
    }
  };

  const handleMdFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMdFilename(file.name);
    setMdTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    const reader = new FileReader();
    reader.onload = (event) => {
      setMdContent((event.target?.result as string) || '');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleExecuteMdImport = async () => {
    if (!mdTitle.trim() || !mdContent.trim()) {
      setMdError(t('common.required'));
      return;
    }
    try {
      setMdImporting(true);
      setMdError(null);
      const isFa = detectTextScript(mdContent).isPersianScript;
      await repository.createSource({
        title: mdTitle.trim(),
        filename: mdFilename.trim() || `${mdTitle.toLowerCase().replace(/\s+/g, '_')}.md`,
        collectionId: mdCollectionId || collections[0]?.id || 'col-data-extraction',
        tags: ['markdown-upload'],
        originalContent: mdContent,
        kind: 'research_report',
        language: isFa ? 'fa' : 'en',
      });
      notifyMutation();
      navigate('/library?tab=sources');
    } catch (err: any) {
      console.error(err);
      setMdError(err.message || 'Failed to ingest markdown report');
    } finally {
      setMdImporting(false);
    }
  };

  // Group item counts by type
  const typeCounts = bundleData?.knowledge_items?.reduce((acc, it) => {
    acc[it.type] = (acc[it.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--separator)]">
        <div>
          <h1 className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-[var(--foreground)] leading-snug">
            {t('import.title')}
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">
            {t('import.subtitle')}
          </p>
        </div>

        {/* Tab Switcher: Markdown tab then Import Bundle as second tab */}
        <div className="ui-segment shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('markdown')}
            className={`ui-segment-item ${activeTab === 'markdown' ? 'active' : ''}`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t('import.tabMarkdown')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bundle')}
            className={`ui-segment-item ${activeTab === 'bundle' ? 'active' : ''}`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{t('import.tabBundle')}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: BUNDLE IMPORT (wikigraph.bundle/1 JSON) */}
      {activeTab === 'bundle' && (
        <div className="space-y-6">
          {/* If already imported successfully: Display completion screen */}
          {importResult ? (
            <div className="ui-panel p-6 sm:p-8 space-y-6 text-center max-w-2xl mx-auto shadow-xs">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-[18px] sm:text-[20px] font-semibold text-[var(--foreground)]">
                  {t('import.successTitle')}
                </h2>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  {t('import.successDesc')}
                </p>
              </div>

              {/* Metrics Summary Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-start">
                <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border)] space-y-1">
                  <div className="text-[11px] text-[var(--muted)] font-medium">
                    {t('import.itemsImportedCount')}
                  </div>
                  <div className="text-[18px] font-semibold text-[var(--foreground)] font-mono">
                    {importResult.createdItemIds.length}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border)] space-y-1">
                  <div className="text-[11px] text-[var(--muted)] font-medium">
                    {t('import.relationshipsImportedCount')}
                  </div>
                  <div className="text-[18px] font-semibold text-[var(--foreground)] font-mono">
                    {importResult.createdRelationshipIds.length}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border)] space-y-1">
                  <div className="text-[11px] text-[var(--muted)] font-medium">
                    {t('import.sourceImportedTitle')}
                  </div>
                  <div className="text-xs font-semibold text-[var(--foreground)] truncate">
                    {bundleData?.source.filename || importResult.sourceId}
                  </div>
                </div>
              </div>

              {/* Navigation Options */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-[var(--separator)]">
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/review?sourceId=${importResult.sourceId}`)
                  }
                  className="ui-button ui-button-primary text-xs w-full sm:w-auto"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{t('import.goToReviewQueue')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBundleData(null);
                    setRawBundleJson('');
                    setImportResult(null);
                  }}
                  className="ui-button ui-button-secondary text-xs w-full sm:w-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('import.importAnother')}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Dropzone & Load Sample Action Strip */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="p-8 sm:p-10 rounded-2xl border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)]/30 transition-colors text-center cursor-pointer space-y-3"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json,application/json"
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] mx-auto">
                  <Upload className="w-5 h-5" />
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-semibold text-[var(--foreground)]">
                    {t('import.bundleDropzoneTitle')}
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    {t('import.bundleDropzoneSubtitle')}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadSample(SAMPLE_BUNDLE);
                    }}
                    className="ui-button ui-button-secondary text-xs inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>{t('import.trySampleBundle')} (EN)</span>
                  </button>
                  {locale === 'fa' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadSample(SAMPLE_BUNDLE_FA);
                      }}
                      className="ui-button ui-button-secondary text-xs inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>نمونه بسته فارسی (FA)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* JSON Syntax Error Notice */}
              {jsonError && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900 text-red-800 dark:text-red-200 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                  <span>{jsonError}</span>
                </div>
              )}

              {/* Validation Status Indicator */}
              {validating && (
                <div className="p-6 text-center text-xs text-[var(--muted)]">
                  <Clock className="w-4 h-4 animate-spin text-[var(--accent)] mx-auto mb-2" />
                  <span>{t('import.importingBundle')}</span>
                </div>
              )}

              {/* Pre-Flight Preview & Validation Panel */}
              {bundleData && !validating && (
                <div className="ui-panel p-5 sm:p-7 space-y-6 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--separator)]">
                    <div>
                      <h2 className="text-[16px] sm:text-[17px] font-semibold text-[var(--foreground)] tracking-tight">
                        {t('import.previewTitle')}
                      </h2>
                      <div className="text-xs text-[var(--muted)] flex items-center gap-2 mt-1 flex-wrap">
                        <span className="font-mono">{bundleData.schema_version}</span>
                        {bundleData.generator && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[11px]">
                              {bundleData.generator.tool} v{bundleData.generator.version}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {validationErrors.length === 0 ? (
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 inline-flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Valid Schema</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-900 inline-flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                          <span>{validationErrors.length} Errors (Blocked)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Errors Block */}
                  {validationErrors.length > 0 && (
                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900 text-xs space-y-2">
                      <div className="font-semibold text-red-900 dark:text-red-200 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span>{t('import.validationErrorsTitle')}</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-red-800 dark:text-red-300 font-mono text-[11px]">
                        {validationErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings Block */}
                  {validationWarnings.length > 0 && (
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900 text-xs space-y-2">
                      <div className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>{t('import.validationWarningsTitle')}</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-300 text-[11px]">
                        {validationWarnings.map((warn, i) => (
                          <li key={i}>{warn}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Duplicate Detection Alert */}
                  {isExactDuplicate && exactDuplicateDoc && (
                    <div className="p-4 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs space-y-2">
                      <div className="font-semibold text-[var(--foreground)] flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-[var(--muted)]" />
                        <span>{t('import.duplicateDetected')}</span>
                      </div>
                      <p className="text-[var(--muted)] leading-relaxed">
                        {t('import.alreadyImportedNotice')} (Source: <strong>{exactDuplicateDoc.filename}</strong>)
                      </p>
                    </div>
                  )}

                  {/* Same Filename Different Hash: Revision Strategy Offer */}
                  {isFilenameCollision && filenameCollisionDoc && (
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs space-y-2.5">
                      <div className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>{t('import.duplicateAction')}</span>
                      </div>
                      <p className="text-blue-800 dark:text-blue-300 leading-relaxed">
                        {t('import.sameFilenameDiffHashNotice')}
                      </p>
                      <div className="space-y-1.5 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="duplicateStrategy"
                            value="new_revision"
                            checked={duplicateStrategy === 'new_revision'}
                            onChange={() => setDuplicateStrategy('new_revision')}
                            className="accent-[var(--accent)]"
                          />
                          <span className="font-medium text-[var(--foreground)]">
                            {t('import.importNewRevisionOption')}
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="duplicateStrategy"
                            value="overwrite"
                            checked={duplicateStrategy === 'overwrite'}
                            onChange={() => setDuplicateStrategy('overwrite')}
                            className="accent-[var(--accent)]"
                          />
                          <span className="text-[var(--muted)]">
                            {t('import.importAsNewDocOption')}
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Source Metadata & Item Composition */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Source Information */}
                    <div className="p-4 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border)] space-y-2.5 text-xs">
                      <div className="font-semibold text-[var(--foreground)]">
                        {t('import.sourceMetadata')}
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--muted)]">{t('sourceDetail.filename')}</span>
                          <span className="font-mono text-[var(--foreground)]">
                            {bundleData.source.filename}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--muted)]">{t('knowledgeDetail.fieldType')}</span>
                          <span className="capitalize text-[var(--foreground)]">
                            {bundleData.source.kind}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--muted)]">{t('common.language')}</span>
                          <span className="font-mono text-[var(--foreground)] uppercase">
                            {bundleData.source.language}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--muted)]">SHA-256</span>
                          <span className="font-mono text-[10px] text-[var(--muted)] truncate max-w-[180px]">
                            {bundleData.source.content_sha256}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown by Item Type & Relationships */}
                    <div className="p-4 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border)] space-y-2.5 text-xs">
                      <div className="font-semibold text-[var(--foreground)]">
                        {t('import.itemsCountByType')} ({bundleData.knowledge_items?.length || 0})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(typeCounts).map(([type, count]) => (
                          <span
                            key={type}
                            className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)]"
                          >
                            {type}: <strong>{count}</strong>
                          </span>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-[var(--separator)] flex items-center justify-between text-xs">
                        <span className="text-[var(--muted)]">{t('import.relationshipsCount')}</span>
                        <span className="font-semibold text-[var(--foreground)] font-mono">
                          {bundleData.relationships?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Target Collection Configuration */}
                  <div className="p-4 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border)] space-y-3 text-xs">
                    <div className="font-semibold text-[var(--foreground)]">
                      {t('import.targetCollection')}
                    </div>

                    {bundleData.collection_suggestion ? (
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="colMode"
                            value="suggested"
                            checked={collectionChoiceMode === 'suggested'}
                            onChange={() => setCollectionChoiceMode('suggested')}
                            className="accent-[var(--accent)]"
                          />
                          <span className="font-medium text-[var(--foreground)]">
                            {t('import.useSuggestedCollection')}{' '}
                            <strong>{bundleData.collection_suggestion.name}</strong>
                          </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="colMode"
                            value="existing"
                            checked={collectionChoiceMode === 'existing'}
                            onChange={() => setCollectionChoiceMode('existing')}
                            className="accent-[var(--accent)]"
                          />
                          <span className="text-[var(--muted)]">
                            {t('import.selectExistingCollection')}
                          </span>
                        </label>

                        {collectionChoiceMode === 'existing' && (
                          <select
                            value={selectedExistingColId}
                            onChange={(e) => setSelectedExistingColId(e.target.value)}
                            className="ui-select w-full mt-1.5"
                          >
                            {collections.map((c) => (
                              <option key={c.id} value={c.id}>
                                {locale === 'fa' ? c.nameFa : c.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    ) : (
                      <select
                        value={selectedExistingColId}
                        onChange={(e) => setSelectedExistingColId(e.target.value)}
                        className="ui-select w-full"
                      >
                        {collections.map((c) => (
                          <option key={c.id} value={c.id}>
                            {locale === 'fa' ? c.nameFa : c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Expandable Knowledge Items Preview */}
                  <div className="space-y-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setExpandedItems(!expandedItems)}
                      className="text-xs font-semibold text-[var(--foreground)] hover:text-[var(--accent)] flex items-center gap-1.5 cursor-pointer"
                    >
                      {expandedItems ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                      )}
                      <span>
                        {t('import.expandItems')} ({bundleData.knowledge_items?.length || 0})
                      </span>
                    </button>

                    {expandedItems && (
                      <div className="space-y-2 max-h-96 overflow-y-auto pe-1">
                        {bundleData.knowledge_items?.map((item, idx) => (
                          <div
                            key={item.local_id || idx}
                            className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-semibold text-[var(--foreground)]">
                                {item.title}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <Badge type="knowledgeType" value={item.type} size="sm" />
                                <span className="font-mono text-[10px] text-[var(--muted)]">
                                  {item.local_id}
                                </span>
                              </div>
                            </div>

                            <p dir="auto" className="text-[12px] text-[var(--muted)] leading-relaxed">
                              {item.summary}
                            </p>

                            {item.source_excerpt && (
                              <blockquote
                                dir="auto"
                                className="p-2 rounded bg-[var(--surface-secondary)] border-s-2 border-[var(--accent)] text-[11px] text-[var(--muted)] italic leading-relaxed"
                              >
                                "{item.source_excerpt}"
                              </blockquote>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Final Import Execution Button */}
                  <div className="pt-4 border-t border-[var(--separator)] flex items-center justify-end gap-3">
                    {isExactDuplicate && (
                      <span className="text-xs text-[var(--muted)] italic">
                        {t('import.skipDuplicateBtn')}
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={importing || validationErrors.length > 0 || isExactDuplicate}
                      onClick={handleExecuteBundleImport}
                      className="ui-button ui-button-primary text-xs"
                    >
                      {importing ? (
                        <>
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                          <span>{t('import.importingBundle')}</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>{t('import.btnImportBundle')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: MARKDOWN REPORT INGESTION */}
      {activeTab === 'markdown' && (
        <div className="ui-panel p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="pb-3 border-b border-[var(--separator)]">
            <h2 className="text-[16px] sm:text-[17px] font-semibold text-[var(--foreground)] tracking-tight">
              {t('import.pasteTitle')}
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {t('import.subtitle')}
            </p>
          </div>

          {mdError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 text-xs">
              {mdError}
            </div>
          )}

          <div className="space-y-4 text-xs">
            {/* File Drop / Select */}
            <div>
              <button
                type="button"
                onClick={() => mdFileInputRef.current?.click()}
                className="ui-button ui-button-secondary text-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{t('import.dropzoneSubtitle')}</span>
              </button>
              <input
                type="file"
                ref={mdFileInputRef}
                onChange={handleMdFileUpload}
                accept=".md,.markdown,text/markdown"
                className="hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-[var(--foreground)]">
                  {t('sourceDetail.title')} *
                </label>
                <input
                  type="text"
                  dir="auto"
                  value={mdTitle}
                  onChange={(e) => setMdTitle(e.target.value)}
                  placeholder="e.g. Analysis of Vector Quantization"
                  className="ui-input w-full"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--foreground)]">
                  {t('import.pasteFilename')}
                </label>
                <input
                  type="text"
                  dir="auto"
                  value={mdFilename}
                  onChange={(e) => setMdFilename(e.target.value)}
                  placeholder="report_name.md"
                  className="ui-input w-full font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[var(--foreground)]">
                {t('import.pasteCollection')}
              </label>
              <select
                value={mdCollectionId}
                onChange={(e) => setMdCollectionId(e.target.value)}
                className="ui-select w-full"
              >
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {locale === 'fa' ? c.nameFa : c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[var(--foreground)]">
                {t('import.tabPaste')} *
              </label>
              <textarea
                dir="auto"
                rows={10}
                value={mdContent}
                onChange={(e) => setMdContent(e.target.value)}
                placeholder={t('import.pastePlaceholder')}
                className="ui-input w-full font-mono text-xs"
              />
            </div>

            <div className="pt-3 border-t border-[var(--separator)] flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={mdImporting || !mdTitle.trim() || !mdContent.trim()}
                onClick={handleExecuteMdImport}
                className="ui-button ui-button-primary text-xs"
              >
                {mdImporting ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('common.saving')}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>{t('import.btnStartImport')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
