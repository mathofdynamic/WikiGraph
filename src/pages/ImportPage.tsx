import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  FileCode,
  ArrowRight,
  Info,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
  FolderOpen,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import { Collection, KnowledgeType } from '../types';

interface QueueItem {
  id: string;
  file?: File;
  filename: string;
  rawSize: number;
  content: string;
  title: string;
  headings: { level: number; text: string; excerpt: string }[];
  collectionId: string;
  duplicateHandling: 'skip' | 'copy' | 'revision';
  status: 'pending' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
  importedId?: string;
}

const MAX_FILE_SIZE_BYTES = 128 * 1024; // 128 KiB
const MAX_QUEUE_FILES = 20;

export const ImportPage: React.FC = () => {
  const { repository, notifyMutation } = useRepository();
  const { t, locale } = useLocale();
  const navigate = useNavigate();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeTab, setActiveTab] = useState<'files' | 'paste'>('files');
  const [dragOver, setDragOver] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  // Paste form state
  const [pasteFilename, setPasteFilename] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [pasteCollectionId, setPasteCollectionId] = useState('');

  // Section suggestions modal state
  const [inspectingItem, setInspectingItem] = useState<QueueItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    repository.listCollections().then((cols) => {
      setCollections(cols);
      if (cols.length > 0) {
        setPasteCollectionId(cols[0].id);
      }
    });
  }, [repository]);

  const parseMarkdownHeadings = (
    md: string
  ): { level: number; text: string; excerpt: string }[] => {
    const lines = md.split('\n');
    const headings: { level: number; text: string; excerpt: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const nextLines: string[] = [];
        for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
          const l = lines[j].trim();
          if (l && !l.startsWith('#')) {
            nextLines.push(l);
            if (nextLines.length >= 3) break;
          }
        }
        headings.push({
          level,
          text,
          excerpt: nextLines.join(' '),
        });
      }
    }
    return headings;
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setGeneralError(null);

    if (queue.length + fileList.length > MAX_QUEUE_FILES) {
      setGeneralError(t('import.queueFull'));
      return;
    }

    const newItems: QueueItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setGeneralError(`${file.name}: ${t('import.fileTooLarge')}`);
        continue;
      }

      try {
        const content = await file.text();
        const headings = parseMarkdownHeadings(content);
        const title = headings.find((h) => h.level === 1)?.text || file.name.replace(/\.[^/.]+$/, '');

        newItems.push({
          id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          filename: file.name,
          rawSize: file.size,
          content,
          title,
          headings,
          collectionId: collections[0]?.id || 'col-data-extraction',
          duplicateHandling: 'copy',
          status: 'pending',
        });
      } catch (err) {
        console.error(`Error reading ${file.name}`, err);
      }
    }

    setQueue((prev) => [...prev, ...newItems]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleAddPasted = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteContent.trim()) return;

    const filename = pasteFilename.trim() || `pasted_notes_${new Date().toISOString().slice(0, 10)}.md`;
    const size = new Blob([pasteContent]).size;

    if (size > MAX_FILE_SIZE_BYTES) {
      setGeneralError(t('import.fileTooLarge'));
      return;
    }

    const headings = parseMarkdownHeadings(pasteContent);
    const title = headings.find((h) => h.level === 1)?.text || filename.replace(/\.[^/.]+$/, '');

    const newItem: QueueItem = {
      id: `queue-paste-${Date.now()}`,
      filename,
      rawSize: size,
      content: pasteContent,
      title,
      headings,
      collectionId: pasteCollectionId || collections[0]?.id || 'col-data-extraction',
      duplicateHandling: 'copy',
      status: 'pending',
    };

    setQueue((prev) => [...prev, newItem]);
    setPasteContent('');
    setPasteFilename('');
    setActiveTab('files');
  };

  const handleUpdateItem = (id: string, updates: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const handleRemoveItem = (id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  };

  const startProcessingQueue = async () => {
    if (queue.length === 0 || importing) return;
    setImporting(true);
    setGeneralError(null);
    let successCount = 0;

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === 'completed') continue;

      handleUpdateItem(item.id, { status: 'processing' });

      try {
        const created = await repository.createSource({
          title: item.title,
          filename: item.filename,
          originalContent: item.content,
          rawSize: item.rawSize,
          language: locale,
          collectionId: item.collectionId,
          initialRevisionSummary: `Initial ingest of ${item.filename} with ${item.headings.length} headings`,
        });

        handleUpdateItem(item.id, { status: 'completed', importedId: created.id });
        successCount++;
      } catch (err: any) {
        console.error(err);
        handleUpdateItem(item.id, {
          status: 'error',
          errorMessage: err.message || 'Import error',
        });
      }
    }

    setImporting(false);
    setImportedCount(successCount);
    notifyMutation();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
            {t('import.title')}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            {t('import.subtitle')}
          </p>
        </div>

        {queue.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQueue([])}
              className="heroui-btn-secondary text-xs"
            >
              {t('common.reset')}
            </button>
            <button
              type="button"
              disabled={importing || queue.every((q) => q.status === 'completed')}
              onClick={startProcessingQueue}
              className="heroui-btn-primary text-xs"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{importing ? t('common.saving') : `${t('import.btnStartImport')} (${queue.length})`}</span>
            </button>
          </div>
        )}
      </div>

      {/* Stage Progression Indicator */}
      <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
        <div className={`p-2 rounded-lg text-center font-medium ${queue.length === 0 ? 'bg-zinc-800 text-blue-400' : 'text-zinc-400'}`}>
          <span className="font-mono text-[11px] block text-zinc-500">Stage 01</span>
          <span>1. Select Files</span>
        </div>
        <div className={`p-2 rounded-lg text-center font-medium ${queue.length > 0 && !importedCount ? 'bg-zinc-800 text-blue-400' : 'text-zinc-400'}`}>
          <span className="font-mono text-[11px] block text-zinc-500">Stage 02</span>
          <span>2. Review Queue ({queue.length})</span>
        </div>
        <div className={`p-2 rounded-lg text-center font-medium ${importedCount ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40' : 'text-zinc-400'}`}>
          <span className="font-mono text-[11px] block text-zinc-500">Stage 03</span>
          <span>3. Complete</span>
        </div>
      </div>

      {/* Ingestion limits notification */}
      <div className="p-3.5 rounded-xl border border-zinc-800 bg-[#18181b] text-xs text-zinc-400 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-zinc-200 me-1">
            {t('import.limitsTitle')}:
          </span>
          <span>{t('import.limitsDesc')}</span>
        </div>
      </div>

      {/* Success Notification */}
      {importedCount !== null && (
        <div className="p-4 rounded-xl border border-emerald-800/40 bg-emerald-950/20 text-emerald-300 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Successfully imported {importedCount} document(s) into workspace.</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/library?tab=sources')}
            className="heroui-btn-primary text-xs"
          >
            <span>View Source Documents</span>
            <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        </div>
      )}

      {/* General Error Banner */}
      {generalError && (
        <div className="p-3.5 rounded-xl border border-rose-900/40 bg-rose-950/20 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Segmented Switch: Upload Files vs Paste Markdown */}
      <div className="inline-flex items-center p-1 rounded-lg bg-zinc-900 border border-zinc-800">
        <button
          type="button"
          onClick={() => setActiveTab('files')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'files'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span>{t('import.tabFiles')}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('paste')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'paste'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <FileCode className="w-3.5 h-3.5 text-blue-400" />
          <span>{t('import.tabPaste')}</span>
        </button>
      </div>

      {/* File Upload Zone (Neutral & Structured) */}
      {activeTab === 'files' ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-6 sm:p-8 rounded-xl border border-dashed text-center transition-all cursor-pointer ${
            dragOver
              ? 'border-blue-500 bg-blue-950/15'
              : 'border-zinc-700/80 hover:border-zinc-600 bg-[#18181b]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".md,.markdown"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 text-blue-400 flex items-center justify-center mx-auto mb-2.5">
            <UploadCloud className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-100 mb-0.5">
            {t('import.dropzoneTitle')}
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {t('import.dropzoneSubtitle')}
          </p>
        </div>
      ) : (
        /* Paste Markdown Form */
        <form onSubmit={handleAddPasted} className="p-4 rounded-xl border border-zinc-800 bg-[#18181b] space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                {t('import.pasteFilename')}
              </label>
              <input
                type="text"
                dir="auto"
                value={pasteFilename}
                onChange={(e) => setPasteFilename(e.target.value)}
                placeholder="research_report.md"
                className="heroui-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                {t('import.pasteCollection')}
              </label>
              <select
                value={pasteCollectionId}
                onChange={(e) => setPasteCollectionId(e.target.value)}
                className="heroui-select w-full"
              >
                {collections.map((col) => (
                  <option key={col.id} value={col.id}>
                    {locale === 'fa' ? col.nameFa : col.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Markdown Text
            </label>
            <textarea
              dir="auto"
              required
              rows={6}
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder="# Research Report Title..."
              className="heroui-input font-mono text-xs"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="heroui-btn-primary"
            >
              <span>Add to Queue</span>
            </button>
          </div>
        </form>
      )}

      {/* Queue Table */}
      {queue.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-[#18181b] overflow-hidden shadow-xs space-y-0">
          <div className="p-3.5 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between text-xs font-semibold text-zinc-300">
            <span>Import Queue ({queue.length} files)</span>
            <span className="text-[11px] text-zinc-500 font-mono">Max 128 KiB per file</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400">
                  <th className="p-3 font-medium">{t('import.colFile')}</th>
                  <th className="p-3 font-medium">{t('import.colSize')}</th>
                  <th className="p-3 font-medium">{t('import.colCollection')}</th>
                  <th className="p-3 font-medium">{t('import.colDuplicates')}</th>
                  <th className="p-3 font-medium">{t('import.colStatus')}</th>
                  <th className="p-3 font-medium text-end">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {queue.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <div>
                          <div className="font-semibold text-zinc-200">{item.filename}</div>
                          <div className="text-[11px] text-zinc-500 font-mono">
                            {item.headings.length} headings detected
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-zinc-400">
                      {Math.round(item.rawSize / 1024)} KiB
                    </td>
                    <td className="p-3">
                      <select
                        value={item.collectionId}
                        onChange={(e) => handleUpdateItem(item.id, { collectionId: e.target.value })}
                        disabled={item.status !== 'pending'}
                        className="heroui-select text-xs py-1"
                      >
                        {collections.map((c) => (
                          <option key={c.id} value={c.id}>
                            {locale === 'fa' ? c.nameFa : c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <select
                        value={item.duplicateHandling}
                        onChange={(e) =>
                          handleUpdateItem(item.id, {
                            duplicateHandling: e.target.value as any,
                          })
                        }
                        disabled={item.status !== 'pending'}
                        className="heroui-select text-xs py-1"
                      >
                        <option value="copy">{t('import.dupCopy')}</option>
                        <option value="skip">{t('import.dupSkip')}</option>
                        <option value="revision">{t('import.dupRevision')}</option>
                      </select>
                    </td>
                    <td className="p-3">
                      {item.status === 'pending' && (
                        <span className="px-2 py-0.5 rounded text-[11px] bg-zinc-800 text-zinc-400 border border-zinc-700">
                          Pending
                        </span>
                      )}
                      {item.status === 'processing' && (
                        <span className="px-2 py-0.5 rounded text-[11px] bg-blue-950/40 text-blue-400 border border-blue-800/40 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 animate-spin" />
                          Processing
                        </span>
                      )}
                      {item.status === 'completed' && (
                        <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Imported
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="px-2 py-0.5 rounded text-[11px] bg-rose-950/40 text-rose-300 border border-rose-800/40 inline-flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-end whitespace-nowrap">
                      {item.status === 'completed' && item.importedId ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/documents/${item.importedId}`)}
                          className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer me-2"
                        >
                          <span>View</span>
                          <ChevronRight className="w-3 h-3 rtl:rotate-180" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-zinc-500 hover:text-rose-400 p-1 cursor-pointer"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
