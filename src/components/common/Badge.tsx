import React from 'react';
import {
  Check,
  AlertTriangle,
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
      colorClasses = 'bg-[var(--surface-secondary)] text-[var(--muted)] border-[var(--border)]';
      label = t('reviewStatus.draft');
    } else if (val === 'deprecated') {
      colorClasses = 'bg-[var(--surface-secondary)] text-[var(--muted)] border-[var(--border)]';
      IconComponent = AlertTriangle;
      iconClass = 'w-3 h-3 text-[var(--muted)] shrink-0';
      label = t('reviewStatus.deprecated');
    }
  } else if (type === 'evidence') {
    const val = value as EvidenceLevel;
    if (val === 'tested') {
      colorClasses = 'bg-[var(--surface-secondary)] text-[var(--foreground)] border-[var(--border)]';
      IconComponent = Check;
      iconClass = 'w-3 h-3 text-[var(--accent)] shrink-0';
      label = t('evidenceLevel.tested');
    } else if (val === 'observed') {
      colorClasses = 'bg-[var(--surface-secondary)] text-[var(--accent)] border-[var(--border)]';
      indicatorDot = 'bg-[var(--accent)]';
      label = t('evidenceLevel.observed');
    } else if (val === 'unverified') {
      colorClasses = 'bg-[var(--surface-secondary)] text-[var(--muted)] border-[var(--border)]';
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
        iconClass = 'w-3 h-3 text-[var(--muted)] shrink-0';
        break;
      case 'lesson':
        IconComponent = BookOpen;
        iconClass = 'w-3 h-3 text-[var(--muted)] shrink-0';
        break;
    }
  } else if (type === 'outcome') {
    const val = value as OutcomeResult;
    colorClasses = 'bg-[var(--surface-secondary)] text-[var(--foreground)] border-[var(--border)]';
    if (val === 'success') {
      IconComponent = Check;
      iconClass = 'w-3 h-3 text-[var(--accent)] shrink-0';
      label = t('results.success');
    } else if (val === 'failure') {
      IconComponent = X;
      iconClass = 'w-3 h-3 text-[var(--muted)] shrink-0';
      label = t('results.failure');
    } else {
      IconComponent = HelpCircle;
      iconClass = 'w-3 h-3 text-[var(--muted)] shrink-0';
      label = t('results.uncertain');
    }
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
