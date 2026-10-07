import {
  ApiKeyGrant,
  ApiToken,
  AuthLoginRequest,
  AuthLoginResponse,
  AuthSessionResponse,
  Collection,
  ContextAssemblyRequest,
  ContextAssemblyResult,
  ContextRequest,
  ContextResult,
  CreateApiTokenRequest,
  CreateApiTokenResponse,
  KnowledgeFilter,
  KnowledgeItem,
  KnowledgeOutcome,
  KnowledgeRelationship,
  KnowledgeRevision,
  SourceDocument,
  SourceRevision,
  StorageStats,
  WikiGraphBundle,
  ImportBundleOptions,
  ImportBundleResult,
  EvidenceLevel,
} from '../types';
import { executeRetrieval } from '../lib/retrieval';
import {
  INITIAL_API_KEYS,
  INITIAL_COLLECTIONS,
  INITIAL_KNOWLEDGE,
  INITIAL_KNOWLEDGE_REVISIONS,
  INITIAL_OUTCOMES,
  INITIAL_RELATIONSHIPS,
  INITIAL_SOURCES,
} from './fixtures';
import { KnowledgeRepository } from './KnowledgeRepository';

interface StoredData {
  sources: SourceDocument[];
  knowledge: KnowledgeItem[];
  revisions: KnowledgeRevision[];
  relationships: KnowledgeRelationship[];
  outcomes: KnowledgeOutcome[];
  apiKeys: ApiKeyGrant[];
  tokens?: ApiToken[];
  collections?: Collection[];
}

import {
  formatBytes,
  safeLocalStorageGet,
  safeLocalStorageSet,
  STORAGE_KEY,
} from '../lib/storage';

export class MockKnowledgeRepository implements KnowledgeRepository {
  private data: StoredData;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): StoredData {
    try {
      const stored = safeLocalStorageGet(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.sources && parsed.knowledge && parsed.relationships) {
          if (!parsed.revisions) {
            parsed.revisions = JSON.parse(JSON.stringify(INITIAL_KNOWLEDGE_REVISIONS));
          }
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
      revisions: JSON.parse(JSON.stringify(INITIAL_KNOWLEDGE_REVISIONS)),
      relationships: JSON.parse(JSON.stringify(INITIAL_RELATIONSHIPS)),
      outcomes: JSON.parse(JSON.stringify(INITIAL_OUTCOMES)),
      apiKeys: JSON.parse(JSON.stringify(INITIAL_API_KEYS)),
      collections: JSON.parse(JSON.stringify(INITIAL_COLLECTIONS)),
    };
  }

  private saveData(): void {
    const success = safeLocalStorageSet(STORAGE_KEY, JSON.stringify(this.data));
    if (!success) {
      console.warn('WikiGraph: Local demo store write failed (quota exceeded or storage blocked)');
    }
  }

  private async computeContentSha256(content: string): Promise<string> {
    const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  private createRevisionSnapshot(item: KnowledgeItem, changeNote?: string): KnowledgeRevision {
    const rev: KnowledgeRevision = {
      id: `rev-k-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      knowledgeId: item.id,
      snapshot: {
        title: item.title,
        summary: item.summary,
        body: item.body,
        type: item.type,
        collectionId: item.collectionId,
        applicability: item.applicability,
        exclusions: item.exclusions,
        requirements: [...(item.requirements || [])],
        sourceId: item.sourceId ?? null,
        sourceRevisionId: item.sourceRevisionId ?? null,
        sourceExcerpt: item.sourceExcerpt ?? null,
        reviewStatus: item.reviewStatus,
        evidenceLevel: item.evidenceLevel,
        language: item.language,
        origin: item.origin || 'manual',
        status: item.status || 'active',
      },
      changeNote: changeNote || null,
      createdAt: new Date().toISOString(),
    };
    if (!this.data.revisions) {
      this.data.revisions = [];
    }
    this.data.revisions.unshift(rev);
    return rev;
  }

  // --- Sources ---
  async listSources(): Promise<SourceDocument[]> {
    return [...this.data.sources];
  }

  async getSource(id: string): Promise<SourceDocument | null> {
    const doc = this.data.sources.find((s) => s.id === id);
    return doc ? { ...doc } : null;
  }

  async getSourceRevisions(sourceId: string): Promise<SourceRevision[]> {
    const doc = this.data.sources.find((s) => s.id === sourceId);
    return doc ? [...(doc.revisions || [])] : [];
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
    const contentSha256 = await this.computeContentSha256(source.originalContent);

    const newDoc: SourceDocument = {
      ...source,
      id,
      kind: source.kind || 'research_report',
      contentSha256,
      content_sha256: contentSha256,
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
    let contentSha256 = current.contentSha256 || current.content_sha256;

    if (newContent !== undefined && newContent !== current.originalContent) {
      const revisionId = `rev-${id}-${(updatedRevisions.length + 1).toString(36)}`;
      const headingMatches = newContent.match(/^#{1,6}\s+.+$/gm);
      contentSha256 = await this.computeContentSha256(newContent);

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
      kind: updates.kind || current.kind || 'research_report',
      contentSha256,
      content_sha256: contentSha256,
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
    // ON DELETE SET NULL for related knowledge items instead of cascade delete
    const relatedKnowledge = this.data.knowledge.filter((k) => k.sourceId === id);
    const now = new Date().toISOString();
    for (const k of relatedKnowledge) {
      k.sourceId = null;
      k.sourceRevisionId = null;
      k.sourceExcerpt = null;
      k.updatedAt = now;
      this.createRevisionSnapshot(k, 'Detached: underlying source document deleted');
    }
    this.saveData();
  }

  // --- Knowledge Items ---
  async listKnowledge(filters?: KnowledgeFilter): Promise<KnowledgeItem[]> {
    let items = [...this.data.knowledge];

    // Filter by status (default: active only unless includeRetired is true or status is specified)
    if (filters?.status && filters.status !== 'all') {
      items = items.filter((k) => (k.status || 'active') === filters.status);
    } else if (!filters?.includeRetired) {
      items = items.filter((k) => (k.status || 'active') === 'active');
    }

    if (filters?.origin && filters.origin !== 'all') {
      items = items.filter((k) => (k.origin || 'bundle') === filters.origin);
    }

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

    if (filters.sourceId && filters.sourceId !== 'all') {
      items = items.filter((k) => k.sourceId === filters.sourceId);
    }

    if (filters.type && filters.type !== 'all') {
      items = items.filter((k) => k.type === filters.type);
    }

    if (filters.language && filters.language !== 'all') {
      items = items.filter((k) => k.language === filters.language);
    }

    if (filters.reviewStatus && filters.reviewStatus !== 'all') {
      if (filters.reviewStatus === 'needs_review') {
        items = items.filter(
          (k) => k.reviewStatus === 'needs_review' || k.reviewStatus === 'draft' || k.sourceHasChanged
        );
      } else {
        items = items.filter((k) => k.reviewStatus === filters.reviewStatus);
      }
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
    item: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>,
    changeNote?: string
  ): Promise<KnowledgeItem> {
    const now = new Date().toISOString();
    const id = `kno-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newItem: KnowledgeItem = {
      ...item,
      id,
      origin: item.origin || 'manual',
      status: item.status || 'active',
      retiredAt: item.retiredAt || null,
      sourceId: item.sourceId ?? null,
      sourceRevisionId: item.sourceRevisionId ?? null,
      sourceExcerpt: item.sourceExcerpt ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.data.knowledge.unshift(newItem);
    this.createRevisionSnapshot(newItem, changeNote || 'Initial creation');
    this.saveData();
    return newItem;
  }

  async updateKnowledge(
    id: string,
    updates: Partial<KnowledgeItem>,
    changeNote?: string
  ): Promise<KnowledgeItem> {
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
    this.createRevisionSnapshot(updated, changeNote || 'Updated knowledge properties');
    this.saveData();
    return updated;
  }

  async deleteKnowledge(id: string): Promise<void> {
    this.data.knowledge = this.data.knowledge.filter((k) => k.id !== id);
    this.data.relationships = this.data.relationships.filter(
      (r) => r.sourceId !== id && r.targetId !== id
    );
    this.data.outcomes = this.data.outcomes.filter((o) => o.knowledgeId !== id);
    if (this.data.revisions) {
      this.data.revisions = this.data.revisions.filter((r) => r.knowledgeId !== id);
    }
    this.saveData();
  }

  async retireKnowledge(id: string, changeNote?: string): Promise<KnowledgeItem> {
    const idx = this.data.knowledge.findIndex((k) => k.id === id);
    if (idx === -1) throw new Error(`Knowledge item ${id} not found`);

    const current = this.data.knowledge[idx];
    const now = new Date().toISOString();
    const updated: KnowledgeItem = {
      ...current,
      status: 'retired',
      retiredAt: now,
      updatedAt: now,
    };
    this.data.knowledge[idx] = updated;
    this.createRevisionSnapshot(updated, changeNote || 'Item retired');
    this.saveData();
    return updated;
  }

  async restoreKnowledge(id: string, changeNote?: string): Promise<KnowledgeItem> {
    const idx = this.data.knowledge.findIndex((k) => k.id === id);
    if (idx === -1) throw new Error(`Knowledge item ${id} not found`);

    const current = this.data.knowledge[idx];
    const now = new Date().toISOString();
    const updated: KnowledgeItem = {
      ...current,
      status: 'active',
      retiredAt: null,
      updatedAt: now,
    };
    this.data.knowledge[idx] = updated;
    this.createRevisionSnapshot(updated, changeNote || 'Item restored to active status');
    this.saveData();
    return updated;
  }

  // --- Knowledge Revisions ---
  async getKnowledgeRevisions(knowledgeId: string): Promise<KnowledgeRevision[]> {
    if (!this.data.revisions) return [];
    return this.data.revisions.filter((r) => r.knowledgeId === knowledgeId);
  }

  async restoreKnowledgeRevision(
    knowledgeId: string,
    revisionId: string,
    changeNote?: string
  ): Promise<KnowledgeItem> {
    const rev = this.data.revisions?.find((r) => r.id === revisionId && r.knowledgeId === knowledgeId);
    if (!rev) throw new Error(`Revision ${revisionId} not found for knowledge item ${knowledgeId}`);

    const idx = this.data.knowledge.findIndex((k) => k.id === knowledgeId);
    if (idx === -1) throw new Error(`Knowledge item ${knowledgeId} not found`);

    const current = this.data.knowledge[idx];
    const now = new Date().toISOString();
    const updated: KnowledgeItem = {
      ...current,
      ...rev.snapshot,
      updatedAt: now,
    };
    this.data.knowledge[idx] = updated;
    this.createRevisionSnapshot(
      updated,
      changeNote || `Restored from version ${revisionId.slice(0, 8)}`
    );
    this.saveData();
    return updated;
  }

  // --- Relationships ---
  async listRelationships(knowledgeId?: string): Promise<KnowledgeRelationship[]> {
    if (knowledgeId) {
      return this.data.relationships.filter(
        (r) =>
          r.sourceId === knowledgeId ||
          r.sourceKnowledgeId === knowledgeId ||
          r.targetId === knowledgeId ||
          r.targetKnowledgeId === knowledgeId
      );
    }
    return [...this.data.relationships];
  }

  async updateRelationship(
    id: string,
    updates: Partial<KnowledgeRelationship>
  ): Promise<KnowledgeRelationship> {
    const rel = this.data.relationships.find((r) => r.id === id);
    if (!rel) throw new Error(`Relationship not found: ${id}`);
    Object.assign(rel, updates);
    this.saveData();
    return { ...rel };
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

  async moveCollectionItems(fromCollectionId: string, toCollectionId: string): Promise<void> {
    const now = new Date().toISOString();
    const items = this.data.knowledge.filter((k) => k.collectionId === fromCollectionId);
    for (const item of items) {
      item.collectionId = toCollectionId;
      item.updatedAt = now;
      this.createRevisionSnapshot(
        item,
        `Moved from collection ${fromCollectionId} to ${toCollectionId}`
      );
    }
    const sources = this.data.sources.filter((s) => s.collectionId === fromCollectionId);
    for (const s of sources) {
      s.collectionId = toCollectionId;
      s.updatedAt = now;
    }
    this.saveData();
  }

  async deleteCollection(id: string, targetCollectionIdForMove?: string): Promise<void> {
    const itemsInCol = this.data.knowledge.filter((k) => k.collectionId === id);
    const sourcesInCol = this.data.sources.filter((s) => s.collectionId === id);
    const hasContent = itemsInCol.length > 0 || sourcesInCol.length > 0;

    if (hasContent) {
      if (!targetCollectionIdForMove) {
        throw new Error(
          'Cannot delete collection containing items or documents. Please move them to another collection first.'
        );
      }
      await this.moveCollectionItems(id, targetCollectionIdForMove);
    }

    if ((this.data as any).collections) {
      (this.data as any).collections = (this.data as any).collections.filter(
        (c: Collection) => c.id !== id
      );
    } else {
      (this.data as any).collections = INITIAL_COLLECTIONS.filter((c) => c.id !== id);
    }
    this.saveData();
  }

  // --- Auth (Single Owner) ---
  async login(password: string): Promise<AuthLoginResponse> {
    if (!password || password.trim().length === 0) {
      throw new Error('Password is required');
    }
    safeLocalStorageSet('wikigraph_auth_session', 'true');
    return { success: true, user: { role: 'owner' } };
  }

  async logout(): Promise<void> {
    safeLocalStorageSet('wikigraph_auth_session', 'false');
  }

  async getSession(): Promise<AuthSessionResponse> {
    const isAuthed = safeLocalStorageGet('wikigraph_auth_session') !== 'false';
    return {
      authenticated: isAuthed,
      user: isAuthed ? { role: 'owner' } : undefined,
    };
  }

  // --- API Tokens (External AI Tools & CLI Access) ---
  async listTokens(): Promise<ApiToken[]> {
    if (this.data.tokens && Array.isArray(this.data.tokens)) {
      return [...this.data.tokens];
    }
    // Initialize default tokens from apiKeys if none exist
    const initialTokens: ApiToken[] = this.data.apiKeys.map((k) => ({
      id: k.id,
      name: k.label,
      tokenMasked: `wg_tok_${k.id.slice(-6)}...`,
      scope: 'read_write' as const,
      collectionIds: k.allowedCollections.includes('all') ? null : k.allowedCollections,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt || null,
    }));
    this.data.tokens = initialTokens;
    this.saveData();
    return [...initialTokens];
  }

  async createToken(data: CreateApiTokenRequest): Promise<CreateApiTokenResponse> {
    const id = `tok-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const randomHex = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    const secret = `wg_live_${randomHex}`;
    const tokenMasked = `wg_live_${randomHex.substring(0, 8)}...${randomHex.substring(randomHex.length - 4)}`;

    const token: ApiToken = {
      id,
      name: data.name,
      tokenMasked,
      scope: data.scope,
      collectionIds: data.collectionIds && data.collectionIds.length > 0 ? data.collectionIds : null,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    };

    if (!this.data.tokens) {
      this.data.tokens = [];
    }
    this.data.tokens.unshift(token);
    this.saveData();

    return { token, secret };
  }

  async deleteToken(id: string): Promise<void> {
    if (this.data.tokens) {
      this.data.tokens = this.data.tokens.filter((t) => t.id !== id);
    }
    this.data.apiKeys = this.data.apiKeys.filter((k) => k.id !== id);
    this.saveData();
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
      if (item.sourceId) {
        const source = allSources.find((s) => s.id === item.sourceId);
        if (source) {
          evidenceSourcesMap.set(`${source.id}-${item.sourceRevisionId || 'initial'}`, {
            source,
            revision: item.sourceRevisionId || source.revisions[0]?.revisionId || 'initial',
            excerpt: item.sourceExcerpt || '',
          });
        }
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

  async buildContext(request: ContextRequest): Promise<ContextResult> {
    return executeRetrieval(request, {
      items: this.data.knowledge,
      sources: this.data.sources,
      relationships: this.data.relationships,
    });
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

  // --- Bundle Ingestion ---
  async importBundle(
    bundle: WikiGraphBundle,
    options?: ImportBundleOptions
  ): Promise<ImportBundleResult> {
    // 1. Duplicate checks
    const existingByHash = this.data.sources.find(
      (s) =>
        s.contentSha256 &&
        s.contentSha256.toLowerCase() === bundle.source.content_sha256.toLowerCase()
    );
    if (existingByHash && options?.onDuplicate !== 'overwrite') {
      return {
        sourceId: existingByHash.id,
        createdItemIds: [],
        createdRelationshipIds: [],
        skipped: true,
      };
    }

    const existingByFilename = this.data.sources.find(
      (s) => s.filename.toLowerCase() === bundle.source.filename.toLowerCase()
    );

    // All-or-nothing preparation staging
    let newColToAdd: Collection | null = null;
    let targetCollectionId = options?.collectionId;
    if (!targetCollectionId) {
      if (options?.createCollection) {
        newColToAdd = {
          id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: options.createCollection.name,
          nameFa: options.createCollection.name_fa || options.createCollection.name,
          description: `Imported collection suggestion for ${bundle.source.title}`,
        };
        targetCollectionId = newColToAdd.id;
      } else if (bundle.collection_suggestion?.name) {
        const customCols = (this.data as any).collections || INITIAL_COLLECTIONS;
        const matchingCol = customCols.find(
          (c: Collection) =>
            c.name.toLowerCase() === bundle.collection_suggestion!.name.toLowerCase()
        );
        if (matchingCol) {
          targetCollectionId = matchingCol.id;
        } else {
          newColToAdd = {
            id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: bundle.collection_suggestion.name,
            nameFa: bundle.collection_suggestion.name_fa || bundle.collection_suggestion.name,
            description: `Imported collection suggestion for ${bundle.source.title}`,
          };
          targetCollectionId = newColToAdd.id;
        }
      } else {
        targetCollectionId = this.data.sources[0]?.collectionId || 'col-data-extraction';
      }
    }

    const finalCollectionId = targetCollectionId || 'col-data-extraction';
    let sourceId: string;
    let isNewRevision = false;
    let sourceRevId = `rev-${Date.now()}`;
    let newSourceToAdd: SourceDocument | null = null;
    let existingSourceToUpdate: SourceDocument | null = null;
    let updatedOldRev: SourceRevision | null = null;

    if (existingByFilename && options?.onDuplicate === 'new_revision') {
      isNewRevision = true;
      sourceId = existingByFilename.id;
      existingSourceToUpdate = existingByFilename;

      // Snapshot the old content as a source revision
      updatedOldRev = {
        revisionId: `rev-${existingByFilename.id}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        changeSummary: 'Snapshot before importing updated bundle revision',
        content: existingByFilename.originalContent,
      };
      sourceRevId = updatedOldRev.revisionId;
    } else {
      // Create new source document
      sourceId = `src-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      newSourceToAdd = {
        id: sourceId,
        title: bundle.source.title,
        filename: bundle.source.filename,
        collectionId: finalCollectionId,
        tags: bundle.source.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        originalContent: bundle.source.content,
        contentSha256: bundle.source.content_sha256,
        kind: bundle.source.kind,
        language: bundle.source.language,
        revisions: [
          {
            revisionId: sourceRevId,
            timestamp: new Date().toISOString(),
            changeSummary: 'Initial bundle import ingestion',
            content: bundle.source.content,
          },
        ],
      };
    }

    // Map local_id to real knowledge item ID
    const localIdToRealIdMap = new Map<string, string>();
    const createdItemIds: string[] = [];
    const newItemsToAdd: KnowledgeItem[] = [];
    const newRevisionsToAdd: KnowledgeRevision[] = [];

    const now = new Date().toISOString();

    for (const bItem of bundle.knowledge_items) {
      const realId = `kno-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      localIdToRealIdMap.set(bItem.local_id, realId);
      createdItemIds.push(realId);

      // Map evidence level to domain enum
      let mappedEvidence: EvidenceLevel = 'unverified';
      if (bItem.evidence_level === 'production_proven') mappedEvidence = 'tested';
      else if (bItem.evidence_level === 'tested') mappedEvidence = 'observed';
      else mappedEvidence = 'unverified';

      const newItem: KnowledgeItem = {
        id: realId,
        title: bItem.title,
        summary: bItem.summary,
        body: bItem.body || '',
        type: bItem.type,
        collectionId: finalCollectionId,
        sourceId: sourceId,
        sourceRevisionId: sourceRevId,
        sourceExcerpt: bItem.source_excerpt,
        origin: 'bundle',
        status: 'active',
        reviewStatus: 'needs_review',
        evidenceLevel: mappedEvidence,
        applicability: bItem.applicability || '',
        exclusions: bItem.exclusions || '',
        requirements: bItem.requirements || [],
        language: bItem.language,
        sourceHasChanged: false,
        createdAt: now,
        updatedAt: now,
      };

      newItemsToAdd.push(newItem);

      // Record initial revision
      const rev: KnowledgeRevision = {
        id: `rev-kno-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        knowledgeId: realId,
        snapshot: {
          title: newItem.title,
          summary: newItem.summary,
          body: newItem.body,
          type: newItem.type,
          collectionId: finalCollectionId,
          evidenceLevel: newItem.evidenceLevel,
          reviewStatus: newItem.reviewStatus,
          applicability: newItem.applicability,
          exclusions: newItem.exclusions,
          requirements: newItem.requirements,
          language: newItem.language,
          origin: newItem.origin,
          status: newItem.status,
          sourceId: newItem.sourceId,
          sourceRevisionId: newItem.sourceRevisionId,
          sourceExcerpt: newItem.sourceExcerpt,
        },
        changeNote: 'Initial import from bundle',
        createdAt: now,
      };
      newRevisionsToAdd.push(rev);
    }

    // Map relationships
    const createdRelationshipIds: string[] = [];
    const newRelationshipsToAdd: KnowledgeRelationship[] = [];
    if (bundle.relationships && Array.isArray(bundle.relationships)) {
      for (const bRel of bundle.relationships) {
        const sourceRealId = localIdToRealIdMap.get(bRel.source_local_id);
        const targetRealId = localIdToRealIdMap.get(bRel.target_local_id);
        if (sourceRealId && targetRealId) {
          const relId = `rel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          createdRelationshipIds.push(relId);
          const newRel: KnowledgeRelationship = {
            id: relId,
            sourceKnowledgeId: sourceRealId,
            targetKnowledgeId: targetRealId,
            relationshipType: bRel.relationship_type,
            notes: bRel.notes,
            createdAt: now,
          };
          newRelationshipsToAdd.push(newRel);
        }
      }
    }

    // --- ATOMIC COMMIT (All-or-nothing) ---
    if (newColToAdd) {
      const customCols = (this.data as any).collections || INITIAL_COLLECTIONS;
      (this.data as any).collections = [...customCols, newColToAdd];
    }

    if (existingSourceToUpdate && updatedOldRev) {
      existingSourceToUpdate.revisions = [
        updatedOldRev,
        ...(existingSourceToUpdate.revisions || []),
      ];
      existingSourceToUpdate.originalContent = bundle.source.content;
      existingSourceToUpdate.contentSha256 = bundle.source.content_sha256;
      existingSourceToUpdate.updatedAt = new Date().toISOString();
      if (bundle.source.tags) {
        existingSourceToUpdate.tags = Array.from(
          new Set([...(existingSourceToUpdate.tags || []), ...bundle.source.tags])
        );
      }
      // Set sourceHasChanged on existing knowledge items referencing this source
      this.data.knowledge.forEach((k) => {
        if (k.sourceId === existingSourceToUpdate!.id) {
          k.sourceHasChanged = true;
        }
      });
    } else if (newSourceToAdd) {
      this.data.sources.unshift(newSourceToAdd);
    }

    for (const item of newItemsToAdd) {
      this.data.knowledge.unshift(item);
    }
    for (const rev of newRevisionsToAdd) {
      this.data.revisions.unshift(rev);
    }
    for (const rel of newRelationshipsToAdd) {
      this.data.relationships.unshift(rel);
    }

    this.saveData();

    return {
      sourceId,
      createdItemIds,
      createdRelationshipIds,
      skipped: false,
      isNewRevision,
    };
  }
}
