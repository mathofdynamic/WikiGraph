import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  Layers,
  ArrowLeft,
  ExternalLink,
  Edit3,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  History,
  X,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import { Collection, KnowledgeItem, SourceDocument, SourceRevision } from '../types';
import { MarkdownViewer } from '../components/common/MarkdownViewer';
import { Badge } from '../components/common/Badge';
import { ConfirmModal } from '../components/common/ConfirmModal';

export const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { repository, version, notifyMutation } = useRepository();
  const { t, locale } = useLocale();
  const navigate = useNavigate();

  const [document, setDocument] = useState<SourceDocument | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [relatedKnowledge, setRelatedKnowledge] = useState<KnowledgeItem[]>([]);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Edit / Add Revision Modal
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editRevisionSummary, setEditRevisionSummary] = useState('');
  const [editTitle, setEditTitle] = useState('');

  // Extract Knowledge Modal
  const [extractModalOpen, setExtractModalOpen] = useState(false);
  const [selectedExcerpt, setSelectedExcerpt] = useState('');
  const [extractTitle, setExtractTitle] = useState('');
  const [extractSummary, setExtractSummary] = useState('');

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;

    const loadDoc = async () => {
      try {
        setLoading(true);
        const doc = await repository.getSource(id);
        if (!active) return;
        if (!doc) {
          setDocument(null);
          return;
        }

        setDocument(doc);
        if (doc.revisions.length > 0) {
          setSelectedRevisionId(doc.revisions[doc.revisions.length - 1].revisionId);
        }

        const [cols, allK] = await Promise.all([
          repository.listCollections(),
          repository.listKnowledge(),
        ]);
        if (!active) return;

        setCollection(cols.find((c) => c.id === doc.collectionId) || null);
        setRelatedKnowledge(allK.filter((k) => k.sourceId === id));
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDoc();
    return () => {
      active = false;
    };
  }, [id, repository, version]);

  const activeRevision: SourceRevision | undefined = React.useMemo(() => {
    if (!document) return undefined;
    return (
      document.revisions.find((r) => r.revisionId === selectedRevisionId) ||
      document.revisions[document.revisions.length - 1]
    );
  }, [document, selectedRevisionId]);

  const activeContent: string = activeRevision?.content || document?.originalContent || '';

  const handleSelection = () => {
    const sel = window.getSelection()?.toString().trim();
    if (sel && sel.length > 5) {
      setSelectedExcerpt(sel);
    }
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(activeContent || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenEdit = () => {
    if (!document) return;
    setEditTitle(document.title);
    setEditContent(activeContent || '');
    setEditRevisionSummary('');
    setIsEditing(true);
  };

  const handleSaveRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document || !id) return;

    try {
      await repository.updateSource(
        id,
        { title: editTitle },
        editContent,
        editRevisionSummary || `Updated document on ${new Date().toISOString()}`
      );
      setIsEditing(false);
      notifyMutation();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExtractKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document || !extractTitle.trim()) return;

    try {
      const created = await repository.createKnowledge({
        title: extractTitle,
        summary: extractSummary || selectedExcerpt.slice(0, 140),
        body: selectedExcerpt,
        type: 'procedure',
        collectionId: document.collectionId,
        sourceId: document.id,
        sourceRevisionId: activeRevision?.revisionId || 'rev-src-01-a',
        sourceExcerpt: selectedExcerpt || document.title,
        applicability: 'Derived from source report.',
        exclusions: '',
        requirements: [],
        reviewStatus: 'draft',
        evidenceLevel: 'observed',
        language: document.language,
        sourceHasChanged: false,
      });

      setExtractModalOpen(false);
      setSelectedExcerpt('');
      setExtractTitle('');
      setExtractSummary('');
      notifyMutation();
      navigate(`/knowledge/${created.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!document || !id) return;
    try {
      await repository.deleteSource(id);
      notifyMutation();
      navigate('/library?tab=sources');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-zinc-500">
        <Clock className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
        <span>{t('common.loading')}</span>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="py-20 text-center text-xs text-zinc-500 max-w-md mx-auto">
        <AlertCircle className="w-7 h-7 mx-auto mb-2 text-rose-500" />
        <h2 className="text-sm font-semibold text-zinc-100 mb-1">{t('sourceDetail.notFound')}</h2>
        <button
          type="button"
          onClick={() => navigate('/library?tab=sources')}
          className="heroui-btn-secondary mt-3"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
          <span>{t('common.backToLibrary')}</span>
        </button>
      </div>
    );
  }

  return (
    <div
      onMouseUp={handleSelection}
      className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6"
    >
      {/* Back button & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <button
          type="button"
          onClick={() => navigate('/library?tab=sources')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180 text-blue-400" />
          <span>{t('common.backToLibrary')}</span>
        </button>

        <div className="flex items-center gap-2">
          {selectedExcerpt && (
            <button
              type="button"
              onClick={() => {
                setExtractTitle('');
                setExtractSummary(selectedExcerpt.slice(0, 120));
                setExtractModalOpen(true);
              }}
              className="heroui-btn-primary text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('sourceDetail.extractKnowledge')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenEdit}
            className="heroui-btn-secondary text-xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
            <span>{t('sourceDetail.editSource')}</span>
          </button>

          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/40 transition-colors cursor-pointer"
            title={t('sourceDetail.deleteSource')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Layout: Left Document Body, Right Meta and Revisions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Document Content View (Left 8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-5 sm:p-6 rounded-xl border border-zinc-800 bg-[#18181b] space-y-4">
            {/* Header info */}
            <div className="space-y-2 pb-4 border-b border-zinc-800">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-mono">{document.filename}</span>
                <button
                  type="button"
                  onClick={handleCopyContent}
                  className="inline-flex items-center gap-1 hover:text-zinc-100 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-blue-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t('common.copy')}</span>
                    </>
                  )}
                </button>
              </div>

              <h1
                dir="auto"
                className="text-lg sm:text-2xl font-bold tracking-tight text-zinc-100 leading-snug"
              >
                {document.title}
              </h1>

              {activeRevision && (
                <div className="flex items-center gap-2 text-xs text-zinc-400 pt-1">
                  <span className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-300 font-mono text-[11px]">
                    {activeRevision.revisionId}
                  </span>
                  <span>•</span>
                  <span>{activeRevision.changeSummary || activeRevision.summary || 'Snapshot'}</span>
                </div>
              )}
            </div>

            {/* Hint for excerpt extraction */}
            <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
              <span>
                Tip: Highlight any sentence or paragraph with your mouse to extract a draft knowledge item.
              </span>
              {selectedExcerpt && (
                <span className="text-blue-400 font-medium">
                  {selectedExcerpt.length} chars selected
                </span>
              )}
            </div>

            {/* Markdown Reader */}
            <div className="pt-2 text-zinc-300 text-xs sm:text-sm">
              <MarkdownViewer content={activeContent} />
            </div>
          </div>
        </div>

        {/* Right Sidebar: Metadata, Revisions list, Extracted Knowledge (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Metadata Card */}
          <div className="p-4 rounded-xl border border-zinc-800 bg-[#18181b] space-y-3">
            <h3 className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
              {t('sourceDetail.metadata')}
            </h3>

            <div className="space-y-2 text-xs divide-y divide-zinc-800">
              <div className="pt-1 flex items-center justify-between">
                <span className="text-zinc-500">{t('knowledgeDetail.fieldCollection')}</span>
                <span className="font-medium text-zinc-200">
                  {collection ? (locale === 'fa' ? collection.nameFa : collection.name) : '-'}
                </span>
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-zinc-500">{t('sourceDetail.language')}</span>
                <span className="font-medium text-zinc-200">
                  {document.language === 'fa' ? 'فارسی' : 'English'}
                </span>
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-zinc-500">{t('sourceDetail.size')}</span>
                <span className="text-zinc-300 font-mono">
                  {((document.rawSize || 0) / 1024).toFixed(1)} KiB
                </span>
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-zinc-500">{t('sourceDetail.importedAt')}</span>
                <span className="text-zinc-400">
                  {new Date(document.importedAt || document.createdAt).toLocaleDateString()}
                </span>
              </div>
              {(document.sourceUrl || document.url) && (
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-zinc-500">{t('sourceDetail.originalUrl')}</span>
                  <a
                    href={document.sourceUrl || document.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:underline"
                  >
                    <span>Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Revisions History Card */}
          <div className="p-4 rounded-xl border border-zinc-800 bg-[#18181b] space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-zinc-400" />
                <span>{t('sourceDetail.revisions')}</span>
              </h3>
              <span className="text-[11px] text-zinc-500 font-mono">
                {document.revisions.length} total
              </span>
            </div>

            <div className="space-y-1.5">
              {document.revisions.map((rev) => {
                const isSelected = rev.revisionId === activeRevision?.revisionId;
                return (
                  <button
                    key={rev.revisionId}
                    type="button"
                    onClick={() => setSelectedRevisionId(rev.revisionId)}
                    className={`w-full text-start p-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-zinc-800 text-zinc-100 ring-1 ring-blue-500/20'
                        : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <span className="font-semibold text-blue-400 font-mono">
                        {rev.revisionId}
                      </span>
                      <span className="text-zinc-500 text-[10px]">
                        {new Date(rev.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-zinc-300 line-clamp-1 text-[11px]">
                      {rev.changeSummary || rev.summary || 'Snapshot'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Related Knowledge Items Card */}
          <div className="p-4 rounded-xl border border-zinc-800 bg-[#18181b] space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                {t('sourceDetail.relatedKnowledge')}
              </h3>
              <span className="text-[11px] text-zinc-500 font-mono">
                {relatedKnowledge.length}
              </span>
            </div>

            {relatedKnowledge.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">
                {t('sourceDetail.noRelatedKnowledge')}
              </p>
            ) : (
              <div className="space-y-1.5">
                {relatedKnowledge.map((k) => (
                  <div
                    key={k.id}
                    onClick={() => navigate(`/knowledge/${k.id}`)}
                    className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-850 hover:border-zinc-700 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge type="knowledgeType" value={k.type} size="sm" />
                      <Badge type="review" value={k.reviewStatus} size="sm" />
                    </div>
                    <h4
                      dir="auto"
                      className="text-xs font-medium text-zinc-200 group-hover:text-blue-400 truncate"
                    >
                      {k.title}
                    </h4>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit / New Revision Modal */}
      {isEditing && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-2xl bg-[#18181b] rounded-xl border border-zinc-800 overflow-hidden max-h-[85vh] flex flex-col shadow-2xl">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100">
                {t('sourceDetail.editSource')}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRevision} className="p-5 space-y-3.5 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  dir="auto"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="heroui-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Revision Summary (What changed?) *
                </label>
                <input
                  type="text"
                  dir="auto"
                  required
                  placeholder="e.g. Corrected benchmark parameter tables and cited updated sources"
                  value={editRevisionSummary}
                  onChange={(e) => setEditRevisionSummary(e.target.value)}
                  className="heroui-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Markdown Content
                </label>
                <textarea
                  dir="auto"
                  rows={10}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="heroui-input font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
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

      {/* Extract Knowledge Modal */}
      {extractModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-lg bg-[#18181b] rounded-xl border border-zinc-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-100">
                {t('sourceDetail.extractKnowledge')}
              </h3>
              <button
                type="button"
                onClick={() => setExtractModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExtractKnowledge} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Selected Excerpt
                </label>
                <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono max-h-32 overflow-y-auto">
                  "{selectedExcerpt}"
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  dir="auto"
                  required
                  placeholder="e.g. Heuristic Row Projection Alignment"
                  value={extractTitle}
                  onChange={(e) => setExtractTitle(e.target.value)}
                  className="heroui-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Summary
                </label>
                <textarea
                  dir="auto"
                  rows={2}
                  value={extractSummary}
                  onChange={(e) => setExtractSummary(e.target.value)}
                  placeholder="Brief summary..."
                  className="heroui-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setExtractModalOpen(false)}
                  className="heroui-btn-secondary"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="heroui-btn-primary"
                >
                  {t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title={t('sourceDetail.deleteSource')}
        description="Are you sure you want to delete this source document? All extracted knowledge items will remain intact."
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        isDestructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
};
