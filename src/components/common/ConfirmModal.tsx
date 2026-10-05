import React, { useEffect, useRef } from 'react';
import { useLocale } from '../../locales/useLocale';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  const { t } = useLocale();
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      confirmBtnRef.current?.focus();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onCancel();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div
        className="w-full max-w-md rounded-xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--separator)]">
          <div className="flex items-center gap-2 text-[var(--foreground)] font-medium text-sm">
            {isDestructive && <AlertTriangle className="w-4 h-4 text-[var(--danger)] shrink-0" />}
            <span id="confirm-modal-title">{title}</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)] cursor-pointer transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
          {description}
        </div>

        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-[var(--surface-secondary)]/50 border-t border-[var(--separator)]">
          <button
            type="button"
            onClick={onCancel}
            className="ui-button ui-button-secondary text-xs"
          >
            {cancelLabel || t('common.cancel')}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className={isDestructive ? 'ui-button text-xs bg-[var(--danger)] text-white hover:opacity-90' : 'ui-button ui-button-primary text-xs'}
          >
            {confirmLabel || t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
