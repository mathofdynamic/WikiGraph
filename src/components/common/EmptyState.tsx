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
      className={`flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-secondary)]/40 ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] mb-3.5">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">
        {title || t('common.emptyTitle')}
      </h3>
      <p className="text-xs text-[var(--muted)] max-w-sm mb-4 leading-relaxed">
        {description || t('common.emptyDesc')}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="ui-button ui-button-primary text-xs"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
