import {
  ApiToken,
  AuthLoginRequest,
  AuthLoginResponse,
  AuthSessionResponse,
  Collection,
  ContextRequest,
  ContextResult,
  CreateApiTokenRequest,
  CreateApiTokenResponse,
  KnowledgeFilter,
  KnowledgeItem,
  KnowledgeOutcome,
  KnowledgeRelationship,
  KnowledgeRevision,
  RelationType,
  RepositoryError,
  RepositoryErrorCode,
  SourceDocument,
  SourceRevision,
  StorageStats,
  WikiGraphBundle,
  ImportBundleOptions,
  ImportBundleResult,
  PaginatedKnowledgeRequest,
  PaginatedKnowledgeResponse,
  SearchKnowledgeRequest,
  SearchKnowledgeResponse,
} from '../types';
import { KnowledgeRepository } from './KnowledgeRepository';

/**
 * Cloudflare Pages Functions + D1 API Adapter Seam.
 * In production mode, this class communicates with /api/v1/* routes.
 * Every method implements the KnowledgeRepository interface, mapping
 * HTTP status codes and error payloads to typed RepositoryError instances.
 */
export class ApiKnowledgeRepository implements KnowledgeRepository {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/v1') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /**
   * Resolves path ensuring /api/v1 prefix is consistently preserved.
   */
  private resolvePath(subPath: string): string {
    const cleanSub = subPath.startsWith('/') ? subPath : `/${subPath}`;
    if (this.baseUrl.endsWith('/v1')) {
      return `${this.baseUrl}${cleanSub}`;
    }
    return `${this.baseUrl}/v1${cleanSub}`;
  }

  private mapStatusToErrorCode(status: number, explicitCode?: string): RepositoryErrorCode {
    if (
      explicitCode &&
      [
        'unauthorized',
        'forbidden',
        'not_found',
        'validation_failed',
        'conflict',
        'rate_limited',
        'server_error',
        'network_error',
      ].includes(explicitCode)
    ) {
      return explicitCode as RepositoryErrorCode;
    }

    switch (status) {
      case 401:
        return 'unauthorized';
      case 403:
        return 'forbidden';
      case 404:
        return 'not_found';
      case 400:
      case 422:
        return 'validation_failed';
      case 409:
        return 'conflict';
      case 429:
        return 'rate_limited';
      default:
        return 'server_error';
    }
  }

  private async request<T>(subPath: string, options?: RequestInit): Promise<T> {
    const fullUrl = this.resolvePath(subPath);

    let res: Response;
    try {
      res = await fetch(fullUrl, {
        ...options,
        credentials: 'include', // Transmits httpOnly session cookie
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...options?.headers,
        },
      });
    } catch (networkErr) {
      throw new RepositoryError(
        'network_error',
        networkErr instanceof Error
          ? networkErr.message
          : 'Network connection failed. Unable to communicate with WikiGraph API.'
      );
    }

    if (!res.ok) {
      let errBody: any = null;
      try {
        errBody = await res.json();
      } catch {
        // Response was not JSON
      }

      const code = this.mapStatusToErrorCode(res.status, errBody?.error?.code);
      const message =
        errBody?.error?.message ||
        errBody?.message ||
        `Request to ${subPath} failed with HTTP ${res.status}`;
      const details = errBody?.error?.details || errBody?.details;

      throw new RepositoryError(code, message, details, res.status);
    }

    if (res.status === 204) {
      return undefined as unknown as T;
    }

    const json = await res.json().catch(() => ({}));
    return json as T;
  }

  /**
   * Normalizes responses that may return either a flat array T[] or paginated { items: T[], nextCursor?: string }
   */
  private async requestList<T>(subPath: string, options?: RequestInit): Promise<T[]> {
    const data = await this.request<T[] | { items: T[]; nextCursor?: string | null }>(
      subPath,
      options
    );
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray((data as any).items)) {
      return (data as any).items;
    }
    return [];
  }

  // --- Auth (Single Owner) ---
  async login(password: string): Promise<AuthLoginResponse> {
    return this.request<AuthLoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  async logout(): Promise<void> {
    await this.request<void>('/auth/logout', {
      method: 'POST',
    });
  }

  async getSession(): Promise<AuthSessionResponse> {
    return this.request<AuthSessionResponse>('/auth/session', {
      method: 'GET',
    });
  }

  // --- Sources ---
  async listSources(): Promise<SourceDocument[]> {
    const rawList = await this.requestList<any>('/sources');
    return rawList.map((s: any) => ({
      ...s,
      contentSha256: s.contentSha256 || s.content_sha256,
    }));
  }

  async getSource(id: string): Promise<SourceDocument | null> {
    try {
      const s = await this.request<any>(`/sources/${encodeURIComponent(id)}`);
      return {
        ...s,
        contentSha256: s.contentSha256 || s.content_sha256,
      };
    } catch (err) {
      if (err instanceof RepositoryError && err.code === 'not_found') {
        return null;
      }
      throw err;
    }
  }

  async getSourceRevisions(sourceId: string): Promise<SourceRevision[]> {
    return this.requestList<SourceRevision>(`/sources/${encodeURIComponent(sourceId)}/revisions`);
  }

  async createSource(
    source: Omit<SourceDocument, 'id' | 'createdAt' | 'updatedAt' | 'revisions'> & {
      initialRevisionSummary?: string;
    }
  ): Promise<SourceDocument> {
    const wirePayload: any = {
      ...source,
      content_sha256: source.contentSha256,
    };
    const s = await this.request<any>('/sources', {
      method: 'POST',
      body: JSON.stringify(wirePayload),
    });
    return {
      ...s,
      contentSha256: s.contentSha256 || s.content_sha256,
    };
  }

  async updateSource(
    id: string,
    updates: Partial<SourceDocument>,
    newContent?: string,
    changeSummary?: string
  ): Promise<SourceDocument> {
    const wireUpdates: any = { ...updates };
    if (updates.contentSha256) {
      wireUpdates.content_sha256 = updates.contentSha256;
    }
    const s = await this.request<any>(`/sources/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ updates: wireUpdates, newContent, changeSummary }),
    });
    return {
      ...s,
      contentSha256: s.contentSha256 || s.content_sha256,
    };
  }

  async deleteSource(id: string): Promise<void> {
    await this.request<void>(`/sources/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  // --- Knowledge Items ---
  async listKnowledge(filters?: KnowledgeFilter): Promise<KnowledgeItem[]> {
    const query = new URLSearchParams();
    if (filters) {
      if (filters.search) query.set('search', filters.search);
      if (filters.sourceId) query.set('sourceId', filters.sourceId);
      if (filters.collectionId) query.set('collectionId', filters.collectionId);
      if (filters.type && filters.type !== 'all') query.set('type', filters.type);
      if (filters.language && filters.language !== 'all') query.set('language', filters.language);
      if (filters.reviewStatus && filters.reviewStatus !== 'all')
        query.set('reviewStatus', filters.reviewStatus);
      if (filters.evidenceLevel && filters.evidenceLevel !== 'all')
        query.set('evidenceLevel', filters.evidenceLevel);
      if (filters.freshness && filters.freshness !== 'all')
        query.set('freshness', filters.freshness);
      if (filters.status && filters.status !== 'all') query.set('status', filters.status);
      if (filters.includeRetired) query.set('includeRetired', 'true');
      if (filters.origin && filters.origin !== 'all') query.set('origin', filters.origin);
    }
    const qStr = query.toString();
    return this.requestList<KnowledgeItem>(`/knowledge${qStr ? `?${qStr}` : ''}`);
  }

  async listKnowledgePaginated(params?: PaginatedKnowledgeRequest): Promise<PaginatedKnowledgeResponse> {
    const query = new URLSearchParams();
    if (params?.query) query.set('q', params.query);
    if (params?.collectionId && params.collectionId !== 'all') query.set('collectionId', params.collectionId);
    if (params?.type && params.type !== 'all') query.set('type', params.type);
    if (params?.language && params.language !== 'all') query.set('language', params.language);
    if (params?.evidenceLevel && params.evidenceLevel !== 'all') query.set('evidenceLevel', params.evidenceLevel);
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.includeRetired) query.set('includeRetired', 'true');
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.cursor) query.set('cursor', params.cursor);

    const qStr = query.toString();
    return this.request<PaginatedKnowledgeResponse>(`/knowledge/paginated${qStr ? `?${qStr}` : ''}`);
  }

  async searchKnowledge(params: SearchKnowledgeRequest): Promise<SearchKnowledgeResponse> {
    const query = new URLSearchParams();
    query.set('q', params.query);
    if (params.collectionId && params.collectionId !== 'all') query.set('collectionId', params.collectionId);
    if (params.type && params.type !== 'all') query.set('type', params.type);
    if (params.language && params.language !== 'all') query.set('language', params.language);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.cursor) query.set('cursor', params.cursor);

    const qStr = query.toString();
    return this.request<SearchKnowledgeResponse>(`/search${qStr ? `?${qStr}` : ''}`);
  }

  async getKnowledge(id: string): Promise<KnowledgeItem | null> {
    try {
      return await this.request<KnowledgeItem>(`/knowledge/${encodeURIComponent(id)}`);
    } catch (err) {
      if (err instanceof RepositoryError && err.code === 'not_found') {
        return null;
      }
      throw err;
    }
  }

  async createKnowledge(
    item: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>,
    changeNote?: string
  ): Promise<KnowledgeItem> {
    return this.request<KnowledgeItem>('/knowledge', {
      method: 'POST',
      body: JSON.stringify({ ...item, changeNote }),
    });
  }

  async updateKnowledge(
    id: string,
    updates: Partial<KnowledgeItem>,
    changeNote?: string
  ): Promise<KnowledgeItem> {
    return this.request<KnowledgeItem>(`/knowledge/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...updates, changeNote }),
    });
  }

  async retireKnowledge(id: string, changeNote?: string): Promise<KnowledgeItem> {
    return this.request<KnowledgeItem>(`/knowledge/${encodeURIComponent(id)}/retire`, {
      method: 'POST',
      body: JSON.stringify({ changeNote }),
    });
  }

  async restoreKnowledge(id: string, changeNote?: string): Promise<KnowledgeItem> {
    return this.request<KnowledgeItem>(`/knowledge/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
      body: JSON.stringify({ changeNote }),
    });
  }

  // --- Knowledge Revisions (Edit History) ---
  async getKnowledgeRevisions(knowledgeId: string): Promise<KnowledgeRevision[]> {
    return this.requestList<KnowledgeRevision>(
      `/knowledge/${encodeURIComponent(knowledgeId)}/revisions`
    );
  }

  async restoreKnowledgeRevision(
    knowledgeId: string,
    revisionId: string,
    changeNote?: string
  ): Promise<KnowledgeItem> {
    return this.request<KnowledgeItem>(
      `/knowledge/${encodeURIComponent(knowledgeId)}/revisions/${encodeURIComponent(revisionId)}/restore`,
      {
        method: 'POST',
        body: JSON.stringify({ changeNote }),
      }
    );
  }

  // --- Relationships ---
  async listRelationships(knowledgeId?: string): Promise<KnowledgeRelationship[]> {
    const q = knowledgeId ? `?knowledgeId=${encodeURIComponent(knowledgeId)}` : '';
    const rawList = await this.requestList<any>(`/relationships${q}`);
    return rawList.map((r: any) => ({
      id: r.id,
      sourceKnowledgeId: r.source_knowledge_id || r.sourceKnowledgeId,
      targetKnowledgeId: r.target_knowledge_id || r.targetKnowledgeId,
      type: (r.relationship_type || r.type) as RelationType,
      notes: r.notes || undefined,
      createdAt: r.created_at || r.createdAt || new Date().toISOString(),
    }));
  }

  async createRelationship(
    rel: Omit<KnowledgeRelationship, 'id' | 'createdAt'>
  ): Promise<KnowledgeRelationship> {
    const wirePayload = {
      source_knowledge_id: rel.sourceKnowledgeId,
      target_knowledge_id: rel.targetKnowledgeId,
      relationship_type: rel.type,
      notes: rel.notes,
    };
    const r = await this.request<any>('/relationships', {
      method: 'POST',
      body: JSON.stringify(wirePayload),
    });
    return {
      id: r.id,
      sourceKnowledgeId: r.source_knowledge_id || r.sourceKnowledgeId || rel.sourceKnowledgeId,
      targetKnowledgeId: r.target_knowledge_id || r.targetKnowledgeId || rel.targetKnowledgeId,
      type: (r.relationship_type || r.type || rel.type) as RelationType,
      notes: r.notes || rel.notes,
      createdAt: r.created_at || r.createdAt || new Date().toISOString(),
    };
  }

  async updateRelationship(
    id: string,
    updates: Partial<KnowledgeRelationship>
  ): Promise<KnowledgeRelationship> {
    const wirePayload: any = {};
    if (updates.sourceKnowledgeId) wirePayload.source_knowledge_id = updates.sourceKnowledgeId;
    if (updates.targetKnowledgeId) wirePayload.target_knowledge_id = updates.targetKnowledgeId;
    if (updates.type) wirePayload.relationship_type = updates.type;
    if (updates.notes !== undefined) wirePayload.notes = updates.notes;

    const r = await this.request<any>(`/relationships/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(wirePayload),
    });
    return {
      id: r.id,
      sourceKnowledgeId: r.source_knowledge_id || r.sourceKnowledgeId || updates.sourceKnowledgeId || '',
      targetKnowledgeId: r.target_knowledge_id || r.targetKnowledgeId || updates.targetKnowledgeId || '',
      type: (r.relationship_type || r.type || updates.type || 'supports') as RelationType,
      notes: r.notes !== undefined ? r.notes : updates.notes,
      createdAt: r.created_at || r.createdAt || new Date().toISOString(),
    };
  }

  async deleteRelationship(id: string): Promise<void> {
    await this.request<void>(`/relationships/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  // --- Outcomes ---
  async listOutcomes(knowledgeId?: string): Promise<KnowledgeOutcome[]> {
    const q = knowledgeId ? `?knowledgeId=${encodeURIComponent(knowledgeId)}` : '';
    const rawList = await this.requestList<any>(`/outcomes${q}`);
    return rawList.map((o: any) => ({
      id: o.id,
      task: o.task,
      appliedKnowledgeIds: Array.isArray(o.applied_knowledge_ids)
        ? o.applied_knowledge_ids
        : typeof o.applied_knowledge_ids === 'string'
        ? JSON.parse(o.applied_knowledge_ids || '[]')
        : (o.appliedKnowledgeIds || []),
      appliedRevisionIds: Array.isArray(o.applied_revision_ids)
        ? o.applied_revision_ids
        : typeof o.applied_revision_ids === 'string'
        ? JSON.parse(o.applied_revision_ids || '[]')
        : (o.appliedRevisionIds || undefined),
      result: o.result,
      notes: o.notes || undefined,
      recordedAt: o.recorded_at || o.recordedAt || new Date().toISOString(),
      reportedBy: o.reported_by || o.reportedBy || undefined,
    }));
  }

  async createOutcome(
    outcome: Omit<KnowledgeOutcome, 'id' | 'recordedAt'>
  ): Promise<KnowledgeOutcome> {
    const wirePayload = {
      task: outcome.task,
      applied_knowledge_ids: outcome.appliedKnowledgeIds,
      applied_revision_ids: outcome.appliedRevisionIds,
      result: outcome.result,
      notes: outcome.notes,
      reported_by: outcome.reportedBy,
    };
    const o = await this.request<any>('/outcomes', {
      method: 'POST',
      body: JSON.stringify(wirePayload),
    });
    return {
      id: o.id,
      task: o.task || outcome.task,
      appliedKnowledgeIds: Array.isArray(o.applied_knowledge_ids)
        ? o.applied_knowledge_ids
        : typeof o.applied_knowledge_ids === 'string'
        ? JSON.parse(o.applied_knowledge_ids || '[]')
        : (o.appliedKnowledgeIds || outcome.appliedKnowledgeIds),
      appliedRevisionIds: Array.isArray(o.applied_revision_ids)
        ? o.applied_revision_ids
        : typeof o.applied_revision_ids === 'string'
        ? JSON.parse(o.applied_revision_ids || '[]')
        : (o.appliedRevisionIds || outcome.appliedRevisionIds),
      result: o.result || outcome.result,
      notes: o.notes !== undefined ? o.notes : outcome.notes,
      recordedAt: o.recorded_at || o.recordedAt || new Date().toISOString(),
      reportedBy: o.reported_by || o.reportedBy || outcome.reportedBy,
    };
  }

  async deleteOutcome(id: string): Promise<void> {
    await this.request<void>(`/outcomes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  // --- Collections ---
  async listCollections(): Promise<Collection[]> {
    return this.requestList<Collection>('/collections');
  }

  async getCollection(idOrSlug: string): Promise<Collection | null> {
    try {
      return await this.request<Collection>(`/collections/${encodeURIComponent(idOrSlug)}`);
    } catch (err) {
      if (err instanceof RepositoryError && err.code === 'not_found') {
        return null;
      }
      throw err;
    }
  }

  async createCollection(col: Omit<Collection, 'id'>): Promise<Collection> {
    return this.request<Collection>('/collections', {
      method: 'POST',
      body: JSON.stringify(col),
    });
  }

  async moveCollectionItems(fromCollectionId: string, toCollectionId: string): Promise<void> {
    await this.request<void>('/collections/move-items', {
      method: 'POST',
      body: JSON.stringify({ fromCollectionId, toCollectionId }),
    });
  }

  async deleteCollection(id: string, targetCollectionIdForMove?: string): Promise<void> {
    const q = targetCollectionIdForMove
      ? `?moveTo=${encodeURIComponent(targetCollectionIdForMove)}`
      : '';
    await this.request<void>(`/collections/${encodeURIComponent(id)}${q}`, {
      method: 'DELETE',
    });
  }

  // --- API Tokens (External AI Tools & CLI Access) ---
  async listTokens(): Promise<ApiToken[]> {
    return this.requestList<ApiToken>('/tokens');
  }

  async createToken(data: CreateApiTokenRequest): Promise<CreateApiTokenResponse> {
    return this.request<CreateApiTokenResponse>('/tokens', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteToken(id: string): Promise<void> {
    await this.request<void>(`/tokens/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  // --- Context Assembly & Natural Language Retrieval ---
  async buildContext(request: ContextRequest): Promise<ContextResult> {
    return this.request<ContextResult>('/query', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // --- Backup, Export & Ingestion ---
  async getStorageStats(): Promise<StorageStats> {
    return this.request<StorageStats>('/system/stats');
  }

  async resetDemoStore(): Promise<void> {
    throw new RepositoryError(
      'validation_failed',
      'Reset demo store is only supported in offline demo store mode.'
    );
  }

  async exportData(): Promise<string> {
    const data = await this.request<unknown>('/export');
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  }

  async importData(jsonString: string): Promise<boolean> {
    let bodyObj: any;
    try {
      bodyObj = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    } catch {
      throw new RepositoryError('validation_failed', 'Import payload is not valid JSON.');
    }

    await this.request<void>('/import/backup', {
      method: 'POST',
      body: JSON.stringify(bodyObj),
    });
    return true;
  }

  async importBundle(
    bundle: WikiGraphBundle,
    options?: ImportBundleOptions
  ): Promise<ImportBundleResult> {
    return this.request<ImportBundleResult>('/import/bundle', {
      method: 'POST',
      body: JSON.stringify({ bundle, options }),
    });
  }
}
