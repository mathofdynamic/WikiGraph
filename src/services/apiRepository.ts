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
import { KnowledgeRepository } from './KnowledgeRepository';

/**
 * Cloudflare Pages Functions + D1 API Adapter Seam.
 * In production mode, this class communicates with /api/* routes.
 * In this static frontend prototype, it acts as the exact typed contract
 * for Codex or backend developers to wire up with Cloudflare D1.
 */
export class ApiKnowledgeRepository implements KnowledgeRepository {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(
        (errBody as { message?: string }).message ||
          `API request to ${path} failed with status ${res.status}`
      );
    }

    return res.json() as Promise<T>;
  }

  async listSources(): Promise<SourceDocument[]> {
    return this.request<SourceDocument[]>('/sources');
  }

  async getSource(id: string): Promise<SourceDocument | null> {
    return this.request<SourceDocument>(`/sources/${id}`);
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
    return this.request<SourceDocument>(`/sources/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ updates, newContent, changeSummary }),
    });
  }

  async deleteSource(id: string): Promise<void> {
    await this.request<void>(`/sources/${id}`, {
      method: 'DELETE',
    });
  }

  async listKnowledge(filters?: KnowledgeFilter): Promise<KnowledgeItem[]> {
    const query = new URLSearchParams();
    if (filters) {
      if (filters.search) query.set('search', filters.search);
      if (filters.collectionId) query.set('collectionId', filters.collectionId);
      if (filters.type) query.set('type', filters.type);
      if (filters.language) query.set('language', filters.language);
      if (filters.reviewStatus) query.set('reviewStatus', filters.reviewStatus);
      if (filters.evidenceLevel) query.set('evidenceLevel', filters.evidenceLevel);
      if (filters.freshness) query.set('freshness', filters.freshness);
    }
    const qStr = query.toString();
    return this.request<KnowledgeItem[]>(`/knowledge${qStr ? `?${qStr}` : ''}`);
  }

  async getKnowledge(id: string): Promise<KnowledgeItem | null> {
    return this.request<KnowledgeItem>(`/knowledge/${id}`);
  }

  async createKnowledge(
    item: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<KnowledgeItem> {
    return this.request<KnowledgeItem>('/knowledge', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async updateKnowledge(id: string, updates: Partial<KnowledgeItem>): Promise<KnowledgeItem> {
    return this.request<KnowledgeItem>(`/knowledge/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteKnowledge(id: string): Promise<void> {
    await this.request<void>(`/knowledge/${id}`, {
      method: 'DELETE',
    });
  }

  async listRelationships(): Promise<KnowledgeRelationship[]> {
    return this.request<KnowledgeRelationship[]>('/relationships');
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

  async deleteRelationship(id: string): Promise<void> {
    await this.request<void>(`/relationships/${id}`, {
      method: 'DELETE',
    });
  }

  async removeRelationship(id: string): Promise<void> {
    return this.deleteRelationship(id);
  }

  async listOutcomes(knowledgeId?: string): Promise<KnowledgeOutcome[]> {
    const q = knowledgeId ? `?knowledgeId=${encodeURIComponent(knowledgeId)}` : '';
    return this.request<KnowledgeOutcome[]>(`/outcomes${q}`);
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
    await this.request<void>(`/outcomes/${id}`, {
      method: 'DELETE',
    });
  }

  async listCollections(): Promise<Collection[]> {
    return this.request<Collection[]>('/collections');
  }

  async createCollection(col: Omit<Collection, 'id'>): Promise<Collection> {
    return this.request<Collection>('/collections', {
      method: 'POST',
      body: JSON.stringify(col),
    });
  }

  async deleteCollection(id: string): Promise<void> {
    await this.request<void>(`/collections/${id}`, {
      method: 'DELETE',
    });
  }

  async listApiKeys(): Promise<ApiKeyGrant[]> {
    return this.request<ApiKeyGrant[]>('/auth/keys');
  }

  async createApiKey(data: {
    label: string;
    allowedCollections: string[];
    grants: ('search' | 'read' | 'compose')[];
    expiryDays: number;
  }): Promise<{ key: ApiKeyGrant; plainTextToken: string }> {
    return this.request<{ key: ApiKeyGrant; plainTextToken: string }>('/auth/keys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async revokeApiKey(id: string): Promise<void> {
    await this.request<void>(`/auth/keys/${id}`, {
      method: 'DELETE',
    });
  }

  async assembleContext(req: ContextAssemblyRequest): Promise<ContextAssemblyResult> {
    return this.request<ContextAssemblyResult>('/context/assemble', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async getStorageStats(): Promise<StorageStats> {
    return this.request<StorageStats>('/system/stats');
  }

  async resetDemoStore(): Promise<void> {
    throw new Error('Reset demo store is not supported in production API mode.');
  }

  async exportData(): Promise<string> {
    return this.request<string>('/system/export');
  }

  async importData(jsonString: string): Promise<boolean> {
    return this.request<boolean>('/system/import', {
      method: 'POST',
      body: jsonString,
    });
  }
}
