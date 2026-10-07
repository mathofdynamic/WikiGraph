import {
  ContextRequest,
  ContextResult,
  KnowledgeItem,
  KnowledgeRelationship,
  SourceDocument,
} from '../types';

/**
 * Normalizes Persian and Arabic text:
 * - Replaces Arabic Yeh (ي \u064A) with Persian Yeh (ی \u06CC)
 * - Replaces Arabic Kaf (ك \u0643) with Persian Keheh (ک \u06A9)
 * - Removes Zero-Width Non-Joiner (ZWNJ \u200C)
 * - Standardizes case and trims whitespace
 */
export function normalizeSearchText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\u064A/g, '\u06CC') // Arabic Yeh -> Persian Yeh
    .replace(/\u0643/g, '\u06A9') // Arabic Kaf -> Persian Keheh
    .replace(/\u200C/g, ' ') // Strip ZWNJ to space
    .replace(/[\u064B-\u065F]/g, '') // Strip Arabic diacritics
    .toLowerCase()
    .trim();
}

const STOP_WORDS = new Set([
  // English stop words
  'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
  'of', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'this', 'that',
  'it', 'how', 'what', 'when', 'where', 'which', 'who', 'why', 'can', 'will',
  'do', 'does', 'did', 'have', 'has', 'had', 'not', 'no', 'but', 'into', 'use',
  'using', 'via', 'vs', 'than',
  // Persian stop words
  'و', 'در', 'به', 'از', 'که', 'این', 'را', 'با', 'برای', 'یا', 'تا', 'بر',
  'یک', 'آن', 'است', 'شد', 'شده', 'شود', 'کرد', 'کرده', 'کند', 'بود', 'اما',
  'اگر', 'چون', 'نیز', 'هم', 'هر', 'همچنین', 'بین', 'روی', 'می', 'نمی', 'ها', 'های', 'ان', 'ای',
]);

/**
 * Extracts meaningful keyword tokens from normalized text.
 */
export function extractKeywords(text: string): string[] {
  const normalized = normalizeSearchText(text);
  // Split on any whitespace or punctuation
  const words = normalized
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'<>\[\]\\|«»؟،؛]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  return Array.from(new Set(words));
}

/**
 * Estimates token count for an item or string.
 * Deterministic rule: ceil(characters / 4).
 */
export function estimateTokens(charCount: number): number {
  return Math.max(1, Math.ceil(charCount / 4));
}

/**
 * Estimates character count of a knowledge item as used in retrieval context.
 */
export function getItemCharacterCount(item: KnowledgeItem): number {
  return (
    (item.title || '').length +
    (item.summary || '').length +
    (item.body || '').length +
    (item.applicability || '').length +
    (item.exclusions || '').length +
    (item.sourceExcerpt || '').length +
    (item.requirements || []).join(' ').length
  );
}

export interface RetrievalEngineOptions {
  items: KnowledgeItem[];
  sources: SourceDocument[];
  relationships: KnowledgeRelationship[];
}

/**
 * Deterministic retrieval engine implementing the shared retrieval contract.
 */
export function executeRetrieval(
  request: ContextRequest,
  options: RetrievalEngineOptions
): ContextResult {
  const { items, sources, relationships } = options;
  const budget = request.maxTokens && request.maxTokens > 0 ? request.maxTokens : 4000;
  const includeUnreviewed = Boolean(request.includeUnreviewed);

  const sourceMap = new Map<string, SourceDocument>(sources.map((s) => [s.id, s]));

  // 1. Identify superseded items via 'supersedes' relationships and status
  const supersededIds = new Set<string>();
  for (const rel of relationships) {
    const relType = rel.type || rel.relationshipType;
    if (relType === 'supersedes') {
      const targetId = rel.targetId || rel.targetKnowledgeId;
      if (targetId) supersededIds.add(targetId);
    }
  }

  // 2. Filter initial candidates and record pre-exclusion reasons
  const candidatePool: KnowledgeItem[] = [];
  const excludedMap = new Map<string, 'superseded' | 'retired' | 'unreviewed' | 'over_budget' | 'exclusion_matched'>();

  for (const item of items) {
    // Collection scope
    if (request.collectionIds && request.collectionIds.length > 0) {
      if (!request.collectionIds.includes(item.collectionId)) {
        continue;
      }
    }

    if (item.status === 'retired') {
      excludedMap.set(item.id, 'retired');
      continue;
    }

    if (item.reviewStatus === 'deprecated' || supersededIds.has(item.id)) {
      excludedMap.set(item.id, 'superseded');
      continue;
    }

    if (!includeUnreviewed && (item.reviewStatus === 'needs_review' || item.reviewStatus === 'draft')) {
      excludedMap.set(item.id, 'unreviewed');
      continue;
    }

    candidatePool.push(item);
  }

  // 3. Extract keywords from task and requirements
  const taskKeywords = extractKeywords(request.task);
  const toolKeywords = (request.requirements?.tools || []).flatMap((t) => extractKeywords(t));
  const inputKeywords = request.requirements?.inputs ? extractKeywords(request.requirements.inputs) : [];
  const constraintKeywords = request.requirements?.constraints ? extractKeywords(request.requirements.constraints) : [];
  const allQueryKeywords = Array.from(new Set([...taskKeywords, ...toolKeywords, ...inputKeywords, ...constraintKeywords]));

  // 4. Score each candidate
  interface ScoredCandidate {
    item: KnowledgeItem;
    score: number;
    reasons: string[];
    warnings: string[];
    role: 'primary' | 'prerequisite' | 'supporting';
    source?: { id: string; title: string; excerpt: string };
  }

  const scoredCandidates: ScoredCandidate[] = [];

  for (const item of candidatePool) {
    let score = 0;
    const reasons: string[] = [];
    const warnings: string[] = [];

    const normTitle = normalizeSearchText(item.title);
    const normSummary = normalizeSearchText(item.summary);
    const normApplicability = normalizeSearchText(item.applicability || '');
    const normRequirements = normalizeSearchText((item.requirements || []).join(' '));
    const normBody = normalizeSearchText(item.body || '');
    const normExclusions = normalizeSearchText(item.exclusions || '');

    // Applicability matching (Weight: 3.5 - highest)
    const applicabilityMatches = allQueryKeywords.filter((k) => normApplicability.includes(k));
    if (applicabilityMatches.length > 0) {
      score += applicabilityMatches.length * 3.5;
      reasons.push(`Matched '${applicabilityMatches.join("', '")}' in applicability`);
    }

    // Title matching (Weight: 3.0 - high)
    const titleMatches = allQueryKeywords.filter((k) => normTitle.includes(k));
    if (titleMatches.length > 0) {
      score += titleMatches.length * 3.0;
      reasons.push(`Matched '${titleMatches.join("', '")}' in title`);
    }

    // Summary matching (Weight: 1.5)
    const summaryMatches = allQueryKeywords.filter((k) => normSummary.includes(k));
    if (summaryMatches.length > 0) {
      score += summaryMatches.length * 1.5;
      reasons.push(`Matched '${summaryMatches.join("', '")}' in summary`);
    }

    // Requirements matching (Weight: 1.5)
    const reqMatches = allQueryKeywords.filter((k) => normRequirements.includes(k));
    if (reqMatches.length > 0) {
      score += reqMatches.length * 1.5;
      reasons.push(`Matched '${reqMatches.join("', '")}' in requirements`);
    }

    // Body matching (Weight: 1.0)
    const bodyMatches = allQueryKeywords.filter((k) => normBody.includes(k));
    if (bodyMatches.length > 0 && applicabilityMatches.length === 0 && titleMatches.length === 0) {
      score += Math.min(bodyMatches.length, 3) * 1.0;
      reasons.push(`Matched '${bodyMatches.slice(0, 3).join("', '")}' in body`);
    }

    // Tool boost
    if (toolKeywords.length > 0) {
      const toolMatches = toolKeywords.filter(
        (t) => normRequirements.includes(t) || normBody.includes(t) || normTitle.includes(t)
      );
      if (toolMatches.length > 0) {
        score += 3.0;
        reasons.push(`Matched requested tool '${toolMatches.join("', '")}'`);
      }
    }

    // Input specification boost
    if (inputKeywords.length > 0) {
      const inputMatches = inputKeywords.filter(
        (i) => normApplicability.includes(i) || normSummary.includes(i) || normBody.includes(i)
      );
      if (inputMatches.length > 0) {
        score += 2.0;
        reasons.push(`Aligned with input specification ('${inputMatches.join("', '")}')`);
      }
    }

    // Language boost
    if (request.requirements?.language) {
      if (item.language === request.requirements.language) {
        score += 1.5;
        reasons.push(
          `Language matches requested ${request.requirements.language === 'fa' ? 'Persian' : 'English'}`
        );
      }
    }

    // Exclusions penalty / match
    if (normExclusions.length > 0 && taskKeywords.length > 0) {
      const exclusionMatches = taskKeywords.filter((k) => normExclusions.includes(k));
      if (exclusionMatches.length > 0) {
        score -= exclusionMatches.length * 4.0;
        if (score <= 0) {
          excludedMap.set(item.id, 'exclusion_matched');
          continue;
        }
        reasons.push(`Penalized: task overlaps exclusion ('${exclusionMatches.join("', '")}')`);
      }
    }

    // Item Warnings
    if (item.reviewStatus === 'needs_review') {
      warnings.push('needs review');
    } else if (item.reviewStatus === 'draft') {
      warnings.push('draft');
    }
    if (item.status === 'retired') {
      warnings.push('outdated');
    }
    if (item.sourceHasChanged) {
      warnings.push('source has changed');
    }
    if (item.evidenceLevel === 'unverified' || (item.evidenceLevel as string) === 'theoretical') {
      warnings.push('evidence: theoretical');
    }

    // Citation
    let sourceMeta: { id: string; title: string; excerpt: string } | undefined;
    if (item.sourceId) {
      const srcDoc = sourceMap.get(item.sourceId);
      if (srcDoc) {
        sourceMeta = {
          id: srcDoc.id,
          title: srcDoc.title,
          excerpt: item.sourceExcerpt || '',
        };
      }
    }

    // Minimum baseline score: Candidate must have matched at least one query keyword
    const hasKeywordMatch =
      applicabilityMatches.length > 0 ||
      titleMatches.length > 0 ||
      summaryMatches.length > 0 ||
      reqMatches.length > 0 ||
      bodyMatches.length > 0;

    if (hasKeywordMatch && score > 0.5) {
      scoredCandidates.push({
        item,
        score: Math.round(score * 10) / 10,
        reasons,
        warnings,
        role: 'primary',
        source: sourceMeta,
      });
    }
  }

  // Sort candidate items descending by score
  scoredCandidates.sort((a, b) => b.score - a.score);

  // 5. Evaluate sufficiency
  const maxScore = scoredCandidates.length > 0 ? scoredCandidates[0].score : 0;
  let sufficiency: 'sufficient' | 'partial' | 'insufficient' = 'insufficient';
  let sufficiencyNote = '';

  if (scoredCandidates.length === 0 || maxScore < 2.0) {
    sufficiency = 'insufficient';
    sufficiencyNote =
      'Insufficient knowledge found for the requested task. No strong relevant procedures or findings matched the criteria.';
  } else if (
    maxScore >= 5.0 &&
    scoredCandidates.length >= 2 &&
    (!request.requirements?.tools?.length ||
      scoredCandidates.some((c) => c.reasons.some((r) => r.includes('Matched requested tool'))))
  ) {
    sufficiency = 'sufficient';
    sufficiencyNote = 'Sufficient knowledge retrieved covering task requirements and domain constraints.';
  } else {
    sufficiency = 'partial';
    sufficiencyNote =
      'Partial knowledge matches found. Key procedural areas or specific tools may need additional clarification.';
  }

  // 6. Automatically pull in prerequisites
  const candidateMap = new Map<string, ScoredCandidate>(
    scoredCandidates.map((c) => [c.item.id, c])
  );
  const itemsMap = new Map<string, KnowledgeItem>(items.map((i) => [i.id, i]));

  // If insufficient, only take top 1 candidate if score >= 1.0, otherwise 0
  const initialPrimaries =
    sufficiency === 'insufficient'
      ? scoredCandidates.filter((c) => c.score >= 1.5).slice(0, 1)
      : scoredCandidates;

  const resolvedCandidates: ScoredCandidate[] = [];
  const addedIds = new Set<string>();

  for (const primary of initialPrimaries) {
    if (!addedIds.has(primary.item.id)) {
      resolvedCandidates.push(primary);
      addedIds.add(primary.item.id);
    }

    // Look for relationships where another item is prerequisite_for this item,
    // or this item requires another item
    for (const rel of relationships) {
      const relType = rel.type || rel.relationshipType;
      const sId = rel.sourceId || rel.sourceKnowledgeId;
      const tId = rel.targetId || rel.targetKnowledgeId;

      let prereqId: string | null = null;
      if (relType === 'prerequisite_for' && tId === primary.item.id && sId) {
        prereqId = sId;
      } else if (relType === 'requires' && sId === primary.item.id && tId) {
        prereqId = tId;
      }

      if (prereqId && !addedIds.has(prereqId)) {
        const prereqItem = itemsMap.get(prereqId);
        if (prereqItem && prereqItem.status !== 'retired') {
          let sourceMeta: { id: string; title: string; excerpt: string } | undefined;
          if (prereqItem.sourceId) {
            const sDoc = sourceMap.get(prereqItem.sourceId);
            if (sDoc) {
              sourceMeta = { id: sDoc.id, title: sDoc.title, excerpt: prereqItem.sourceExcerpt || '' };
            }
          }

          const existingCandidate = candidateMap.get(prereqId);
          const prereqWarnings: string[] = [];
          if (prereqItem.reviewStatus === 'needs_review') prereqWarnings.push('needs review');
          if (prereqItem.sourceHasChanged) prereqWarnings.push('source has changed');
          if (prereqItem.evidenceLevel === 'unverified' || (prereqItem.evidenceLevel as string) === 'theoretical') {
            prereqWarnings.push('evidence: theoretical');
          }

          const prereqCandidate: ScoredCandidate = {
            item: prereqItem,
            score: existingCandidate ? existingCandidate.score : Math.round(primary.score * 0.8 * 10) / 10,
            reasons: [
              ...(existingCandidate ? existingCandidate.reasons : []),
              `Prerequisite dependency for '${primary.item.title}'`,
            ],
            warnings: prereqWarnings,
            role: 'prerequisite',
            source: sourceMeta,
          };

          resolvedCandidates.push(prereqCandidate);
          addedIds.add(prereqId);
        }
      } else if (prereqId && addedIds.has(prereqId)) {
        // Update role of already added item
        const existing = resolvedCandidates.find((c) => c.item.id === prereqId);
        if (existing && existing.role !== 'prerequisite') {
          existing.role = 'prerequisite';
          existing.reasons.push(`Prerequisite dependency for '${primary.item.title}'`);
        }
      }
    }
  }

  // Designate roles: top scoring are primary, prerequisites stay prerequisite, remainder supporting
  let primaryCount = 0;
  for (const c of resolvedCandidates) {
    if (c.role === 'primary') {
      primaryCount++;
      if (primaryCount > 2) {
        c.role = 'supporting';
      }
    }
  }

  // 7. Enforce token budget: ceil(characters / 4)
  const selected: ContextResult['selected'] = [];
  let usedTokens = 0;

  for (const cand of resolvedCandidates) {
    const chars = getItemCharacterCount(cand.item);
    const itemTokens = estimateTokens(chars);

    if (usedTokens + itemTokens <= budget) {
      usedTokens += itemTokens;
      selected.push(cand);
    } else {
      excludedMap.set(cand.item.id, 'over_budget');
    }
  }

  // 8. Detect conflicts among selected items
  const selectedIds = new Set(selected.map((s) => s.item.id));
  const conflicts: ContextResult['conflicts'] = [];
  const reportedConflictPairs = new Set<string>();

  for (const rel of relationships) {
    const relType = rel.type || rel.relationshipType;
    if (relType === 'conflicts_with') {
      const sId = rel.sourceId || rel.sourceKnowledgeId;
      const tId = rel.targetId || rel.targetKnowledgeId;
      if (sId && tId && selectedIds.has(sId) && selectedIds.has(tId)) {
        const pairKey = [sId, tId].sort().join('::');
        if (!reportedConflictPairs.has(pairKey)) {
          reportedConflictPairs.add(pairKey);
          conflicts.push({
            itemIds: [sId, tId],
            note: rel.rationale || rel.notes || 'Incompatible execution constraints or conflicting methodology.',
          });
        }
      }
    }
  }

  // 9. Format excluded list
  const excluded: ContextResult['excluded'] = [];
  for (const [itemId, reason] of excludedMap.entries()) {
    if (!selectedIds.has(itemId)) {
      excluded.push({ itemId, reason });
    }
  }

  return {
    request,
    sufficiency,
    sufficiencyNote,
    selected,
    conflicts,
    excluded,
    tokenEstimate: {
      used: usedTokens,
      budget,
    },
  };
}

/**
 * Formats the AI-ready Markdown packet according to the strict specification:
 * - Task and requirements
 * - Short instruction line telling AI to cite item titles and state when knowledge is insufficient
 * - Each item with title, type, evidence level, review status, summary, applicability, exclusions, requirements, body,
 *   and a "Source:" line with the source title and excerpt as a blockquote
 * - "Conflicts" section
 * - "Knowledge gaps" section when sufficiency is not 'sufficient'
 * - Persian items stay in Persian
 */
export function formatContextMarkdown(result: ContextResult): string {
  const { request, sufficiency, sufficiencyNote, selected, conflicts } = result;

  const lines: string[] = [];

  // Header & Task
  lines.push('# Technical Context Packet');
  lines.push('');
  lines.push(`**Task:** ${request.task}`);

  // Requirements
  if (request.requirements) {
    const reqs = request.requirements;
    const reqParts: string[] = [];
    if (reqs.tools && reqs.tools.length > 0) {
      reqParts.push(`**Tools:** ${reqs.tools.join(', ')}`);
    }
    if (reqs.inputs) {
      reqParts.push(`**Inputs:** ${reqs.inputs}`);
    }
    if (reqs.outputFormat) {
      reqParts.push(`**Output Format:** ${reqs.outputFormat}`);
    }
    if (reqs.language) {
      reqParts.push(`**Target Language:** ${reqs.language === 'fa' ? 'Persian (fa)' : 'English (en)'}`);
    }
    if (reqs.constraints) {
      reqParts.push(`**Constraints:** ${reqs.constraints}`);
    }
    if (reqParts.length > 0) {
      lines.push('');
      lines.push('### Operational Requirements');
      reqParts.forEach((rp) => lines.push(`- ${rp}`));
    }
  }

  // AI Instruction Directive
  lines.push('');
  lines.push('---');
  lines.push(
    '> **AI INSTRUCTION:** When executing this task, cite knowledge item titles explicitly for every major technical decision or procedure. If provided knowledge is insufficient or missing required operational steps, state the limitation plainly before proceeding.'
  );
  lines.push('---');
  lines.push('');

  // Knowledge Items
  lines.push(`## Selected Knowledge Units (${selected.length})`);
  lines.push('');

  if (selected.length === 0) {
    lines.push('*No knowledge items selected.*');
    lines.push('');
  } else {
    selected.forEach((sel, idx) => {
      const item = sel.item;
      lines.push(`### ${idx + 1}. ${item.title}`);
      lines.push(`- **Role:** \`${sel.role}\``);
      lines.push(`- **Type:** \`${item.type}\``);
      lines.push(`- **Evidence Level:** \`${item.evidenceLevel}\``);
      lines.push(`- **Review Status:** \`${item.reviewStatus}\``);
      if (sel.reasons && sel.reasons.length > 0) {
        lines.push(`- **Retrieval Match:** ${sel.reasons.join('; ')}`);
      }
      if (sel.warnings && sel.warnings.length > 0) {
        lines.push(`- **Warnings:** ${sel.warnings.join(', ')}`);
      }
      lines.push('');

      lines.push(`**Summary:** ${item.summary}`);
      lines.push('');

      if (item.applicability) {
        lines.push(`**Applicability:** ${item.applicability}`);
        lines.push('');
      }

      if (item.exclusions) {
        lines.push(`**Exclusions:** ${item.exclusions}`);
        lines.push('');
      }

      if (item.requirements && item.requirements.length > 0) {
        lines.push(`**Requirements:** ${item.requirements.join(', ')}`);
        lines.push('');
      }

      if (item.body) {
        lines.push('**Procedure & Body:**');
        lines.push(item.body);
        lines.push('');
      }

      if (sel.source) {
        lines.push(`Source: ${sel.source.title}`);
        if (sel.source.excerpt) {
          lines.push(`> ${sel.source.excerpt.replace(/\n/g, '\n> ')}`);
        }
        lines.push('');
      } else if (item.sourceExcerpt) {
        lines.push('Source: Attached Excerpt');
        lines.push(`> ${item.sourceExcerpt.replace(/\n/g, '\n> ')}`);
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    });
  }

  // Conflicts Section
  if (conflicts && conflicts.length > 0) {
    lines.push('## Conflicts');
    conflicts.forEach((c) => {
      lines.push(`- **Conflict between item [${c.itemIds[0]}] and [${c.itemIds[1]}]:** ${c.note || 'Contradictory procedures'}`);
    });
    lines.push('');
  }

  // Knowledge Gaps Section (when sufficiency is not 'sufficient')
  if (sufficiency !== 'sufficient') {
    lines.push('## Knowledge gaps');
    lines.push(`- **Status:** \`${sufficiency.toUpperCase()}\``);
    lines.push(`- **Assessment:** ${sufficiencyNote}`);
    lines.push(
      '- **Notice:** The knowledge base does not fully address all facets of the requested task. Do not extrapolate unproven procedures without validation.'
    );
    lines.push('');
  }

  // Token Estimate Footer
  lines.push(`<!-- Token estimate: ${result.tokenEstimate.used} / ${result.tokenEstimate.budget} tokens (used/budget) -->`);

  return lines.join('\n');
}
