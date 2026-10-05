import {
  ApiKeyGrant,
  Collection,
  ContextAssemblyRequest,
  ContextAssemblyResult,
  KnowledgeFilter,
  KnowledgeItem,
  KnowledgeOutcome,
  KnowledgeRelationship,
  SourceDocument,
  StorageStats,
} from '../types';
import {
  INITIAL_API_KEYS,
  INITIAL_COLLECTIONS,
  INITIAL_KNOWLEDGE,
  INITIAL_OUTCOMES,
  INITIAL_RELATIONSHIPS,
  INITIAL_SOURCES,
} from './fixtures';
import { KnowledgeRepository } from './KnowledgeRepository';

interface StoredData {
  sources: SourceDocument[];
  knowledge: KnowledgeItem[];
  relationships: KnowledgeRelationship[];
  outcomes: KnowledgeOutcome[];
  apiKeys: ApiKeyGrant[];
}

const STORAGE_KEY = 'wikigraph_demo_store_v1';

export class MockKnowledgeRepository implements KnowledgeRepository {
  private data: StoredData;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): StoredData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.sources && parsed.knowledge && parsed.relationships) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('WikiGraph: Local demo store read failed, falling back to clean fixtures', e);
    }
    return this.getCleanFixtures();
  }

  private getCleanFixtures(): StoredData {
    return {
      sources: JSON.parse(JSON.stringify(INITIAL_SOURCES)),
      knowledge: JSON.parse(JSON.stringify(INITIAL_KNOWLEDGE)),
      relationships: JSON.parse(JSON.stringify(INITIAL_RELATIONSHIPS)),
      outcomes: JSON.parse(JSON.stringify(INITIAL_OUTCOMES)),
      apiKeys: JSON.parse(JSON.stringify(INITIAL_API_KEYS)),
    };
  }

  private saveData(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('WikiGraph: Local demo store write failed (quota exceeded or private mode)', e);
    }
  }

  // --- Sources ---
  async listSources(): Promise<SourceDocument[]> {
    return [...this.data.sources];
  }

  async getSource(id: string): Promise<SourceDocument | null> {
    const doc = this.data.sources.find((s) => s.id === id);
    return doc ? { ...doc } : null;
  }

  async createSource(
    source: Omit<SourceDocument, 'id' | 'createdAt' | 'updatedAt' | 'revisions'> & {
      initialRevisionSummary?: string;
    }
  ): Promise<SourceDocument> {
    const now = new Date().toISOString();
    const id = `src-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const revisionId = `rev-${id}-a`;

    const headingMatches = source.originalContent.match(/^#{1,6}\s+.+$/gm);
    const headingsCount = headingMatches ? headingMatches.length : 1;

    const newDoc: SourceDocument = {
      ...source,
      id,
      createdAt: now,
      updatedAt: now,
      revisions: [
        {
          revisionId,
          timestamp: now,
          changeSummary: source.initialRevisionSummary || 'Initial document import into private workspace.',
          rawSize: new Blob([source.originalContent]).size,
          headingsCount,
        },
      ],
    };

    this.data.sources.unshift(newDoc);
    this.saveData();
    return newDoc;
  }

  async updateSource(
    id: string,
    updates: Partial<SourceDocument>,
    newContent?: string,
    changeSummary?: string
  ): Promise<SourceDocument> {
    const idx = this.data.sources.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error(`Source ${id} not found`);

    const current = this.data.sources[idx];
    const now = new Date().toISOString();
    let updatedRevisions = [...current.revisions];

    if (newContent !== undefined && newContent !== current.originalContent) {
      const revisionId = `rev-${id}-${(updatedRevisions.length + 1).toString(36)}`;
      const headingMatches = newContent.match(/^#{1,6}\s+.+$/gm);
      updatedRevisions.unshift({
        revisionId,
        timestamp: now,
        changeSummary: changeSummary || `Revision ${updatedRevisions.length + 1} update.`,
        rawSize: new Blob([newContent]).size,
        headingsCount: headingMatches ? headingMatches.length : 1,
      });

      // Mark dependent knowledge items as needing review
      this.data.knowledge.forEach((k) => {
        if (k.sourceId === id) {
          k.sourceHasChanged = true;
          k.updatedAt = now;
        }
      });
    }

    const updatedDoc: SourceDocument = {
      ...current,
      ...updates,
      originalContent: newContent !== undefined ? newContent : current.originalContent,
      updatedAt: now,
      revisions: updatedRevisions,
    };

    this.data.sources[idx] = updatedDoc;
    this.saveData();
    return updatedDoc;
  }

  async deleteSource(id: string): Promise<void> {
    this.data.sources = this.data.sources.filter((s) => s.id !== id);
    // Remove related knowledge items
    const relatedKnowledge = this.data.knowledge.filter((k) => k.sourceId === id);
    for (const k of relatedKnowledge) {
      await this.deleteKnowledge(k.id);
    }
    this.saveData();
  }

  // --- Knowledge Items ---
  async listKnowledge(filters?: KnowledgeFilter): Promise<KnowledgeItem[]> {
    let items = [...this.data.knowledge];

    if (!filters) return items;

    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (k) =>
          k.title.toLowerCase().includes(q) ||
          k.summary.toLowerCase().includes(q) ||
          k.body.toLowerCase().includes(q) ||
          k.applicability.toLowerCase().includes(q) ||
          k.requirements.some((r) => r.toLowerCase().includes(q))
      );
    }

    if (filters.collectionId && filters.collectionId !== 'all') {
      items = items.filter((k) => k.collectionId === filters.collectionId);
    }

    if (filters.type && filters.type !== 'all') {
      items = items.filter((k) => k.type === filters.type);
    }

    if (filters.language && filters.language !== 'all') {
      items = items.filter((k) => k.language === filters.language);
    }

    if (filters.reviewStatus && filters.reviewStatus !== 'all') {
      items = items.filter((k) => k.reviewStatus === filters.reviewStatus);
    }

    if (filters.evidenceLevel && filters.evidenceLevel !== 'all') {
      items = items.filter((k) => k.evidenceLevel === filters.evidenceLevel);
    }

    if (filters.freshness && filters.freshness !== 'all') {
      if (filters.freshness === 'needs_review') {
        items = items.filter((k) => k.sourceHasChanged || !k.reviewedAt);
      } else if (filters.freshness === 'fresh') {
        items = items.filter((k) => !k.sourceHasChanged && !!k.reviewedAt);
      } else if (filters.freshness === 'stale') {
        items = items.filter((k) => k.sourceHasChanged || k.reviewStatus === 'deprecated');
      }
    }

    return items;
  }

  async getKnowledge(id: string): Promise<KnowledgeItem | null> {
    const item = this.data.knowledge.find((k) => k.id === id);
    return item ? { ...item } : null;
  }

  async createKnowledge(
    item: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<KnowledgeItem> {
    const now = new Date().toISOString();
    const id = `kno-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newItem: KnowledgeItem = {
      ...item,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.data.knowledge.unshift(newItem);
    this.saveData();
    return newItem;
  }

  async updateKnowledge(id: string, updates: Partial<KnowledgeItem>): Promise<KnowledgeItem> {
    const idx = this.data.knowledge.findIndex((k) => k.id === id);
    if (idx === -1) throw new Error(`Knowledge item ${id} not found`);

    const current = this.data.knowledge[idx];
    const now = new Date().toISOString();
    const updated: KnowledgeItem = {
      ...current,
      ...updates,
      updatedAt: now,
    };
    this.data.knowledge[idx] = updated;
    this.saveData();
    return updated;
  }

  async deleteKnowledge(id: string): Promise<void> {
    this.data.knowledge = this.data.knowledge.filter((k) => k.id !== id);
    this.data.relationships = this.data.relationships.filter(
      (r) => r.sourceId !== id && r.targetId !== id
    );
    this.data.outcomes = this.data.outcomes.filter((o) => o.knowledgeId !== id);
    this.saveData();
  }

  // --- Relationships ---
  async listRelationships(): Promise<KnowledgeRelationship[]> {
    return [...this.data.relationships];
  }

  async createRelationship(
    rel: Omit<KnowledgeRelationship, 'id' | 'createdAt'>
  ): Promise<KnowledgeRelationship> {
    // Avoid duplicate relationships in same direction
    const existing = this.data.relationships.find(
      (r) =>
        (r.sourceId === rel.sourceId || r.sourceKnowledgeId === rel.sourceKnowledgeId) &&
        (r.targetId === rel.targetId || r.targetKnowledgeId === rel.targetKnowledgeId) &&
        (r.type === rel.type || r.relationshipType === rel.relationshipType)
    );
    if (existing) return existing;

    const now = new Date().toISOString();
    const id = `rel-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newRel: KnowledgeRelationship = {
      ...rel,
      id,
      sourceId: rel.sourceId || rel.sourceKnowledgeId,
      sourceKnowledgeId: rel.sourceKnowledgeId || rel.sourceId,
      targetId: rel.targetId || rel.targetKnowledgeId,
      targetKnowledgeId: rel.targetKnowledgeId || rel.targetId,
      type: rel.type || (rel.relationshipType as any) || 'supports',
      relationshipType: rel.relationshipType || rel.type || 'supports',
      rationale: rel.rationale || rel.notes || '',
      notes: rel.notes || rel.rationale || '',
      createdAt: now,
    };
    this.data.relationships.push(newRel);
    this.saveData();
    return newRel;
  }

  async addRelationship(
    rel: Omit<KnowledgeRelationship, 'id' | 'createdAt'>
  ): Promise<KnowledgeRelationship> {
    return this.createRelationship(rel);
  }

  async deleteRelationship(id: string): Promise<void> {
    this.data.relationships = this.data.relationships.filter((r) => r.id !== id);
    this.saveData();
  }

  async removeRelationship(id: string): Promise<void> {
    return this.deleteRelationship(id);
  }

  // --- Outcomes ---
  async listOutcomes(knowledgeId?: string): Promise<KnowledgeOutcome[]> {
    if (knowledgeId) {
      return this.data.outcomes.filter(
        (o) => o.knowledgeId === knowledgeId || o.appliedKnowledgeIds?.includes(knowledgeId)
      );
    }
    return [...this.data.outcomes];
  }

  async createOutcome(
    outcome: Omit<KnowledgeOutcome, 'id' | 'recordedAt'>
  ): Promise<KnowledgeOutcome> {
    const now = new Date().toISOString();
    const id = `out-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newOutcome: KnowledgeOutcome = {
      ...outcome,
      id,
      knowledgeId: outcome.knowledgeId || outcome.appliedKnowledgeIds?.[0] || 'kno-general',
      taskContext: outcome.taskContext || outcome.task || 'General task',
      task: outcome.task || outcome.taskContext || 'General task',
      pinnedRevisionId: outcome.pinnedRevisionId || 'rev-current',
      notes: outcome.notes || outcome.reviewNotes || '',
      reviewNotes: outcome.reviewNotes || outcome.notes || '',
      appliedKnowledgeIds: outcome.appliedKnowledgeIds || (outcome.knowledgeId ? [outcome.knowledgeId] : []),
      recordedAt: now,
      executedAt: outcome.executedAt || now,
    };
    this.data.outcomes.unshift(newOutcome);
    this.saveData();
    return newOutcome;
  }

  async deleteOutcome(id: string): Promise<void> {
    this.data.outcomes = this.data.outcomes.filter((o) => o.id !== id);
    this.saveData();
  }

  // --- Collections ---
  async listCollections(): Promise<Collection[]> {
    const customCols = (this.data as any).collections || INITIAL_COLLECTIONS;
    return customCols.map((c: Collection) => ({
      ...c,
      count: this.data.knowledge.filter((k) => k.collectionId === c.id).length,
    }));
  }

  async createCollection(col: Omit<Collection, 'id'>): Promise<Collection> {
    const id = `col-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newCol: Collection = {
      ...col,
      id,
      description: col.description || '',
      descriptionFa: col.descriptionFa || '',
      color: col.color || '#71717a',
      count: 0,
    };
    if (!(this.data as any).collections) {
      (this.data as any).collections = [...INITIAL_COLLECTIONS];
    }
    (this.data as any).collections.push(newCol);
    this.saveData();
    return newCol;
  }

  async deleteCollection(id: string): Promise<void> {
    if ((this.data as any).collections) {
      (this.data as any).collections = (this.data as any).collections.filter(
        (c: Collection) => c.id !== id
      );
      this.saveData();
    }
  }

  // --- Scoped API Keys ---
  async listApiKeys(): Promise<ApiKeyGrant[]> {
    return [...this.data.apiKeys];
  }

  async createApiKey(data: {
    label: string;
    allowedCollections: string[];
    grants: ('search' | 'read' | 'compose')[];
    expiryDays: number;
  }): Promise<{ key: ApiKeyGrant; plainTextToken: string }> {
    const id = `key-${Date.now().toString(36)}`;
    const randomHex = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    const plainTextToken = `wg_demo_${randomHex}`;
    const tokenPrefix = `wg_demo_${randomHex.substring(0, 8)}...`;

    const now = new Date();
    const expires = new Date();
    expires.setDate(now.getDate() + (data.expiryDays > 0 ? data.expiryDays : 90));

    const newKey: ApiKeyGrant = {
      id,
      label: data.label,
      tokenPrefix,
      allowedCollections: data.allowedCollections,
      grants: data.grants,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      status: 'active',
      isDemoSimulated: true,
    };

    this.data.apiKeys.unshift(newKey);
    this.saveData();
    return { key: newKey, plainTextToken };
  }

  async revokeApiKey(id: string): Promise<void> {
    const key = this.data.apiKeys.find((k) => k.id === id);
    if (key) {
      key.status = 'revoked';
      this.saveData();
    }
  }

  // --- Context Assembly ---
  async assembleContext(req: ContextAssemblyRequest): Promise<ContextAssemblyResult> {
    const now = new Date().toISOString();
    const allKnowledge = this.data.knowledge;
    const allRelationships = this.data.relationships;
    const allSources = this.data.sources;

    const selectedItems = allKnowledge.filter((k) => req.selectedKnowledgeIds.includes(k.id));

    const applicableMethods: { item: KnowledgeItem; reason: string }[] = [];
    const prerequisites: { item: KnowledgeItem; requiredBy: string }[] = [];
    const alternatives: { item: KnowledgeItem; alternativeTo: string }[] = [];
    const conflicts: { itemA: KnowledgeItem; itemB: KnowledgeItem; warning: string }[] = [];
    const evidenceSourcesMap = new Map<string, { source: SourceDocument; revision: string; excerpt: string }>();
    const limitations: string[] = [];
    const omittedItems: { item: KnowledgeItem; reason: string }[] = [];

    // Check prerequisites & conflicts
    for (const item of selectedItems) {
      // Check for 'requires' relations
      const reqRels = allRelationships.filter(
        (r) => r.sourceId === item.id && r.type === 'requires'
      );
      for (const rel of reqRels) {
        const reqItem = allKnowledge.find((k) => k.id === rel.targetId);
        if (reqItem) {
          const isSelected = selectedItems.some((s) => s.id === reqItem.id);
          prerequisites.push({
            item: reqItem,
            requiredBy: `${item.title} (${isSelected ? 'Included in prompt' : 'MISSING dependency!'})`,
          });
          if (!isSelected) {
            limitations.push(
              `Dependency Warning: "${item.title}" requires "${reqItem.title}", which was not explicitly selected. Execution may fail without its foundational procedures.`
            );
          }
        }
      }

      // Check for conflicts
      const conflictRels = allRelationships.filter(
        (r) => r.sourceId === item.id && r.type === 'conflicts_with'
      );
      for (const rel of conflictRels) {
        const opposing = selectedItems.find((s) => s.id === rel.targetId);
        if (opposing && item.id < opposing.id) {
          conflicts.push({
            itemA: item,
            itemB: opposing,
            warning: `Method Conflict: ${rel.rationale}`,
          });
          limitations.push(
            `Incompatible Methods Selected: "${item.title}" and "${opposing.title}" conflict. Do not mix their execution paths.`
          );
        }
      }

      // Check for alternatives
      const altRels = allRelationships.filter(
        (r) => r.sourceId === item.id && r.type === 'alternative_to'
      );
      for (const rel of altRels) {
        const altItem = allKnowledge.find((k) => k.id === rel.targetId);
        if (altItem) {
          alternatives.push({
            item: altItem,
            alternativeTo: item.title,
          });
        }
      }

      // Gather source evidence
      const source = allSources.find((s) => s.id === item.sourceId);
      if (source) {
        evidenceSourcesMap.set(`${source.id}-${item.sourceRevisionId}`, {
          source,
          revision: item.sourceRevisionId,
          excerpt: item.sourceExcerpt,
        });
      }

      applicableMethods.push({
        item,
        reason: `Selected for task execution [Evidence: ${item.evidenceLevel}, Status: ${item.reviewStatus}].`,
      });
    }

    if (req.toolsEnvironment) {
      limitations.push(`Environment Constraints: ${req.toolsEnvironment}`);
    }

    // Deterministic Markdown Generator
    let md = `# Task Grounded Context: ${req.task}\n\n`;
    md += `*Generated by WikiGraph Private Research Workspace — ${now}*\n\n`;
    md += `## 1. Task Objective & Operational Boundary\n`;
    md += `- **Task**: ${req.task}\n`;
    if (req.inputFormat) md += `- **Input Format**: ${req.inputFormat}\n`;
    if (req.outputFormat) md += `- **Target Output Format**: ${req.outputFormat}\n`;
    if (req.toolsEnvironment) md += `- **Environment / Tools**: ${req.toolsEnvironment}\n`;
    md += `\n`;

    if (conflicts.length > 0) {
      md += `## ⚠️ Critical Conflicts (Must Be Kept Separate)\n`;
      for (const c of conflicts) {
        md += `> **Conflict Warning**: \`${c.itemA.title}\` contradicts \`${c.itemB.title}\`.\n`;
        md += `> **Rationale**: ${c.warning}\n\n`;
      }
    }

    if (prerequisites.length > 0) {
      md += `## 2. Prerequisites & Dependencies\n`;
      for (const p of prerequisites) {
        md += `- **${p.item.title}** (Required by: ${p.requiredBy})\n`;
        md += `  - Summary: ${p.item.summary}\n`;
      }
      md += `\n`;
    }

    md += `## 3. Applicable Procedures & Knowledge\n`;
    for (const m of applicableMethods) {
      md += `### [${m.item.type.toUpperCase()}] ${m.item.title}\n`;
      md += `*Status: ${m.item.reviewStatus} | Evidence Level: ${m.item.evidenceLevel}*\n\n`;
      md += `**Summary**: ${m.item.summary}\n\n`;
      md += `**Execution Guidance**:\n${m.item.body}\n\n`;
      if (m.item.applicability) md += `**When Applicable**: ${m.item.applicability}\n\n`;
      if (m.item.exclusions) md += `**Exclusions (Do Not Use When)**: ${m.item.exclusions}\n\n`;
      if (m.item.requirements && m.item.requirements.length > 0) {
        md += `**Tool Requirements**: ${m.item.requirements.join(', ')}\n\n`;
      }
    }

    if (evidenceSourcesMap.size > 0) {
      md += `## 4. Cited Evidence & Source Provenance\n`;
      evidenceSourcesMap.forEach(({ source, revision, excerpt }) => {
        md += `- **Source Document**: *${source.title}* (\`${source.filename}\`)\n`;
        md += `  - **Pinned Revision**: \`${revision}\`\n`;
        md += `  - **Cited Research Excerpt**: "${excerpt}"\n\n`;
      });
    }

    if (limitations.length > 0) {
      md += `## 5. Known Limitations & Warnings\n`;
      for (const lim of limitations) {
        md += `- ${lim}\n`;
      }
      md += `\n`;
    }

    // Budget enforcement
    const budget = req.characterBudget || 12000;
    let totalCharacters = md.length;

    if (totalCharacters > budget) {
      // Need to prune items that exceed budget
      let prunedMd = md;
      // Truncate non-critical sections or append budget note
      const excess = totalCharacters - budget;
      prunedMd = md.slice(0, budget - 400);
      prunedMd += `\n\n---\n*Truncated: Context reached character budget limit of ${budget.toLocaleString()} characters (${excess.toLocaleString()} characters omitted).*\n`;
      totalCharacters = prunedMd.length;
      md = prunedMd;

      omittedItems.push({
        item: selectedItems[selectedItems.length - 1],
        reason: `Omitted tail content to honor hard budget constraint of ${budget} characters.`,
      });
    }

    const jsonOutput = JSON.stringify(
      {
        task: req.task,
        assembledAt: now,
        budget,
        totalCharacters,
        applicableMethods: applicableMethods.map((m) => ({
          id: m.item.id,
          title: m.item.title,
          type: m.item.type,
          evidenceLevel: m.item.evidenceLevel,
          reviewStatus: m.item.reviewStatus,
          summary: m.item.summary,
        })),
        prerequisites: prerequisites.map((p) => ({
          id: p.item.id,
          title: p.item.title,
          requiredBy: p.requiredBy,
        })),
        conflicts: conflicts.map((c) => ({
          itemAId: c.itemA.id,
          itemBId: c.itemB.id,
          warning: c.warning,
        })),
        evidenceSources: Array.from(evidenceSourcesMap.values()).map((e) => ({
          sourceId: e.source.id,
          title: e.source.title,
          filename: e.source.filename,
          revision: e.revision,
          excerpt: e.excerpt,
        })),
        limitations,
        omittedItems: omittedItems.map((o) => ({
          id: o.item.id,
          title: o.item.title,
          reason: o.reason,
        })),
      },
      null,
      2
    );

    return {
      task: req.task,
      timestamp: now,
      characterBudget: budget,
      totalCharacters,
      applicableMethods,
      prerequisites,
      alternatives,
      conflicts,
      evidenceSources: Array.from(evidenceSourcesMap.values()),
      limitations,
      omittedItems,
      markdownOutput: md,
      jsonOutput,
    };
  }

  // --- Storage Stats & Backup ---
  async getStorageStats(): Promise<StorageStats> {
    const raw = JSON.stringify(this.data);
    return {
      documentCount: this.data.sources.length,
      knowledgeCount: this.data.knowledge.length,
      relationshipCount: this.data.relationships.length,
      outcomeCount: this.data.outcomes.length,
      estimatedBytes: new Blob([raw]).size,
      isDemoStore: true,
    };
  }

  async resetDemoStore(): Promise<void> {
    this.data = this.getCleanFixtures();
    this.saveData();
  }

  async exportData(): Promise<string> {
    return JSON.stringify(this.data, null, 2);
  }

  async importData(jsonString: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.sources && parsed.knowledge && parsed.relationships) {
        this.data = parsed;
        this.saveData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}
