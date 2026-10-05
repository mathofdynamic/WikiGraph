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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/70 backdrop-blur-xs"
    >
      <div
        className="w-full max-w-md rounded-xl bg-[#0f1011] border border-[#23252a] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#23252a]">
          <div className="flex items-center gap-2 text-[#f7f8f8] font-medium tracking-card-title text-sm">
            {isDestructive && <AlertTriangle className="w-4 h-4 text-[#f43f5e] shrink-0" />}
            <span id="confirm-modal-title">{title}</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#141516] cursor-pointer transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 text-xs sm:text-sm text-[#8a8f98] leading-relaxed">
          {description}
        </div>

        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-[#141516] border-t border-[#23252a]">
          <button
            type="button"
            onClick={onCancel}
            className="linear-btn-secondary text-xs"
          >
            {cancelLabel || t('common.cancel')}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className={isDestructive ? 'px-3.5 py-2 rounded-md bg-[#f43f5e] hover:bg-rose-600 text-white text-xs font-medium cursor-pointer transition-colors' : 'linear-btn-primary text-xs'}
          >
            {confirmLabel || t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
