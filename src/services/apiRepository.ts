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
  RepositoryError,
  RepositoryErrorCode,
  SourceDocument,
  SourceRevision,
  StorageStats,
  WikiGraphBundle,
  ImportBundleOptions,
  ImportBundleResult,
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
    return this.requestList<SourceDocument>('/sources');
  }

  async getSource(id: string): Promise<SourceDocument | null> {
    try {
      return await this.request<SourceDocument>(`/sources/${encodeURIComponent(id)}`);
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
    return this.request<SourceDocument>('/sources', {
      method: 'POST',
      body: JSON.stringify(source),
    });
  }

  async updateSource(
    id: string,
    updates: Partial<SourceDocument>,
    newContent?: string,
    changeSummary?: string
  ): Promise<SourceDocument> {
    return this.request<SourceDocument>(`/sources/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ updates, newContent, changeSummary }),
    });
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

  async deleteKnowledge(id: string): Promise<void> {
    await this.request<void>(`/knowledge/${encodeURIComponent(id)}`, {
      method: 'DELETE',
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
    return this.requestList<KnowledgeRelationship>(`/relationships${q}`);
  }

  async createRelationship(
    rel: Omit<KnowledgeRelationship, 'id' | 'createdAt'>
  ): Promise<KnowledgeRelationship> {
    return this.request<KnowledgeRelationship>('/relationships', {
      method: 'POST',
      body: JSON.stringify(rel),
    });
  }

  async addRelationship(
    rel: Omit<KnowledgeRelationship, 'id' | 'createdAt'>
  ): Promise<KnowledgeRelationship> {
    return this.createRelationship(rel);
  }

  async updateRelationship(
    id: string,
    updates: Partial<KnowledgeRelationship>
  ): Promise<KnowledgeRelationship> {
    return this.request<KnowledgeRelationship>(`/relationships/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteRelationship(id: string): Promise<void> {
    await this.request<void>(`/relationships/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  async removeRelationship(id: string): Promise<void> {
    return this.deleteRelationship(id);
  }

  // --- Outcomes ---
  async listOutcomes(knowledgeId?: string): Promise<KnowledgeOutcome[]> {
    const q = knowledgeId ? `?knowledgeId=${encodeURIComponent(knowledgeId)}` : '';
    return this.requestList<KnowledgeOutcome>(`/outcomes${q}`);
  }

  async createOutcome(
    outcome: Omit<KnowledgeOutcome, 'id' | 'recordedAt'>
  ): Promise<KnowledgeOutcome> {
    return this.request<KnowledgeOutcome>('/outcomes', {
      method: 'POST',
      body: JSON.stringify(outcome),
    });
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

  // --- Scoped API Keys (Legacy compatibility seam) ---
  async listApiKeys(): Promise<ApiKeyGrant[]> {
    const tokens = await this.listTokens();
    return tokens.map((t) => ({
      id: t.id,
      label: t.name,
      tokenPrefix: t.tokenMasked,
      allowedCollections: t.collectionIds || ['all'],
      grants: t.scope === 'read_only' ? ['search', 'read'] : ['search', 'read', 'compose'],
      createdAt: t.createdAt,
      expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(),
      lastUsedAt: t.lastUsedAt || undefined,
      status: 'active',
      isDemoSimulated: false,
    }));
  }

  async createApiKey(data: {
    label: string;
    allowedCollections: string[];
    grants: ('search' | 'read' | 'compose')[];
    expiryDays: number;
  }): Promise<{ key: ApiKeyGrant; plainTextToken: string }> {
    const scope = data.grants.includes('compose') ? 'read_write' : 'read_only';
    const collectionIds = data.allowedCollections.includes('all') ? null : data.allowedCollections;
    const res = await this.createToken({
      name: data.label,
      scope,
      collectionIds,
    });
    const key: ApiKeyGrant = {
      id: res.token.id,
      label: res.token.name,
      tokenPrefix: res.token.tokenMasked,
      allowedCollections: data.allowedCollections,
      grants: data.grants,
      createdAt: res.token.createdAt,
      expiresAt: new Date(Date.now() + (data.expiryDays || 90) * 86400000).toISOString(),
      status: 'active',
      isDemoSimulated: false,
    };
    return { key, plainTextToken: res.secret };
  }

  async revokeApiKey(id: string): Promise<void> {
    return this.deleteToken(id);
  }

  // --- Context Assembly & Natural Language Retrieval ---
  async assembleContext(req: ContextAssemblyRequest): Promise<ContextAssemblyResult> {
    return this.request<ContextAssemblyResult>('/context/assemble', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

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
