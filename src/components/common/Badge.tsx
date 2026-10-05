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

  let colorClasses = 'bg-zinc-800/70 text-zinc-300 border-zinc-700/60';
  let indicatorColor = '';
  let label = value;

  if (type === 'review') {
    const val = value as ReviewStatus;
    if (val === 'reviewed') {
      colorClasses = 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40';
      indicatorColor = 'bg-emerald-500';
      label = t('reviewStatus.reviewed');
    } else if (val === 'draft') {
      colorClasses = 'bg-zinc-800/80 text-zinc-400 border-zinc-700/60';
      indicatorColor = 'bg-zinc-500';
      label = t('reviewStatus.draft');
    } else if (val === 'deprecated') {
      colorClasses = 'bg-amber-950/40 text-amber-300 border-amber-800/40';
      indicatorColor = 'bg-amber-500';
      label = t('reviewStatus.deprecated');
    }
  } else if (type === 'evidence') {
    const val = value as EvidenceLevel;
    if (val === 'tested') {
      colorClasses = 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40';
      indicatorColor = 'bg-emerald-400';
      label = t('evidenceLevel.tested');
    } else if (val === 'observed') {
      colorClasses = 'bg-blue-950/40 text-blue-300 border-blue-800/40';
      indicatorColor = 'bg-blue-400';
      label = t('evidenceLevel.observed');
    } else if (val === 'unverified') {
      colorClasses = 'bg-zinc-800/80 text-zinc-400 border-zinc-700/60';
      indicatorColor = 'bg-zinc-500';
      label = t('evidenceLevel.unverified');
    }
  } else if (type === 'knowledgeType') {
    const val = value as KnowledgeType;
    label = t(`types.${val}`) || val;
    switch (val) {
      case 'procedure':
        colorClasses = 'bg-blue-950/40 text-blue-300 border-blue-800/40';
        indicatorColor = 'bg-blue-400';
        break;
      case 'research_finding':
        colorClasses = 'bg-indigo-950/40 text-indigo-300 border-indigo-800/40';
        indicatorColor = 'bg-indigo-400';
        break;
      case 'tip':
        colorClasses = 'bg-cyan-950/40 text-cyan-300 border-cyan-800/40';
        indicatorColor = 'bg-cyan-400';
        break;
      case 'skill':
        colorClasses = 'bg-purple-950/40 text-purple-300 border-purple-800/40';
        indicatorColor = 'bg-purple-400';
        break;
      case 'example':
        colorClasses = 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60';
        indicatorColor = 'bg-zinc-400';
        break;
      case 'failure':
        colorClasses = 'bg-rose-950/40 text-rose-300 border-rose-800/40';
        indicatorColor = 'bg-rose-500';
        break;
      case 'lesson':
        colorClasses = 'bg-amber-950/40 text-amber-300 border-amber-800/40';
        indicatorColor = 'bg-amber-400';
        break;
    }
  } else if (type === 'outcome') {
    const val = value as OutcomeResult;
    if (val === 'success') {
      colorClasses = 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40';
      indicatorColor = 'bg-emerald-400';
      label = t('results.success');
    } else if (val === 'failure') {
      colorClasses = 'bg-rose-950/40 text-rose-300 border-rose-800/40';
      indicatorColor = 'bg-rose-400';
      label = t('results.failure');
    } else {
      colorClasses = 'bg-amber-950/40 text-amber-300 border-amber-800/40';
      indicatorColor = 'bg-amber-400';
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
