import React from 'react';
import { EvidenceLevel, KnowledgeType, OutcomeResult, ReviewStatus } from '../../types';
import { useLocale } from '../../locales/useLocale';

export interface BadgeProps {
  type?: 'review' | 'evidence' | 'knowledgeType' | 'outcome' | 'freshness' | 'collection';
  value: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  type = 'knowledgeType',
  value,
  className = '',
  size = 'md',
}) => {
  const { t } = useLocale();

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs';

  let colorClasses = 'bg-[var(--surface-secondary)] text-[var(--foreground)] border-[var(--border)]';
  let indicatorColor = '';
  let label = value;

  if (type === 'review') {
    const val = value as ReviewStatus;
    if (val === 'reviewed') {
      colorClasses = 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/25';
      indicatorColor = 'bg-[var(--success)]';
      label = t('reviewStatus.reviewed');
    } else if (val === 'draft') {
      colorClasses = 'bg-[var(--surface-secondary)] text-[var(--muted)] border-[var(--border)]';
      indicatorColor = 'bg-[var(--muted)]';
      label = t('reviewStatus.draft');
    } else if (val === 'deprecated') {
      colorClasses = 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/25';
      indicatorColor = 'bg-[var(--warning)]';
      label = t('reviewStatus.deprecated');
    }
  } else if (type === 'evidence') {
    const val = value as EvidenceLevel;
    if (val === 'tested') {
      colorClasses = 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/25';
      indicatorColor = 'bg-[var(--success)]';
      label = t('evidenceLevel.tested');
    } else if (val === 'observed') {
      colorClasses = 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/25';
      indicatorColor = 'bg-[var(--accent)]';
      label = t('evidenceLevel.observed');
    } else if (val === 'unverified') {
      colorClasses = 'bg-[var(--surface-secondary)] text-[var(--muted)] border-[var(--border)]';
      indicatorColor = 'bg-[var(--muted)]';
      label = t('evidenceLevel.unverified');
    }
  } else if (type === 'knowledgeType') {
    const val = value as KnowledgeType;
    label = t(`types.${val}`) || val;
    switch (val) {
      case 'procedure':
        colorClasses = 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/25';
        indicatorColor = 'bg-[var(--accent)]';
        break;
      case 'research_finding':
        colorClasses = 'bg-[var(--surface-secondary)] text-[var(--foreground)] border-[var(--border)]';
        indicatorColor = 'bg-[var(--accent)]';
        break;
      case 'tip':
        colorClasses = 'bg-[var(--surface-secondary)] text-[var(--foreground)] border-[var(--border)]';
        indicatorColor = 'bg-[var(--accent)]';
        break;
      case 'skill':
        colorClasses = 'bg-[var(--surface-secondary)] text-[var(--foreground)] border-[var(--border)]';
        indicatorColor = 'bg-[var(--accent)]';
        break;
      case 'example':
        colorClasses = 'bg-[var(--surface-secondary)] text-[var(--muted)] border-[var(--border)]';
        indicatorColor = 'bg-[var(--muted)]';
        break;
      case 'failure':
        colorClasses = 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/25';
        indicatorColor = 'bg-[var(--danger)]';
        break;
      case 'lesson':
        colorClasses = 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/25';
        indicatorColor = 'bg-[var(--warning)]';
        break;
    }
  } else if (type === 'outcome') {
    const val = value as OutcomeResult;
    if (val === 'success') {
      colorClasses = 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/25';
      indicatorColor = 'bg-[var(--success)]';
      label = t('results.success');
    } else if (val === 'failure') {
      colorClasses = 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/25';
      indicatorColor = 'bg-[var(--danger)]';
      label = t('results.failure');
    } else {
      colorClasses = 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/25';
      indicatorColor = 'bg-[var(--warning)]';
      label = t('results.uncertain');
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium border ${sizeClasses} ${colorClasses} ${className}`}
    >
      {indicatorColor && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${indicatorColor}`} />
      )}
      <span className="truncate">{label}</span>
    </span>
  );
};
