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

  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs';

  let colorClasses = 'bg-[#141516] text-[#d0d6e0] border border-[#23252a]';
  let indicatorColor = '';
  let label = value;

  if (type === 'review') {
    const val = value as ReviewStatus;
    if (val === 'reviewed') {
      colorClasses = 'bg-[#141516] text-[#d0d6e0] border border-[#23252a]';
      indicatorColor = 'bg-[#27a644]';
      label = t('reviewStatus.reviewed');
    } else if (val === 'draft') {
      colorClasses = 'bg-[#141516] text-[#8a8f98] border border-[#23252a]';
      indicatorColor = 'bg-[#62666d]';
      label = t('reviewStatus.draft');
    } else if (val === 'deprecated') {
      colorClasses = 'bg-[#141516] text-[#f59e0b] border border-[#34343a]';
      indicatorColor = 'bg-[#f59e0b]';
      label = t('reviewStatus.deprecated');
    }
  } else if (type === 'evidence') {
    const val = value as EvidenceLevel;
    if (val === 'tested') {
      colorClasses = 'bg-[#141516] text-[#d0d6e0] border border-[#23252a]';
      indicatorColor = 'bg-[#27a644]';
      label = t('evidenceLevel.tested');
    } else if (val === 'observed') {
      colorClasses = 'bg-[#141516] text-[#d0d6e0] border border-[#23252a]';
      indicatorColor = 'bg-[#5e6ad2]';
      label = t('evidenceLevel.observed');
    } else if (val === 'unverified') {
      colorClasses = 'bg-[#141516] text-[#8a8f98] border border-[#23252a]';
      indicatorColor = 'bg-[#62666d]';
      label = t('evidenceLevel.unverified');
    }
  } else if (type === 'knowledgeType') {
    const val = value as KnowledgeType;
    label = t(`types.${val}`) || val;
    switch (val) {
      case 'procedure':
        colorClasses = 'bg-[#141516] text-[#d0d6e0] border border-[#23252a]';
        indicatorColor = 'bg-[#5e6ad2]';
        break;
      case 'research_finding':
        colorClasses = 'bg-[#141516] text-[#d0d6e0] border border-[#23252a]';
        indicatorColor = 'bg-[#828fff]';
        break;
      case 'tip':
        colorClasses = 'bg-[#141516] text-[#d0d6e0] border border-[#23252a]';
        indicatorColor = 'bg-[#7a7fad]';
        break;
      case 'skill':
        colorClasses = 'bg-[#141516] text-[#d0d6e0] border border-[#23252a]';
        indicatorColor = 'bg-[#5e6ad2]';
        break;
      case 'example':
        colorClasses = 'bg-[#141516] text-[#8a8f98] border border-[#23252a]';
        indicatorColor = 'bg-[#62666d]';
        break;
      case 'failure':
        colorClasses = 'bg-[#141516] text-[#f43f5e] border border-[#34343a]';
        indicatorColor = 'bg-[#f43f5e]';
        break;
      case 'lesson':
        colorClasses = 'bg-[#141516] text-[#d0d6e0] border border-[#23252a]';
        indicatorColor = 'bg-[#f59e0b]';
        break;
    }
  } else if (type === 'outcome') {
    const val = value as OutcomeResult;
    if (val === 'success') {
      colorClasses = 'bg-[#141516] text-[#d0d6e0] border border-[#23252a]';
      indicatorColor = 'bg-[#27a644]';
      label = t('results.success');
    } else if (val === 'failure') {
      colorClasses = 'bg-[#141516] text-[#f43f5e] border border-[#34343a]';
      indicatorColor = 'bg-[#f43f5e]';
      label = t('results.failure');
    } else {
      colorClasses = 'bg-[#141516] text-[#8a8f98] border border-[#23252a]';
      indicatorColor = 'bg-[#62666d]';
      label = t('results.uncertain');
    }
  } else if (type === 'freshness') {
    if (value === 'needs_review') {
      colorClasses = 'bg-[#141516] text-[#f59e0b] border border-[#34343a]';
      indicatorColor = 'bg-[#f59e0b]';
      label = t('library.needsReview');
    } else {
      colorClasses = 'bg-[#141516] text-[#d0d6e0] border border-[#23252a]';
      indicatorColor = 'bg-[#27a644]';
      label = t('library.fresh');
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ${sizeClasses} ${colorClasses} ${className}`}
    >
      {indicatorColor && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${indicatorColor}`} />}
      <span>{label}</span>
    </span>
  );
};
