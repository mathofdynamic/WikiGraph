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
  Eye,
  History,
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
        setSelectedRevisionId(doc.revisions[doc.revisions.length - 1]?.revisionId || null);

        const [cols, knowledgeList] = await Promise.all([
          repository.listCollections(),
          repository.listKnowledge({ sourceId: id }),
        ]);

        if (!active) return;
        const col = cols.find((c) => c.id === doc.collectionId) || null;
        setCollection(col);
        setRelatedKnowledge(knowledgeList);
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

  // Determine current active revision content
  const activeRevision: SourceRevision | null = React.useMemo(() => {
    if (!document) return null;
    return (
      document.revisions.find((r) => r.revisionId === selectedRevisionId) ||
      document.revisions[document.revisions.length - 1] ||
      null
    );
  }, [document, selectedRevisionId]);

  const activeContent: string = activeRevision?.content || document?.originalContent || '';

  // Handle text selection for extraction
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
      <div className="p-12 text-center text-sm text-stone-500">
        <Clock className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
        <span>{t('common.loading')}</span>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-12 text-center text-sm text-[#8a8f98]">
        <AlertCircle className="w-6 h-6 mx-auto mb-2 text-[#f43f5e]" />
        <span>{t('sourceDetail.notFound')}</span>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate('/library?tab=sources')}
            className="text-[#828fff] hover:text-[#5e6ad2] underline text-xs cursor-pointer"
          >
            {t('common.backToLibrary')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onMouseUp={handleSelection}
      className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6"
    >
      {/* Back button & Breadcrumbs */}
      <div className="flex items-center justify-between pb-3 border-b border-[#23252a]">
        <button
          type="button"
          onClick={() => navigate('/library?tab=sources')}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#8a8f98] hover:text-[#f7f8f8] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
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
              className="linear-btn-primary text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('sourceDetail.extractKnowledge')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenEdit}
            className="linear-btn-secondary text-xs gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#5e6ad2]" />
            <span>{t('sourceDetail.editSource')}</span>
          </button>

          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="p-1.5 rounded-md text-[#8a8f98] hover:text-[#f43f5e] hover:bg-[#1a1012] cursor-pointer"
            title={t('sourceDetail.deleteSource')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Layout: Left Document Body, Right Meta and Revisions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Document Content View (Left 8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-6 sm:p-8 rounded-xl border border-[#23252a] bg-[#0f1011] space-y-4">
            {/* Header info */}
            <div className="space-y-2 pb-4 border-b border-[#23252a]">
              <div className="flex items-center justify-between text-xs text-[#8a8f98]">
                <span>{document.filename}</span>
                <button
                  type="button"
                  onClick={handleCopyContent}
                  className="inline-flex items-center gap-1 hover:text-[#f7f8f8] cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#828fff]" />
                      <span className="text-[#828fff]">Copied</span>
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
                className="text-xl sm:text-2xl font-bold tracking-title text-[#f7f8f8] leading-snug"
              >
                {document.title}
              </h1>

              {activeRevision && (
                <div className="flex items-center gap-2 text-xs text-[#8a8f98] pt-1">
                  <span className="bg-[#141516] border border-[#23252a] px-2 py-0.5 rounded text-[#d0d6e0]">
                    {activeRevision.revisionId}
                  </span>
                  <span>&bull;</span>
                  <span>{activeRevision.changeSummary || activeRevision.summary || 'Snapshot'}</span>
                </div>
              )}
            </div>

            {/* Hint for excerpt extraction */}
            <div className="p-2.5 rounded-lg bg-[#141516] border border-[#23252a] text-[11px] text-[#8a8f98] flex items-center justify-between">
              <span>
                Tip: Highlight any sentence or paragraph with your mouse to extract a draft knowledge item.
              </span>
              {selectedExcerpt && (
                <span className="text-[#828fff] font-medium">
                  {selectedExcerpt.length} chars selected
                </span>
              )}
            </div>

            {/* Markdown Reader */}
            <div className="pt-2">
              <MarkdownViewer content={activeContent} />
            </div>
          </div>
        </div>

        {/* Right Sidebar: Metadata, Revisions list, Extracted Knowledge (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Metadata Card */}
          <div className="p-5 rounded-xl border border-[#23252a] bg-[#0f1011] space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-[#8a8f98] font-medium">
              {t('sourceDetail.metadata')}
            </h3>

            <div className="space-y-2 text-xs divide-y divide-[#23252a]">
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[#8a8f98]">{t('knowledgeDetail.fieldCollection')}</span>
                <span className="font-medium text-[#f7f8f8]">
                  {collection ? (locale === 'fa' ? collection.nameFa : collection.name) : '-'}
                </span>
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[#8a8f98]">{t('sourceDetail.language')}</span>
                <span className="font-medium text-[#f7f8f8]">
                  {document.language === 'fa' ? 'فارسی (Persian)' : 'English'}
                </span>
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[#8a8f98]">{t('sourceDetail.size')}</span>
                <span className="text-[#f7f8f8]">
                  {((document.rawSize || 0) / 1024).toFixed(1)} KiB
                </span>
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[#8a8f98]">{t('sourceDetail.importedAt')}</span>
                <span className="text-[#8a8f98]">
                  {new Date(document.importedAt || document.createdAt).toLocaleDateString()}
                </span>
              </div>
              {(document.sourceUrl || document.url) && (
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[#8a8f98]">{t('sourceDetail.originalUrl')}</span>
                  <a
                    href={document.sourceUrl || document.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#828fff] hover:text-[#5e6ad2] underline"
                  >
                    <span>Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Revisions History Card */}
          <div className="p-5 rounded-xl border border-[#23252a] bg-[#0f1011] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-wider text-[#8a8f98] font-medium flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-[#8a8f98]" />
                <span>{t('sourceDetail.revisions')}</span>
              </h3>
              <span className="text-[11px] text-[#8a8f98]">
                {document.revisions.length} total
              </span>
            </div>

            <div className="space-y-2">
              {document.revisions.map((rev) => {
                const isSelected = rev.revisionId === activeRevision?.revisionId;
                return (
                  <button
                    key={rev.revisionId}
                    type="button"
                    onClick={() => setSelectedRevisionId(rev.revisionId)}
                    className={`w-full text-start p-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[#5e6ad2] bg-[#1f2347] text-[#828fff]'
                        : 'border-[#23252a] bg-[#141516] hover:border-[#34343a] text-[#8a8f98]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-[#828fff]">
                        {rev.revisionId}
                      </span>
                      <span className="text-[#8a8f98]">
                        {new Date(rev.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[#d0d6e0] line-clamp-2">
                      {rev.changeSummary || rev.summary || 'Snapshot'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Related Knowledge Items Card */}
          <div className="p-5 rounded-xl border border-[#23252a] bg-[#0f1011] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-wider text-[#8a8f98] font-medium">
                {t('sourceDetail.relatedKnowledge')}
              </h3>
              <span className="text-[11px] text-[#8a8f98]">
                {relatedKnowledge.length}
              </span>
            </div>

            {relatedKnowledge.length === 0 ? (
              <p className="text-xs text-[#8a8f98] italic">
                No knowledge items extracted from this source yet.
              </p>
            ) : (
              <div className="space-y-2">
                {relatedKnowledge.map((k) => (
                  <div
                    key={k.id}
                    onClick={() => navigate(`/knowledge/${k.id}`)}
                    className="p-2.5 rounded-lg border border-[#23252a] bg-[#141516] hover:border-[#34343a] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge type="knowledgeType" value={k.type} size="sm" />
                      <Badge type="review" value={k.reviewStatus} size="sm" />
                    </div>
                    <h4
                      dir="auto"
                      className="text-xs font-medium text-[#f7f8f8] group-hover:text-[#828fff] truncate"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div className="w-full max-w-3xl bg-[#0f1011] rounded-xl border border-[#23252a] overflow-hidden my-8 max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-[#23252a] flex items-center justify-between">
              <h3 className="text-base font-semibold tracking-title text-[#f7f8f8]">
                {t('sourceDetail.editSource')}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 rounded text-[#8a8f98] hover:text-[#f7f8f8] cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveRevision} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  Title
                </label>
                <input
                  type="text"
                  dir="auto"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  Revision Summary (What changed?) *
                </label>
                <input
                  type="text"
                  dir="auto"
                  required
                  placeholder="e.g. Corrected benchmark parameter tables and cited updated sources"
                  value={editRevisionSummary}
                  onChange={(e) => setEditRevisionSummary(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  Original Markdown Content
                </label>
                <textarea
                  dir="auto"
                  rows={14}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-3 text-xs rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] leading-relaxed focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#23252a]">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="linear-btn-secondary text-xs sm:text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="linear-btn-primary text-xs sm:text-sm"
                >
                  {t('sourceDetail.saveRevision')}
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div className="w-full max-w-xl bg-[#0f1011] rounded-xl border border-[#23252a] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#23252a] flex items-center justify-between">
              <h3 className="text-base font-semibold tracking-title text-[#f7f8f8]">
                {t('sourceDetail.extractKnowledge')}
              </h3>
              <button
                type="button"
                onClick={() => setExtractModalOpen(false)}
                className="p-1 rounded text-[#8a8f98] hover:text-[#f7f8f8] cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleExtractKnowledge} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  dir="auto"
                  required
                  placeholder="e.g. Structured Extraction Pattern"
                  value={extractTitle}
                  onChange={(e) => setExtractTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  Summary
                </label>
                <textarea
                  dir="auto"
                  rows={2}
                  value={extractSummary}
                  onChange={(e) => setExtractSummary(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  Source Excerpt Citation
                </label>
                <blockquote
                  dir="auto"
                  className="p-3 text-xs italic text-[#d0d6e0] bg-[#141516] rounded-md border border-[#23252a] max-h-32 overflow-y-auto border-s-2 border-s-[#5e6ad2]"
                >
                  "{selectedExcerpt}"
                </blockquote>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#23252a]">
                <button
                  type="button"
                  onClick={() => setExtractModalOpen(false)}
                  className="linear-btn-secondary text-xs sm:text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="linear-btn-primary text-xs sm:text-sm"
                >
                  Create & View Knowledge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title={t('sourceDetail.deleteSource')}
        description={t('sourceDetail.deleteConfirm')}
        isDestructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
};
