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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
    >
      <div
        className="w-full max-w-md rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-100 font-medium text-sm">
            {isDestructive && <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />}
            <span id="confirm-modal-title">{title}</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 text-xs sm:text-sm text-zinc-400 leading-relaxed">
          {description}
        </div>

        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-zinc-950/70 border-t border-zinc-800">
          <button
            type="button"
            onClick={onCancel}
            className="heroui-btn-secondary text-xs"
          >
            {cancelLabel || t('common.cancel')}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className={isDestructive ? 'px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium cursor-pointer transition-colors' : 'heroui-btn-primary text-xs'}
          >
            {confirmLabel || t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
