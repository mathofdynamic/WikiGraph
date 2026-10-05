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
  ListPlus,
  Info,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
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
  const [draftExcerpt, setDraftExcerpt] = useState<{ heading: string; excerpt: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    repository.listCollections().then((cols) => {
      setCollections(cols);
      if (cols.length > 0) {
        setPasteCollectionId(cols[0].id);
      }
    });
  }, [repository]);

  // Parse markdown headings & excerpts
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
        // Grab next 3 non-empty lines as excerpt
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

  const deriveTitle = (filename: string, content: string): string => {
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) return h1Match[1].trim();
    // Otherwise clean filename
    return filename.replace(/\.(md|markdown)$/i, '').replace(/[-_]/g, ' ');
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setGeneralError(null);
    setImportedCount(null);

    const newItems: QueueItem[] = [];
    let currentTotal = queue.length;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (currentTotal >= MAX_QUEUE_FILES) {
        setGeneralError(t('import.queueFull'));
        break;
      }

      if (!f.name.endsWith('.md') && !f.name.endsWith('.markdown')) {
        continue;
      }

      if (f.size > MAX_FILE_SIZE_BYTES) {
        setGeneralError(`${f.name}: ${t('import.fileTooLarge')}`);
        continue;
      }

      const reader = new FileReader();
      const id = `queue-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      reader.onload = (e) => {
        const content = (e.target?.result as string) || '';
        const headings = parseMarkdownHeadings(content);
        const title = deriveTitle(f.name, content);

        setQueue((prev) => [
          ...prev,
          {
            id,
            file: f,
            filename: f.name,
            rawSize: f.size,
            content,
            title,
            headings,
            collectionId: collections[0]?.id || 'col-research-synthesis',
            duplicateHandling: 'copy',
            status: 'pending',
          },
        ]);
      };

      reader.readAsText(f, 'UTF-8');
      currentTotal++;
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleAddPasted = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteContent.trim()) return;

    const rawSize = new Blob([pasteContent]).size;
    if (rawSize > MAX_FILE_SIZE_BYTES) {
      setGeneralError(t('import.fileTooLarge'));
      return;
    }
    if (queue.length >= MAX_QUEUE_FILES) {
      setGeneralError(t('import.queueFull'));
      return;
    }

    const filename = pasteFilename.trim()
      ? pasteFilename.endsWith('.md')
        ? pasteFilename
        : `${pasteFilename}.md`
      : `pasted_report_${Date.now().toString(36)}.md`;

    const headings = parseMarkdownHeadings(pasteContent);
    const title = deriveTitle(filename, pasteContent);

    setQueue((prev) => [
      ...prev,
      {
        id: `queue-paste-${Date.now()}`,
        filename,
        rawSize,
        content: pasteContent,
        title,
        headings,
        collectionId: pasteCollectionId || collections[0]?.id || 'col-research-synthesis',
        duplicateHandling: 'copy',
        status: 'pending',
      },
    ]);

    setPasteContent('');
    setPasteFilename('');
    setActiveTab('files');
  };

  const removeQueueItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const startProcessingQueue = async () => {
    if (queue.length === 0) return;
    setImporting(true);
    setGeneralError(null);

    try {
      const existingSources = await repository.listSources();
      let count = 0;

      for (const item of queue) {
        if (item.status === 'completed') continue;

        // Check if matching filename already exists
        const existing = existingSources.find((s) => s.filename.toLowerCase() === item.filename.toLowerCase());

        if (existing && item.duplicateHandling === 'skip') {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, status: 'completed', errorMessage: 'Skipped existing file' } : q
            )
          );
          continue;
        }

        if (existing && item.duplicateHandling === 'revision') {
          // Update as a new revision of existing
          await repository.updateSource(
            existing.id,
            {},
            item.content,
            `Imported updated revision from ${item.filename}`
          );
          count++;
        } else {
          // Create new document
          await repository.createSource({
            title: item.title,
            filename: item.filename,
            originalContent: item.content,
            rawSize: item.rawSize,
            language: locale,
            collectionId: item.collectionId,
            initialRevisionSummary: `Initial import from ${item.filename}`,
          });
          count++;
        }

        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'completed' } : q))
        );
      }

      setImportedCount(count);
      notifyMutation();
    } catch (err) {
      console.error(err);
      setGeneralError(t('common.errorOccurred'));
    } finally {
      setImporting(false);
    }
  };

  // Create draft knowledge from section suggestion
  const handleExtractDraftKnowledge = async (item: QueueItem, heading: string, excerpt: string) => {
    try {
      // First ensure the source document is created in repository
      const createdSource = await repository.createSource({
        title: item.title,
        filename: item.filename,
        originalContent: item.content,
        rawSize: item.rawSize,
        language: locale,
        collectionId: item.collectionId,
        initialRevisionSummary: `Imported for knowledge extraction: ${heading}`,
      });

      // Then create draft knowledge item
      const draft = await repository.createKnowledge({
        title: heading.replace(/^[#\d\.\s]+/, ''),
        summary: excerpt || `Key insight extracted from ${item.filename} under ${heading}.`,
        body: `Extracted procedure or finding from section "${heading}". Review and refine parameters.`,
        type: 'procedure',
        collectionId: item.collectionId,
        sourceId: createdSource.id,
        sourceRevisionId: createdSource.revisions[0].revisionId,
        sourceExcerpt: excerpt || heading,
        applicability: `Applicable when working with data described in ${item.filename}.`,
        exclusions: 'Not verified for production environments without empirical testing.',
        requirements: ['Standard environment'],
        reviewStatus: 'draft',
        evidenceLevel: 'observed',
        language: locale,
        sourceHasChanged: false,
      });

      notifyMutation();
      setInspectingItem(null);
      navigate(`/knowledge/${draft.id}`);
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
              {t('nav.import')}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-title text-[#f7f8f8]">
            {t('import.title')}
          </h2>
          <p className="text-xs sm:text-sm text-[#8a8f98] mt-0.5">
            {t('import.subtitle')}
          </p>
        </div>

        {queue.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQueue([])}
              className="px-3 py-1.5 text-xs text-[#8a8f98] hover:text-[#f7f8f8] cursor-pointer"
            >
              {t('common.reset')}
            </button>
            <button
              type="button"
              disabled={importing || queue.every((q) => q.status === 'completed')}
              onClick={startProcessingQueue}
              className="linear-btn-primary text-xs sm:text-sm gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{importing ? t('common.saving') : t('import.btnStartImport')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Prototype Ingestion Notice */}
      <div className="p-4 rounded-xl border border-[#23252a] bg-[#0f1011] text-xs text-[#8a8f98] flex items-start gap-3">
        <Info className="w-4 h-4 text-[#828fff] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-[#f7f8f8]">
            {t('import.limitsTitle')}:
          </span>
          <p>{t('import.limitsDesc')}</p>
        </div>
      </div>

      {/* Tabs: Upload vs Paste */}
      <div className="flex items-center p-1 rounded-md bg-[#141516] border border-[#23252a] w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('files')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
            activeTab === 'files'
              ? 'bg-[#1b1c1d] text-[#f7f8f8] border border-[#2e3036]'
              : 'text-[#8a8f98] hover:text-[#f7f8f8]'
          }`}
        >
          <FileText className="w-4 h-4 text-[#828fff]" />
          <span>{t('import.tabFiles')}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('paste')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
            activeTab === 'paste'
              ? 'bg-[#1b1c1d] text-[#f7f8f8] border border-[#2e3036]'
              : 'text-[#8a8f98] hover:text-[#f7f8f8]'
          }`}
        >
          <FileCode className="w-4 h-4 text-[#5e6ad2]" />
          <span>{t('import.tabPaste')}</span>
        </button>
      </div>

      {/* File Upload Zone */}
      {activeTab === 'files' ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-8 sm:p-12 rounded-xl border-2 border-dashed text-center transition-all cursor-pointer ${
            dragOver
              ? 'border-[#5e6ad2] bg-[#1f2347]'
              : 'border-[#23252a] hover:border-[#5e6ad2] bg-[#0f1011]'
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
          <div className="w-12 h-12 rounded-lg bg-[#141516] border border-[#23252a] text-[#828fff] flex items-center justify-center mx-auto mb-3.5">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold tracking-title text-[#f7f8f8] mb-1">
            {t('import.dropzoneTitle')}
          </h3>
          <p className="text-xs sm:text-sm text-[#8a8f98] max-w-md mx-auto">
            {t('import.dropzoneSubtitle')}
          </p>
        </div>
      ) : (
        /* Paste Markdown Form */
        <form onSubmit={handleAddPasted} className="p-5 rounded-xl border border-[#23252a] bg-[#0f1011] space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                {t('import.pasteFilename')}
              </label>
              <input
                type="text"
                dir="auto"
                value={pasteFilename}
                onChange={(e) => setPasteFilename(e.target.value)}
                placeholder="my_research_notes.md"
                className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                {t('import.pasteCollection')}
              </label>
              <select
                value={pasteCollectionId}
                onChange={(e) => setPasteCollectionId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
              >
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {locale === 'fa' ? c.nameFa : c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8a8f98] mb-1">
              {t('import.pasteTitle')}
            </label>
            <textarea
              dir="auto"
              required
              rows={8}
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder={t('import.pastePlaceholder')}
              className="w-full p-3 text-xs sm:text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2]"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="linear-btn-primary text-xs sm:text-sm"
            >
              Add to Queue
            </button>
          </div>
        </form>
      )}

      {/* General Error or Success Message */}
      {generalError && (
        <div className="p-3 rounded-lg border border-[#4c1d24] bg-[#241215] text-xs text-[#fb7185] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {importedCount !== null && (
        <div className="p-3 rounded-lg border border-[#184a37] bg-[#10221c] text-xs text-[#4ade80] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4ade80]" />
            <span>
              {t('import.importSuccess')} ({importedCount} documents processed).
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/library?tab=sources')}
            className="font-medium underline cursor-pointer hover:text-white"
          >
            {t('library.tabSources')}
          </button>
        </div>
      )}

      {/* Import Queue Table */}
      {queue.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[#8a8f98] font-medium px-1">
            <span>
              {queue.length} file{queue.length > 1 ? 's' : ''} in queue
            </span>
            <span>Max {MAX_QUEUE_FILES} files</span>
          </div>

          <div className="rounded-xl border border-[#23252a] bg-[#0f1011] overflow-hidden divide-y divide-[#23252a]">
            {queue.map((item) => (
              <div
                key={item.id}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-[#828fff] shrink-0" />
                    <span className="font-semibold text-xs sm:text-sm text-[#f7f8f8] truncate">
                      {item.title}
                    </span>
                    <span className="text-[11px] text-[#8a8f98] shrink-0">
                      ({item.filename})
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#8a8f98]">
                    <span>{(item.rawSize / 1024).toFixed(1)} KiB</span>
                    <span>&bull;</span>
                    <span>{item.headings.length} headings</span>
                    <span>&bull;</span>
                    {/* Collection picker for this item */}
                    <select
                      value={item.collectionId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQueue((prev) =>
                          prev.map((q) => (q.id === item.id ? { ...q, collectionId: val } : q))
                        );
                      }}
                      className="px-2 py-0.5 rounded border border-[#23252a] bg-[#141516] text-[#d0d6e0] text-xs focus:outline-none focus:border-[#5e6ad2]"
                    >
                      {collections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {locale === 'fa' ? c.nameFa : c.name}
                        </option>
                      ))}
                    </select>
                    <span>&bull;</span>
                    {/* Duplicate handling */}
                    <select
                      value={item.duplicateHandling}
                      onChange={(e) => {
                        const val = e.target.value as 'skip' | 'copy' | 'revision';
                        setQueue((prev) =>
                          prev.map((q) => (q.id === item.id ? { ...q, duplicateHandling: val } : q))
                        );
                      }}
                      className="px-2 py-0.5 rounded border border-[#23252a] bg-[#141516] text-[#d0d6e0] text-xs focus:outline-none focus:border-[#5e6ad2]"
                    >
                      <option value="copy">{t('import.dupCopy')}</option>
                      <option value="skip">{t('import.dupSkip')}</option>
                      <option value="revision">{t('import.dupRevision')}</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
                  {/* Section Suggestions button */}
                  {item.headings.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setInspectingItem(item)}
                      className="linear-btn-secondary text-xs gap-1.5"
                    >
                      <ListPlus className="w-3.5 h-3.5 text-[#828fff]" />
                      <span>{t('import.btnInspectSections')}</span>
                    </button>
                  )}

                  {/* Status Indicator */}
                  {item.status === 'completed' ? (
                    <span className="inline-flex items-center gap-1 text-xs text-[#4ade80] font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Imported</span>
                    </span>
                  ) : item.status === 'error' ? (
                    <span className="text-xs text-[#fb7185] font-medium">Error</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeQueueItem(item.id)}
                      className="p-1 rounded text-[#8a8f98] hover:text-[#f7f8f8] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section Suggestions Inspector Modal */}
      {inspectingItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div className="w-full max-w-2xl bg-[#0f1011] rounded-xl border border-[#23252a] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#23252a]">
              <div className="min-w-0 pr-4">
                <span className="text-[11px] uppercase tracking-wider text-[#8a8f98]">
                  {t('import.btnInspectSections')}
                </span>
                <h3 className="text-base font-semibold tracking-title text-[#f7f8f8] truncate">
                  {inspectingItem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingItem(null)}
                className="p-1 rounded text-[#8a8f98] hover:text-[#f7f8f8] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <p className="text-xs text-[#8a8f98]">
                Extracted headings and section previews from Markdown structure. Click to create a draft knowledge item from any section suggestion.
              </p>

              <div className="space-y-3">
                {inspectingItem.headings.map((h, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-[#23252a] bg-[#141516] hover:border-[#34343a] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span
                        dir="auto"
                        className="font-medium text-xs sm:text-sm text-[#f7f8f8]"
                      >
                        {h.text}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleExtractDraftKnowledge(inspectingItem, h.text, h.excerpt)
                        }
                        className="linear-btn-primary text-xs gap-1 shrink-0"
                      >
                        <span>{t('import.extractDraft')}</span>
                        <ChevronRight className="w-3 h-3 rtl:rotate-180" />
                      </button>
                    </div>
                    {h.excerpt && (
                      <p
                        dir="auto"
                        className="text-xs text-[#8a8f98] line-clamp-2 italic"
                      >
                        "{h.excerpt}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-3 bg-[#0f1011] border-t border-[#23252a] text-end">
              <button
                type="button"
                onClick={() => setInspectingItem(null)}
                className="linear-btn-secondary text-xs sm:text-sm"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
