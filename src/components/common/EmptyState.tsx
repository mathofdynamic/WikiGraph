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
      className={`flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-zinc-850 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-3.5">
        <Icon className="w-5 h-5 text-blue-500" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-100 mb-1">
        {title || t('common.emptyTitle')}
      </h3>
      <p className="text-xs text-zinc-400 max-w-sm mb-4 leading-relaxed">
        {description || t('common.emptyDesc')}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="heroui-btn-primary text-xs"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
