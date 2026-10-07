import React from 'react';
import {
  Check,
  AlertTriangle,
  AlertCircle,
  X,
  HelpCircle,
  Wrench,
  Lightbulb,
  Sparkles,
  Layers,
  FileText,
  BookOpen,
} from 'lucide-react';
import { EvidenceLevel, KnowledgeType, OutcomeResult, ReviewStatus } from '../../types';
import { useLocale } from '../../locales/useLocale';

export interface BadgeProps {
  type?: 'review' | 'evidence' | 'knowledgeType' | 'outcome' | 'freshness' | 'collection' | 'status' | 'origin';
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
  let IconComponent: React.ComponentType<{ className?: string }> | null = null;
  let iconClass = 'w-3 h-3 shrink-0';
  let indicatorDot: string | null = null;
  let label = value;

  if (type === 'review') {
    const val = value as ReviewStatus;
    if (val === 'reviewed') {
      colorClasses = 'bg-[var(--surface-secondary)] text-[var(--foreground)] border-[var(--border)]';
      IconComponent = Check;
      iconClass = 'w-3 h-3 text-[var(--accent)] shrink-0';
      label = t('reviewStatus.reviewed');
    } else if (val === 'draft') {
      colorClasses = 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-300 dark:border-stone-700';
      label = t('reviewStatus.draft');
    } else if (val === 'deprecated') {
      colorClasses = 'bg-rose-100/80 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800';
      IconComponent = AlertTriangle;
      iconClass = 'w-3 h-3 text-rose-700 dark:text-rose-300 shrink-0';
      label = t('reviewStatus.deprecated');
    } else if (val === 'needs_review') {
      colorClasses = 'bg-amber-100/80 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700/80';
      IconComponent = AlertCircle;
      iconClass = 'w-3 h-3 text-amber-800 dark:text-amber-300 shrink-0';
      label = t('reviewStatus.needs_review');
    }
  } else if (type === 'evidence') {
    const val = value as EvidenceLevel;
    if (val === 'tested') {
      colorClasses = 'bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800';
      IconComponent = Check;
      iconClass = 'w-3 h-3 text-emerald-700 dark:text-emerald-300 shrink-0';
      label = t('evidenceLevel.tested');
    } else if (val === 'observed') {
      colorClasses = 'bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800';
      indicatorDot = 'bg-blue-600 dark:bg-blue-400';
      label = t('evidenceLevel.observed');
    } else if (val === 'unverified') {
      colorClasses = 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-300 dark:border-stone-700';
      label = t('evidenceLevel.unverified');
    }
  } else if (type === 'knowledgeType') {
    const val = value as KnowledgeType;
    label = t(`types.${val}`) || val;
    colorClasses = 'bg-[var(--surface-secondary)] text-[var(--foreground)] border-[var(--border)]';

    switch (val) {
      case 'procedure':
        IconComponent = Wrench;
        iconClass = 'w-3 h-3 text-[var(--muted)] shrink-0';
        break;
      case 'research_finding':
        IconComponent = Lightbulb;
        iconClass = 'w-3 h-3 text-[var(--muted)] shrink-0';
        break;
      case 'tip':
        IconComponent = Sparkles;
        iconClass = 'w-3 h-3 text-[var(--muted)] shrink-0';
        break;
      case 'skill':
        IconComponent = Layers;
        iconClass = 'w-3 h-3 text-[var(--muted)] shrink-0';
        break;
      case 'example':
        IconComponent = FileText;
        iconClass = 'w-3 h-3 text-[var(--muted)] shrink-0';
        break;
      case 'failure':
        IconComponent = X;
        iconClass = 'w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0';
        break;
      case 'lesson':
        IconComponent = BookOpen;
        iconClass = 'w-3 h-3 text-[var(--muted)] shrink-0';
        break;
    }
  } else if (type === 'outcome') {
    const val = value as OutcomeResult;
    if (val === 'success') {
      colorClasses = 'bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800';
      IconComponent = Check;
      iconClass = 'w-3 h-3 text-emerald-700 dark:text-emerald-300 shrink-0';
      label = t('results.success');
    } else if (val === 'failure') {
      colorClasses = 'bg-rose-100/80 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800';
      IconComponent = X;
      iconClass = 'w-3 h-3 text-rose-700 dark:text-rose-300 shrink-0';
      label = t('results.failure');
    } else {
      colorClasses = 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-300 dark:border-stone-700';
      IconComponent = HelpCircle;
      iconClass = 'w-3 h-3 text-stone-600 dark:text-stone-400 shrink-0';
      label = t('results.uncertain');
    }
  } else if (type === 'status') {
    if (value === 'retired') {
      colorClasses = 'bg-stone-200/90 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border-stone-300 dark:border-stone-600';
      label = t('library.retired');
    } else {
      colorClasses = 'bg-[var(--surface-secondary)] text-[var(--foreground)] border-[var(--border)]';
      label = t('status.active') || value;
    }
  } else if (type === 'origin') {
    colorClasses = 'bg-[var(--surface-secondary)] text-[var(--muted)] border-[var(--border)]';
    label = value === 'manual' ? t('library.originManual') : t('library.originBundle');
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium border ${sizeClasses} ${colorClasses} ${className}`}
    >
      {IconComponent && <IconComponent className={iconClass} />}
      {indicatorDot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${indicatorDot}`} />
      )}
      <span className="truncate">{label}</span>
    </span>
  );
};
