import React from 'react';
import { LucideIcon, FolderSearch } from 'lucide-react';
import { useLocale } from '../../locales/useLocale';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = FolderSearch,
  actionLabel,
  onAction,
  className = '',
}) => {
  const { t } = useLocale();

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-[#23252a] bg-[#0f1011]/80 ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-[#141516] border border-[#23252a] flex items-center justify-center text-[#8a8f98] mb-3.5">
        <Icon className="w-5 h-5 text-[#5e6ad2]" />
      </div>
      <h3 className="text-sm font-semibold tracking-card-title text-[#f7f8f8] mb-1">
        {title || t('common.emptyTitle')}
      </h3>
      <p className="text-xs text-[#8a8f98] max-w-sm mb-4 leading-relaxed">
        {description || t('common.emptyDesc')}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="linear-btn-primary text-xs"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
