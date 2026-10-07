import React, { useState, useRef } from 'react';
import { X, Plus, Clock } from 'lucide-react';
import { useLocale } from '../../locales/useLocale';
import { Collection, EvidenceLevel, KnowledgeItem, KnowledgeType, ReviewStatus } from '../../types';
import { useFocusTrap } from '../../lib/useFocusTrap';

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  collections: Collection[];
  onSubmit: (item: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  isOpen,
  onClose,
  collections,
  onSubmit,
}) => {
  const { t, locale } = useLocale();
  const modalRef = useRef<HTMLDivElement>(null);

  useFocusTrap(modalRef, isOpen, onClose);

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<KnowledgeType>('tip');
  const [collectionId, setCollectionId] = useState(collections[0]?.id || 'col-data-extraction');
  const [evidenceLevel, setEvidenceLevel] = useState<EvidenceLevel>('observed');
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>('reviewed');
  const [applicability, setApplicability] = useState('');
  const [exclusions, setExclusions] = useState('');
  const [requirementsInput, setRequirementsInput] = useState('');
  const [itemLanguage, setItemLanguage] = useState<'en' | 'fa'>(locale as 'en' | 'fa');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim()) {
      setError(t('common.titleSummaryRequired'));
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const requirements = requirementsInput
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);

      await onSubmit({
        title: title.trim(),
        summary: summary.trim(),
        body: body.trim(),
        type,
        collectionId,
        applicability: applicability.trim(),
        exclusions: exclusions.trim(),
        requirements,
        sourceId: null,
        sourceRevisionId: null,
        sourceExcerpt: null,
        origin: 'manual',
        status: 'active',
        reviewStatus,
        evidenceLevel,
        language: itemLanguage,
      });

      // Reset form
      setTitle('');
      setSummary('');
      setBody('');
      setApplicability('');
      setExclusions('');
      setRequirementsInput('');
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create manual note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
      <div
        ref={modalRef}
        className="ui-panel max-w-2xl w-full max-h-[90vh] flex flex-col shadow-lg border border-[var(--border)] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--separator)] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-[var(--foreground)] tracking-tight">
              {t('library.createNoteModalTitle')}
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {t('library.createNoteModalDesc')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 text-xs">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <label className="font-semibold text-[var(--foreground)] flex items-center justify-between">
              <span>{t('knowledgeDetail.fieldTitle')} *</span>
            </label>
            <input
              type="text"
              dir="auto"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Memory optimizations for scalar quantization..."
              className="ui-input w-full"
            />
          </div>

          {/* Core Summary */}
          <div className="space-y-1">
            <label className="font-semibold text-[var(--foreground)] flex items-center justify-between">
              <span>{t('knowledgeDetail.fieldSummary')} *</span>
            </label>
            <textarea
              dir="auto"
              required
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Concise takeaway or operational insight..."
              className="ui-input w-full"
            />
          </div>

          {/* Classification Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-[var(--foreground)]">
                {t('knowledgeDetail.fieldType')}
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as KnowledgeType)}
                className="ui-select w-full"
              >
                <option value="tip">{t('types.tip')}</option>
                <option value="procedure">{t('types.procedure')}</option>
                <option value="research_finding">{t('types.research_finding')}</option>
                <option value="skill">{t('types.skill')}</option>
                <option value="example">{t('types.example')}</option>
                <option value="failure">{t('types.failure')}</option>
                <option value="lesson">{t('types.lesson')}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[var(--foreground)]">
                {t('knowledgeDetail.fieldCollection')}
              </label>
              <select
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
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
                {t('common.language')}
              </label>
              <select
                value={itemLanguage}
                onChange={(e) => setItemLanguage(e.target.value as 'en' | 'fa')}
                className="ui-select w-full"
              >
                <option value="en">English (en)</option>
                <option value="fa">فارسی (fa)</option>
              </select>
            </div>
          </div>

          {/* Evidence and Review Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-[var(--foreground)]">
                {t('knowledgeDetail.fieldEvidenceLevel')}
              </label>
              <select
                value={evidenceLevel}
                onChange={(e) => setEvidenceLevel(e.target.value as EvidenceLevel)}
                className="ui-select w-full"
              >
                <option value="tested">{t('evidenceLevel.tested')}</option>
                <option value="observed">{t('evidenceLevel.observed')}</option>
                <option value="unverified">{t('evidenceLevel.unverified')}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[var(--foreground)]">
                {t('knowledgeDetail.fieldReviewStatus')}
              </label>
              <select
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value as ReviewStatus)}
                className="ui-select w-full"
              >
                <option value="reviewed">{t('reviewStatus.reviewed')}</option>
                <option value="draft">{t('reviewStatus.draft')}</option>
              </select>
            </div>
          </div>

          {/* Procedural Body / Steps */}
          <div className="space-y-1">
            <label className="font-semibold text-[var(--foreground)]">
              {t('knowledgeDetail.fieldBody')}
            </label>
            <textarea
              dir="auto"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Step-by-step procedural steps or markdown documentation..."
              className="ui-input w-full font-mono text-[11px]"
            />
          </div>

          {/* Applicability & Exclusions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-[var(--foreground)]">
                {t('knowledgeDetail.fieldApplicability')}
              </label>
              <input
                type="text"
                dir="auto"
                value={applicability}
                onChange={(e) => setApplicability(e.target.value)}
                placeholder="When to apply..."
                className="ui-input w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-[var(--foreground)]">
                {t('knowledgeDetail.fieldExclusions')}
              </label>
              <input
                type="text"
                dir="auto"
                value={exclusions}
                onChange={(e) => setExclusions(e.target.value)}
                placeholder="When NOT to apply..."
                className="ui-input w-full"
              />
            </div>
          </div>

          {/* Requirements */}
          <div className="space-y-1">
            <label className="font-semibold text-[var(--foreground)]">
              {t('knowledgeDetail.fieldRequirements')}
            </label>
            <input
              type="text"
              dir="auto"
              value={requirementsInput}
              onChange={(e) => setRequirementsInput(e.target.value)}
              placeholder="Tool names or prerequisites separated by commas..."
              className="ui-input w-full"
            />
            <p className="text-[11px] text-[var(--muted)]">
              {t('knowledgeDetail.fieldRequirementsHint')}
            </p>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-[var(--separator)] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="ui-button ui-button-secondary text-xs"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="ui-button ui-button-primary text-xs"
            >
              {saving ? (
                <>
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('common.saving')}</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('common.create')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
